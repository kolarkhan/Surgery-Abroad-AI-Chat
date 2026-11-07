const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_UPLOAD_BASE = "https://generativelanguage.googleapis.com/upload/v1beta/files";

export type GeminiPart =
  | { text: string }
  | {
      inline_data: {
        mime_type: string;
        data: string;
      };
    }
  | {
      file_data: {
        mime_type: string;
        file_uri: string;
      };
    };

export type GeminiContent = {
  role?: "user" | "model";
  parts: GeminiPart[];
};

type GeminiGenerateTextOptions = {
  model?: string;
  systemInstruction?: string;
  contents: GeminiContent[];
  generationConfig?: Record<string, unknown>;
};

type GeminiUploadResult = {
  uri: string;
  mimeType: string;
  name?: string;
};

const RETRIABLE_STATUS_CODES = new Set([429, 500, 503, 504]);
const TRANSCRIPTION_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-001"];
const GEMINI_INLINE_UPLOAD_LIMIT = 15 * 1024 * 1024;

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not set");
  }

  return apiKey;
}

async function geminiFetch(
  url: string,
  init?: RequestInit,
  extraHeaders?: Record<string, string>
) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(url, {
      ...init,
      headers: {
        "x-goog-api-key": getGeminiApiKey(),
        ...(init?.headers || {}),
        ...(extraHeaders || {}),
      },
    });

    if (response.ok) {
      return response;
    }

    const errorText = await response.text();
    const isRetriable = RETRIABLE_STATUS_CODES.has(response.status);
    const hasAttemptsLeft = attempt < maxAttempts;

    if (isRetriable && hasAttemptsLeft) {
      const delayMs = 400 * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    throw new Error(`Gemini request failed (${response.status}): ${errorText}`);
  }

  throw new Error("Gemini request failed after retries");
}

function extractTextFromGeminiResponse(payload: any) {
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];

  return parts
    .map((part: any) => part?.text || "")
    .filter(Boolean)
    .join("");
}

export async function generateGeminiText({
  model = "gemini-2.5-flash",
  systemInstruction,
  contents,
  generationConfig,
}: GeminiGenerateTextOptions) {
  const response = await geminiFetch(
    `${GEMINI_API_BASE}/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(systemInstruction
          ? {
              system_instruction: {
                parts: [{ text: systemInstruction }],
              },
            }
          : {}),
        contents,
        ...(generationConfig ? { generationConfig } : {}),
      }),
    }
  );

  const payload = await response.json();
  return extractTextFromGeminiResponse(payload).trim();
}

export async function generateGeminiJson<T>({
  model = "gemini-2.5-flash",
  systemInstruction,
  prompt,
}: {
  model?: string;
  systemInstruction?: string;
  prompt: string;
}) {
  const text = await generateGeminiText({
    model,
    systemInstruction,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(text) as T;
}

export async function uploadGeminiFile({
  data,
  mimeType,
  displayName,
}: {
  data: Buffer;
  mimeType: string;
  displayName: string;
}): Promise<GeminiUploadResult> {
  const startResponse = await geminiFetch(GEMINI_UPLOAD_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": data.byteLength.toString(),
      "X-Goog-Upload-Header-Content-Type": mimeType,
    },
    body: JSON.stringify({
      file: {
        display_name: displayName,
      },
    }),
  });

  const uploadUrl = startResponse.headers.get("x-goog-upload-url");

  if (!uploadUrl) {
    throw new Error("Gemini upload URL not returned");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": data.byteLength.toString(),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: data,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Gemini file upload failed (${uploadResponse.status}): ${errorText}`);
  }

  const payload = await uploadResponse.json();
  const file = payload?.file;

  if (!file?.uri || !file?.mimeType) {
    throw new Error("Gemini file upload response missing file URI");
  }

  return {
    uri: file.uri,
    mimeType: file.mimeType,
    name: file.name,
  };
}

export async function deleteGeminiFile(name?: string) {
  if (!name) return;

  try {
    await geminiFetch(`${GEMINI_API_BASE}/${name}`, {
      method: "DELETE",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("(404)")) {
      return;
    }

    console.warn("Failed to delete Gemini file:", error);
  }
}

export async function transcribeAudioWithGemini({
  data,
  mimeType,
  displayName,
}: {
  data: Buffer;
  mimeType: string;
  displayName: string;
}) {
  const transcriptionPrompt =
    "Generate a clean transcript of this audio. Return only the transcript text with no extra commentary.";

  const runTranscription = async (audioPart: GeminiPart) => {
    let lastError: unknown;

    for (const model of TRANSCRIPTION_MODELS) {
      try {
        return await generateGeminiText({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: transcriptionPrompt }, audioPart],
            },
          ],
        });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Gemini transcription failed");
  };

  if (data.byteLength <= GEMINI_INLINE_UPLOAD_LIMIT) {
    try {
      return await runTranscription({
        inline_data: {
          mime_type: mimeType,
          data: data.toString("base64"),
        },
      });
    } catch (inlineError) {
      console.warn("Inline Gemini transcription failed, retrying with Files API:", inlineError);
    }
  }

  const uploaded = await uploadGeminiFile({ data, mimeType, displayName });

  try {
    return await runTranscription({
      file_data: {
        mime_type: uploaded.mimeType,
        file_uri: uploaded.uri,
      },
    });
  } finally {
    void deleteGeminiFile(uploaded.name);
  }
}

export async function generateGeminiSpeech({
  text,
  voiceName = "Kore",
}: {
  text: string;
  voiceName?: string;
}) {
  const ttsModel =
    process.env.GEMINI_TTS_MODEL || process.env.GEMINI_VOICE_TTS_MODEL || "gemini-3.1-flash-tts-preview";

  const response = await geminiFetch(
    `${GEMINI_API_BASE}/models/${ttsModel}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ttsModel,
        contents: [
          {
            parts: [{ text }],
          },
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
      }),
    }
  );

  const payload = await response.json();
  const audioPart = payload?.candidates?.[0]?.content?.parts?.find(
    (part: any) => part?.inlineData?.data
  );
  const base64Audio = audioPart?.inlineData?.data;
  const mimeType = audioPart?.inlineData?.mimeType as string | undefined;

  if (!base64Audio) {
    throw new Error("Gemini TTS did not return audio");
  }

  return {
    audioBuffer: Buffer.from(base64Audio, "base64"),
    mimeType,
  };
}

export function pcmToWav(pcmData: Buffer, sampleRate = 24000, channels = 1) {
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, 44);

  return buffer;
}
