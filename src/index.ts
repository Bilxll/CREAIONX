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

// Prisma's `permissions` bitfields are BigInt, and JSON.stringify can't
// serialize BigInt natively. Rather than fix this per-route, teach BigInt
// how to convert to JSON once, globally, as a string. Every route that
// returns a role (with its `permissions` field) is now safe automatically.
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

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
  const socketIoClientSrc = path.join(
    __dirname,
    "..",
    "node_modules",
    "socket.io-client",
    "dist",
    "socket.io.min.js"
  );
  if (fs.existsSync(socketIoClientSrc)) {
    fs.copyFileSync(socketIoClientSrc, path.join(vendorDir, "socket.io.min.js"));
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

import messageRoutes from "./modules/messages/routes";
app.use("/", messageRoutes); // routes define their own full paths, e.g. /channels/:id/messages

// Route modules get mounted here as they're built out, e.g.:
// import eventRoutes from "./modules/events/routes";
// app.use("/events", eventRoutes);

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" }, // tighten before production
});

// ---- Socket.io auth: verify the same Supabase access token used for REST ----
import { createClient } from "@supabase/supabase-js";
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SocketUser {
  id: string;
  email: string;
}

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Missing auth token"));
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return next(new Error("Invalid or expired token"));
  }
  (socket.data as { user: SocketUser }).user = {
    id: data.user.id,
    email: data.user.email ?? "",
  };
  next();
});

io.on("connection", (socket) => {
  const user = (socket.data as { user: SocketUser }).user;
  console.log("socket connected:", socket.id, "user:", user.email);

  /**
   * Join a channel's room. We check server membership before allowing
   * the join, same rule as the REST routes — a socket connection isn't
   * a bypass for the membership check.
   */
  socket.on("channel:join", async (channelId: string, ack?: (res: any) => void) => {
    try {
      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!channel) return ack?.({ error: "Channel not found" });

      const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: channel.serverId, userId: user.id } },
      });
      if (!membership) return ack?.({ error: "Not a member of this server" });

      socket.join(`channel:${channelId}`);
      ack?.({ joined: channelId });
    } catch (err) {
      ack?.({ error: String(err) });
    }
  });

  socket.on("channel:leave", (channelId: string) => {
    socket.leave(`channel:${channelId}`);
  });

  /**
   * Send a message. Persists to the database FIRST (source of truth),
   * then broadcasts the saved row (with real id/createdAt) to everyone
   * in the channel room, including the sender — so the UI always
   * renders from the same server-confirmed data, not an optimistic
   * local echo.
   */
  socket.on(
    "message:send",
    async (payload: { channelId: string; content: string }, ack?: (res: any) => void) => {
      try {
        const { channelId, content } = payload;
        if (!content || !content.trim()) {
          return ack?.({ error: "Message content is required" });
        }

        const channel = await prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel) return ack?.({ error: "Channel not found" });

        const membership = await prisma.serverMember.findUnique({
          where: { serverId_userId: { serverId: channel.serverId, userId: user.id } },
        });
        if (!membership) return ack?.({ error: "Not a member of this server" });

        const message = await prisma.message.create({
          data: { channelId, userId: user.id, content: content.trim() },
          include: { user: { select: { id: true, username: true, avatarUrl: true } } },
        });

        io.to(`channel:${channelId}`).emit("channel:message", message);
        ack?.({ sent: message.id });
      } catch (err) {
        ack?.({ error: String(err) });
      }
    }
  );

  socket.on("disconnect", () => {
    console.log("socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
httpServer.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
