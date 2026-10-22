import { fail, getIp, json, makeRateLimiter, preflight } from "@/engine/api";
import { isAddress } from "@/engine/address";
import { getDeps } from "@/engine/deps";
import { num } from "@/engine/http";

export const runtime = "nodejs";
export const maxDuration = 10;

const limit = makeRateLimiter(30);

/** As many coins as the app's Sniffed lately shows, and a few to spare. */
const MAX_MINTS = 10;

/**
 * PRICES NOW: `?mints=<a>,<b>,…` (up to ten) → each coin's price in dollars,
 * from one Jupiter search for all of them, or null for a coin Jupiter has
 * no price for. For the app's Sniffed lately, where every coin says how far
 * it has gone since it was sniffed.
 *
 *   200 { ok, prices: { <mint>: number | null } }
 *   400 invalid_mints   429 rate_limited   503 lookup_failed
 */
export async function GET(req: Request) {
  if (!limit(getIp(req))) return fail(429, "rate_limited");
  const mints = [...new Set((new URL(req.url).searchParams.get("mints") ?? "").split(",").map((m) => m.trim()).filter(Boolean))];
  if (!mints.length || mints.length > MAX_MINTS || !mints.every(isAddress)) return fail(400, "invalid_mints");
  const res = await getDeps().search.search(mints.join(","), { timeoutMs: 3_000 });
  if (!res.ok) return fail(503, "lookup_failed");
  const prices = Object.fromEntries(mints.map((m) => [m, num(res.value.find((t) => t.id === m)?.usdPrice) ?? null]));
  /* A price is a price for half a minute: everyone with the same coins sniffed shares one search. */
  return json({ ok: true, prices }, { cache: "public, s-maxage=30, stale-while-revalidate=60" });
}

export const OPTIONS = preflight;
