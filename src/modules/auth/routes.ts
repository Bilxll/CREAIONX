import { Router, Response } from "express";
import { prisma } from "../../index";
import { requireAuth, AuthedRequest } from "./middleware";

const router = Router();

/**
 * GET /auth/me
 *
 * Called right after the frontend logs a user in via Supabase Auth.
 * We use the Supabase user's id as our own User.id directly — no
 * separate mapping table needed, since Supabase already guarantees
 * uniqueness and gives us a stable UUID per account.
 *
 * First call for a given user: creates the User row (with a default
 * username derived from their email) and their initial server
 * membership is left to a separate onboarding step.
 * Every subsequent call: just returns the existing profile.
 */
router.get("/me", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { id, email } = req.supabaseUser!;

  const defaultUsername = email.split("@")[0] || `user_${id.slice(0, 8)}`;

  const user = await prisma.user.upsert({
    where: { id },
    update: {}, // no-op on existing users; profile edits go through a separate endpoint
    create: {
      id,
      email,
      username: defaultUsername,
    },
  });

  res.json({ user });
});

/**
 * GET /auth/whoami
 *
 * Minimal smoke-test route: proves requireAuth + token verification
 * work end-to-end without touching the database. Useful while wiring
 * up the frontend login flow.
 */
router.get("/whoami", requireAuth, (req: AuthedRequest, res: Response) => {
  res.json({ supabaseUser: req.supabaseUser });
});

export default router;
