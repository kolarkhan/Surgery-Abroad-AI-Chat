// app/api/store-chat/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { email, username, fullname, threadId, messages } = await req.json();

    if (!email || !username || !fullname || !threadId || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("surgery-chat");
    const collection = db.collection("conversations");

    const filteredMessages = messages
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .map((m: any) => ({
        role: m.role,
        content: m.content || m?.data?.value || "",
      }))
      .filter((m) => m.content && m.content.length > 0);

    if (filteredMessages.length === 0) {
      return NextResponse.json({ error: "No valid messages to store" }, { status: 400 });
    }

    // Upsert conversation by threadId
    const result = await collection.updateOne(
      { threadId },
      {
        $set: {
          email,
          username,
          fullname,
          messages: filteredMessages,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          conversationId: uuidv4(),
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, upserted: result.upsertedId });
  } catch (err) {
    console.error("Error saving conversation:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}



