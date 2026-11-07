import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Only cache in development to prevent hot-reload issues
if (process.env.NODE_ENV === "development") {
  if (!(globalThis as any)._mongoClientPromise) {
    client = new MongoClient(uri, options);
    (globalThis as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (globalThis as any)._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
