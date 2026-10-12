import { describe, expect, it } from "vitest";
import {
  COIN_A,
  COIN_B,
  COPY_1,
  COPY_2,
  NVDAX,
  PAIR_A,
  WALLET,
  WBTC,
  fakeDeps,
  fakeExpand,
  fakePairs,
  fakePosts,
  fakeSearch,
  fresh,
  token,
} from "@/engine/fakes";
import type { Post } from "./posts";
import { resolve, type ResolveResult } from "./resolve";

const POST_URL = "https://x.com/ana_trades/status/1845678901234567890?s=46&t=AbCdEf";
const POST = "https://x.com/ana_trades/status/1845678901234567890";

const xPost = (text: string, links: string[] = []): Post => ({ platform: "x", text, author: "@ana_trades", links });

const mints = (r: ResolveResult) => r.candidates.map((c) => `${c.token.mint}:${c.via}`);

/* $EXAMPLE, the real one, and two small copies of it. */
const real = token(COIN_A, { symbol: "EXAMPLE" });
const copy1 = fresh(COPY_1, { symbol: "EXAMPLE" });
const copy2 = fresh(COPY_2, { symbol: "EXAMPLE", liquidity: 3_000 });

describe("a shared link", () => {
  it("to a coin's page is that coin", async () => {
    const r = await resolve({ url: `https://pump.fun/coin/${COIN_A}` }, fakeDeps({ search: fakeSearch([real]) }));
    expect(r.status).toBe("found");
    expect(r.pick).toMatchObject({ via: "link", token: { mint: COIN_A, symbol: "EXAMPLE" } });
    expect(r.source).toEqual({ platform: "web", url: `https://pump.fun/coin/${COIN_A}`, author: null, text: null });
  });

  it("to a pool is the coin the pool trades", async () => {
    const pairs = fakePairs({ [PAIR_A]: COIN_A });
    const r = await resolve(
      { url: `https://photon-sol.tinyastro.io/en/lp/${PAIR_A}?handle=ana` },
      fakeDeps({ search: fakeSearch([real]), pairs }),
    );
    expect(r.pick).toMatchObject({ via: "pair", token: { mint: COIN_A } });
    expect(pairs.asked).toEqual([[PAIR_A]]);
  });

  it("to Dexscreener, lowercased, is the coin once Dexscreener says whose pool it is", async () => {
    const lower = PAIR_A.toLowerCase();
    const r = await resolve({ url: `https://dexscreener.com/solana/${lower}` }, fakeDeps({ search: fakeSearch([real]), pairs: fakePairs({ [lower]: COIN_A }) }));
    expect(r.status).toBe("found");
    expect(r.pick?.via).toBe("pair");
  });

  it("that is short is asked where it goes first", async () => {
    const r = await resolve(
      { url: "https://t.co/AbC123" },
      fakeDeps({ search: fakeSearch([real]), expand: fakeExpand({ "https://t.co/AbC123": `https://pump.fun/coin/${COIN_A}` }) }),
    );
    expect(r.pick?.token.mint).toBe(COIN_A);
  });

  it("settles it, even when the words around it name another coin", async () => {
    const r = await resolve(
      { url: `https://pump.fun/coin/${COIN_A}`, text: `better than ${COIN_B} imo` },
      fakeDeps({ search: fakeSearch([real, token(COIN_B)]) }),
    );
    expect(r.status).toBe("found");
    expect(mints(r)).toEqual([`${COIN_A}:link`, `${COIN_B}:text`]);
  });
});

describe("a shared post", () => {
  it("with a CA in it is that coin, from that author", async () => {
    const posts = fakePosts({ [POST]: xPost(`$EXAMPLE breaking out.\nCA: ${COIN_A}`) });
    const r = await resolve({ url: POST_URL }, fakeDeps({ search: fakeSearch([real]), readPost: posts }));
    expect(r.status).toBe("found");
    expect(r.pick).toMatchObject({ via: "post", token: { mint: COIN_A } });
    expect(r.source).toEqual({ platform: "x", url: POST_URL, author: "@ana_trades", text: `$EXAMPLE breaking out.\nCA: ${COIN_A}` });
    expect(posts.read).toEqual([POST]);
  });

  it("with the coin behind a t.co link is that coin", async () => {
    const posts = fakePosts({ [POST]: xPost("this one 👇 https://t.co/AbC123", ["https://t.co/AbC123"]) });
    const expand = fakeExpand({ "https://t.co/AbC123": `https://pump.fun/coin/${COIN_B}` });
    const r = await resolve({ url: POST_URL }, fakeDeps({ search: fakeSearch([token(COIN_B)]), readPost: posts, expand }));
    expect(r.pick).toMatchObject({ via: "post", token: { mint: COIN_B } });
  });

  it("with two CAs asks which", async () => {
    const posts = fakePosts({ [POST]: xPost(`two plays: ${COIN_B} and ${COIN_A}`) });
    const r = await resolve({ url: POST_URL }, fakeDeps({ search: fakeSearch([real, token(COIN_B)]), readPost: posts }));
    expect(r.status).toBe("ambiguous");
    expect(r.pick).toBeNull();
    expect(mints(r)).toEqual([`${COIN_B}:post`, `${COIN_A}:post`]);
  });

  it("naming a wallet and a cashtag is the cashtag's coin", async () => {
    const posts = fakePosts({ [POST]: xPost(`dev wallet ${WALLET} still holding $EXAMPLE`) });
    const r = await resolve({ url: POST_URL }, fakeDeps({ search: fakeSearch([real, copy1, copy2]), readPost: posts }));
    expect(r.status).toBe("found");
    expect(r.pick).toMatchObject({ via: "cashtag", token: { mint: COIN_A } });
  });

  it("that cannot be read falls back on whatever else was shared, and says so", async () => {
    const r = await resolve(
      { url: POST_URL, text: `${POST_URL} $EXAMPLE` },
      fakeDeps({ search: fakeSearch([real, copy1]), readPost: fakePosts({ [POST]: "unavailable" }) }),
    );
    expect(r.status).toBe("found");
    expect(r.missed).toEqual(["post"]);
  });
});

