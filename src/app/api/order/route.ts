import { SOL_MINT, USDC_MINT } from "@/core/route/jupiter";
import { fail, getIp, json, makeRateLimiter, preflight } from "@/engine/api";
import { isAddress } from "@/engine/address";
import { getDeps } from "@/engine/deps";
import { isRecord, num } from "@/engine/http";
import { sniff } from "@/engine/sniff";
import { mayTrade, tradingMode } from "@/engine/trade";

export const runtime = "nodejs";
export const maxDuration = 30;

const limit = makeRateLimiter(20);

/**
 * AN ORDER TO SIGN. `{ mint, side: "buy" | "sell", taker, amountUsdc | amountRaw, payWith? }`
 * → a Jupiter transaction for the taker's wallet. A buy is sniffed again
 * here, whatever the app showed: a blocked coin gets no transaction, a
 * warned one none above its cap. A sell is never refused: getting out is
 * always the user's call. A buy is paid in USDC, or with `payWith: "sol"`
 * in SOL worth the same dollars at Jupiter's price of the moment.
 *
 * CLOSED until SPOT_TRADING=1, and only for SPOT_TRADING_WALLETS when that
 * is set (a wallet off the list hears trading_closed, like everyone does
 * while it is closed).
 *
 *   200 { ok, requestId, transaction, inAmount, outAmount, priceImpactPct, gasless }
 *   400 bad_json | invalid_mint | invalid_side | invalid_taker | invalid_amount
 *   403 trading_closed     409 blocked | unsniffed | over_cap
 *   422 no_route | refused (with Jupiter's message)     503 lookup_failed | needs_key
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
  const mint = typeof b.mint === "string" ? b.mint.trim() : "";
  const taker = typeof b.taker === "string" ? b.taker.trim() : "";
  if (!isAddress(mint) || mint === USDC_MINT) return fail(400, "invalid_mint");
  if (b.side !== "buy" && b.side !== "sell") return fail(400, "invalid_side");
  if (!isAddress(taker)) return fail(400, "invalid_taker");
  if (!mayTrade(process.env, taker)) return fail(403, "trading_closed");
  const deps = getDeps();

  let input: string;
  let output: string;
  let amount: string;
  if (b.side === "buy") {
    const usdc = typeof b.amountUsdc === "number" ? Math.round(b.amountUsdc * 100) / 100 : NaN;
    if (!Number.isFinite(usdc) || usdc < 1 || usdc > 10_000) return fail(400, "invalid_amount");
    const s = await sniff(mint, usdc, deps);
    if (!s.ok) return s.reason === "lookup_failed" ? fail(503, "lookup_failed") : fail(404, s.reason);
    if (s.value.level === "block") return fail(409, "blocked", { headline: s.value.headline });
    if (s.value.level === "unknown") return fail(409, "unsniffed", { headline: s.value.headline });
    if (s.value.level === "warn" && s.value.maxBuyUsdc !== null && usdc > s.value.maxBuyUsdc) {
      return fail(409, "over_cap", { maxBuyUsdc: s.value.maxBuyUsdc });
    }
    if (b.payWith === "sol") {
      const sol = await deps.search.search(SOL_MINT, { timeoutMs: 3_000 });
      const price = sol.ok ? num(sol.value.find((t) => t.id === SOL_MINT)?.usdPrice) : undefined;
      if (price === undefined || !(price > 0)) return fail(503, "lookup_failed");
      [input, output, amount] = [SOL_MINT, mint, String(Math.round((usdc / price) * 1e9))];
    } else {
      [input, output, amount] = [USDC_MINT, mint, String(Math.round(usdc * 1e6))];
    }
  } else {
    const raw = typeof b.amountRaw === "string" ? b.amountRaw.trim() : "";
    if (!/^\d{1,30}$/.test(raw) || /^0+$/.test(raw)) return fail(400, "invalid_amount");
    [input, output, amount] = [mint, USDC_MINT, raw];
  }

  const o = await deps.order({ inputMint: input, outputMint: output, amount, taker });
  if (!o.ok) {
    if (o.reason === "no_route" || o.reason === "refused") return fail(422, o.reason, o.message ? { message: o.message } : {});
    return fail(503, o.reason === "needs_key" ? "needs_key" : "lookup_failed");
  }
  return json({ ok: true, ...o.value });
}

export const OPTIONS = preflight;
