"use server";

import { z } from "zod";
import { generateGeminiJson } from "@/app/lib/gemini";

const PossibleQuestions = z.object({
  possibleQuestions: z.array(z.string()),
});

export const generatePossibleQuestions = async (message: string) => {
  const payload = await generateGeminiJson<z.infer<typeof PossibleQuestions>>({
    model: "gemini-2.5-flash",
    systemInstruction:
      "You generate likely follow-up questions for a medical tourism assistant. Return valid JSON only.",
    prompt: `This is the last assistant message in a conversation with a user. Generate 3 follow-up questions the user is likely to ask next.\n\nAssistant message: "${message}"\n\nReturn JSON in this shape: {"possibleQuestions":["question 1","question 2","question 3"]}`,
  });

  return PossibleQuestions.parse(payload).possibleQuestions;
};
