import dotenv from 'dotenv';
import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

dotenv.config();
connectDB()
  .then(() => {
    
  })
  .catch((err) => {
    console.error("MongoDB connection error: ", err);
    process.exit(1);
  });

export default app;
