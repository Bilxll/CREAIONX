import { PrismaClient, ChannelType, StoreItemType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Owner user
  const owner = await prisma.user.create({
    data: {
      username: "platform_owner",
      email: "owner@example.com",
    },
  });

  // A single server (Phase 1: servers/channels exist, but events are
  // centralized/platform-hosted per the spec's locked MVP scope)
  const server = await prisma.server.create({
    data: {
      name: "Main Community",
      ownerId: owner.id,
      roles: {
        create: [
          { name: "Owner", position: 3, permissions: BigInt(0xffffffff) },
          { name: "Admin", position: 2, permissions: BigInt(0xff) },
          { name: "Member", position: 1, permissions: BigInt(0x1) },
        ],
      },
      channels: {
        create: [
          { name: "general", type: ChannelType.TEXT },
          { name: "trivia-night", type: ChannelType.TEXT },
        ],
      },
    },
  });

  await prisma.serverMember.create({
    data: {
      serverId: server.id,
      userId: owner.id,
    },
  });

  // Phase 1 event type: a single simple trivia event
  const event = await prisma.event.create({
    data: {
      name: "Trivia Night #1",
      startsAt: new Date(Date.now() + 1000 * 60 * 60), // 1hr from now
      endsAt: new Date(Date.now() + 1000 * 60 * 90), // 1.5hr from now
      status: "SCHEDULED",
      createdBy: owner.id,
    },
  });

  // A basic store: 5-10 Sparks-only cosmetics per Phase 1 scope
  await prisma.storeItem.createMany({
    data: [
      { name: "Blue Name Color", type: StoreItemType.NAME_COLOR, priceEarned: 200 },
      { name: "Starter Avatar Frame", type: StoreItemType.AVATAR_FRAME, priceEarned: 300 },
      { name: "OG Badge", type: StoreItemType.BADGE, priceEarned: 500 },
      { name: "Extra Emoji Slot", type: StoreItemType.EMOJI_SLOT, priceEarned: 400 },
      { name: "Trivia Night Champion", type: StoreItemType.BADGE, priceEarned: null, isLimited: true, eventId: event.id },
    ],
  });

  console.log("Seed complete:", { ownerId: owner.id, serverId: server.id, eventId: event.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
