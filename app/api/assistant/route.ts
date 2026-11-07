import { v4 as uuidv4 } from "uuid";
import { AssistantResponse } from "ai";
import { AssistantDataMessageServer } from "@/app/types/data-message";
import { createMedicalTourismChatStream } from "@/app/lib/medical-tourism-assistant";
import { deleteGeminiFile, GeminiPart, uploadGeminiFile } from "@/app/lib/gemini";

export const maxDuration = 60;

function getDefaultPrompt(file?: File) {
  if (!file) {
    return "Please help me with the uploaded files.";
  }

  if (file.type === "application/pdf") {
    return "Please read the PDF and summarize the key points.";
  }

  if (file.type.startsWith("image/")) {
    return "Please analyze the image and describe what you see.";
  }

  return "Please process the attached file.";
}

export async function POST(req: Request) {
  let input: {
    threadId: string | null;
    message: string;
    files?: File[];
  };

  const contentType = req.headers.get("content-type");

  if (contentType?.includes("multipart/form-data")) {
    const formData = await req.formData();
    const threadId = formData.get("threadId") as string | null;
    const message = formData.get("message") as string;
    const files = formData.getAll("files") as File[];
    input = { threadId, message, files };
  } else {
    input = await req.json();
  }

  const hasFiles = Array.isArray(input.files) && input.files.length > 0;
  const threadId = input.threadId ?? uuidv4();
  const messageId = uuidv4();
  const fileNames: string[] = [];
  const uploadedFiles: { name?: string }[] = [];
  const attachmentParts: GeminiPart[] = [];

  if (hasFiles) {
    for (const file of input.files!) {
      const uploaded = await uploadGeminiFile({
        data: Buffer.from(await file.arrayBuffer()),
        mimeType: file.type || "application/octet-stream",
        displayName: file.name,
      });

      uploadedFiles.push({ name: uploaded.name });
      fileNames.push(file.name);
      attachmentParts.push({
        file_data: {
          mime_type: uploaded.mimeType,
          file_uri: uploaded.uri,
        },
      });
    }
  }

  const trimmedMessage = input.message?.trim();
  const prompt = trimmedMessage || (hasFiles ? getDefaultPrompt(input.files?.[0]) : "");
  const fileNote = fileNames.length > 0 ? `Uploaded: ${fileNames.join(", ")}` : "";
  const fullPrompt = [prompt, fileNote].filter(Boolean).join("\n\n");

  if (!fullPrompt && attachmentParts.length === 0) {
    return new Response("No message or file provided", { status: 400 });
  }

  return AssistantResponse(
    { threadId, messageId },
    async ({ forwardStream, sendDataMessage }) => {
      let assistantReply = "";

      try {
        const syntheticAssistantStream = (async function* () {
          yield {
            event: "thread.message.created",
            data: {
              id: messageId,
            },
          };

          const chatStream = createMedicalTourismChatStream(
            threadId,
            fullPrompt,
            attachmentParts
          );

          for await (const chunk of chatStream) {
            const delta = chunk.choices?.[0]?.delta?.content;

            if (!delta) continue;

            assistantReply += delta;

            yield {
              event: "thread.message.delta",
              data: {
                delta: {
                  content: [
                    {
                      type: "text",
                      text: { value: delta },
                    },
                  ],
                },
              },
            };
          }

          yield {
            event: "thread.run.completed",
            data: {
              status: "completed",
            },
          };
        })();

        await forwardStream(syntheticAssistantStream as any);

        if (assistantReply) {
          sendDataMessage({
            role: "data",
            data: {
              type: "message.text",
              value: assistantReply,
            },
          } as AssistantDataMessageServer);
        }
      } finally {
        await Promise.all(uploadedFiles.map((file) => deleteGeminiFile(file.name)));
      }
    }
  );
}
