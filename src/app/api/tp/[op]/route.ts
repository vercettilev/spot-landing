import { USDC_MINT } from "@/core/route/jupiter";
import { fail, getIp, json, makeRateLimiter, preflight } from "@/engine/api";
import { isAddress } from "@/engine/address";
import { getDeps } from "@/engine/deps";
import { isRecord, num, str } from "@/engine/http";
import { mayTrade } from "@/engine/trade";
import type { TriggerCall } from "@/engine/trigger";

export const runtime = "nodejs";
export const maxDuration = 30;

const limit = makeRateLimiter(30);

/** Jupiter wants an end on every order; Spot's run thirty days, and none may run longer than this. */
const LONGEST_MS = 31 * 24 * 60 * 60 * 1000;

/**
 * SELL HALF AT 2X, through Jupiter's trigger orders (src/engine/trigger.ts),
 * one step per path, each passing on only what that step needs:
 *
 *   POST challenge       { walletPubkey }                      → { challenge }
 *   POST verify          { walletPubkey, signature }           → { accessToken, refreshToken, expiresAt }
 *   POST refresh         { refreshToken }                      → the same
 *   POST vault           Bearer                                → {} (registered now or before)
 *   POST deposit         Bearer { inputMint, userAddress, amount } → { transaction, requestId, … }
 *   POST order           Bearer { depositRequestId, depositSignedTx, userPubkey, inputMint, inputAmount, triggerPriceUsd, expiresAt }
 *                                                              → { id, txSignature, depositConfirmed }
 *   GET  orders          Bearer ?state=active|past&mint=       → { orders, pagination }
 *   POST cancel          Bearer { orderId }                    → { id, transaction, requestId }
 *   POST confirm-cancel  Bearer { orderId, signedTransaction, cancelRequestId } → { id, txSignature }
 *
 * The only order Spot makes: sell a coin for USDC once its price is above a
 * mark, single, at Jupiter's own slippage. Putting coins into one is trading
 * (SPOT_TRADING); seeing and cancelling one never closes, as a sell never
 * does.
 *
 *   400 bad_json | invalid_request    401 signed_out (Jupiter's session ended: sign in again)
 *   403 trading_closed | refused      404 not_found    429 rate_limited
 *   502 refused (Jupiter said no, with its words)      503 lookup_failed | needs_key
 */
type Handled = { call: TriggerCall; ok?: (status: number, body: unknown) => Response | null } | Response;

const ADDRESS = (v: unknown) => (typeof v === "string" && isAddress(v.trim()) ? v.trim() : null);
const RAW = (v: unknown) => (typeof v === "string" && /^\d{1,30}$/.test(v) && !/^0+$/.test(v) ? v : null);
const B64 = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9+/]{40,12000}={0,2}$/.test(v) ? v : null);
const B58SIG = (v: unknown) => (typeof v === "string" && /^[1-9A-HJ-NP-Za-km-z]{64,100}$/.test(v) ? v : null);
const TOKEN = (v: unknown) => (typeof v === "string" && /^[\w.~+/=-]{8,4096}$/.test(v) ? v : null);
const ORDER_ID = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9-]{8,64}$/.test(v) ? v : null);

function bearerOf(req: Request): string | null {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers.get("authorization") ?? "");
  return m && TOKEN(m[1]) ? m[1]! : null;
}

