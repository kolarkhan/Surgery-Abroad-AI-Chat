import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";
import { generateGeminiText } from "@/app/lib/gemini";

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("surgery-chat");

    const conversations = await db
      .collection("conversations")
      .find({}, { projection: { messages: 1 } })
      .toArray();

    const allMessages = conversations.flatMap((conversation) => conversation.messages || []);

    if (allMessages.length === 0) {
      return NextResponse.json({ success: false, error: "No messages found" }, { status: 404 });
    }

    const combinedText = allMessages
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n");

    const summary = await generateGeminiText({
      model: "gemini-2.5-flash",
      systemInstruction:
        "You are an analytics assistant. Analyze chat history and provide key insights about common topics, user behavior, tone, sentiment, and any unusual patterns.",
      contents: [{ role: "user", parts: [{ text: combinedText.slice(-15000) }] }],
      generationConfig: {
        temperature: 0.7,
      },
    });

    return NextResponse.json(
      { success: true, summary: summary || "No analytics generated." },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (err) {
    console.error("Error generating analytics summary:", err);
    return NextResponse.json(
      { success: false, error: "Error generating summary" },
      { status: 500 }
    );
  }
}
