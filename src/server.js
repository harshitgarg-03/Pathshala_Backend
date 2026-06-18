import dotenv from 'dotenv';
import "dotenv/config";
dotenv.config();
import app from "./app.js";
import { connectDB } from "./config/db.js";
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error: ", err);
    process.exit(1);
  });

export default app;