describe("a cashtag", () => {
  const share = (text: string, tokens = [real, copy1, copy2]) => resolve({ text }, fakeDeps({ search: fakeSearch(tokens) }));

  it("is the coin that dwarfs its copies, with the copies kept as other choices", async () => {
    const r = await share("$EXAMPLE breaking out");
    expect(r.status).toBe("found");
    expect(mints(r)).toEqual([`${COIN_A}:cashtag`, `${COPY_1}:cashtag`, `${COPY_2}:cashtag`]);
  });

  it("shared by two real coins asks which", async () => {
    const twin = token(COIN_B, { symbol: "EXAMPLE", liquidity: 200_000, holderCount: 9_000 });
    const r = await share("$EXAMPLE", [real, twin]);
    expect(r.status).toBe("ambiguous");
    expect(mints(r)).toEqual([`${COIN_A}:cashtag`, `${COIN_B}:cashtag`]);
  });

  it("does not count a namesake Spot could never buy", async () => {
    const trap = token(COIN_B, { symbol: "EXAMPLE", liquidity: 240_000, holderCount: 11_000, freezeAuthority: "Dev111" });
    const r = await share("$EXAMPLE", [real, trap]);
    expect(r.status).toBe("found");
    expect(mints(r)).toEqual([`${COIN_A}:cashtag`]);
  });

  it("people write for an issued asset is the catalog's mint, not a squatter's", async () => {
    const squatter = fresh(COIN_B, { symbol: "BTC" });
    const r = await share("$BTC to 200k", [token(WBTC, { symbol: "WBTC" }), squatter]);
    expect(r.pick).toMatchObject({ via: "cashtag", token: { mint: WBTC } });
  });

  it("decides with the first, and the second rides along", async () => {
    const other = token(COIN_B, { symbol: "OTHER" });
    const r = await share("$EXAMPLE > $OTHER", [real, other]);
    expect(r.pick?.token.mint).toBe(COIN_A);
    expect(mints(r)).toEqual([`${COIN_A}:cashtag`, `${COIN_B}:cashtag`]);
  });

  it("that is currency is not a coin", async () => {
    expect((await share("up 20% in $USDC terms")).status).toBe("none");
  });
});

describe("words alone", () => {
  it("naming a tokenized stock suggest it, and only suggest it", async () => {
    const r = await resolve({ text: "NVIDIA earnings tonight, thoughts?" }, fakeDeps({ search: fakeSearch([token(NVDAX, { symbol: "NVDAx" })]) }));
    expect(r.status).toBe("ambiguous");
    expect(mints(r)).toEqual([`${NVDAX}:name`]);
    expect(r.candidates[0]!.token).toMatchObject({ kind: "stock", restrictions: ["us-persons"] });
  });

  it("with a CA pasted from a group chat are that coin", async () => {
    const r = await resolve({ text: `ape this ${COIN_A}` }, fakeDeps({ search: fakeSearch([real]) }));
    expect(r.pick).toMatchObject({ via: "text", token: { mint: COIN_A } });
    expect(r.source).toMatchObject({ platform: "text", url: null, text: `ape this ${COIN_A}` });
  });

  it("with nothing in them are nothing", async () => {
    const r = await resolve({ text: "gm" }, fakeDeps());
    expect(r).toMatchObject({ status: "none", pick: null, candidates: [], missed: [] });
  });
});

describe("an upstream that does not answer", () => {
  it("is named, so nothing found is not mistaken for nothing there", async () => {
    const r = await resolve({ text: `ape ${COIN_A}` }, fakeDeps({ search: fakeSearch([real], "timeout") }));
    expect(r.status).toBe("none");
    expect(r.missed).toContain("search");
  });

  it("includes a shortener that would not say where it goes", async () => {
    const r = await resolve({ url: "https://t.co/gone" }, fakeDeps());
    expect(r.missed).toEqual(["short_link"]);
  });
});
