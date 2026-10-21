import { describe, expect, it } from "vitest";
import { COIN_A, COIN_B, WALLET, fakeAccounts, fakeFetch, fakeSearch, jsonResponse, token } from "@/engine/fakes";
import { TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "./address";
import { balancesOf, imageOf, landingOf, makeAccountsReader, makeImageReader, makeSignatureReader } from "./chain";
import { fillIcons } from "./icons";
import { cardOf } from "./token";
import { holdings } from "./holdings";
import { jupiterConfig } from "./jupiter";
import { makeExecutor, makeOrderer, mayTrade, tradeConfig, tradingMode } from "./trade";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL = "So11111111111111111111111111111111111111112";

const account = (mint: string, amount: string, decimals = 6) => ({
  pubkey: "acct",
  account: { data: { program: "spl-token", parsed: { type: "account", info: { mint, owner: WALLET, tokenAmount: { amount, decimals, uiAmount: Number(amount) / 10 ** decimals } } } } },
});

describe("a wallet's accounts", () => {
  it("are read under both token programs, with its SOL, and one mint's accounts add up", async () => {
    const fetchFn = fakeFetch([
      ["https://rpc.test", async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        if (body.method === "getBalance") return jsonResponse({ result: { context: {}, value: 2_500_000_000 } });
        const program = body.params[1].programId;
        const value = program === TOKEN_PROGRAM ? [account(USDC, "12500000"), account(COIN_A, "1000"), account(COIN_A, "500")] : [account(COIN_B, "7", 0)];
        return jsonResponse({ result: { context: {}, value } });
      }],
    ]);
    const got = await makeAccountsReader("https://rpc.test", { fetchFn })(WALLET);
    expect(got).toEqual({
      ok: true,
      value: {
        sol: 2.5,
        tokens: [
          { mint: USDC, raw: "12500000", amount: 12.5, decimals: 6 },
          { mint: COIN_A, raw: "1500", amount: 0.0015, decimals: 6 },
          { mint: COIN_B, raw: "7", amount: 7, decimals: 0 },
        ],
      },
    });
    const programs = fetchFn.seen.map((s) => JSON.parse(String(s.init?.body)).params[1]?.programId).filter(Boolean);
    expect(programs.sort()).toEqual([TOKEN_PROGRAM, TOKEN_2022_PROGRAM].sort());
  });

  it("skips rows that are not token accounts", () => {
    expect(balancesOf([{ account: { data: ["", "base64"] } }, account(COIN_A, "x")])).toEqual([]);
  });

  it("fail as a whole when any call fails", async () => {
    const fetchFn = fakeFetch([["https://rpc.test", () => jsonResponse({}, 429)]]);
    expect(await makeAccountsReader("https://rpc.test", { fetchFn })(WALLET)).toEqual({ ok: false, reason: "rate_limited" });
  });
});

