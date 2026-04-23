import type { User } from "@supabase/supabase-js";

/**
 * Founder access (MVP):
 * - `user_metadata.role` or `app_metadata.role` is `founder` or `admin`, OR
 * - User email is listed in `VITE_FOUNDER_EMAILS` (comma-separated, case-insensitive).
 *
 * If the env list is empty, only metadata roles grant access (secure default).
 */
export function parseFounderEmailAllowlist(): string[] {
  const raw = import.meta.env.VITE_FOUNDER_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function userIsFounder(user: User | null | undefined): boolean {
  if (!user?.email) return false;
  const meta = {
    ...((user.app_metadata ?? {}) as Record<string, unknown>),
    ...((user.user_metadata ?? {}) as Record<string, unknown>),
  };
  const role = meta.role;
  if (role === "founder" || role === "admin") return true;
  const allow = parseFounderEmailAllowlist();
  if (allow.length === 0) return false;
  return allow.includes(user.email.toLowerCase());
}
