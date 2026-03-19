import dotenv from 'dotenv';
import "dotenv/config";
dotenv.config();
import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";
connectDB()
  .then(() => {
    
  })
  .catch((err) => {
    console.error("MongoDB connection error: ", err);
    process.exit(1);
  });

export default app;
