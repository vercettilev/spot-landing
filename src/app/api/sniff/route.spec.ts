import { afterEach, describe, expect, it } from "vitest";
import { setDeps } from "@/engine/deps";
import { COIN_A, fakeDeps, fakeMintReader, fakeQuoter, fakeSearch, fresh, token } from "@/engine/fakes";
import { GET, OPTIONS } from "./route";

let ip = 0;
const get = (query: string, from = `10.0.0.${++ip}`) =>
  GET(new Request(`https://api.test/api/sniff?${query}`, { headers: { "x-real-ip": from } }));

afterEach(() => setDeps(null));

describe("GET /api/sniff", () => {
  it("answers a coin with its verdict, shareable for ten seconds", async () => {
    setDeps(fakeDeps({ search: fakeSearch([fresh(COIN_A)]) }));
    const res = await get(`mint=${COIN_A}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, s-maxage=10, stale-while-revalidate=20");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, mint: COIN_A, level: "warn", maxBuyUsdc: 50, token: { mint: COIN_A } });
  });

  it("sizes the probe to the amount asked, 25 USDC when none is", async () => {
    const quote = fakeQuoter();
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A)]), quote }));
    await get(`mint=${COIN_A}`);
    await get(`mint=${COIN_A}&amount=10.555`);
    expect(quote.calls.filter((c) => c.outputMint === COIN_A).map((c) => c.amount)).toEqual(["25000000", "10560000"]);
  });

  it("never shares an unfinished sniff", async () => {
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A)]), quote: fakeQuoter({ sell: "timeout" }) }));
    const res = await get(`mint=${COIN_A}`);
    expect((await res.json()).level).toBe("unknown");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses what is not a coin address, USDC itself, and amounts out of range", async () => {
    setDeps(fakeDeps());
    for (const [q, error] of [
      ["", "invalid_mint"],
      ["mint=hello", "invalid_mint"],
      [`mint=${COIN_A.toLowerCase()}`, "invalid_mint"],
      ["mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "is_usdc"],
      [`mint=${COIN_A}&amount=0`, "invalid_amount"],
      [`mint=${COIN_A}&amount=20000`, "invalid_amount"],
      [`mint=${COIN_A}&amount=lots`, "invalid_amount"],
    ]) {
      const res = await get(q!);
      expect(res.status, q).toBe(400);
      expect(await res.json()).toEqual({ ok: false, error });
    }
  });

  it("is 404 for a mint Jupiter has never seen or an address that is no mint, 503 when Jupiter is down", async () => {
    setDeps(fakeDeps({ search: fakeSearch([]) }));
    expect((await get(`mint=${COIN_A}`)).status).toBe(404);
    setDeps(fakeDeps({ search: fakeSearch([]), readMint: fakeMintReader({ ok: false, reason: "not_a_mint" }) }));
    expect(await (await get(`mint=${COIN_A}`)).json()).toEqual({ ok: false, error: "not_a_mint" });
    setDeps(fakeDeps({ search: fakeSearch([], "rate_limited") }));
    const down = await get(`mint=${COIN_A}`);
    expect(down.status).toBe(503);
    expect(down.headers.get("cache-control")).toBe("no-store");
  });

  it("slows down one caller, not the next", async () => {
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A)]) }));
    const codes: number[] = [];
    for (let i = 0; i < 61; i++) codes.push((await get(`mint=${COIN_A}`, "10.9.9.9")).status);
    expect(codes.slice(0, 60).every((c) => c === 200)).toBe(true);
    expect(codes[60]).toBe(429);
    expect((await get(`mint=${COIN_A}`, "10.9.9.10")).status).toBe(200);
  });

  it("answers a browser's preflight", async () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toBe("GET, POST, OPTIONS");
  });
});
