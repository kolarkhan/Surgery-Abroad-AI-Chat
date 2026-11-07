export const dynamic = 'force-dynamic';
import clientPromise from "@/lib/mongo";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");

    if (!threadId) {
      return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("surgery-chat");
    const collection = db.collection("conversations");

    const conversation = await collection.findOne({ threadId });

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      messages: conversation.messages,
      threadId: conversation.threadId,
    });
  } catch (error) {
    console.error("Error in get-chat API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
