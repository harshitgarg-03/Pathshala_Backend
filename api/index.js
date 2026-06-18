import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";

let isConnected = false;

async function connect() {
  if (isConnected) return;

  try {
    await connectDB();
    isConnected = true;
    console.log("✅ DB Connected");
  } catch (err) {
    console.error("❌ DB Error:", err);
  }
}

export default async function handler(req, res) {
  await connect();

  return app(req, res);
}