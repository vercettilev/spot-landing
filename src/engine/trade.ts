import { bindFetch, fetchText, isRecord, num, parseJson, str, type Failure, type Fetch, type Outcome } from "./http";
import type { JupiterConfig } from "./jupiter";

/**
 * THE MONEY PATH, through Jupiter's Swap V2: /order builds a transaction for
 * the taker's wallet to sign, /execute lands the signed one. Spot never holds
 * a key and never broadcasts on its own; the wallet signs, Jupiter sends.
 *
 * Closed unless SPOT_TRADING=1 (see the routes): built and tested ahead of
 * the decisions it waits on (the fee, the wallet, the legal read).
 */

export type TradingMode = "closed" | "testing" | "open";

/**
 * WHO MAY TRADE. Closed unless SPOT_TRADING=1. With SPOT_TRADING_WALLETS
 * set too (addresses, split by commas or spaces), only those wallets get an
 * order: real money through the real deployment, on the team's own wallets,
 * before anyone else's.
 */
export function tradingMode(env: Record<string, string | undefined>): { mode: TradingMode; wallets: ReadonlySet<string> } {
  if (env.SPOT_TRADING?.trim() !== "1") return { mode: "closed", wallets: new Set() };
  const wallets = new Set((env.SPOT_TRADING_WALLETS ?? "").split(/[\s,]+/).filter(Boolean));
  return { mode: wallets.size > 0 ? "testing" : "open", wallets };
}

export function mayTrade(env: Record<string, string | undefined>, taker: string): boolean {
  const { mode, wallets } = tradingMode(env);
  return mode === "open" || (mode === "testing" && wallets.has(taker));
}

export interface OrderRequest {
  inputMint: string;
  outputMint: string;
  /** Raw base units of the input mint. */
  amount: string;
  /** The wallet that signs and pays. */
  taker: string;
}

export interface Order {
  requestId: string;
  /** Base64, unsigned: the taker's wallet signs it. */
  transaction: string;
  inAmount: string;
  outAmount: string;
  /** Percent, as Jupiter reports it, when it does. */
  priceImpactPct: number | null;
  /** True when Jupiter covers the network fee for this one. */
  gasless: boolean;
}

export type OrderFailure = Failure | "no_route" | "needs_key" | "refused";

export type Orderer = (r: OrderRequest) => Promise<Outcome<Order, OrderFailure> & { message?: string }>;

export interface Executed {
  status: "Success" | "Failed";
  signature: string | null;
  error: string | null;
}

export type Executor = (signedTransaction: string, requestId: string) => Promise<Outcome<Executed, Failure | "needs_key">>;

export interface TradeConfig extends JupiterConfig {
  orderPath: string;
  executePath: string;
}

export function tradeConfig(jup: JupiterConfig, env: Record<string, string | undefined>): TradeConfig {
  return {
    ...jup,
    orderPath: env.JUPITER_ORDER_PATH?.trim() || "/swap/v2/order",
    executePath: env.JUPITER_EXECUTE_PATH?.trim() || "/swap/v2/execute",
  };
}

const NO_ROUTE = /COULD_NOT_FIND_ANY_ROUTE|NO_ROUTES_FOUND|TOKEN_NOT_TRADABLE|no routes? found|could not find any route|not tradable/i;

export function makeOrderer(cfg: TradeConfig, opts: { fetchFn?: Fetch; pace?: () => Promise<void>; timeoutMs?: number } = {}): Orderer {
  const fetchFn = bindFetch(opts.fetchFn ?? fetch);
  const pace = opts.pace ?? (async () => {});
  return async ({ inputMint, outputMint, amount, taker }) => {
    /* An order names a taker, which only the keyed API serves. */
    if (!cfg.apiKey) return { ok: false, reason: "needs_key" };
    await pace();
    const qs = new URLSearchParams({ inputMint, outputMint, amount, taker });
    const res = await fetchText(fetchFn, `${cfg.base}${cfg.orderPath}?${qs}`, {
      timeoutMs: opts.timeoutMs ?? 6_000,
      headers: { accept: "application/json", "x-api-key": cfg.apiKey },
    });
    if (!res.ok) return res;
    const { status, text } = res.value;
    if (status === 429) return { ok: false, reason: "rate_limited" };
    if (status >= 500) return { ok: false, reason: "http_error" };
    const body = parseJson(text);
    if (!isRecord(body)) return { ok: false, reason: "bad_shape" };

    const transaction = str(body.transaction);
    const requestId = str(body.requestId);
    const said = [body.error, body.errorCode, body.errorMessage].filter((v) => v !== undefined && v !== null).join(" ");
    if (status < 300 && transaction && requestId) {
      return {
        ok: true,
        value: {
          requestId,
          transaction,
          inAmount: str(body.inAmount) ?? amount,
          outAmount: str(body.outAmount) ?? "0",
          priceImpactPct: num(body.priceImpactPct) ?? num(body.priceImpact) ?? null,
          gasless: body.gasless === true,
        },
      };
    }
    if (NO_ROUTE.test(said)) return { ok: false, reason: "no_route" };
    /* A quote without a transaction is Jupiter declining this wallet
       (no funds, no SOL for fees): its own words go back to the app. */
    return { ok: false, reason: status >= 400 && !said ? "http_error" : "refused", ...(said ? { message: said.slice(0, 200) } : {}) };
  };
}

export function makeExecutor(cfg: TradeConfig, opts: { fetchFn?: Fetch; pace?: () => Promise<void>; timeoutMs?: number } = {}): Executor {
  const fetchFn = bindFetch(opts.fetchFn ?? fetch);
  const pace = opts.pace ?? (async () => {});
  return async (signedTransaction, requestId) => {
    if (!cfg.apiKey) return { ok: false, reason: "needs_key" };
    await pace();
    /* Jupiter answers once the transaction lands or cannot any more; a
       slow answer is not a failed trade (see the route). */
    const res = await fetchText(fetchFn, `${cfg.base}${cfg.executePath}`, {
      timeoutMs: opts.timeoutMs ?? 40_000,
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", "x-api-key": cfg.apiKey },
      body: JSON.stringify({ signedTransaction, requestId }),
    });
    if (!res.ok) return res;
    if (res.value.status === 429) return { ok: false, reason: "rate_limited" };
    const body = parseJson(res.value.text);
    if (!isRecord(body)) return { ok: false, reason: res.value.status >= 400 ? "http_error" : "bad_shape" };
    const status = body.status === "Success" ? "Success" : "Failed";
    return {
      ok: true,
      value: {
        status,
        signature: str(body.signature) ?? null,
        error: status === "Failed" ? (str(body.error) ?? str(body.errorMessage) ?? `code ${String(body.code ?? "?")}`) : null,
      },
    };
  };
}
