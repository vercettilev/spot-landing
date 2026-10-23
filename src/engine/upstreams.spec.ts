import { describe, expect, it } from "vitest";
import { COIN_A, COIN_B, PAIR_A, fakeFetch, jsonResponse, token } from "@/engine/fakes";
import { TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "./address";
import { makeMintReader, mintFactsOf } from "./chain";
import { coinOf, makePairLookup } from "./dexscreener";
import { jupiterConfig, makePacer, makeQuoter, makeSearch, remembering, ultraAuthority, waitAfter429 } from "./jupiter";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL = "So11111111111111111111111111111111111111112";
const ON_BASE = "0x4200000000000000000000000000000000000006";

describe("which Jupiter", () => {
  it("is api.jup.ag and Swap V2 with a key, lite-api and v1 without", () => {
    expect(jupiterConfig({ JUPITER_API_KEY: " k " })).toEqual({ base: "https://api.jup.ag", quotePath: "/swap/v2/order", apiKey: "k", rps: 1 });
    expect(jupiterConfig({})).toEqual({ base: "https://lite-api.jup.ag", quotePath: "/swap/v1/quote", apiKey: undefined, rps: 0 });
    expect(jupiterConfig({ JUPITER_BASE_URL: "https://jup.example/", JUPITER_QUOTE_PATH: "/q" })).toMatchObject({
      base: "https://jup.example",
      quotePath: "/q",
    });
  });
});

describe("the pace", () => {
  it("is the free plan's one a second with a key, unless the plan says more", () => {
    expect(jupiterConfig({ JUPITER_API_KEY: "k", JUPITER_RPS: "10" }).rps).toBe(10);
    expect(jupiterConfig({ JUPITER_API_KEY: "k", JUPITER_RPS: "lots" }).rps).toBe(1);
    expect(jupiterConfig({ JUPITER_RPS: " " }).rps).toBe(0);
  });

  it("starts each call a gap after the one before it", async () => {
    const pace = makePacer(20);
    const t0 = Date.now();
    const starts = await Promise.all([0, 1, 2].map(async () => (await pace(), Date.now() - t0)));
    expect(starts[0]).toBeLessThan(25);
    expect(starts[1]).toBeGreaterThanOrEqual(45);
    expect(starts[2]).toBeGreaterThanOrEqual(95);
  });

  it("does not wait at all when there is no plan rate", async () => {
    const pace = makePacer(0);
    const t0 = Date.now();
    await Promise.all([pace(), pace(), pace()]);
    expect(Date.now() - t0).toBeLessThan(25);
  });

  it("reads how long a 429 asks to wait", () => {
    const h = (o: Record<string, string>) => new Headers(o);
    expect(waitAfter429(h({ "retry-after": "1" }))).toBe(1000);
    expect(waitAfter429(h({ "x-ratelimit-reset": "1700000001" }), 1700000000500)).toBe(500);
    expect(waitAfter429(h({ "x-ratelimit-reset": "9" }))).toBe(1500);
    expect(waitAfter429(h({}))).toBe(1000);
  });
});

describe("a quote", () => {
  const v2 = jupiterConfig({ JUPITER_API_KEY: "key" });
  const v1 = jupiterConfig({});
  const ask = { inputMint: USDC, outputMint: COIN_A, amount: "25000000" };

  it("comes back with what it pays and where it routes", async () => {
    const fetchFn = fakeFetch([
      ["https://api.jup.ag/swap/v2/order", () =>
        jsonResponse({ inAmount: "25000000", outAmount: "6250000000", routePlan: [{ swapInfo: { label: "Pump.fun Amm" } }], transaction: null })],
    ]);
    expect(await makeQuoter(v2, { fetchFn })(ask)).toEqual({
      ok: true,
      value: { inAmount: "25000000", outAmount: "6250000000", venues: ["Pump.fun Amm"] },
    });
    const sent = fetchFn.seen[0]!;
    expect(sent.url).toBe(`https://api.jup.ag/swap/v2/order?inputMint=${USDC}&outputMint=${COIN_A}&amount=25000000`);
    expect((sent.init?.headers as Record<string, string>)["x-api-key"]).toBe("key");
  });

  it("asks v1 with a slippage and no key", async () => {
    const fetchFn = fakeFetch([["https://lite-api.jup.ag/swap/v1/quote", () => jsonResponse({ outAmount: "1" })]]);
    await makeQuoter(v1, { fetchFn })(ask);
    expect(fetchFn.seen[0]!.url).toContain("slippageBps=300");
    expect((fetchFn.seen[0]!.init?.headers as Record<string, string>)["x-api-key"]).toBeUndefined();
  });

  it("tells no route apart from not knowing", async () => {
    const answer = (body: unknown, status: number) => makeQuoter(v1, { fetchFn: fakeFetch([["https://", () => jsonResponse(body, status)]]) })(ask);
    expect(await answer({ error: "Could not find any route", errorCode: "COULD_NOT_FIND_ANY_ROUTE" }, 400)).toEqual({ ok: false, reason: "no_route" });
    expect(await answer({ error: "The token is not tradable", errorCode: "TOKEN_NOT_TRADABLE" }, 400)).toEqual({ ok: false, reason: "no_route" });
    expect(await answer({ errorMessage: "No routes found" }, 200)).toEqual({ ok: false, reason: "no_route" });
    expect(await answer({ outAmount: "0" }, 200)).toEqual({ ok: false, reason: "no_route" });
    expect(await answer({ error: "Invalid amount" }, 400)).toEqual({ ok: false, reason: "http_error" });
    expect(await answer({}, 429)).toEqual({ ok: false, reason: "rate_limited" });
    expect(await answer({ error: "Could not find any route" }, 503)).toEqual({ ok: false, reason: "http_error" });
    expect(await answer({ surprise: true }, 200)).toEqual({ ok: false, reason: "bad_shape" });
  });

  it("tries once more after a 429, at the time Jupiter names", async () => {
    let calls = 0;
    const fetchFn = fakeFetch([
      ["https://lite-api.jup.ag/", () =>
        ++calls === 1 ? jsonResponse({}, 429, { "retry-after": "0" }) : jsonResponse({ inAmount: "25000000", outAmount: "7" })],
    ]);
    const paced: number[] = [];
    const quoter = makeQuoter(v1, { fetchFn, pace: async () => void paced.push(Date.now()) });
    expect(await quoter(ask)).toMatchObject({ ok: true, value: { outAmount: "7" } });
    expect(calls).toBe(2);
    expect(paced).toHaveLength(2);
  });

  it("stops at the second 429, and when the wait would not fit its clock", async () => {
    const twice = fakeFetch([["https://", () => jsonResponse({}, 429, { "retry-after": "0" })]]);
    expect(await makeQuoter(v1, { fetchFn: twice })(ask)).toEqual({ ok: false, reason: "rate_limited" });
    expect(twice.seen).toHaveLength(2);
    const long = fakeFetch([["https://", () => jsonResponse({}, 429, { "retry-after": "1" })]]);
    expect(await makeQuoter(v1, { fetchFn: long, timeoutMs: 1_200 })(ask)).toEqual({ ok: false, reason: "rate_limited" });
    expect(long.seen).toHaveLength(1);
  });

  it("gives up on its own clock", async () => {
    const hang = (async (_: unknown, init?: RequestInit) =>
      new Promise((_r, reject) => init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))))) as typeof fetch;
    expect(await makeQuoter(v1, { fetchFn: hang, timeoutMs: 20 })(ask)).toEqual({ ok: false, reason: "timeout" });
  });
});

