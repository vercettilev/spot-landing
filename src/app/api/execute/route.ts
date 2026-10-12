import { fail, getIp, json, makeRateLimiter, preflight } from "@/engine/api";
import { getDeps } from "@/engine/deps";
import { isRecord } from "@/engine/http";

export const runtime = "nodejs";
export const maxDuration = 45;

const limit = makeRateLimiter(20);

/**
 * LAND A SIGNED ORDER. `{ requestId, signedTransaction }` from /api/order,
 * after the wallet signed it, handed to Jupiter's /execute. Spot adds
 * nothing to the transaction and keeps no copy.
 *
 * CLOSED until SPOT_TRADING=1.
 *
 *   200 { ok, status: "Success" | "Failed", signature, error }
 *   400 bad_json | invalid_request   403 trading_closed   503 lookup_failed | needs_key
 */
export async function POST(req: Request) {
  if (process.env.SPOT_TRADING !== "1") return fail(403, "trading_closed");
  if (!limit(getIp(req))) return fail(429, "rate_limited");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_json");
  }
  const b = isRecord(body) ? body : {};
  const requestId = typeof b.requestId === "string" ? b.requestId.trim() : "";
  const signed = typeof b.signedTransaction === "string" ? b.signedTransaction.trim() : "";
  if (!requestId || requestId.length > 200 || !/^[A-Za-z0-9+/=]{40,4000}$/.test(signed)) return fail(400, "invalid_request");
  const res = await getDeps().execute(signed, requestId);
  if (!res.ok) return fail(503, res.reason === "needs_key" ? "needs_key" : "lookup_failed");
  return json({ ok: true, ...res.value });
}

export const OPTIONS = preflight;
