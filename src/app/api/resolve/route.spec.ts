import { afterEach, describe, expect, it } from "vitest";
import { setDeps } from "@/engine/deps";
import { COIN_A, COIN_B, fakeDeps, fakeMintReader, fakePosts, fakeQuoter, fakeSearch, fresh, token } from "@/engine/fakes";
import { GET as sniffGet } from "../sniff/route";
import { GET, POST } from "./route";

let ip = 0;
const headers = (from: string) => ({ "x-real-ip": from, "content-type": "application/json" });
const post = (body: unknown, from = `10.1.0.${++ip}`) =>
  POST(new Request("https://api.test/api/resolve", { method: "POST", headers: headers(from), body: typeof body === "string" ? body : JSON.stringify(body) }));
const get = (query: string, from = `10.1.1.${++ip}`) =>
  GET(new Request(`https://api.test/api/resolve?${query}`, { headers: headers(from) }));

afterEach(() => setDeps(null));

describe("/api/resolve", () => {
  it("turns a shared link into its coin", async () => {
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A)]) }));
    const res = await post({ url: `https://pump.fun/coin/${COIN_A}` });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toMatchObject({ ok: true, status: "found", pick: { via: "link", token: { mint: COIN_A } } });
  });

  it("reads plain text that arrived in the url slot as shared text", async () => {
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A)]) }));
    const body = await (await post({ url: `ape this ${COIN_A}` })).json();
    expect(body).toMatchObject({ status: "found", pick: { via: "text" } });
  });

  it("lets a complete GET answer be cached, and an incomplete one not", async () => {
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A)]) }));
    const whole = await get(`url=${encodeURIComponent(`https://pump.fun/coin/${COIN_A}`)}`);
    expect(whole.headers.get("cache-control")).toBe("public, s-maxage=60, stale-while-revalidate=300");
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A)]), readPost: fakePosts({}) }));
    const partial = await get(`url=${encodeURIComponent("https://x.com/ana/status/1845678901234567890")}&text=${encodeURIComponent(COIN_A)}`);
    expect((await partial.clone().json()).missed).toEqual(["post"]);
    expect(partial.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses an empty share, a giant URL and a body that is not JSON", async () => {
    setDeps(fakeDeps());
    expect(await (await post({})).json()).toEqual({ ok: false, error: "nothing_shared" });
    expect(await (await post({ url: "  ", text: " " })).json()).toEqual({ ok: false, error: "nothing_shared" });
    expect((await post({ url: `https://x.com/${"a".repeat(2_100)}` })).status).toBe(400);
    expect(await (await post("{nope")).json()).toEqual({ ok: false, error: "bad_json" });
  });

  it("is 503 rather than 'none' when Jupiter could not be asked", async () => {
    setDeps(fakeDeps({ search: fakeSearch([], "timeout") }));
    const res = await post({ text: `ape ${COIN_A}` });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "lookup_failed", missed: ["search"] });
  });

  it("sniffs a found coin in the same answer when asked: the coin's line first, then the verdict's", async () => {
    const search = fakeSearch([fresh(COIN_A)]);
    const quote = fakeQuoter();
    setDeps(fakeDeps({ search, quote }));
    const res = await post({ text: `ape ${COIN_A}`, sniff: 25 });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/x-ndjson; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-store, no-transform");
    const lines = (await res.text()).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe("");
    expect(JSON.parse(lines[0]!)).toMatchObject({ ok: true, status: "found", pick: { token: { mint: COIN_A } } });
    expect(JSON.parse(lines[1]!)).toMatchObject({ sniff: { ok: true, mint: COIN_A, level: "warn", maxBuyUsdc: 50 } });
    /* The sniff read the coin the resolve found: Jupiter was searched once. */
    expect(search.queries).toEqual([COIN_A]);
    expect(quote.calls.filter((c) => c.outputMint === COIN_A).map((c) => c.amount)).toEqual(["25000000"]);
  });

  it("shares the sniff it sent with /api/sniff for the next ten seconds, as the CDN would", async () => {
    const quote = fakeQuoter();
    setDeps(fakeDeps({ search: fakeSearch([fresh(COIN_A)]), quote }));
    await (await post({ text: COIN_A, sniff: 25 })).text();
    const again = await sniffGet(new Request(`https://api.test/api/sniff?mint=${COIN_A}`, { headers: { "x-real-ip": "10.3.3.3" } }));
    expect(await again.json()).toMatchObject({ ok: true, level: "warn" });
    expect(quote.calls).toHaveLength(2);
  });

  it("sends the coin's line even when its sniff gets no answer", async () => {
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A)]), readMint: fakeMintReader({ ok: false, reason: "not_a_mint" }) }));
    const lines = (await (await post({ text: COIN_A, sniff: 25 })).text()).trim().split("\n");
    expect(JSON.parse(lines[0]!)).toMatchObject({ status: "found" });
    expect(JSON.parse(lines[1]!)).toEqual({ sniff: null });
  });

  it("answers in one line when there is no one coin to sniff, or no sniff was asked for", async () => {
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A), token(COIN_B)]) }));
    const two = await post({ text: `${COIN_A} or ${COIN_B}`, sniff: 25 });
    expect(two.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await two.json()).toMatchObject({ status: "ambiguous" });
    for (const body of [{ text: COIN_A }, { text: COIN_A, sniff: 0 }, { text: COIN_A, sniff: "25" }]) {
      const one = await post(body);
      expect(one.headers.get("content-type"), JSON.stringify(body)).toBe("application/json; charset=utf-8");
      expect(await one.json()).toMatchObject({ status: "found" });
    }
  });

  it("never sniffs on a GET, which is cached for a minute", async () => {
    const quote = fakeQuoter();
    setDeps(fakeDeps({ search: fakeSearch([token(COIN_A)]), quote }));
    const res = await get(`text=${COIN_A}&sniff=25`);
    expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(quote.calls).toEqual([]);
  });

  it("slows down one caller after thirty", async () => {
    setDeps(fakeDeps());
    const codes: number[] = [];
    for (let i = 0; i < 31; i++) codes.push((await post({ text: "gm" }, "10.2.2.2")).status);
    expect(codes.slice(0, 30).every((c) => c === 200)).toBe(true);
    expect(codes[30]).toBe(429);
  });
});
