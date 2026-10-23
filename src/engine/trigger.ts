import { bindFetch, fetchText, parseJson, type Failure, type Fetch, type Outcome } from "./http";
import type { JupiterConfig } from "./jupiter";

/**
 * JUPITER'S TRIGGER ORDERS (V2), for "sell half at 2x". The wallet signs in
 * to Jupiter once (a message; a refresh token keeps the session after), the
 * coins to sell go into the wallet's vault at Jupiter, which Jupiter calls
 * a "Privy-managed custodial account", with a deposit the wallet signs, and
 * Jupiter's keeper sells them when the price is reached. Spot holds no key
 * and no coin: these calls only pass through with Spot's API key, which the
 * app must not carry, and the routes (src/app/api/tp) decide which calls
 * pass and with what.
 */

export interface TriggerCall {
  method: "GET" | "POST";
  /** Under /trigger/v2. */
  path: string;
  /** The wallet's Jupiter session, passed through as it came. */
  bearer?: string | null;
  body?: unknown;
  query?: Record<string, string>;
}

/** Jupiter's own answer, status and body, for the route to pass on. */
export interface TriggerAnswer {
  status: number;
  body: unknown;
}

export type Trigger = (call: TriggerCall) => Promise<Outcome<TriggerAnswer, Failure | "needs_key">>;

export function makeTrigger(cfg: JupiterConfig, opts: { fetchFn?: Fetch; pace?: () => Promise<void>; timeoutMs?: number } = {}): Trigger {
  const fetchFn = bindFetch(opts.fetchFn ?? fetch);
  const pace = opts.pace ?? (async () => {});
  return async ({ method, path, bearer, body, query }) => {
    /* The trigger API serves keyed callers only. */
    if (!cfg.apiKey) return { ok: false, reason: "needs_key" };
    await pace();
    const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query)}` : "";
    const res = await fetchText(fetchFn, `${cfg.base}/trigger/v2${path}${qs}`, {
      timeoutMs: opts.timeoutMs ?? 15_000,
      method,
      headers: {
        accept: "application/json",
        "x-api-key": cfg.apiKey,
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) return res;
    if (res.value.status === 429) return { ok: false, reason: "rate_limited" };
    return { ok: true, value: { status: res.value.status, body: parseJson(res.value.text) ?? null } };
  };
}
