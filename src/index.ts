import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

export const prisma = new PrismaClient();

const app = express();
app.use(cors());
// Content-Security-Policy relaxed only for this local test page's needs;
// helmet's default CSP would otherwise also block same-origin scripts
// depending on config. Real frontend deployments should set a proper CSP.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

// One-time setup: copy the Supabase JS UMD bundle from node_modules into
// public/vendor so the test page can load it same-origin (avoids CSP /
// CDN issues entirely). This runs on every boot but is cheap (file copy).
const vendorDir = path.join(__dirname, "..", "public", "vendor");
const supabaseSrc = path.join(
  __dirname,
  "..",
  "node_modules",
  "@supabase",
  "supabase-js",
  "dist",
  "umd",
  "supabase.js"
);
try {
  if (!fs.existsSync(vendorDir)) fs.mkdirSync(vendorDir, { recursive: true });
  if (fs.existsSync(supabaseSrc)) {
    fs.copyFileSync(supabaseSrc, path.join(vendorDir, "supabase.min.js"));
  }
} catch (err) {
  console.warn("Could not vendor supabase-js for test page:", err);
}

app.use(express.static("public")); // serves public/test-login.html at /test-login.html

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

import authRoutes from "./modules/auth/routes";
app.use("/auth", authRoutes);

import serverRoutes from "./modules/servers/routes";
app.use("/servers", serverRoutes);

// Route modules get mounted here as they're built out, e.g.:
// import eventRoutes from "./modules/events/routes";
// app.use("/events", eventRoutes);

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" }, // tighten before production
});

io.on("connection", (socket) => {
  // Real-time messaging (Section 2.2) hooks in here in the next pass:
  // channel join/leave rooms, message broadcast, typing indicators.
  console.log("socket connected:", socket.id);
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
httpServer.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
