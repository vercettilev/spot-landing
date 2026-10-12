import type { UltraOutcome, UltraSearchClient } from "@/core/resolve/ultra";
import type { AccountsReader, ImageReader, MintFacts, MintReader, SignatureReader, WalletAccounts } from "@/engine/chain";
import type { Deps } from "@/engine/deps";
import type { PairLookup } from "@/engine/dexscreener";
import type { Outcome } from "@/engine/http";
import type { Quote, QuoteFailure, Quoter, QuoteRequest, TokenInfo } from "@/engine/jupiter";
import type { PostRef } from "@/engine/links";
import type { Post, PostFailure } from "@/engine/posts";
import { DEFAULT_POLICY } from "@/engine/sniff";
import type { Executor, Order, OrderRequest, Orderer } from "@/engine/trade";

/* Valid 32-byte addresses that are nobody's coin (sha256 of a label). */
export const COIN_A = "GAKDkX3myHqofbqHQ4wV7HkzwLgAv8quFHpAPvGeunNG";
export const COIN_B = "GSBz2NUew8BoBXYTMWyuJ9Je2z1MyajrTrRZwd3HmVz2";
export const COIN_C = "2g7qfRJ9Y1Re5fAjZ6Uv5LJLZSfBbSeUeFF25R8RHKLF";
export const PAIR_A = "Do2S4Bu8VVMcFsuTGbcomr8Gt18vP99oC8QvNSzzv2aY";
export const WALLET = "GfsJWjmGXMfct8JMR9Lm9ySUnniZbnGUTQDbT8ipWf9U";
export const COPY_1 = "2TV64jm1gHfjfMrvDWwoEFKy3mbqpoXN8ogHLGPbvr9o";
export const COPY_2 = "22j4EfQUs4dLvawjPHkNhdEPmGpuNV3oMm3hK7o9XH37";

/* Real ones, from spot-core's catalog. */
export const WIF = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm";
export const NVDAX = "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh";
export const WBTC = "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh";

export const NOW = Date.parse("2026-10-12T12:00:00Z");
export const HOUR = 60 * 60 * 1000;

/** A token as Ultra describes it: by default a healthy, established coin. */
export function token(id: string, over: Partial<TokenInfo> = {}): TokenInfo {
  return {
    id,
    name: `Coin ${id.slice(0, 4)}`,
    symbol: `C${id.slice(0, 3).toUpperCase()}`,
    icon: `https://example.test/${id}.png`,
    decimals: 6,
    tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    mintAuthority: null,
    freezeAuthority: null,
    firstPool: { id: PAIR_A, createdAt: new Date(NOW - 30 * 24 * HOUR).toISOString() },
    holderCount: 12_000,
    organicScoreLabel: "medium",
    isVerified: false,
    liquidity: 250_000,
    mcap: 4_000_000,
    usdPrice: 0.004,
    stats24h: { priceChange: 12.5 },
    ...over,
  };
}

/** A pump.fun coin an hour old: everything small, nothing stolen. */
export const fresh = (id: string, over: Partial<TokenInfo> = {}) =>
  token(id, {
    firstPool: { id: PAIR_A, createdAt: new Date(NOW - 0.2 * HOUR).toISOString() },
    holderCount: 38,
    liquidity: 4_200,
    mcap: 9_000,
    organicScoreLabel: "low",
    ...over,
  });

/** Ultra search over a fixed list: by mint (comma-joined) or by symbol. */
type SearchFailure = Extract<UltraOutcome<unknown>, { ok: false }>["reason"];

export function fakeSearch(tokens: TokenInfo[], fail?: SearchFailure): UltraSearchClient & { queries: string[] } {
  const queries: string[] = [];
  return {
    queries,
    async search(query) {
      queries.push(query);
      if (fail) return { ok: false, reason: fail };
      const asked = query.split(",").map((q) => q.trim().toLowerCase());
      return {
        ok: true,
        value: tokens.filter(
          (t) => asked.includes(t.id.toLowerCase()) || asked.includes((t.symbol ?? "").replace(/^\$/, "").toLowerCase()),
        ),
      };
    },
  };
}

export function classicMint(over: Partial<MintFacts> = {}): MintFacts {
  return {
    program: "classic",
    decimals: 6,
    mintAuthority: null,
    freezeAuthority: null,
    permanentDelegate: null,
    transferFeeBps: null,
    transferHook: null,
    nonTransferable: false,
    startsFrozen: false,
    pause: null,
    ...over,
  };
}

export const fakeMintReader =
  (answer: Awaited<ReturnType<MintReader>> = { ok: true, value: classicMint() }): MintReader =>
  async () =>
    answer;

/**
 * Quotes priced off a fixed rate: `tokensPerUsdc` on the way in, and
 * `exitShare` of the value back on the way out. Either leg can be told to
 * fail instead.
 */
