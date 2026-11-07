export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";
import { generateGeminiText } from "@/app/lib/gemini";

export async function POST(req: Request) {
  try {
    const { messages, threadId } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0 || !threadId) {
      return NextResponse.json(
        { success: false, error: "No messages or threadId provided." },
        { status: 400 }
      );
    }

    const chatMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    const summaryPrompt = `Summarize the following conversation between a user and an AI assistant in no more than 4 short lines.\n\n${chatMessages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n")}`;

    const summary = await generateGeminiText({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: summaryPrompt }] }],
    });
    const finalSummary = summary || "No summary available.";
    const summaryMessageCount = messages.length;
    const timestamp = new Date();

    const client = await clientPromise;
    const db = client.db("surgery-chat");

    
    await db.collection("conversations").updateOne(
  { threadId },
  {
    $push: {
      summaries: {
        $each: [
          {
            text: finalSummary,
            messageCount: summaryMessageCount,
            timestamp,
          },
        ],
        $position: 0,
      },
    } as any, //  Fix: Cast to any
    $set: { updatedAt: timestamp },
  }
);


    return NextResponse.json({
      success: true,
      summary: finalSummary,
      summaryMessageCount,
    });
  } catch (err) {
    console.error("Error summarizing conversation:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
