import { USDC_MINT } from "@/core/route/jupiter";
import { NO_STORE, fail, getIp, json, makeRateLimiter, preflight } from "@/engine/api";
import { isAddress } from "@/engine/address";
import { getDeps } from "@/engine/deps";
import { fillIcons } from "@/engine/icons";
import { sniff } from "@/engine/sniff";

export const runtime = "nodejs";
export const maxDuration = 15;

const limit = makeRateLimiter(60);

/** The landing's buy sheet opens at 25 USDC; so does the probe. */
const DEFAULT_AMOUNT = 25;
const MAX_AMOUNT = 10_000;

/**
 * SNIFF A COIN: `?mint=<address>&amount=<usdc>`. The amount sizes the
 * round trip, since an exit that holds for 5 USDC can fold at 500.
 *
 *   200 { ok, level: "ok" | "warn" | "block" | "unknown", headline, token, checks, maxBuyUsdc, roundTrip }
 *   400 invalid_mint | is_usdc | invalid_amount
 *   404 not_found (Jupiter has no record, often a coin minutes old) | not_a_mint
 *   429 rate_limited
 *   503 lookup_failed
 */
export async function GET(req: Request) {
  if (!limit(getIp(req))) return fail(429, "rate_limited");
  const q = new URL(req.url).searchParams;
  const mint = (q.get("mint") ?? "").trim();
  if (!isAddress(mint)) return fail(400, "invalid_mint");
  if (mint === USDC_MINT) return fail(400, "is_usdc");
  const raw = q.get("amount");
  const amount = raw === null || raw.trim() === "" ? DEFAULT_AMOUNT : Number(raw);
  if (!Number.isFinite(amount) || amount < 1 || amount > MAX_AMOUNT) return fail(400, "invalid_amount");

  const deps = getDeps();
  const res = await sniff(mint, Math.round(amount * 100) / 100, deps);
  if (!res.ok) return res.reason === "lookup_failed" ? fail(503, "lookup_failed") : fail(404, res.reason);
  await fillIcons([res.value.token], deps.readImage);

  /* Prices move by the second; ten seconds of sharing one answer between
     everyone sniffing the same coin is what keeps a hot coin from costing a
     Jupiter quote per tap. An unfinished sniff is never shared. */
  const cache = res.value.level === "unknown" ? NO_STORE : "public, s-maxage=10, stale-while-revalidate=20";
  return json({ ok: true, ...res.value }, { cache });
}

export const OPTIONS = preflight;