describe("a search", () => {
  it("waits its turn, and tries once more when Jupiter says 429", async () => {
    let calls = 0;
    const fetchFn = fakeFetch([
      ["https://api.jup.ag/ultra/v1/search", () => (++calls <= 2 ? jsonResponse({}, 429) : jsonResponse([{ id: COIN_A, symbol: "EXAMPLE", name: "x", decimals: 6 }]))],
    ]);
    const paced: string[] = [];
    const search = makeSearch(jupiterConfig({ JUPITER_API_KEY: "k" }), { fetchFn, pace: async () => void paced.push("turn"), retryAfterMs: 0 });
    const got = await search.search(COIN_A);
    expect(got.ok && got.value.map((t) => t.id)).toEqual([COIN_A]);
    expect(paced).toEqual(["turn", "turn"]);
    expect((fetchFn.seen[0]!.init?.headers as Record<string, string>)["x-api-key"]).toBe("k");
  });

  it("is not asked again, within one request, for a coin it already turned up", async () => {
    const fetchFn = fakeFetch([
      ["https://api.jup.ag/ultra/v1/search", () => jsonResponse([token(COIN_A, { symbol: "WIF" }), token(COIN_B, { symbol: "WIF" })])],
    ]);
    const search = remembering(makeSearch(jupiterConfig({ JUPITER_API_KEY: "k" }), { fetchFn }));
    await search.search("WIF");
    const again = await search.search(COIN_B);
    expect(again.ok && again.value.map((t) => t.id)).toEqual([COIN_B]);
    expect(fetchFn.seen).toHaveLength(1);
    /* A word is always asked: only a coin's own address is answered from memory. */
    await search.search("WIF");
    expect(fetchFn.seen).toHaveLength(2);
  });
});

