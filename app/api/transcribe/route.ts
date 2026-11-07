import { NextResponse } from "next/server";
import { transcribeAudioWithGemini } from "@/app/lib/gemini";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    const text = await transcribeAudioWithGemini({
      data: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "audio/webm",
      displayName: file.name || "speech.webm",
    });

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Gemini transcription error:", error);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
