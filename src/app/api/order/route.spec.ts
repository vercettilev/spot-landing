import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setDeps } from "@/engine/deps";
import { COIN_A, WALLET, fakeDeps, fakeExecutor, fakeOrderer, fakeQuoter, fakeSearch, fakeSignatures, fresh, token } from "@/engine/fakes";
import { POST as execute } from "../execute/route";
import { POST } from "./route";

let ip = 0;
const post = (body: unknown, handler = POST) =>
  handler(new Request("https://api.test/api/order", { method: "POST", headers: { "x-real-ip": `10.4.0.${++ip}`, "content-type": "application/json" }, body: JSON.stringify(body) }));

beforeEach(() => {
  process.env.SPOT_TRADING = "1";
});
afterEach(() => {
  delete process.env.SPOT_TRADING;
  delete process.env.SPOT_TRADING_WALLETS;
  setDeps(null);
});

const OTHER = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

describe("POST /api/order", () => {
  it("is closed until trading is switched on", async () => {
    delete process.env.SPOT_TRADING;
    setDeps(fakeDeps());
    const res = await post({ mint: COIN_A, side: "buy", amountUsdc: 25, taker: WALLET });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, error: "trading_closed" });
  });

  it("while testing, builds orders for the listed wallets and nobody else", async () => {
    process.env.SPOT_TRADING_WALLETS = ` ${WALLET}, someone-else `;
    const order = fakeOrderer();
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A)]), order }));
    const stranger = await post({ mint: COIN_A, side: "buy", amountUsdc: 25, taker: OTHER });
    expect(stranger.status).toBe(403);
    expect(await stranger.json()).toEqual({ ok: false, error: "trading_closed" });
    expect((await post({ mint: COIN_A, side: "sell", amountRaw: "1", taker: OTHER })).status).toBe(403);
    expect(order.asked).toEqual([]);
    const tester = await post({ mint: COIN_A, side: "buy", amountUsdc: 25, taker: WALLET });
    expect(tester.status).toBe(200);
    expect(order.asked).toHaveLength(1);
  });

  it("builds a buy for a clean coin, in USDC base units", async () => {
    const order = fakeOrderer();
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A)]), order }));
    const res = await post({ mint: COIN_A, side: "buy", amountUsdc: 25, taker: WALLET });
    expect(await res.json()).toMatchObject({ ok: true, requestId: "req-1", transaction: "AQID" });
    expect(order.asked).toEqual([{ inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", outputMint: COIN_A, amount: "25000000", taker: WALLET }]);
  });

  it("pays a buy in SOL when asked, at Jupiter's price of the moment", async () => {
    const SOL = "So11111111111111111111111111111111111111112";
    const order = fakeOrderer();
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A), token(SOL, { symbol: "SOL", usdPrice: 200 })]), order }));
    const res = await post({ mint: COIN_A, side: "buy", amountUsdc: 25, taker: WALLET, payWith: "sol" });
    expect(res.status).toBe(200);
    expect(order.asked).toEqual([{ inputMint: SOL, outputMint: COIN_A, amount: "125000000", taker: WALLET }]);
  });

  it("turns SOL into cash (USDC as the coin, paid in SOL) without a sniff, and takes USDC no other way", async () => {
    const SOL = "So11111111111111111111111111111111111111112";
    const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const order = fakeOrderer();
    const search = fakeSearch([token(SOL, { symbol: "SOL", usdPrice: 200 })]);
    setDeps(fakeDeps({ search, order }));
    const res = await post({ mint: USDC, side: "buy", amountUsdc: 50, taker: WALLET, payWith: "sol" });
    expect(res.status).toBe(200);
    expect(order.asked).toEqual([{ inputMint: SOL, outputMint: USDC, amount: "250000000", taker: WALLET }]);
    expect((await post({ mint: USDC, side: "buy", amountUsdc: 50, taker: WALLET })).status).toBe(400);
    expect((await post({ mint: USDC, side: "sell", amountRaw: "1", taker: WALLET })).status).toBe(400);
  });

  it("sniffs again, and builds nothing for a blocked coin or above a warned one's cap", async () => {
    const order = fakeOrderer();
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A)]), quote: fakeQuoter({ sell: "no_route" }), order }));
    const blocked = await post({ mint: COIN_A, side: "buy", amountUsdc: 25, taker: WALLET });
    expect(blocked.status).toBe(409);
    expect(await blocked.json()).toMatchObject({ error: "blocked", headline: "Honeypot. Spot won't buy it." });

    setDeps(fakeDeps({ search: fakeSearch([fresh(COIN_A, { liquidity: 900 })]), order }));
    const over = await post({ mint: COIN_A, side: "buy", amountUsdc: 25, taker: WALLET });
    expect(await over.json()).toEqual({ ok: false, error: "over_cap", maxBuyUsdc: 18 });
    expect(order.asked).toEqual([]);
  });

  it("never refuses a sell, and sells exactly the raw amount asked", async () => {
    const order = fakeOrderer();
    setDeps(fakeDeps({ search: fakeSearch([]), order }));
    const res = await post({ mint: COIN_A, side: "sell", amountRaw: "6250000000", taker: WALLET });
    expect(res.status).toBe(200);
    expect(order.asked[0]).toMatchObject({ inputMint: COIN_A, amount: "6250000000" });
  });

  it("checks its input and passes Jupiter's refusal through in words", async () => {
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A)]), order: fakeOrderer({ ok: false, reason: "refused", message: "Insufficient funds" }) }));
    expect((await post({ mint: COIN_A, side: "hodl", taker: WALLET })).status).toBe(400);
    expect((await post({ mint: COIN_A, side: "buy", amountUsdc: 0, taker: WALLET })).status).toBe(400);
    expect((await post({ mint: COIN_A, side: "buy", amountUsdc: 25, taker: "nope" })).status).toBe(400);
    const refused = await post({ mint: COIN_A, side: "buy", amountUsdc: 25, taker: WALLET });
    expect(refused.status).toBe(422);
    expect(await refused.json()).toEqual({ ok: false, error: "refused", message: "Insufficient funds" });
  });
});

