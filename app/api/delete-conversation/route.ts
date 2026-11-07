import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { threadId, adminToken } = body;

    if (!threadId) {
      return NextResponse.json({ success: false, error: "Missing threadId" }, { status: 400 });
    }

    // Optional: Simple admin check (replace with secure method in production)
    const VALID_ADMIN_TOKEN = process.env.ADMIN_DASHBOARD_TOKEN || "your-secret-admin-token";
    if (adminToken !== VALID_ADMIN_TOKEN) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("surgery-chat");
    const hiddenCollection = db.collection("hidden_threads");

    await hiddenCollection.updateOne(
      { threadId },
      {
        $set: {
          threadId,
          hiddenAt: new Date().toISOString(),
          hiddenBy: "admin", // Or req.user.email if using auth
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error hiding conversation:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