describe("the bag", () => {
  const priced = [token(SOL, { symbol: "SOL", usdPrice: 150 }), token(COIN_A, { symbol: "EXAMPLE", usdPrice: 0.004 }), token(COIN_B, { symbol: "DUST", usdPrice: 0.000001 })];
  const accounts = fakeAccounts({
    ok: true,
    value: {
      sol: 0.5,
      tokens: [
        { mint: USDC, raw: "25000000", amount: 25, decimals: 6 },
        { mint: COIN_A, raw: "6250000000", amount: 6250, decimals: 6 },
        { mint: COIN_B, raw: "100000000", amount: 100, decimals: 6 },
        { mint: "2g7qfRJ9Y1Re5fAjZ6Uv5LJLZSfBbSeUeFF25R8RHKLF", raw: "1", amount: 1, decimals: 0 },
      ],
    },
  });

  it("prices every coin, lists what is worth a cent, and adds it all up", async () => {
    const search = fakeSearch(priced);
    const got = await holdings(WALLET, { search, readAccounts: accounts });
    expect(got.ok && got.value).toMatchObject({
      owner: WALLET,
      totalUsd: 25 + 75 + 25,
      usdc: { amount: 25, usd: 25 },
      sol: { amount: 0.5, usd: 75, token: { mint: SOL, symbol: "SOL", name: "Solana" } },
      positions: [{ token: { mint: COIN_A, symbol: "EXAMPLE" }, amount: 6250, raw: "6250000000", usd: 25 }],
      hidden: 2,
    });
    expect(search.queries).toEqual([`${SOL},${COIN_A},${COIN_B},2g7qfRJ9Y1Re5fAjZ6Uv5LJLZSfBbSeUeFF25R8RHKLF`]);
  });

  it("counts wrapped SOL as SOL, Solana, never as a second coin", async () => {
    const wrapped = fakeAccounts({
      ok: true,
      value: { sol: 0.5, tokens: [{ mint: SOL, raw: "250000000", amount: 0.25, decimals: 9 }, { mint: USDC, raw: "0", amount: 0, decimals: 6 }] },
    });
    const got = await holdings(WALLET, { search: fakeSearch([token(SOL, { symbol: "SOL", name: "Wrapped SOL", usdPrice: 100 })]), readAccounts: wrapped });
    expect(got.ok && got.value).toMatchObject({ totalUsd: 75, sol: { amount: 0.75, usd: 75, token: { name: "Solana" } }, positions: [], hidden: 0 });
  });

  it("says so when the chain or Jupiter did not answer", async () => {
    expect(await holdings(WALLET, { search: fakeSearch(priced), readAccounts: fakeAccounts({ ok: false, reason: "timeout" }) })).toEqual({ ok: false, reason: "lookup_failed" });
    expect(await holdings(WALLET, { search: fakeSearch(priced, "timeout"), readAccounts: accounts })).toEqual({ ok: false, reason: "lookup_failed" });
  });
});