export function fakeQuoter(opts: {
  tokensPerUsdc?: number;
  exitShare?: number;
  buy?: QuoteFailure;
  sell?: QuoteFailure;
} = {}): Quoter & { calls: QuoteRequest[] } {
  const rate = opts.tokensPerUsdc ?? 250;
  const exit = opts.exitShare ?? 0.98;
  const calls: QuoteRequest[] = [];
  const quote = async (q: QuoteRequest): Promise<Outcome<Quote, QuoteFailure>> => {
    calls.push(q);
    const buying = q.inputMint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const failure = buying ? opts.buy : opts.sell;
    if (failure) return { ok: false, reason: failure };
    const out = buying ? BigInt(q.amount) * BigInt(rate) : BigInt(Math.floor((Number(q.amount) / rate) * exit));
    return { ok: true, value: { inAmount: q.amount, outAmount: String(out), venues: ["Pump.fun Amm"] } };
  };
  return Object.assign(quote, { calls });
}

export const noPairs: PairLookup = async () => ({ ok: true, value: new Map() });

export function fakePairs(map: Record<string, string>): PairLookup & { asked: string[][] } {
  const asked: string[][] = [];
  const lookup: PairLookup = async (addresses, loose) => {
    asked.push([...addresses, ...loose]);
    return { ok: true, value: new Map(Object.entries(map).filter(([k]) => addresses.includes(k) || loose.includes(k))) };
  };
  return Object.assign(lookup, { asked });
}

export function fakePosts(posts: Record<string, Post | PostFailure>) {
  const read: string[] = [];
  const reader = async (ref: PostRef): Promise<Outcome<Post, PostFailure>> => {
    read.push(ref.canonical);
    const p = posts[ref.canonical];
    if (p === undefined) return { ok: false, reason: "unavailable" };
    return typeof p === "string" ? { ok: false, reason: p } : { ok: true, value: p };
  };
  return Object.assign(reader, { read });
}

export const fakeExpand = (map: Record<string, string>) => async (url: string) => map[url] ?? null;

/** A wallet's accounts as the chain would hand them over. */
export const fakeAccounts =
  (answer: Awaited<ReturnType<AccountsReader>> = { ok: true, value: { sol: 0, tokens: [] } satisfies WalletAccounts }): AccountsReader =>
  async () =>
    answer;

/** Jupiter's /order: a transaction for whoever asks, unless told to refuse. */
export function fakeOrderer(answer?: Awaited<ReturnType<Orderer>>): Orderer & { asked: OrderRequest[] } {
  const asked: OrderRequest[] = [];
  const order: Orderer = async (r) => {
    asked.push(r);
    if (answer) return answer;
    const value: Order = { requestId: "req-1", transaction: "AQID", inAmount: r.amount, outAmount: "6250000000", priceImpactPct: 0.4, gasless: false };
    return { ok: true, value };
  };
  return Object.assign(order, { asked });
}

export const fakeExecutor =
  (answer: Awaited<ReturnType<Executor>> = { ok: true, value: { status: "Success", signature: "5ig", error: null } }): Executor =>
  async () =>
    answer;

/** The chain's word on a signature: nowhere, unless told otherwise. */
export const fakeSignatures =
  (answer: Awaited<ReturnType<SignatureReader>> = { ok: true, value: "unknown" }): SignatureReader & { asked: string[] } => {
    const asked: string[] = [];
    return Object.assign(async (signature: string) => (asked.push(signature), answer), { asked });
  };

/** The chain's images, by mint. */
export const fakeImages = (images: Record<string, string> = {}): ImageReader => async (mint) => images[mint] ?? null;

export function fakeDeps(over: Partial<Deps> = {}): Deps {
  return {
    search: fakeSearch([]),
    quote: fakeQuoter(),
    readMint: fakeMintReader(),
    readAccounts: fakeAccounts(),
    order: fakeOrderer(),
    execute: fakeExecutor(),
    readSignature: fakeSignatures(),
    readImage: fakeImages(),
    readPost: fakePosts({}),
    expand: fakeExpand({}),
    pairs: noPairs,
    policy: DEFAULT_POLICY,
    now: () => NOW,
    ...over,
  };
}

/** A fetch that answers from a table of URL prefixes, and records what was asked. */
export function fakeFetch(routes: Array<[match: string | RegExp, respond: (url: string, init?: RequestInit) => Response | Promise<Response>]>) {
  const seen: { url: string; init?: RequestInit | undefined }[] = [];
  const f = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    seen.push({ url, init });
    for (const [match, respond] of routes) {
      if (typeof match === "string" ? url.startsWith(match) : match.test(url)) return respond(url, init);
    }
    throw new TypeError(`fetch failed: no fake for ${url}`);
  };
  return Object.assign(f as typeof fetch, { seen });
}

export const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
