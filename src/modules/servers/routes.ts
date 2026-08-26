import { Router, Response } from "express";
import { prisma } from "../../index";
import { requireAuth, AuthedRequest } from "../auth/middleware";

const router = Router();

/**
 * POST /servers
 * Body: { name: string }
 *
 * Creates a new server, owned by the requesting user. Also creates a
 * default "Owner" role and adds the creator as a member with that role,
 * plus a default "general" text channel — mirrors what the seed script
 * does, so servers are usable immediately after creation.
 */
router.post("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { id: userId } = req.supabaseUser!;
  const { name } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Server name is required" });
  }

  const server = await prisma.server.create({
    data: {
      name: name.trim(),
      ownerId: userId,
      roles: {
        create: [
          { name: "Owner", position: 3, permissions: BigInt(0xffffffff) },
          { name: "Member", position: 1, permissions: BigInt(0x1) },
        ],
      },
      channels: {
        create: [{ name: "general", type: "TEXT" }],
      },
    },
    include: { roles: true, channels: true },
  });

  const ownerRole = server.roles.find((r) => r.name === "Owner");

  await prisma.serverMember.create({
    data: {
      serverId: server.id,
      userId,
      roleId: ownerRole?.id,
    },
  });

  res.status(201).json({ server });
});

/**
 * GET /servers
 *
 * Lists servers the requesting user is a member of (not all servers
 * platform-wide — that's not a Phase 1 need per the spec's centralized-
 * events, server-scoped-channels MVP scope).
 */
router.get("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { id: userId } = req.supabaseUser!;

  const memberships = await prisma.serverMember.findMany({
    where: { userId },
    include: { server: true },
  });

  res.json({ servers: memberships.map((m) => m.server) });
});

/**
 * GET /servers/:id
 *
 * Returns one server's detail, including its channels — but only if
 * the requesting user is a member (otherwise 403). This is a simple
 * membership check; full role/permission enforcement is a later pass.
 */
router.get("/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { id: userId } = req.supabaseUser!;
  const { id: serverId } = req.params;

  const membership = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!membership) {
    return res.status(403).json({ error: "You are not a member of this server" });
  }

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: { channels: true, roles: true },
  });

  if (!server) {
    return res.status(404).json({ error: "Server not found" });
  }

  res.json({ server });
});

/**
 * POST /servers/:id/join
 *
 * Adds the requesting user as a member with the default "Member" role.
 * No invite-link/token system yet — Phase 1 keeps this simple (anyone
 * with a server id can join). Invite links are a natural follow-up.
 */
router.post("/:id/join", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { id: userId } = req.supabaseUser!;
  const { id: serverId } = req.params;

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: { roles: true },
  });

  if (!server) {
    return res.status(404).json({ error: "Server not found" });
  }

  const existing = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (existing) {
    return res.json({ membership: existing, note: "Already a member" });
  }

  const memberRole = server.roles.find((r) => r.name === "Member");

  const membership = await prisma.serverMember.create({
    data: { serverId, userId, roleId: memberRole?.id },
  });

  res.status(201).json({ membership });
});

/**
 * POST /servers/:id/channels
 * Body: { name: string, type: "TEXT" | "VOICE" }
 *
 * Creates a channel within a server. Requires membership. Phase 1 does
 * not yet enforce role-based permissions for who can create channels —
 * any member can, for now.
 */
router.post("/:id/channels", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { id: userId } = req.supabaseUser!;
  const { id: serverId } = req.params;
  const { name, type } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Channel name is required" });
  }
  if (type !== "TEXT" && type !== "VOICE") {
    return res.status(400).json({ error: "type must be 'TEXT' or 'VOICE'" });
  }

  const membership = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!membership) {
    return res.status(403).json({ error: "You are not a member of this server" });
  }

  const channel = await prisma.channel.create({
    data: { serverId, name: name.trim(), type },
  });

  res.status(201).json({ channel });
});

/**
 * GET /servers/:id/channels
 *
 * Lists channels for a server. Requires membership.
 */
router.get("/:id/channels", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { id: userId } = req.supabaseUser!;
  const { id: serverId } = req.params;

  const membership = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!membership) {
    return res.status(403).json({ error: "You are not a member of this server" });
  }

  const channels = await prisma.channel.findMany({ where: { serverId } });

  res.json({ channels });
});

export default router;
