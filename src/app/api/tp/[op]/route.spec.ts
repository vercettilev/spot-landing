import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setDeps } from "@/engine/deps";
import { COIN_A, WALLET, fakeDeps, fakeTrigger } from "@/engine/fakes";
import { GET, POST } from "./route";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SIG = "5".repeat(88);
const TX = "A".repeat(200);
const DAY = 24 * 60 * 60 * 1000;

let ip = 0;
const call = (method: "GET" | "POST", op: string, body?: unknown, opts: { bearer?: string; query?: string } = {}) => {
  const headers: Record<string, string> = { "x-real-ip": `10.7.0.${++ip}`, "content-type": "application/json" };
  if (opts.bearer) headers.authorization = `Bearer ${opts.bearer}`;
  const req = new Request(`https://api.test/api/tp/${op}${opts.query ?? ""}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const ctx = { params: Promise.resolve({ op }) };
  return method === "GET" ? GET(req, ctx) : POST(req, ctx);
};

const trading = process.env.SPOT_TRADING;
beforeEach(() => {
  process.env.SPOT_TRADING = "1";
});
afterEach(() => {
  setDeps(null);
  if (trading === undefined) delete process.env.SPOT_TRADING;
  else process.env.SPOT_TRADING = trading;
});

describe("/api/tp: signing in to Jupiter", () => {
  it("asks for a message to sign, then trades the signature for a session that refreshes", async () => {
    const trigger = fakeTrigger({
      "POST /auth/challenge": { body: { type: "message", challenge: "Sign this message to authenticate with Jupiter" } },
      "POST /auth/verify": { body: { authMode: "access_refresh", accessToken: "acc.ess.tok", refreshToken: "refresh-token-0001", expiresAt: "2026-10-23T12:15:00Z", tokenType: "Bearer" } },
      "POST /auth/refresh": { body: { authMode: "access_refresh", accessToken: "acc.ess.two", refreshToken: "refresh-token-0002", expiresAt: "2026-10-23T12:30:00Z", tokenType: "Bearer" } },
    });
    setDeps(fakeDeps({ trigger }));
    expect(await (await call("POST", "challenge", { walletPubkey: WALLET })).json()).toMatchObject({ ok: true, challenge: "Sign this message to authenticate with Jupiter" });
    expect(await (await call("POST", "verify", { walletPubkey: WALLET, signature: SIG })).json()).toMatchObject({ ok: true, accessToken: "acc.ess.tok", refreshToken: "refresh-token-0001" });
    expect(await (await call("POST", "refresh", { refreshToken: "refresh-token-0001" })).json()).toMatchObject({ ok: true, refreshToken: "refresh-token-0002" });
    expect(trigger.calls.map((c) => [c.path, c.body])).toEqual([
      ["/auth/challenge", { walletPubkey: WALLET, type: "message" }],
      ["/auth/verify", { type: "message", walletPubkey: WALLET, signature: SIG, authMode: "access_refresh" }],
      ["/auth/refresh", { refreshToken: "refresh-token-0001" }],
    ]);
  });

  it("refuses what isn't an address or a signature, without asking Jupiter", async () => {
    const trigger = fakeTrigger();
    setDeps(fakeDeps({ trigger }));
    expect((await call("POST", "challenge", { walletPubkey: "nope" })).status).toBe(400);
    expect((await call("POST", "verify", { walletPubkey: WALLET, signature: "0OIl" })).status).toBe(400);
    expect((await call("POST", "nonsense", {})).status).toBe(404);
    expect(trigger.calls).toEqual([]);
  });

  it("says signed_out when the session is missing or Jupiter has ended it", async () => {
    const trigger = fakeTrigger({ "GET /orders/history": { status: 401, body: { error: "token expired" } } });
    setDeps(fakeDeps({ trigger }));
    expect(await (await call("POST", "vault")).json()).toEqual({ ok: false, error: "signed_out" });
    expect(trigger.calls).toEqual([]);
    const ended = await call("GET", "orders", undefined, { bearer: "acc.ess.tok" });
    expect(ended.status).toBe(401);
    expect(await ended.json()).toEqual({ ok: false, error: "signed_out", message: "token expired" });
  });

  it("takes a vault made before as the vault", async () => {
    setDeps(fakeDeps({ trigger: fakeTrigger({ "GET /vault/register": { status: 409, body: { error: "Vault already exists" } } }) }));
    expect(await (await call("POST", "vault", undefined, { bearer: "acc.ess.tok" })).json()).toEqual({ ok: true, existed: true });
  });
});

describe("/api/tp: the 2x sell", () => {
  const order = (over: Record<string, unknown> = {}) => ({
    depositRequestId: "dep-1",
    depositSignedTx: TX,
    userPubkey: WALLET,
    inputMint: COIN_A,
    inputAmount: "620000000",
    triggerPriceUsd: 0.4,
    expiresAt: Date.now() + 30 * DAY,
    ...over,
  });

  it("deposits a coin to sell for USDC, and orders it sold above a price, single, nothing else", async () => {
    const trigger = fakeTrigger({
      "POST /deposit/craft": { body: { transaction: TX, requestId: "dep-1", receiverAddress: "Vault111", mint: COIN_A, amount: "620000000", tokenDecimals: 6 } },
      "POST /orders/price": { body: { id: "ord-123456", txSignature: "5ig", depositConfirmed: true } },
    });
    setDeps(fakeDeps({ trigger }));
    const dep = await call("POST", "deposit", { inputMint: COIN_A, userAddress: WALLET, amount: "620000000", outputMint: "Something" }, { bearer: "acc.ess.tok" });
    expect(await dep.json()).toMatchObject({ ok: true, requestId: "dep-1", transaction: TX });
    const made = await call("POST", "order", order({ outputMint: "Else", triggerCondition: "below", orderType: "oco" }), { bearer: "acc.ess.tok" });
    expect(await made.json()).toEqual({ ok: true, id: "ord-123456", txSignature: "5ig", depositConfirmed: true });
    expect(trigger.calls[0]).toMatchObject({
      path: "/deposit/craft",
      bearer: "acc.ess.tok",
      body: { inputMint: COIN_A, outputMint: USDC, userAddress: WALLET, amount: "620000000", orderType: "price", orderSubType: "single" },
    });
    expect(trigger.calls[1]!.body).toMatchObject({ orderType: "single", outputMint: USDC, triggerMint: COIN_A, triggerCondition: "above", triggerPriceUsd: 0.4 });
  });

  it("opens none while trading is closed, never sells USDC, and never runs past a month", async () => {
    const trigger = fakeTrigger();
    setDeps(fakeDeps({ trigger }));
    for (const body of [order({ expiresAt: Date.now() + 40 * DAY }), order({ expiresAt: Date.now() - 1 }), order({ inputMint: USDC }), order({ inputAmount: "0" }), order({ triggerPriceUsd: -1 })]) {
      expect((await call("POST", "order", body, { bearer: "acc.ess.tok" })).status, JSON.stringify(body).slice(0, 80)).toBe(400);
    }
    delete process.env.SPOT_TRADING;
    expect(await (await call("POST", "order", order(), { bearer: "acc.ess.tok" })).json()).toEqual({ ok: false, error: "trading_closed" });
    expect(await (await call("POST", "deposit", { inputMint: COIN_A, userAddress: WALLET, amount: "1" }, { bearer: "acc.ess.tok" })).json()).toEqual({ ok: false, error: "trading_closed" });
    expect(trigger.calls).toEqual([]);
  });

  it("is seen and cancelled even while trading is closed: getting out never closes", async () => {
    delete process.env.SPOT_TRADING;
    const trigger = fakeTrigger({
      "GET /orders/history": { body: { orders: [{ id: "ord-123456", orderState: "open" }], pagination: { total: 1, limit: 50, offset: 0 } } },
      "POST /orders/price/cancel/ord-123456": { body: { id: "ord-123456", transaction: TX, requestId: "can-1" } },
      "POST /orders/price/confirm-cancel/ord-123456": { body: { id: "ord-123456", txSignature: "5ig2" } },
    });
    setDeps(fakeDeps({ trigger }));
    expect(await (await call("GET", "orders", undefined, { bearer: "acc.ess.tok", query: `?state=active&mint=${COIN_A}` })).json()).toMatchObject({ ok: true, orders: [{ id: "ord-123456" }] });
    expect(await (await call("POST", "cancel", { orderId: "ord-123456" }, { bearer: "acc.ess.tok" })).json()).toMatchObject({ ok: true, requestId: "can-1" });
    expect(await (await call("POST", "confirm-cancel", { orderId: "ord-123456", signedTransaction: TX, cancelRequestId: "can-1" }, { bearer: "acc.ess.tok" })).json()).toMatchObject({ ok: true, txSignature: "5ig2" });
    expect(trigger.calls.map((c) => c.query ?? c.body ?? null)).toEqual([{ state: "active", mint: COIN_A, limit: "50" }, null, { signedTransaction: TX, cancelRequestId: "can-1" }]);
    expect((await call("POST", "cancel", { orderId: "../vault" }, { bearer: "acc.ess.tok" })).status).toBe(400);
  });

  it("passes Jupiter's no back in its own words", async () => {
    setDeps(fakeDeps({ trigger: fakeTrigger({ "POST /orders/price": { status: 400, body: { error: "Minimum order size is 10 USD" } } }) }));
    const res = await call("POST", "order", order(), { bearer: "acc.ess.tok" });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "refused", message: "Minimum order size is 10 USD" });
  });
});
