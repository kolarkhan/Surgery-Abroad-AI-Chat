export const dynamic = "force-dynamic";

import { v4 as uuidv4 } from "uuid";
import clientPromise from "@/lib/mongo";
import { generateFastVoiceAssistantReply } from "@/app/lib/medical-tourism-assistant";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email") || "guest@example.com";
    const username = searchParams.get("username") || "guest";
    const fullname = searchParams.get("fullname") || "Guest User";
    const threadId = searchParams.get("threadId") || uuidv4();

    const { message } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const assistantReply = await generateFastVoiceAssistantReply(threadId, message.trim());

    const client = await clientPromise;
    const db = client.db("surgery-chat");
    const collection = db.collection("conversations");

    const filteredMessages = [
      { role: "user", content: message.trim() },
      { role: "assistant", content: assistantReply },
    ];

    await collection.updateOne(
      { threadId },
      {
        $set: {
          email,
          username,
          fullname,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          conversationId: uuidv4(),
          createdAt: new Date(),
          threadId,
        },
        $push: {
          messages: { $each: filteredMessages } as any,
        },
      },
      { upsert: true }
    );

    return new Response(JSON.stringify({ text: assistantReply, threadId }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Voice Assistant Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
