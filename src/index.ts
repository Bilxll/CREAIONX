import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Route modules get mounted here as they're built out, e.g.:
// import serverRoutes from "./modules/servers/routes";
// app.use("/servers", serverRoutes);
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
