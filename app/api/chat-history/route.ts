export const dynamic = 'force-dynamic';

import clientPromise from "@/lib/mongo";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email") || "guest@example.com";

  try {
    const client = await clientPromise;
    const db = client.db("surgery-chat");
    const collection = db.collection("conversations");

    const chats = await collection
      .find({ email })
      .sort({ createdAt: -1 })
      .toArray();

    const result = chats.map((conv) => {
      const firstUserMsg = conv.messages?.find((m: any) => m.role === "user");
      const title = firstUserMsg?.content?.slice(0, 40) || "Untitled Chat";

      return {
        threadId: conv.threadId,
        title,
        createdAt: conv.createdAt,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}
