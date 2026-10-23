import type { Executed, Holdings, Order, Sniff } from "./types";

/* The site's API (src/engine in the repo root). EXPO_PUBLIC_SPOT_API points
   a build elsewhere, a preview deployment for instance. The www host on
   purpose: the bare domain redirects, and a redirected POST arrives as a GET. */
export const API_BASE = (process.env.EXPO_PUBLIC_SPOT_API ?? "https://www.usespot.fun").replace(/\/+$/, "");

/** The digital dollar Spot trades in. */
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export type ApiError =
  | "offline"
  | "timeout"
  | "busy"
  | "lookup_failed"
  | "not_found"
  | "not_a_mint"
  | "trading_closed"
  | "blocked"
  | "unsniffed"
  | "over_cap"
  | "no_route"
  | "refused"
  | "needs_key"
  | "pending"
  | "signed_out"
  | "bad";

const KNOWN = new Set<ApiError>([
  "lookup_failed",
  "not_found",
  "not_a_mint",
  "trading_closed",
  "blocked",
  "unsniffed",
  "over_cap",
  "no_route",
  "refused",
  "needs_key",
  "pending",
  "signed_out",
]);

/** A failed answer keeps whatever the API said with it: a headline, a cap, Jupiter's words. */
export type Answer<T> = { ok: true; value: T } | { ok: false; error: ApiError; detail?: Record<string, unknown> };

export type Body = { ok?: boolean; error?: string } & Record<string, unknown>;

/** What an answer says: its value, or the API's error and whatever came with it. */
export function answerOf<T>(res: { ok: boolean; status: number }, body: Body | null): Answer<T> {
  if (res.ok && body?.ok) return { ok: true, value: body as T };
  if (res.status === 429) return { ok: false, error: "busy" };
  const error = body?.error as ApiError | undefined;
  return { ok: false, error: error && KNOWN.has(error) ? error : "bad", ...(body ? { detail: body } : {}) };
}

async function call<T>(path: string, init: RequestInit, timeoutMs: number): Promise<Answer<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal });
    return answerOf<T>(res, (await res.json().catch(() => null)) as Body | null);
  } catch (e) {
    return { ok: false, error: (e as Error)?.name === "AbortError" ? "timeout" : "offline" };
  } finally {
    clearTimeout(timer);
  }
}

/* What did they share? is asked in resolve.ts: its answer comes in lines. */

/** The sniff, sized to the amount. A few seconds on Jupiter's free plan. */
export const sniffCoin = (mint: string, amount: number) =>
  call<Sniff>(`/api/sniff?mint=${encodeURIComponent(mint)}&amount=${amount}`, { method: "GET" }, 20_000);

/** A wallet's bag, priced. */
export const fetchHoldings = (owner: string) =>
  call<Holdings>(`/api/holdings?owner=${encodeURIComponent(owner)}`, { method: "GET" }, 15_000);

/** Coins' prices now, null where Jupiter has none: what Sniffed lately measures against. Up to ten at once. */
export const fetchPrices = (mints: string[]) =>
  call<{ ok: true; prices: Record<string, number | null> }>(`/api/prices?mints=${mints.map(encodeURIComponent).join(",")}`, { method: "GET" }, 10_000);

const post = <T>(path: string, body: unknown, timeoutMs: number) =>
  call<T>(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, timeoutMs);

/** A transaction for the wallet to sign. The server sniffs a buy again before it builds one. */
export const placeOrder = (o: { mint: string; side: "buy" | "sell"; taker: string; amountUsdc?: number; amountRaw?: string; payWith?: "usdc" | "sol" }) =>
  post<Order>("/api/order", o, 30_000);

/** The signed transaction, landed through Jupiter. Anything short of a final answer may still land (see trade.ts). */
export const executeOrder = (requestId: string, signedTransaction: string) =>
  post<Executed>("/api/execute", { requestId, signedTransaction }, 65_000);

