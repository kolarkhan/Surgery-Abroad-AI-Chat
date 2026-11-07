
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";

export async function POST(req: Request) {
  try {
    const { threadId, index } = await req.json();
    if (!threadId || typeof index !== "number") {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("surgery-chat");

    const doc = await db.collection("conversations").findOne({ threadId });
    if (!doc || !Array.isArray(doc.summaries) || index >= doc.summaries.length) {
      return NextResponse.json({ success: false, error: "Summary not found" }, { status: 404 });
    }

    const deletedSummary = doc.summaries[index];

    // Step 1: Unset the summary at the specific index (replaces it with null)
    await db.collection("conversations").updateOne(
      { threadId },
      { $unset: { [`summaries.${index}`]: 1 } }
    );

    // Step 2: Type-safe cast to remove all nulls (TypeScript-safe)
    await db.collection("conversations").updateOne(
      { threadId },
      { $pull: { summaries: null as any } }
    );

    return NextResponse.json({
      success: true,
      deleted: { text: deletedSummary.text, index }
    });
  } catch (err) {
    console.error("Error deleting summary:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

