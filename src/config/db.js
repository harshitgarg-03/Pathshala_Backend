import mongoose from "mongoose";

let isConnected = false;

export const connectDB = async () => {
    if(isConnected) return;

    try {
        const db = await mongoose.connect(process.env.DB_URL, {
            serverSelectionTimeoutMS: 30000,
        });
        isConnected = db.connections[0].readyState === 1;
        console.log("✅ MongoDB connected");
    } catch (error) {
        console.error("❌ MongoDB error:", error.message);
        process.exit(1);
    }
}