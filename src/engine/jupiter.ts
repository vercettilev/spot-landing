import { HttpUltraSearchClient, type JupiterUltraTokenInfo, type UltraSearchClient } from "@/core/resolve/ultra";
import { JUP_KEYED_BASE, JUP_LITE_BASE } from "@/core/route/jupiter";
import { bindFetch, fetchText, isRecord, parseJson, str, type Fetch, type Outcome } from "./http";

/**
 * Jupiter, for two questions: "which token is this?" (Ultra search, the
 * client spot-core already measured) and "is there a way in and a way out,
 * and at what price?" (a quote each way, which is the honeypot probe).
 */

/**
 * Ultra's token record, plus the audit flags Jupiter documents for Tokens
 * V2 search and spot-core's type does not name yet.
 */
export type TokenInfo = JupiterUltraTokenInfo & {
  audit?: { mintAuthorityDisabled?: boolean; freezeAuthorityDisabled?: boolean; isSus?: boolean };
};

export type Authority = "revoked" | "retained";

/**
 * What Ultra says about an authority. spot-core's reading, measured live:
 * a non-null string is retained, null or absent is revoked. The audit flag
 * is the documented form of the same fact and wins when it says retained.
 * The chain is asked first anyway (see chain.ts); this is the fallback.
 */
export function ultraAuthority(t: TokenInfo, which: "mint" | "freeze"): Authority {
  const field = which === "mint" ? t.mintAuthority : t.freezeAuthority;
  const disabled = which === "mint" ? t.audit?.mintAuthorityDisabled : t.audit?.freezeAuthorityDisabled;
  if (typeof field === "string" && field !== "") return "retained";
  if (disabled === false) return "retained";
  return "revoked";
}

export interface JupiterConfig {
  base: string;
  quotePath: string;
  apiKey: string | undefined;
}

/**
 * WHICH HOST AND WHICH QUOTE. With a key: api.jup.ag and Swap V2's /order,
 * which quotes when no taker is named (Jupiter's own migration guide calls
 * /swap/v1/quote deprecated). Without one: lite-api.jup.ag and v1, the pair
 * spot-core measured keyless through September 2026; Jupiter has said
 * lite-api goes away, so real traffic needs the key.
 */
export function jupiterConfig(env: Record<string, string | undefined>): JupiterConfig {
  const apiKey = env.JUPITER_API_KEY?.trim() || undefined;
  const base = (env.JUPITER_BASE_URL?.trim() || (apiKey ? JUP_KEYED_BASE : JUP_LITE_BASE)).replace(/\/+$/, "");
  const quotePath = env.JUPITER_QUOTE_PATH?.trim() || (apiKey ? "/swap/v2/order" : "/swap/v1/quote");
  return { base, quotePath, apiKey };
}

export function makeSearch(cfg: JupiterConfig, fetchFn?: Fetch): UltraSearchClient {
  return new HttpUltraSearchClient({
    base: cfg.base,
    apiKey: cfg.apiKey,
    ...(fetchFn ? { fetchFn } : {}),
  });
}

export interface QuoteRequest {
  inputMint: string;
  outputMint: string;
  /** Raw base units of the input mint. */
  amount: string;
}

export interface Quote {
  inAmount: string;
  outAmount: string;
  /** The venues the route passes through, for logs and for the curious. */
  venues: string[];
}

export type QuoteFailure = "no_route" | "timeout" | "network_error" | "http_error" | "rate_limited" | "bad_shape";

export type Quoter = (q: QuoteRequest) => Promise<Outcome<Quote, QuoteFailure>>;

/**
 * "NO ROUTE" IS AN ANSWER; EVERYTHING ELSE IS NOT KNOWING. The probe turns
 * the first into a honeypot verdict and the rest into "try again", so the
 * line between them is drawn on what Jupiter says, codes first (the ones its
 * docs list for routing), wording as the fallback.
 */
const NO_ROUTE =
  /COULD_NOT_FIND_ANY_ROUTE|NO_ROUTES_FOUND|TOKEN_NOT_TRADABLE|ROUTE_PLAN_DOES_NOT_CONSUME_ALL_THE_AMOUNT|no routes? found|could not find any route|not tradable/i;

export function makeQuoter(cfg: JupiterConfig, opts: { fetchFn?: Fetch; timeoutMs?: number } = {}): Quoter {
  const fetchFn = bindFetch(opts.fetchFn ?? fetch);
  const timeoutMs = opts.timeoutMs ?? 2_500;
  const v1 = cfg.quotePath.includes("/quote");

  return async ({ inputMint, outputMint, amount }) => {
    const qs = new URLSearchParams({ inputMint, outputMint, amount });
    if (v1) qs.set("slippageBps", "300");
    const res = await fetchText(fetchFn, `${cfg.base}${cfg.quotePath}?${qs}`, {
      timeoutMs,
      headers: { accept: "application/json", ...(cfg.apiKey ? { "x-api-key": cfg.apiKey } : {}) },
    });
    if (!res.ok) return res;
    const { status, text } = res.value;
    if (status === 429) return { ok: false, reason: "rate_limited" };
    if (status >= 500) return { ok: false, reason: "http_error" };

    const body = parseJson(text);
    const out = isRecord(body) ? str(body.outAmount) : undefined;
    if (status < 300 && out && /^\d+$/.test(out) && !/^0+$/.test(out)) {
      const plan = isRecord(body) && Array.isArray(body.routePlan) ? body.routePlan : [];
      const venues = plan
        .map((step) => (isRecord(step) && isRecord(step.swapInfo) ? str(step.swapInfo.label) : undefined))
        .filter((v): v is string => Boolean(v));
      return { ok: true, value: { inAmount: (isRecord(body) && str(body.inAmount)) || amount, outAmount: out, venues } };
    }

    const said = isRecord(body)
      ? [body.error, body.errorCode, body.errorMessage, body.message].filter((v) => v !== undefined).join(" ")
      : text.slice(0, 500);
    if (NO_ROUTE.test(said) || (status < 300 && out === "0")) return { ok: false, reason: "no_route" };
    return { ok: false, reason: status >= 400 ? "http_error" : "bad_shape" };
  };
}