describe("POST /api/execute", () => {
  const signed = "A".repeat(60);
  const land = () => post({ requestId: "req-1", signedTransaction: signed }, execute);

  it("lands a signed order through Jupiter, and is closed like orders are", async () => {
    setDeps(fakeDeps());
    expect(await (await land()).json()).toEqual({ ok: true, status: "Success", signature: "5ig", error: null, final: true });
    expect((await post({ requestId: "", signedTransaction: signed }, execute)).status).toBe(400);
    delete process.env.SPOT_TRADING;
    expect((await land()).status).toBe(403);
  });

  it("calls a failure final only when the chain shows it landed and failed", async () => {
    const failed = fakeExecutor({ ok: true, value: { status: "Failed", signature: "5ig", error: "Slippage tolerance exceeded" } });
    setDeps(fakeDeps({ execute: failed, readSignature: fakeSignatures({ ok: true, value: "failed" }) }));
    expect(await (await land()).json()).toEqual({ ok: true, status: "Failed", signature: "5ig", error: "Slippage tolerance exceeded", final: true });

    /* Not on the chain yet: it can still land, so the app must not offer it again. */
    setDeps(fakeDeps({ execute: failed, readSignature: fakeSignatures({ ok: true, value: "unknown" }) }));
    expect(await (await land()).json()).toMatchObject({ status: "Failed", final: false });
    setDeps(fakeDeps({ execute: failed, readSignature: fakeSignatures({ ok: false, reason: "timeout" }) }));
    expect(await (await land()).json()).toMatchObject({ status: "Failed", final: false });

    const unsigned = fakeExecutor({ ok: true, value: { status: "Failed", signature: null, error: "code -1000" } });
    const chain = fakeSignatures();
    setDeps(fakeDeps({ execute: unsigned, readSignature: chain }));
    expect(await (await land()).json()).toMatchObject({ status: "Failed", final: false });
    expect(chain.asked).toEqual([]);
  });

  it("believes the chain over Jupiter when the trade landed after all", async () => {
    const failed = fakeExecutor({ ok: true, value: { status: "Failed", signature: "5ig", error: "Timed out" } });
    const chain = fakeSignatures({ ok: true, value: "landed" });
    setDeps(fakeDeps({ execute: failed, readSignature: chain }));
    expect(await (await land()).json()).toEqual({ ok: true, status: "Success", signature: "5ig", error: null, final: true });
    expect(chain.asked).toEqual(["5ig"]);
  });

  it("says pending, not failed, when Jupiter does not answer in time", async () => {
    setDeps(fakeDeps({ execute: fakeExecutor({ ok: false, reason: "timeout" }) }));
    const slow = await land();
    expect(slow.status).toBe(504);
    expect(await slow.json()).toEqual({ ok: false, error: "pending" });
    setDeps(fakeDeps({ execute: fakeExecutor({ ok: false, reason: "network_error" }) }));
    expect((await land()).status).toBe(504);
  });
});