describe("an order", () => {
  const keyed = tradeConfig(jupiterConfig({ JUPITER_API_KEY: "k" }), {});
  const ask = { inputMint: USDC, outputMint: COIN_A, amount: "25000000", taker: WALLET };

  it("asks Swap V2 for a transaction made out to the taker", async () => {
    const fetchFn = fakeFetch([
      ["https://api.jup.ag/swap/v2/order", () => jsonResponse({ requestId: "r1", transaction: "AQID", inAmount: "25000000", outAmount: "999", priceImpactPct: "0.12", gasless: true })],
    ]);
    expect(await makeOrderer(keyed, { fetchFn })(ask)).toEqual({
      ok: true,
      value: { requestId: "r1", transaction: "AQID", inAmount: "25000000", outAmount: "999", priceImpactPct: 0.12, gasless: true },
    });
    expect(fetchFn.seen[0]!.url).toBe(`https://api.jup.ag/swap/v2/order?inputMint=${USDC}&outputMint=${COIN_A}&amount=25000000&taker=${WALLET}`);
  });

  it("brings back Jupiter's own words when it will not build one", async () => {
    const say = (body: unknown, status = 200) => makeOrderer(keyed, { fetchFn: fakeFetch([["https://", () => jsonResponse(body, status)]]) })(ask);
    expect(await say({ requestId: "r1", transaction: "", errorCode: 1, errorMessage: "Insufficient funds" })).toEqual({ ok: false, reason: "refused", message: "1 Insufficient funds" });
    expect(await say({ errorCode: "COULD_NOT_FIND_ANY_ROUTE" }, 400)).toEqual({ ok: false, reason: "no_route" });
    expect(await say({}, 429)).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("needs a key, because only the keyed API takes a taker", async () => {
    const keyless = tradeConfig(jupiterConfig({}), {});
    expect(await makeOrderer(keyless, { fetchFn: fakeFetch([]) })(ask)).toEqual({ ok: false, reason: "needs_key" });
  });

  it("is landed by /execute, which says whether it went through", async () => {
    const fetchFn = fakeFetch([["https://api.jup.ag/swap/v2/execute", () => jsonResponse({ status: "Failed", code: -1005, error: "Slippage tolerance exceeded" })]]);
    expect(await makeExecutor(keyed, { fetchFn })("c2lnbmVk", "r1")).toEqual({
      ok: true,
      value: { status: "Failed", signature: null, error: "Slippage tolerance exceeded" },
    });
    expect(JSON.parse(String(fetchFn.seen[0]!.init?.body))).toEqual({ signedTransaction: "c2lnbmVk", requestId: "r1" });
  });
});

describe("trading", () => {
  it("is closed unless switched on, and open to the listed wallets only while testing", () => {
    expect(tradingMode({}).mode).toBe("closed");
    expect(tradingMode({ SPOT_TRADING: "0", SPOT_TRADING_WALLETS: WALLET }).mode).toBe("closed");
    expect(tradingMode({ SPOT_TRADING: "1" }).mode).toBe("open");
    expect(tradingMode({ SPOT_TRADING: "1", SPOT_TRADING_WALLETS: " , " }).mode).toBe("open");
    const testing = { SPOT_TRADING: "1", SPOT_TRADING_WALLETS: `${WALLET}\n9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM` };
    expect(tradingMode(testing).mode).toBe("testing");
    expect(mayTrade(testing, WALLET)).toBe(true);
    expect(mayTrade(testing, "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM")).toBe(true);
    expect(mayTrade(testing, COIN_A)).toBe(false);
    expect(mayTrade({}, WALLET)).toBe(false);
    expect(mayTrade({ SPOT_TRADING: "1" }, COIN_A)).toBe(true);
  });
});

describe("a sent transaction", () => {
  it("has landed only once the chain confirms it, and failed once it shows an error", () => {
    expect(landingOf([{ slot: 1, confirmations: null, err: null, confirmationStatus: "finalized" }])).toBe("landed");
    expect(landingOf([{ slot: 1, confirmations: 3, err: null, confirmationStatus: "confirmed" }])).toBe("landed");
    expect(landingOf([{ slot: 1, confirmations: 0, err: null, confirmationStatus: "processed" }])).toBe("unknown");
    expect(landingOf([{ slot: 1, err: { InstructionError: [3, { Custom: 6001 }] }, confirmationStatus: "confirmed" }])).toBe("failed");
    expect(landingOf([null])).toBe("unknown");
    expect(landingOf(undefined)).toBe("unknown");
  });

  it("is looked up with the history search on, so an older one is still found", async () => {
    const fetchFn = fakeFetch([["https://rpc.test", () => jsonResponse({ jsonrpc: "2.0", id: 1, result: { context: { slot: 9 }, value: [{ err: null, confirmationStatus: "confirmed" }] } })]]);
    expect(await makeSignatureReader("https://rpc.test", { fetchFn })("5ig")).toEqual({ ok: true, value: "landed" });
    expect(JSON.parse(String(fetchFn.seen[0]!.init?.body))).toMatchObject({ method: "getSignatureStatuses", params: [["5ig"], { searchTransactionHistory: true }] });
  });
});

describe("a coin's image from the chain", () => {
  it("is the metadata's image, or a file's address, and only a web address", () => {
    expect(imageOf({ content: { links: { image: "https://img.test/a.png" }, files: [{ uri: "https://img.test/b.png" }] } })).toBe("https://img.test/a.png");
    expect(imageOf({ content: { files: [{ uri: "ipfs://x", cdn_uri: "https://cdn.test/x.png" }] } })).toBe("https://cdn.test/x.png");
    expect(imageOf({ content: { links: { image: "ipfs://nope" } } })).toBeNull();
    expect(imageOf(null)).toBeNull();
  });

  it("is asked of the RPC with getAsset, and fills only the cards Jupiter left blank", async () => {
    const fetchFn = fakeFetch([["https://rpc.test", () => jsonResponse({ jsonrpc: "2.0", id: 1, result: { content: { links: { image: "https://img.test/a.png" } } } })]]);
    const read = makeImageReader("https://rpc.test", { fetchFn });
    const blank = cardOf(token(COIN_A, { icon: "" }));
    const drawn = cardOf(token(COIN_B));
    await fillIcons([blank, drawn, blank], read);
    expect(blank.icon).toBe("https://img.test/a.png");
    expect(drawn.icon).toBe(`https://example.test/${COIN_B}.png`);
    expect(fetchFn.seen).toHaveLength(1);
    expect(JSON.parse(String(fetchFn.seen[0]!.init?.body))).toMatchObject({ method: "getAsset", params: { id: COIN_A } });
  });

  it("keeps the letter when the RPC has no such method", async () => {
    const fetchFn = fakeFetch([["https://rpc.test", () => jsonResponse({ jsonrpc: "2.0", id: 1, error: { code: -32601, message: "Method not found" } })]]);
    expect(await makeImageReader("https://rpc.test", { fetchFn })(COIN_A)).toBeNull();
  });
});