/* ---- Jupiter's trigger orders, through Spot (src/app/api/tp): "sell half at 2x" ---- */

/** A wallet's session at Jupiter: the access token lasts minutes, the refresh token renews it. */
export interface JupSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/** An order as Jupiter's history tells it; fields Spot doesn't read are left alone. */
export interface JupOrder {
  id: string;
  orderState: string;
  inputMint?: string;
  initialInputAmount?: string;
  remainingInputAmount?: string;
  inputUsed?: string | null;
  outputAmount?: string | null;
  triggerPriceUsd?: number;
  expiresAt?: number | string;
  updatedAt?: number | string;
}

const tpCall = <T>(op: string, init: { method: "GET" | "POST"; body?: unknown; bearer?: string | null; query?: string }, timeoutMs = 20_000) =>
  call<T>(
    `/api/tp/${op}${init.query ?? ""}`,
    {
      method: init.method,
      headers: { ...(init.body !== undefined ? { "content-type": "application/json" } : {}), ...(init.bearer ? { authorization: `Bearer ${init.bearer}` } : {}) },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    },
    timeoutMs,
  );

export const tp = {
  challenge: (walletPubkey: string) => tpCall<{ challenge: string }>("challenge", { method: "POST", body: { walletPubkey } }),
  verify: (walletPubkey: string, signature: string) => tpCall<JupSession>("verify", { method: "POST", body: { walletPubkey, signature } }),
  refresh: (refreshToken: string) => tpCall<JupSession>("refresh", { method: "POST", body: { refreshToken } }),
  vault: (bearer: string) => tpCall<{ vaultPubkey?: string }>("vault", { method: "POST", body: {}, bearer }),
  deposit: (bearer: string, b: { inputMint: string; userAddress: string; amount: string }) =>
    tpCall<{ transaction: string; requestId: string }>("deposit", { method: "POST", body: b, bearer }),
  order: (
    bearer: string,
    b: { depositRequestId: string; depositSignedTx: string; userPubkey: string; inputMint: string; inputAmount: string; triggerPriceUsd: number; expiresAt: number },
  ) => tpCall<{ id: string; txSignature: string; depositConfirmed: boolean }>("order", { method: "POST", body: b, bearer }, 45_000),
  orders: (bearer: string, state: "active" | "past") => tpCall<{ orders: JupOrder[] }>("orders", { method: "GET", bearer, query: `?state=${state}` }),
  cancel: (bearer: string, orderId: string) => tpCall<{ transaction: string; requestId: string }>("cancel", { method: "POST", body: { orderId }, bearer }),
  confirmCancel: (bearer: string, b: { orderId: string; signedTransaction: string; cancelRequestId: string }) =>
    tpCall<{ txSignature: string }>("confirm-cancel", { method: "POST", body: b, bearer }, 45_000),
};

export function errorLine(e: ApiError): string {
  switch (e) {
    case "offline":
      return "No internet. Check your connection and try again.";
    case "timeout":
      return "That took too long. Try again.";
    case "busy":
      return "Too many sniffs at once. Wait a few seconds.";
    case "lookup_failed":
      return "Couldn't load this coin. Try again in a moment.";
    case "not_found":
      return "Spot can't find this coin yet. Brand new? Try again in a minute.";
    case "not_a_mint":
      return "That address isn't a coin.";
    case "trading_closed":
      return "Buying opens soon. Sniffing is free until then.";
    case "blocked":
      return "Spot won't buy this one.";
    case "unsniffed":
      return "Sniff it first, then ape.";
    case "over_cap":
      return "Too much for this coin. Pick a smaller amount.";
    case "no_route":
      return "Can't trade this coin right now.";
    case "refused":
      return "Couldn't set up that trade. Try again.";
    case "needs_key":
      return "Trading isn't switched on yet.";
    case "pending":
      return "Still landing. Check your bag in a minute.";
    case "signed_out":
      return "Jupiter signed you out. Try again to sign in.";
    default:
      return "Something went wrong. Try again.";
  }
}
