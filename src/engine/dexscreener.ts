import { QUOTE_MINTS } from "./address";
import { bindFetch, fetchText, isRecord, parseJson, str, type Fetch, type Outcome } from "./http";

/**
 * PAIRS TO COINS. Terminals link to the pool, not the coin (Photon's /lp/,
 * Axiom's /meme/, Dexscreener, GeckoTerminal), and an address that Jupiter
 * does not know as a token is usually one of those. Dexscreener knows which
 * coin a pool trades, and its public API needs no key.
 */

const BASE = "https://api.dexscreener.com";
const TIMEOUT_MS = 2_000;

/** Given address (or lowercased one) → the coin it is a pool of. */
export type PairLookup = (addresses: string[], loose: string[]) => Promise<Outcome<Map<string, string>>>;

interface Pair {
  chainId?: string;
  pairAddress?: string;
  baseToken?: { address?: string };
  quoteToken?: { address?: string };
}

/** The side that is not SOL or a dollar; the base when both are. */
export function coinOf(pair: Pair): string | undefined {
  const base = str(pair.baseToken?.address);
  const quote = str(pair.quoteToken?.address);
  if (base && !QUOTE_MINTS.has(base)) return base;
  if (quote && !QUOTE_MINTS.has(quote)) return quote;
  return base;
}

function pairsIn(body: unknown): Pair[] {
  if (!isRecord(body)) return [];
  const list = Array.isArray(body.pairs) ? body.pairs : isRecord(body.pair) ? [body.pair] : [];
  return list.filter((p): p is Pair => isRecord(p) && (p as Pair).chainId === "solana");
}

export function makePairLookup(opts: { fetchFn?: Fetch } = {}): PairLookup {
  const fetchFn = bindFetch(opts.fetchFn ?? fetch);

  async function get(path: string): Promise<Outcome<Pair[]>> {
    const res = await fetchText(fetchFn, `${BASE}${path}`, {
      timeoutMs: TIMEOUT_MS,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return res;
    if (res.value.status === 429) return { ok: false, reason: "rate_limited" };
    if (res.value.status !== 200) return { ok: false, reason: "http_error" };
    return { ok: true, value: pairsIn(parseJson(res.value.text)) };
  }

  return async (addresses, loose) => {
    const found = new Map<string, string>();
    const asked = [...new Set([...addresses, ...loose])].slice(0, 10);
    if (!asked.length) return { ok: true, value: found };

    const direct = await get(`/latest/dex/pairs/solana/${asked.join(",")}`);
    if (!direct.ok) return direct;
    for (const pair of direct.value) {
      const at = pair.pairAddress;
      const coin = coinOf(pair);
      const key = at && asked.find((a) => a === at || a === at.toLowerCase());
      if (key && coin) found.set(key, coin);
    }

    /* A lowercased address the pairs endpoint did not take: search, and
       accept only an exact match, as the pool or as either of its coins. */
    for (const l of loose.filter((x) => !found.has(x)).slice(0, 2)) {
      const res = await get(`/latest/dex/search?q=${encodeURIComponent(l)}`);
      if (!res.ok) continue;
      for (const pair of res.value) {
        const base = str(pair.baseToken?.address);
        const quote = str(pair.quoteToken?.address);
        const coin =
          pair.pairAddress?.toLowerCase() === l
            ? coinOf(pair)
            : base?.toLowerCase() === l
              ? base
              : quote?.toLowerCase() === l
                ? quote
                : undefined;
        if (coin) {
          found.set(l, coin);
          break;
        }
      }
    }
    return { ok: true, value: found };
  };
}
