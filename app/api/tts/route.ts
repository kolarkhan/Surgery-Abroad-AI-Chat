import { NextResponse } from "next/server";
import { generateGeminiSpeech, pcmToWav } from "@/app/lib/gemini";

export async function POST(req: Request) {
  try {
    const { text, voice = "Kore" } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const { audioBuffer, mimeType } = await generateGeminiSpeech({
      text,
      voiceName: voice,
    });

    const normalizedMimeType = mimeType?.toLowerCase() || "";
    const isRawPcm =
      !normalizedMimeType ||
      normalizedMimeType.includes("l16") ||
      normalizedMimeType.includes("pcm");

    const responseBody = isRawPcm ? pcmToWav(audioBuffer) : audioBuffer;
    const responseMimeType = isRawPcm ? "audio/wav" : mimeType!;

    return new NextResponse(responseBody, {
      headers: {
        "Content-Type": responseMimeType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Gemini TTS route error:", error);
    return NextResponse.json(
      { error: "Failed to generate Gemini audio" },
      { status: 500 }
    );
  }
}
