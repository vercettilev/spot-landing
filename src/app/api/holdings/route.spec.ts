import { afterEach, describe, expect, it } from "vitest";
import { setDeps } from "@/engine/deps";
import { WALLET, fakeAccounts, fakeDeps } from "@/engine/fakes";
import { GET } from "./route";

let ip = 0;
const get = (query: string) => GET(new Request(`https://api.test/api/holdings?${query}`, { headers: { "x-real-ip": `10.3.0.${++ip}` } }));

afterEach(() => setDeps(null));

describe("GET /api/holdings", () => {
  it("answers a wallet's bag, briefly cacheable", async () => {
    setDeps(fakeDeps());
    const res = await get(`owner=${WALLET}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, s-maxage=10, stale-while-revalidate=20");
    expect(await res.json()).toMatchObject({ ok: true, owner: WALLET, totalUsd: 0, positions: [] });
  });

  it("refuses what is not an address, and says when the chain is down", async () => {
    setDeps(fakeDeps());
    expect((await get("owner=nope")).status).toBe(400);
    setDeps(fakeDeps({ readAccounts: fakeAccounts({ ok: false, reason: "timeout" }) }));
    expect(await (await get(`owner=${WALLET}`)).json()).toEqual({ ok: false, error: "lookup_failed" });
  });
});
