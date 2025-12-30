import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import path from "path";

import courseTermRoutes from "./routes/api/courseTerm/courseTermRoutes.js";
import apiAuthRoutes from "./routes/api/auth/auth.js";
import apiMainRoutes from "./routes/api/main.js";
import webMainRoutes from "./routes/web/main.js";
import systemInfoRoutes from "./routes/api/system/systemInfo.js";
import { verifyTokenForStatic } from "./middlewares/tokenMiddleware.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

/* --------------------------------------------------
   TRUST PROXY (IMPORTANT behind Nginx)
-------------------------------------------------- */
app.set("trust proxy", 1);

/* --------------------------------------------------
   CORS (PRODUCTION SAFE)
-------------------------------------------------- */
const allowedOrigins = [
  "https://quoratutorialsystem.academy",
  "https://www.quoratutorialsystem.academy",
  "https://quoratutorialsystem.vercel.app",
  "http://localhost:5173", // dev only
  "http://localhost:4173", // preview
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    // 💡 ADD THESE TWO LINES BELOW
    allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
    exposedHeaders: ["Content-Disposition"], 
  })
);

/* --------------------------------------------------
   MIDDLEWARE
-------------------------------------------------- */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(cookieParser());

/* --------------------------------------------------
   STATIC FILES (PUBLIC)
-------------------------------------------------- */
app.use("/storage/assets", express.static(join(__dirname, "public")));

app.use(
  "/uploads/profileimages",
  express.static(join(__dirname, "uploads/profileimages"))
);

app.use(
  "/uploads/contact-videos",
  express.static(join(__dirname, "uploads/contact-videos"))
);

/* --------------------------------------------------
   PROTECTED STATIC FILES
-------------------------------------------------- */
async function isAuthenticated(req, res, next) {
  try {
    const authStatus = await verifyTokenForStatic(req);
    if (!authStatus) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

app.use(
  "/storage/private/assets",
  isAuthenticated,
  express.static(join(__dirname, "private"))
);

/* --------------------------------------------------
   API ROUTES
-------------------------------------------------- */
app.use("/api/auth", apiAuthRoutes);
app.use("/api/course-terms", courseTermRoutes);
app.use("/api/system-info", systemInfoRoutes);
app.use("/api", apiMainRoutes);

/* --------------------------------------------------
   WEB ROUTES (SSR / landing pages)
-------------------------------------------------- */
app.use("/", webMainRoutes);

/* --------------------------------------------------
   HEALTH CHECK
-------------------------------------------------- */
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Tutorial System API is healthy 🚀",
    environment: process.env.APP_MODE || "unknown",
  });
});

/* --------------------------------------------------
   GLOBAL 404 HANDLER
-------------------------------------------------- */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

export default app;

