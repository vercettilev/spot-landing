/**
 * THE EARLY-ACCESS LIST'S RULES. Nothing ships yet, so the page asks for one
 * thing and promises one: an address. Which phone it should land on, so the
 * first build goes where the people are, is read from the device when it can
 * be and asked after joining when it cannot.
 */

export const PLATFORMS = ["iphone", "android", "seeker"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABEL: Record<Platform, string> = {
  iphone: "iPhone",
  android: "Android",
  seeker: "Solana Seeker",
};

/**
 * Only the three values the page offers. Anything else is refused rather than
 * stored, because this field decides which build comes first and a free-text
 * count is a count of typos.
 */
export function parsePlatform(value: unknown): Platform | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return (PLATFORMS as readonly string[]).includes(v) ? (v as Platform) : null;
}

export function cleanEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Deliberately loose: one @ with something on both sides and a dot after it. The inbox is the real test. */
export function looksLikeEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Best-effort per-IP limiter. In-memory, so it bounds one serverless instance
 * and no more; BotID at the door is what stops scripted bursts.
 */
export function makeRateLimiter(max: number, windowMs = 60_000) {
  const hits = new Map<string, { start: number; count: number }>();
  return (ip: string): boolean => {
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now - entry.start > windowMs) {
      hits.set(ip, { start: now, count: 1 });
      return true;
    }
    if (entry.count >= max) return false;
    entry.count++;
    return true;
  };
}

/**
 * THE CALLER'S IP, FROM A HEADER THE CALLER CANNOT WRITE. Vercel sets
 * x-vercel-forwarded-for and x-real-ip and overwrites whatever arrived. The
 * x-forwarded-for fallback takes the LAST hop, the one appended by the
 * nearest proxy, because the leftmost entry is whatever the client typed.
 * "unknown" is one shared bucket, not a free pass.
 */
export function getIp(req: Request): string {
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return "unknown";
}
