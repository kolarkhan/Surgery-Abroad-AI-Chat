
// export const dynamic = 'force-dynamic';

// import { NextResponse } from "next/server";
// import clientPromise from "@/lib/mongo";

// // Handle GET: Fetch all conversations
// export async function GET() {
//   try {
//     const client = await clientPromise;
//     const db = client.db("surgery-chat");
//     const collection = db.collection("conversations");

//     const conversations = await collection
//       .find({}, { projection: { _id: 0 } }) // exclude MongoDB _id
//       .sort({ createdAt: -1 })
//       .toArray();

//     return NextResponse.json(
//       { success: true, conversations },
//       {
//         status: 200,
//         headers: {
//           "Access-Control-Allow-Origin": "*",
//           "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//           "Access-Control-Allow-Headers": "Content-Type",
//           "Content-Type": "application/json",
//         },
//       }
//     );
//   } catch (error) {
//     console.error("Failed to fetch conversations:", error);
//     return NextResponse.json(
//       { success: false, error: "Failed to fetch conversations" },
//       {
//         status: 500,
//         headers: {
//           "Access-Control-Allow-Origin": "*",
//         },
//       }
//     );
//   }
// }

// // Handle OPTIONS: Preflight for CORS
// export async function OPTIONS() {
//   return new Response(null, {
//     status: 204,
//     headers: {
//       "Access-Control-Allow-Origin": "*",
//       "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//       "Access-Control-Allow-Headers": "Content-Type",
//     },
//   });
// }




export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";

// Handle GET: Fetch all conversations
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("surgery-chat");
    const conversationsCollection = db.collection("conversations");
    const hiddenCollection = db.collection("hidden_threads");

    // Get all hidden threadIds
    const hiddenThreads = await hiddenCollection.find({}, { projection: { _id: 0, threadId: 1 } }).toArray();
    const hiddenThreadIds = hiddenThreads.map(h => h.threadId);

    // Fetch conversations excluding hidden threadIds
    const conversations = await conversationsCollection
      .find({ threadId: { $nin: hiddenThreadIds } }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      { success: true, conversations },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversations" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// Handle OPTIONS: Preflight for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
