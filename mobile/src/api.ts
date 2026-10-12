import type { Executed, Holdings, Order, ResolveResult, Share, Sniff } from "./types";

/* The site's API (src/engine in the repo root). EXPO_PUBLIC_SPOT_API points
   a build elsewhere, a preview deployment for instance. The www host on
   purpose: the bare domain redirects, and a redirected POST arrives as a GET. */
export const API_BASE = (process.env.EXPO_PUBLIC_SPOT_API ?? "https://www.usespot.fun").replace(/\/+$/, "");

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
]);

/** A failed answer keeps whatever the API said with it: a headline, a cap, Jupiter's words. */
export type Answer<T> = { ok: true; value: T } | { ok: false; error: ApiError; detail?: Record<string, unknown> };

async function call<T>(path: string, init: RequestInit, timeoutMs: number): Promise<Answer<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal });
    const body = (await res.json().catch(() => null)) as ({ ok?: boolean; error?: string } & Record<string, unknown>) | null;
    if (res.ok && body?.ok) return { ok: true, value: body as T };
    if (res.status === 429) return { ok: false, error: "busy" };
    const error = body?.error as ApiError | undefined;
    return { ok: false, error: error && KNOWN.has(error) ? error : "bad", ...(body ? { detail: body } : {}) };
  } catch (e) {
    return { ok: false, error: (e as Error)?.name === "AbortError" ? "timeout" : "offline" };
  } finally {
    clearTimeout(timer);
  }
}

/** What did they share? → one coin, "which one?", or none. */
export const resolveShare = (share: Share) =>
  call<ResolveResult>(
    "/api/resolve",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: share.url, text: share.text }),
    },
    15_000,
  );

/** The sniff, sized to the amount. A few seconds on Jupiter's free plan. */
export const sniffCoin = (mint: string, amount: number) =>
  call<Sniff>(`/api/sniff?mint=${encodeURIComponent(mint)}&amount=${amount}`, { method: "GET" }, 20_000);

/** A wallet's bag, priced. */
export const fetchHoldings = (owner: string) =>
  call<Holdings>(`/api/holdings?owner=${encodeURIComponent(owner)}`, { method: "GET" }, 15_000);

const post = <T>(path: string, body: unknown, timeoutMs: number) =>
  call<T>(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, timeoutMs);

/** A transaction for the wallet to sign. The server sniffs a buy again before it builds one. */
export const placeOrder = (o: { mint: string; side: "buy" | "sell"; taker: string; amountUsdc?: number; amountRaw?: string }) =>
  post<Order>("/api/order", o, 30_000);

/** The signed transaction, landed through Jupiter. */
export const executeOrder = (requestId: string, signedTransaction: string) =>
  post<Executed>("/api/execute", { requestId, signedTransaction }, 45_000);

export function errorLine(e: ApiError): string {
  switch (e) {
    case "offline":
      return "No connection. Check your internet and try again.";
    case "timeout":
      return "That took too long. Try again.";
    case "busy":
      return "Too many sniffs at once. Give it a few seconds.";
    case "lookup_failed":
      return "Jupiter didn't answer. Try again in a moment.";
    case "not_found":
      return "Jupiter doesn't know this coin yet. Too fresh? Try again in a minute.";
    case "not_a_mint":
      return "That address isn't a coin.";
    case "trading_closed":
      return "Buying opens soon. Sniffing is free until then.";
    case "blocked":
      return "Spot won't buy this one.";
    case "unsniffed":
      return "The sniff didn't finish. Sniff again first.";
    case "over_cap":
      return "That's over this coin's cap.";
    case "no_route":
      return "No route for this trade right now.";
    case "refused":
      return "Jupiter wouldn't build that trade.";
    case "needs_key":
      return "Trading isn't set up on the server yet.";
    default:
      return "Something went wrong. Try again.";
  }
}
