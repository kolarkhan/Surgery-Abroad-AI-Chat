import clientPromise from "@/lib/mongo";
import { GeminiPart, generateGeminiText } from "@/app/lib/gemini";

const MAX_HISTORY_MESSAGES = 12;
const FAST_VOICE_HISTORY_MESSAGES = 6;

export const MEDICAL_TOURISM_SYSTEM_PROMPT = `
# Core Purpose
You are a specialized medical tourism assistant focused on helping people explore different medical procedures abroad, especially plastic surgery options in Lithuania.

Your goals, in order:
1. Provide accurate, helpful information about medical tourism while positively presenting Lithuania as a destination and clinics such as Wellness Travels when relevant.
2. Ask for the necessary contact information early in the conversation in a separate paragraph:
"Before we continue, could you please provide your name, email address and home country so we can reach out to you if needed?"
- email is mandatory; name and country are optional
- if the user ignores it, ask again later
- if they provide it, ask for yes/no consent before saving
3. When possible, encourage users to fill in this quiz for a free consultation and accurate pricing:
https://surgery-abroad.com/surgery-quiz/
- do not place it in the same or consecutive message as the contact info request
- structure it as a separate paragraph and make it stand out
4. If the user is seriously interested, ask whether they want to upload photos for more accurate information.
- if photos are provided, ask for yes/no consent before saving

# Knowledge Base
- Focus on medical tourism in Lithuania, especially plastic surgery and dental procedures
- Share only verified clinic and surgeon information
- Be transparent when information is unavailable
- Help with procedures, travel logistics, recovery expectations, price comparisons, accommodation, transportation, and Lithuanian healthcare standards

# Response Guidelines
- Keep responses concise, structured, professional, compassionate, and easy to scan
- Prioritize patient safety and medical ethics
- Never diagnose, prescribe, or provide specific medical advice
- Encourage in-person consultations with qualified professionals
- Do not guarantee outcomes or prices beyond verified ranges
- If users want a human representative:
  - if contact details are missing, ask for them
  - if already available, say a representative can contact them by email

# Formatting Guidance
- Present clinic, surgeon, and pricing details clearly
- Use brief, readable formatting
- When helpful, compare Lithuania pricing with the user's home country
- When discussing procedures, mention practical recovery guidance such as flying timelines when relevant

# Boundaries
- Do not claim medical expertise
- Do not share other patients' personal data
- Do not provide information about non-verified clinics or surgeons
- Do not disparage other countries' healthcare systems
`;

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function getConversationHistory(
  threadId?: string | null,
  maxMessages = MAX_HISTORY_MESSAGES
): Promise<ConversationMessage[]> {
  if (!threadId) {
    return [];
  }

  const client = await clientPromise;
  const db = client.db("surgery-chat");
  const collection = db.collection("conversations");
  const conversation = await collection.findOne<{ messages?: ConversationMessage[] }>({
    threadId,
  });

  const messages =
    conversation?.messages
      ?.filter(
        (message) =>
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim().length > 0
      )
      .slice(-maxMessages) ?? [];

  return messages;
}

export async function buildMedicalTourismMessages(
  threadId: string | null | undefined,
  message: string
) {
  const history = await getConversationHistory(threadId);

  return [
    {
      role: "system" as const,
      content: MEDICAL_TOURISM_SYSTEM_PROMPT,
    },
    ...history.map((historyMessage) => ({
      role: historyMessage.role,
      content: historyMessage.content,
    })),
    {
      role: "user" as const,
      content: message,
    },
  ];
}

export async function buildMedicalTourismContents(
  threadId: string | null | undefined,
  message: string,
  attachmentParts: GeminiPart[] = [],
  maxHistoryMessages = MAX_HISTORY_MESSAGES
) {
  const history = await getConversationHistory(threadId, maxHistoryMessages);

  return [
    ...history.map((historyMessage) => ({
      role: historyMessage.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: historyMessage.content }],
    })),
    {
      role: "user" as const,
      parts: [{ text: message }, ...attachmentParts],
    },
  ];
}

export async function generateMedicalTourismReply(
  threadId: string | null | undefined,
  message: string,
  attachmentParts: GeminiPart[] = [],
  options?: {
    model?: string;
    systemInstructionSuffix?: string;
    maxHistoryMessages?: number;
    generationConfig?: Record<string, unknown>;
  }
) {
  const contents = await buildMedicalTourismContents(
    threadId,
    message,
    attachmentParts,
    options?.maxHistoryMessages ?? MAX_HISTORY_MESSAGES
  );

  return generateGeminiText({
    model: options?.model ?? "gemini-2.5-flash",
    systemInstruction: `${MEDICAL_TOURISM_SYSTEM_PROMPT}${
      options?.systemInstructionSuffix ? `\n\n${options.systemInstructionSuffix}` : ""
    }`,
    contents,
    generationConfig: {
      temperature: 0.6,
      ...(options?.generationConfig ?? {}),
    },
  });
}

export async function generateFastVoiceAssistantReply(
  threadId: string | null | undefined,
  message: string
) {
  return generateMedicalTourismReply(threadId, message, [], {
    // Use the same broadly available model as the rest of the app to avoid
    // per-model free-tier quota failures on gemini-2.0-flash.
    model: process.env.GEMINI_VOICE_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash",
    maxHistoryMessages: FAST_VOICE_HISTORY_MESSAGES,
    systemInstructionSuffix:
      "This reply will be spoken aloud. Keep it fast, natural, and concise. Use no markdown. Prefer 1-3 short sentences and keep it under 70 words unless the user asks for detail.",
    generationConfig: {
      temperature: 0.4,
    },
  });
}

function chunkText(text: string, chunkSize = 48) {
  const chunks: string[] = [];

  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function* createMedicalTourismChatStream(
  threadId: string | null | undefined,
  message: string,
  attachmentParts: GeminiPart[] = []
) {
  const reply = await generateMedicalTourismReply(threadId, message, attachmentParts);

  for (const chunk of chunkText(reply)) {
    yield {
      choices: [
        {
          delta: {
            content: chunk,
          },
        },
      ],
    };
  }
}