describe("Ultra's word on an authority", () => {
  it("is spot-core's reading: a key is retained, null or absent is revoked, the audit flag can say retained", () => {
    expect(ultraAuthority(token(COIN_A, { freezeAuthority: "Dev111" }), "freeze")).toBe("retained");
    expect(ultraAuthority(token(COIN_A, { freezeAuthority: null }), "freeze")).toBe("revoked");
    const absent = token(COIN_A);
    delete absent.mintAuthority;
    expect(ultraAuthority(absent, "mint")).toBe("revoked");
    expect(ultraAuthority(token(COIN_A, { audit: { mintAuthorityDisabled: false } }), "mint")).toBe("retained");
  });
});

describe("the mint account", () => {
  const account = (owner: string, info: Record<string, unknown>, program = owner === TOKEN_PROGRAM ? "spl-token" : "spl-token-2022") => ({
    owner,
    data: { program, parsed: { type: "mint", info: { decimals: 6, supply: "1000", isInitialized: true, ...info } } },
  });

  it("reads a classic mint's keys", () => {
    expect(mintFactsOf(account(TOKEN_PROGRAM, { mintAuthority: null, freezeAuthority: "Dev111" }))).toEqual({
      ok: true,
      value: expect.objectContaining({ program: "classic", decimals: 6, mintAuthority: null, freezeAuthority: "Dev111", permanentDelegate: null }),
    });
  });

  it("reads every Token-2022 setting that can take a bag", () => {
    const got = mintFactsOf(
      account(TOKEN_2022_PROGRAM, {
        mintAuthority: null,
        freezeAuthority: null,
        extensions: [
          { extension: "permanentDelegate", state: { delegate: "Del111" } },
          {
            extension: "transferFeeConfig",
            state: {
              olderTransferFee: { epoch: 1, maximumFee: 10, transferFeeBasisPoints: 100 },
              newerTransferFee: { epoch: 2, maximumFee: 10, transferFeeBasisPoints: 900 },
            },
          },
          { extension: "transferHook", state: { authority: null, programId: "Hook111" } },
          { extension: "nonTransferable" },
          { extension: "defaultAccountState", state: { accountState: "frozen" } },
          { extension: "pausableConfig", state: { authority: "Pause111", paused: false } },
          { extension: "metadataPointer", state: { authority: null, metadataAddress: COIN_A } },
        ],
      }),
    );
    expect(got).toEqual({
      ok: true,
      value: {
        program: "token-2022",
        decimals: 6,
        mintAuthority: null,
        freezeAuthority: null,
        permanentDelegate: "Del111",
        transferFeeBps: 900,
        transferHook: "Hook111",
        nonTransferable: true,
        startsFrozen: true,
        pause: { authority: "Pause111", paused: false },
      },
    });
  });

  it("is not a mint when it is a wallet or a token account, and is missing when the chain has nothing", () => {
    expect(mintFactsOf({ owner: "11111111111111111111111111111111", data: ["", "base64"] })).toEqual({ ok: false, reason: "not_a_mint" });
    expect(mintFactsOf({ owner: TOKEN_PROGRAM, data: { program: "spl-token", parsed: { type: "account", info: {} } } })).toEqual({
      ok: false,
      reason: "not_a_mint",
    });
    expect(mintFactsOf(null)).toEqual({ ok: false, reason: "not_found" });
  });

  it("is asked for once, jsonParsed, and a throttled RPC says so", async () => {
    const fetchFn = fakeFetch([["https://rpc.test", () => jsonResponse({ jsonrpc: "2.0", id: 1, result: { context: { slot: 1 }, value: account(TOKEN_PROGRAM, { mintAuthority: null, freezeAuthority: null }) } })]]);
    const read = makeMintReader("https://rpc.test", { fetchFn });
    expect((await read(COIN_A)).ok).toBe(true);
    expect(JSON.parse(String(fetchFn.seen[0]!.init?.body))).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [COIN_A, { encoding: "jsonParsed", commitment: "confirmed" }],
    });
    const busy = makeMintReader("https://rpc.test", { fetchFn: fakeFetch([["https://rpc.test", () => jsonResponse({}, 429)]]) });
    expect(await busy(COIN_A)).toEqual({ ok: false, reason: "rate_limited" });
    const erred = makeMintReader("https://rpc.test", { fetchFn: fakeFetch([["https://rpc.test", () => jsonResponse({ error: { code: -32602 } })]]) });
    expect(await erred(COIN_A)).toEqual({ ok: false, reason: "http_error" });
  });
});

