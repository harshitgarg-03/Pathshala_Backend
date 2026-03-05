import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookiesParse from "cookie-parser";
import healthCheck from "./routes/healthCheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import courseRouter from "./routes/course.routes.js";

import {
  verifyPayment,
} from "./controllers/razorpay.controller.js"
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  verifyPayment
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookiesParse());

// cors confifrations
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use("/api/v1/healthcheck", healthCheck);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/auth", courseRouter);

export default app;