function plan(op: string, req: Request, b: Record<string, unknown>, q: URLSearchParams): Handled {
  const bearer = bearerOf(req);
  const signedIn = (call: Omit<TriggerCall, "bearer">, ok?: (status: number, body: unknown) => Response | null): Handled =>
    bearer ? { call: { ...call, bearer }, ...(ok ? { ok } : {}) } : fail(401, "signed_out");
  const bad = fail(400, "invalid_request");

  switch (op) {
    case "challenge": {
      const walletPubkey = ADDRESS(b.walletPubkey);
      return walletPubkey ? { call: { method: "POST", path: "/auth/challenge", body: { walletPubkey, type: "message" } } } : bad;
    }
    case "verify": {
      const walletPubkey = ADDRESS(b.walletPubkey);
      const signature = B58SIG(b.signature);
      return walletPubkey && signature
        ? { call: { method: "POST", path: "/auth/verify", body: { type: "message", walletPubkey, signature, authMode: "access_refresh" } } }
        : bad;
    }
    case "refresh": {
      const refreshToken = TOKEN(b.refreshToken);
      return refreshToken ? { call: { method: "POST", path: "/auth/refresh", body: { refreshToken } } } : bad;
    }
    case "vault":
      /* A vault made before is as good as one made now. */
      return signedIn({ method: "GET", path: "/vault/register" }, (status) => (status === 409 ? json({ ok: true, existed: true }) : null));
    case "deposit": {
      const inputMint = ADDRESS(b.inputMint);
      const userAddress = ADDRESS(b.userAddress);
      const amount = RAW(b.amount);
      if (!inputMint || !userAddress || !amount || inputMint === USDC_MINT) return bad;
      if (!mayTrade(process.env, userAddress)) return fail(403, "trading_closed");
      return signedIn({
        method: "POST",
        path: "/deposit/craft",
        body: { inputMint, outputMint: USDC_MINT, userAddress, amount, orderType: "price", orderSubType: "single" },
      });
    }
    case "order": {
      const userPubkey = ADDRESS(b.userPubkey);
      const inputMint = ADDRESS(b.inputMint);
      const inputAmount = RAW(b.inputAmount);
      const depositSignedTx = B64(b.depositSignedTx);
      const depositRequestId = str(b.depositRequestId)?.trim();
      const triggerPriceUsd = num(b.triggerPriceUsd);
      const expiresAt = num(b.expiresAt);
      const now = Date.now();
      if (
        !userPubkey ||
        !inputMint ||
        inputMint === USDC_MINT ||
        !inputAmount ||
        !depositSignedTx ||
        !depositRequestId ||
        depositRequestId.length > 200 ||
        triggerPriceUsd === undefined ||
        !(triggerPriceUsd > 0) ||
        expiresAt === undefined ||
        !(expiresAt > now && expiresAt <= now + LONGEST_MS)
      ) {
        return bad;
      }
      if (!mayTrade(process.env, userPubkey)) return fail(403, "trading_closed");
      return signedIn({
        method: "POST",
        path: "/orders/price",
        body: {
          orderType: "single",
          depositRequestId,
          depositSignedTx,
          userPubkey,
          inputMint,
          inputAmount,
          outputMint: USDC_MINT,
          triggerMint: inputMint,
          triggerCondition: "above",
          triggerPriceUsd,
          expiresAt: Math.floor(expiresAt),
        },
      });
    }
    case "orders": {
      const state = q.get("state");
      const mint = q.get("mint");
      if ((state && state !== "active" && state !== "past") || (mint && !isAddress(mint))) return bad;
      return signedIn({
        method: "GET",
        path: "/orders/history",
        query: { ...(state ? { state } : {}), ...(mint ? { mint } : {}), limit: "50" },
      });
    }
    case "cancel": {
      const orderId = ORDER_ID(b.orderId);
      return orderId ? signedIn({ method: "POST", path: `/orders/price/cancel/${orderId}` }) : bad;
    }
    case "confirm-cancel": {
      const orderId = ORDER_ID(b.orderId);
      const signedTransaction = B64(b.signedTransaction);
      const cancelRequestId = str(b.cancelRequestId)?.trim();
      return orderId && signedTransaction && cancelRequestId && cancelRequestId.length <= 200
        ? signedIn({ method: "POST", path: `/orders/price/confirm-cancel/${orderId}`, body: { signedTransaction, cancelRequestId } })
        : bad;
    }
    default:
      return fail(404, "not_found");
  }
}

async function handle(req: Request, op: string, body: Record<string, unknown>): Promise<Response> {
  if (!limit(getIp(req))) return fail(429, "rate_limited");
  const planned = plan(op, req, body, new URL(req.url).searchParams);
  if (planned instanceof Response) return planned;
  const res = await getDeps().trigger(planned.call);
  if (!res.ok) return res.reason === "needs_key" ? fail(503, "needs_key") : res.reason === "rate_limited" ? fail(429, "rate_limited") : fail(503, "lookup_failed");
  const { status, body: answer } = res.value;
  const special = planned.ok?.(status, answer);
  if (special) return special;
  if (status >= 200 && status < 300) return json({ ok: true, ...(isRecord(answer) ? answer : {}) });
  /* Jupiter's own words come back with its no, for the app to show or act on. */
  const said = isRecord(answer) ? (str(answer.error) ?? "") : "";
  const extra = said ? { message: said.slice(0, 300) } : {};
  if (status === 401) return fail(401, "signed_out", extra);
  if (status === 404) return fail(404, "not_found", extra);
  if (status === 400 || status === 403 || status === 409) return fail(status === 403 ? 403 : 502, "refused", extra);
  return fail(503, "lookup_failed", extra);
}

type Ctx = { params: Promise<{ op: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { op } = await ctx.params;
  let body: unknown = {};
  const text = await req.text();
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      return fail(400, "bad_json");
    }
  }
  return handle(req, op, isRecord(body) ? body : {});
}

export async function GET(req: Request, ctx: Ctx) {
  const { op } = await ctx.params;
  if (op !== "orders") return fail(404, "not_found");
  return handle(req, op, {});
}

export const OPTIONS = preflight;