describe("a pool", () => {
  const pair = (pairAddress: string, base: string, quote: string) => ({
    chainId: "solana",
    pairAddress,
    baseToken: { address: base },
    quoteToken: { address: quote },
  });

  it("is the coin on whichever side is not SOL or a dollar", () => {
    expect(coinOf(pair(PAIR_A, COIN_A, SOL))).toBe(COIN_A);
    expect(coinOf(pair(PAIR_A, USDC, COIN_B))).toBe(COIN_B);
    expect(coinOf(pair(PAIR_A, SOL, USDC))).toBe(SOL);
  });

  it("is looked up in one call, and only Solana pools count", async () => {
    const fetchFn = fakeFetch([
      ["https://api.dexscreener.com/latest/dex/pairs/solana/", () =>
        jsonResponse({ pairs: [pair(PAIR_A, COIN_A, SOL), { ...pair(COIN_B, ON_BASE, SOL), chainId: "base" }] })],
    ]);
    const got = await makePairLookup({ fetchFn })([PAIR_A, COIN_B], []);
    expect(got).toEqual({ ok: true, value: new Map([[PAIR_A, COIN_A]]) });
    expect(fetchFn.seen[0]!.url).toBe(`https://api.dexscreener.com/latest/dex/pairs/solana/${PAIR_A},${COIN_B}`);
  });

  it("finds a lowercased address by searching, and takes only an exact match", async () => {
    const lower = PAIR_A.toLowerCase();
    const fetchFn = fakeFetch([
      ["https://api.dexscreener.com/latest/dex/pairs/", () => jsonResponse({ pairs: null })],
      ["https://api.dexscreener.com/latest/dex/search", () =>
        jsonResponse({ pairs: [pair(COIN_B, COIN_B, SOL), pair(PAIR_A, COIN_A, SOL)] })],
    ]);
    expect(await makePairLookup({ fetchFn })([], [lower])).toEqual({ ok: true, value: new Map([[lower, COIN_A]]) });
  });

  it("says so when Dexscreener is down or throttling", async () => {
    expect(await makePairLookup({ fetchFn: fakeFetch([["https://", () => jsonResponse({}, 429)]]) })([PAIR_A], [])).toEqual({
      ok: false,
      reason: "rate_limited",
    });
    expect(await makePairLookup({ fetchFn: fakeFetch([]) })([PAIR_A], [])).toEqual({ ok: false, reason: "network_error" });
  });
});

