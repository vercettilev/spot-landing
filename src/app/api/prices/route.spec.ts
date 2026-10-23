import { afterEach, describe, expect, it } from "vitest";
import { isAddress } from "@/engine/address";
import { setDeps } from "@/engine/deps";
import { COIN_A, COIN_B, COIN_C, fakeDeps, fakeSearch, token } from "@/engine/fakes";
import { GET } from "./route";

let ip = 0;
const get = (query: string, from = `10.4.0.${++ip}`) => GET(new Request(`https://api.test/api/prices?${query}`, { headers: { "x-real-ip": from } }));

afterEach(() => setDeps(null));

describe("GET /api/prices", () => {
  it("prices every coin asked for in one search, null where Jupiter has none", async () => {
    const search = fakeSearch([token(COIN_A, { usdPrice: 0.5 }), token(COIN_B, { usdPrice: undefined })]);
    setDeps(fakeDeps({ search }));
    const res = await get(`mints=${COIN_A},${COIN_B},${COIN_C},${COIN_A}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, s-maxage=30, stale-while-revalidate=60");
    expect(await res.json()).toEqual({ ok: true, prices: { [COIN_A]: 0.5, [COIN_B]: null, [COIN_C]: null } });
    expect(search.queries).toEqual([`${COIN_A},${COIN_B},${COIN_C}`]);
  });

  it("refuses no coins, too many, or something that is not an address", async () => {
    setDeps(fakeDeps());
    const eleven = Array.from({ length: 11 }, (_, i) => `${COIN_A.slice(0, -1)}${"123456789AB"[i]}`);
    expect(eleven.every(isAddress)).toBe(true);
    for (const q of ["", "mints=", `mints=${COIN_A},nope`, `mints=${eleven.join(",")}`]) {
      const res = await get(q);
      expect(res.status, q).toBe(400);
      expect(await res.json()).toEqual({ ok: false, error: "invalid_mints" });
    }
  });

  it("is 503 when Jupiter could not be asked", async () => {
    setDeps(fakeDeps({ search: fakeSearch([], "timeout") }));
    expect((await get(`mints=${COIN_A}`)).status).toBe(503);
  });
});
