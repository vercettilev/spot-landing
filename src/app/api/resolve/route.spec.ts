import { afterEach, describe, expect, it } from "vitest";
import { setDeps } from "@/engine/deps";
import { COIN_A, fakeDeps, fakePosts, fakeSearch, token } from "@/engine/fakes";
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

  it("slows down one caller after thirty", async () => {
    setDeps(fakeDeps());
    const codes: number[] = [];
    for (let i = 0; i < 31; i++) codes.push((await post({ text: "gm" }, "10.2.2.2")).status);
    expect(codes.slice(0, 30).every((c) => c === 200)).toBe(true);
    expect(codes[30]).toBe(429);
  });
});
