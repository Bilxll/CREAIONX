import { Router, Response } from "express";
import { prisma } from "../../index";
import { requireAuth, AuthedRequest } from "../auth/middleware";

const router = Router();

/**
 * GET /channels/:channelId/messages?before=<messageId>&limit=50
 *
 * Returns recent messages for a channel, newest first, with simple
 * cursor pagination via `before`. Real-time delivery of NEW messages
 * happens over the Socket.io "channel:message" event (see index.ts) —
 * this REST route is for initial load / scrollback history.
 *
 * Requires the requester to be a member of the channel's server.
 */
router.get("/channels/:channelId/messages", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { id: userId } = req.supabaseUser!;
  const { channelId } = req.params;
  const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 100);
  const before = req.query.before ? String(req.query.before) : undefined;

  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel) {
    return res.status(404).json({ error: "Channel not found" });
  }

  const membership = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId: channel.serverId, userId } },
  });
  if (!membership) {
    return res.status(403).json({ error: "You are not a member of this server" });
  }

  const messages = await prisma.message.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
  });

  res.json({ messages: messages.reverse() }); // oldest-first for easy rendering
});

export default router;
