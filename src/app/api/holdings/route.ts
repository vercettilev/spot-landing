import { fail, getIp, json, makeRateLimiter, preflight } from "@/engine/api";
import { isAddress } from "@/engine/address";
import { getDeps } from "@/engine/deps";
import { holdings } from "@/engine/holdings";
import { fillIcons } from "@/engine/icons";
import { tally, tallyWallet } from "@/engine/tally";

export const runtime = "nodejs";
export const maxDuration = 15;

const limit = makeRateLimiter(30);

/**
 * THE BAG: `?owner=<wallet>` → USDC, SOL and every coin worth a cent, priced.
 * Public data about a public address, so it caches like anything else.
 *
 *   200 { ok, owner, totalUsd, usdc, sol, positions, hidden }
 *   400 invalid_owner   429 rate_limited   503 lookup_failed
 */
export async function GET(req: Request) {
  if (!limit(getIp(req))) return fail(429, "rate_limited");
  const owner = (new URL(req.url).searchParams.get("owner") ?? "").trim();
  if (!isAddress(owner)) return fail(400, "invalid_owner");
  const deps = getDeps();
  const res = await holdings(owner, deps);
  if (!res.ok) return fail(503, "lookup_failed");
  await Promise.all([fillIcons(res.value.positions.map((p) => p.token), deps.readImage), tally("bag"), tallyWallet(owner)]);
  return json({ ok: true, ...res.value }, { cache: "public, s-maxage=10, stale-while-revalidate=20" });
}

export const OPTIONS = preflight;
