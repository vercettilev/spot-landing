import { fail, getIp, json, makeRateLimiter, preflight } from "@/engine/api";
import { getDeps } from "@/engine/deps";
import { isRecord } from "@/engine/http";
import { tradingMode } from "@/engine/trade";

export const runtime = "nodejs";
export const maxDuration = 60;

const limit = makeRateLimiter(20);

/**
 * LAND A SIGNED ORDER. `{ requestId, signedTransaction }` from /api/order,
 * after the wallet signed it, handed to Jupiter's /execute. Spot adds
 * nothing to the transaction and keeps no copy.
 *
 * A failure is only final when the chain says so. Jupiter's "Failed" with a
 * signature is checked against the chain first: there it may have landed
 * after all (then it is a Success), have landed and failed (final), or be
 * nowhere yet (not final: it may still land until its blockhash runs out).
 * A Jupiter that does not answer in time is "pending", never "failed": the
 * app then watches the wallet rather than offering a second, real, buy.
 *
 * CLOSED until SPOT_TRADING=1.
 *
 *   200 { ok, status: "Success" | "Failed", signature, error, final }
 *   400 bad_json | invalid_request   403 trading_closed
 *   504 pending (may still land)   503 lookup_failed | needs_key
 */
export async function POST(req: Request) {
  if (tradingMode(process.env).mode === "closed") return fail(403, "trading_closed");
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
  const deps = getDeps();
  const res = await deps.execute(signed, requestId);
  if (!res.ok) {
    if (res.reason === "needs_key") return fail(503, "needs_key");
    return res.reason === "timeout" || res.reason === "network_error" ? fail(504, "pending") : fail(503, "lookup_failed");
  }
  const { status, signature, error } = res.value;
  if (status === "Success") return json({ ok: true, status, signature, error, final: true });
  if (!signature) return json({ ok: true, status, signature, error, final: false });
  const chain = await deps.readSignature(signature);
  const landing = chain.ok ? chain.value : "unknown";
  if (landing === "landed") return json({ ok: true, status: "Success", signature, error: null, final: true });
  return json({ ok: true, status, signature, error, final: landing === "failed" });
}

export const OPTIONS = preflight;
