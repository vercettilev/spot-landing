import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setDeps } from "@/engine/deps";
import { COIN_A, WALLET, fakeDeps, fakeOrderer, fakeQuoter, fakeSearch, fresh, token } from "@/engine/fakes";
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
  setDeps(null);
});

describe("POST /api/order", () => {
  it("is closed until trading is switched on", async () => {
    delete process.env.SPOT_TRADING;
    setDeps(fakeDeps());
    const res = await post({ mint: COIN_A, side: "buy", amountUsdc: 25, taker: WALLET });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, error: "trading_closed" });
  });

  it("builds a buy for a clean coin, in USDC base units", async () => {
    const order = fakeOrderer();
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A)]), order }));
    const res = await post({ mint: COIN_A, side: "buy", amountUsdc: 25, taker: WALLET });
    expect(await res.json()).toMatchObject({ ok: true, requestId: "req-1", transaction: "AQID" });
    expect(order.asked).toEqual([{ inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", outputMint: COIN_A, amount: "25000000", taker: WALLET }]);
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
  it("lands a signed order through Jupiter, and is closed like orders are", async () => {
    setDeps(fakeDeps());
    const signed = "A".repeat(60);
    const res = await post({ requestId: "req-1", signedTransaction: signed }, execute);
    expect(await res.json()).toEqual({ ok: true, status: "Success", signature: "5ig", error: null });
    expect((await post({ requestId: "", signedTransaction: signed }, execute)).status).toBe(400);
    delete process.env.SPOT_TRADING;
    expect((await post({ requestId: "req-1", signedTransaction: signed }, execute)).status).toBe(403);
  });
});
