import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client, used ONLY to verify tokens (via getUser).
// Uses the service role key so it can validate any user's token — never
// expose SUPABASE_SERVICE_ROLE_KEY to the frontend.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AuthedRequest extends Request {
  supabaseUser?: {
    id: string; // Supabase auth.users.id — this is what we key our own User table on
    email: string;
  };
}

/**
 * Verifies the Supabase access token sent as `Authorization: Bearer <token>`.
 * On success, attaches `req.supabaseUser`. On failure, responds 401.
 *
 * The frontend gets this token from supabase.auth.getSession() after the
 * user logs in, and sends it on every request to our API.
 */
export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.slice("Bearer ".length);

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.supabaseUser = {
    id: data.user.id,
    email: data.user.email ?? "",
  };

  next();
}
