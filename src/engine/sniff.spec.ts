import { describe, expect, it } from "vitest";
import {
  COIN_A,
  HOUR,
  NOW,
  NVDAX,
  PAIR_A,
  classicMint,
  fakeDeps,
  fakeMintReader,
  fakeQuoter,
  fakeSearch,
  fresh,
  token,
} from "@/engine/fakes";
import type { MintFacts } from "./chain";
import type { Outcome } from "./http";
import type { Quote, QuoteFailure, TokenInfo } from "./jupiter";
import { age, judge, sniff, type CheckId, type Facts, type Sniff } from "./sniff";

const quote = (inAmount: string, outAmount: string): Outcome<Quote, QuoteFailure> => ({
  ok: true,
  value: { inAmount, outAmount, venues: [] },
});

/** 25 USDC in for 6,250 tokens, and `back` USDC out when they are sold. */
function facts(info: TokenInfo, over: Partial<Facts> & { back?: number; mint?: Partial<MintFacts> } = {}): Facts {
  const { back = 24.5, mint, ...rest } = over;
  return {
    info,
    chain: { ok: true, value: classicMint(mint) },
    buy: quote("25000000", "6250000000"),
    sell: quote("6250000000", String(Math.round(back * 1e6))),
    blueChip: false,
    amountUsdc: 25,
    now: NOW,
    ...rest,
  };
}

const check = (s: Sniff, id: CheckId) => s.checks.find((c) => c.id === id);
const answers = (s: Sniff) => Object.fromEntries(s.checks.map((c) => [c.id, `${c.answer} (${c.status})`]));

describe("a clean coin", () => {
  const s = judge(facts(token(COIN_A)));

  it("passes with nothing to say and no cap", () => {
    expect(s.level).toBe("ok");
    expect(s.headline).toBe("Nothing smells off.");
    expect(s.maxBuyUsdc).toBeNull();
  });

  it("answers the landing's four questions, and the size ones", () => {
    expect(answers(s)).toEqual({
      honeypot: "No (good)",
      freeze: "No (good)",
      mint: "No (good)",
      liquidity: "$250.0k (good)",
      holders: "12k (good)",
      age: "30 days (good)",
    });
  });

  it("prices the round trip", () => {
    expect(s.roundTrip).toEqual({ inUsdc: 25, outUsdc: 24.5, lossPct: 2 });
    expect(check(s, "honeypot")?.note).toBeNull();
  });
});

describe("a fresh coin", () => {
  const s = judge(facts(fresh(COIN_A)));

  it("is warned, not blocked", () => {
    expect(s.level).toBe("warn");
    expect(s.checks.some((c) => c.blocks && c.status === "bad")).toBe(false);
  });

  it("says why in plain CT", () => {
    expect(answers(s)).toMatchObject({
      liquidity: "Only $4.2k (warn)",
      holders: "Only 38 (warn)",
      age: "12 min (warn)",
    });
    expect(check(s, "age")?.note).toBe("Just launched.");
  });

  it("is capped at 2% of its pool, never above the warn cap", () => {
    expect(s.maxBuyUsdc).toBe(50);
    expect(judge(facts(fresh(COIN_A, { liquidity: 900 }))).maxBuyUsdc).toBe(18);
    expect(judge(facts(fresh(COIN_A, { liquidity: 20 }))).maxBuyUsdc).toBe(1);
    expect(s.headline).toBe("GRRR. Risky. Ape $50 max.");
  });

  it("with a dev who can still mint is a growl, not a wall", () => {
    const m = judge(facts(fresh(COIN_A), { mint: { mintAuthority: "Dev111" } }));
    expect(m.level).toBe("warn");
    expect(check(m, "mint")).toMatchObject({ answer: "Yes", status: "warn", blocks: false, note: "New coins can be printed and dumped on you." });
  });
});

describe("what blocks", () => {
  it("no way to sell it back", () => {
    const s = judge(facts(fresh(COIN_A), { sell: { ok: false, reason: "no_route" } }));
    expect(s.level).toBe("block");
    expect(s.headline).toBe("Honeypot. Spot won't buy it.");
    expect(check(s, "honeypot")).toMatchObject({ answer: "Yes", status: "bad", blocks: true });
    expect(s.maxBuyUsdc).toBe(0);
  });

  it("a way out that hands back less than half", () => {
    const s = judge(facts(token(COIN_A), { back: 9 }));
    expect(s.level).toBe("block");
    expect(check(s, "honeypot")?.note).toBe("Sell right after buying and you get only 36% back.");
  });

  it("a live freeze key, read from the chain", () => {
    const s = judge(facts(token(COIN_A), { mint: { freezeAuthority: "Dev111" } }));
    expect(s.level).toBe("block");
    expect(s.headline).toBe("Dev can freeze it. Spot won't buy it.");
    expect(check(s, "freeze")).toMatchObject({ label: "Dev can freeze it?", answer: "Yes", note: "The dev can lock your coins so you can't sell." });
  });

  it("a live freeze key, from Ultra when the chain did not answer", () => {
    const s = judge(facts(token(COIN_A, { freezeAuthority: "Dev111" }), { chain: { ok: false, reason: "timeout" } }));
    expect(check(s, "freeze")).toMatchObject({ answer: "Yes", status: "bad", blocks: true });
  });

  it("a pause switch, a paused token, accounts that start frozen", () => {
    expect(check(judge(facts(token(COIN_A), { mint: { pause: { authority: "P111", paused: false } } })), "freeze")?.note).toBe(
      "The dev can stop all trading.",
    );
    expect(judge(facts(token(COIN_A), { mint: { pause: { authority: null, paused: true } } })).headline).toBe(
      "Dev can freeze it. Spot won't buy it.",
    );
    expect(judge(facts(token(COIN_A), { mint: { startsFrozen: true } })).level).toBe("block");
  });

  it("a permanent delegate", () => {
    const s = judge(facts(token(COIN_A), { mint: { program: "token-2022", permanentDelegate: "Del111" } }));
    expect(s.level).toBe("block");
    expect(s.headline).toBe("Dev can take your coins. Spot won't buy it.");
  });

  it("a token that cannot move", () => {
    const s = judge(facts(token(COIN_A), { mint: { program: "token-2022", nonTransferable: true } }));
    expect(check(s, "honeypot")).toMatchObject({ answer: "Yes", status: "bad", note: "This coin can't be sent, so it can't be sold." });
  });

  it("a tax of half or more", () => {
    const s = judge(facts(token(COIN_A), { mint: { program: "token-2022", transferFeeBps: 6_000 } }));
    expect(s.level).toBe("block");
    expect(s.headline).toBe("The tax eats your bag. Spot won't buy it.");
  });

  it("no route in at all", () => {
    const s = judge(facts(token(COIN_A), { buy: { ok: false, reason: "no_route" }, sell: null }));
    expect(s.level).toBe("block");
    expect(s.headline).toBe("Can't buy this one right now.");
    expect(check(s, "honeypot")).toMatchObject({ status: "unknown", blocks: false });
  });
});

describe("what only growls", () => {
  it("a micro-cap: a pool under $50k, under 1,000 holders, or a day old", () => {
    /* Bonnie on 2026-10-23: a $34k coin, a $17.3k pool, 594 holders, two days old. It was CLEAN. */
    const bonnie = token(COIN_A, { mcap: 34_100, liquidity: 17_300, holderCount: 594, firstPool: { id: PAIR_A, createdAt: new Date(NOW - 48 * HOUR).toISOString() } });
    const s = judge(facts(bonnie));
    expect(s.level).toBe("warn");
    expect(s.headline).toBe("GRRR. Risky. Ape $50 max.");
    expect(answers(s)).toMatchObject({ liquidity: "Only $17.3k (warn)", holders: "Only 594 (warn)", age: "2 days (good)" });
    expect(judge(facts(token(COIN_A, { firstPool: { id: PAIR_A, createdAt: new Date(NOW - 20 * HOUR).toISOString() } }))).level).toBe("warn");
    /* Just over every floor is CLEAN. */
    const past = token(COIN_A, { liquidity: 50_000, holderCount: 1_000, firstPool: { id: PAIR_A, createdAt: new Date(NOW - 24 * HOUR).toISOString() } });
    expect(judge(facts(past)).level).toBe("ok");
  });

  it("a thin exit", () => {
    const s = judge(facts(token(COIN_A), { back: 20 }));
    expect(s.level).toBe("warn");
    expect(check(s, "honeypot")).toMatchObject({ answer: "Kinda", status: "warn", blocks: false, note: "Sell right after buying and you lose 20%." });
  });

  it("a small transfer tax, and a transfer hook", () => {
    const s = judge(facts(token(COIN_A), { mint: { program: "token-2022", transferFeeBps: 300, transferHook: "Hook111" } }));
    expect(s.level).toBe("warn");
    expect(answers(s)).toMatchObject({ tax: "3% (warn)", hook: "Maybe (warn)" });
  });

  it("Jupiter's own flag", () => {
    expect(judge(facts(token(COIN_A, { audit: { isSus: true } }))).level).toBe("warn");
  });

  it("a mint key on something big and verified is only noted", () => {
    const big = token(COIN_A, { liquidity: 3_000_000, holderCount: 70_000, isVerified: true, organicScoreLabel: "high" });
    const s = judge(facts(big, { mint: { mintAuthority: "Bridge111" } }));
    expect(s.level).toBe("ok");
    expect(check(s, "mint")).toMatchObject({ status: "info", note: "Normal for a big, verified coin." });
  });

  it("a mint key is forgiven from a $250k pool, 5,000 holders, verified and medium organic trading, all four", () => {
    /* Seeker's SKR on 2026-10-21: $640k, 46.5k holders, verified, organic medium, its mint key kept. */
    const skr = token(COIN_A, { liquidity: 640_000, holderCount: 46_500, isVerified: true, organicScoreLabel: "medium" });
    const s = judge(facts(skr, { mint: { mintAuthority: "Issuer111" } }));
    expect(s.level).toBe("ok");
    expect(check(s, "mint")).toMatchObject({ answer: "Yes", status: "info" });
    for (const short of [
      { liquidity: 249_000 },
      { holderCount: 4_999 },
      { isVerified: false },
      { organicScoreLabel: "low" },
    ]) {
      const m = judge(facts(token(COIN_A, { liquidity: 640_000, holderCount: 46_500, isVerified: true, organicScoreLabel: "medium", ...short }), { mint: { mintAuthority: "Issuer111" } }));
      expect(check(m, "mint")).toMatchObject({ status: "warn" });
    }
  });
});

describe("what waits for an answer", () => {
  it("an exit Jupiter could not price right now", () => {
    for (const f of [
      facts(token(COIN_A), { buy: { ok: false, reason: "timeout" }, sell: null }),
      facts(token(COIN_A), { sell: { ok: false, reason: "rate_limited" } }),
    ]) {
      const s = judge(f);
      expect(s.level).toBe("unknown");
      expect(s.headline).toBe("Couldn't finish the sniff. Try again.");
      expect(s.maxBuyUsdc).toBe(0);
    }
  });

  it("Token-2022 settings the chain did not hand over", () => {
    const s = judge(facts(token(COIN_A, { tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" }), { chain: { ok: false, reason: "rate_limited" } }));
    expect(s.level).toBe("unknown");
    expect(check(s, "delegate")).toMatchObject({ answer: "?", status: "unknown", blocks: true, observed: "rate_limited" });
  });

  it("but a classic token has no such settings, so a silent chain costs nothing", () => {
    const s = judge(facts(token(COIN_A), { chain: { ok: false, reason: "timeout" } }));
    expect(s.level).toBe("ok");
    expect(check(s, "delegate")).toBeUndefined();
  });
});

describe("an issued asset", () => {
  const stock = token(NVDAX, {
    symbol: "NVDAx",
    name: "NVIDIA xStock",
    tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    liquidity: 1_200,
    holderCount: 90,
    firstPool: { id: COIN_A, createdAt: new Date(NOW - HOUR).toISOString() },
  });
  const s = judge(
    facts(stock, {
      mint: { program: "token-2022", mintAuthority: "Issuer111", freezeAuthority: "Issuer111", permanentDelegate: "Issuer111" },
    }),
  );

  it("keeps its issuer's keys without a growl, shown as what they are", () => {
    expect(s.level).toBe("ok");
    expect(answers(s)).toMatchObject({ freeze: "Issuer (info)", delegate: "Issuer (info)", mint: "Issuer (info)", liquidity: "Only $1.2k (info)" });
  });

  it("carries its issuer and who may not hold it", () => {
    expect(s.token).toMatchObject({ kind: "stock", issuer: "xstocks", restrictions: ["us-persons"] });
  });

  it("is still blocked when there is no way out", () => {
    expect(judge(facts(stock, { sell: { ok: false, reason: "no_route" } })).level).toBe("block");
  });
});

describe("a blue chip", () => {
  it("needs no test trade: verified, big and old is answer enough", () => {
    const s = judge(facts(token(COIN_A), { blueChip: true, buy: null, sell: null }));
    expect(s.level).toBe("ok");
    expect(s.headline).toBe("Blue chip. Nothing smells off.");
    expect(check(s, "honeypot")).toMatchObject({ answer: "No", status: "good", note: "Blue chip: it trades everywhere." });
    expect(check(s, "route")).toBeUndefined();
    expect(s.roundTrip).toBeNull();
    expect(s.maxBuyUsdc).toBeNull();
  });

  it("still has its keys read from the chain", () => {
    const s = judge(facts(token(COIN_A), { blueChip: true, buy: null, sell: null, mint: { freezeAuthority: "dev" } }));
    expect(s.level).toBe("block");
    expect(s.headline).toBe("Dev can freeze it. Spot won't buy it.");
  });

  it("keeps its mint key without a growl, whatever its numbers say today", () => {
    /* Seeker's SKR is on Spot's list, its key kept to mint on a schedule: clean on a slow day too. */
    const slow = token(COIN_A, { liquidity: 90_000, holderCount: 4_000, isVerified: true, organicScoreLabel: "low" });
    const s = judge(facts(slow, { blueChip: true, buy: null, sell: null, mint: { mintAuthority: "Issuer111" } }));
    expect(s.level).toBe("ok");
    expect(s.headline).toBe("Blue chip. Nothing smells off.");
    expect(check(s, "mint")).toMatchObject({ answer: "Yes", status: "info", note: "Normal for a big, verified coin." });
  });

  it("isn't growled at for a small figure: it was vetted already", () => {
    /* DRIFT and fih, on Spot's list, under CLEAN's pool floor on 2026-10-23. */
    const thin = token(COIN_A, { liquidity: 20_667, holderCount: 27_902 });
    const s = judge(facts(thin, { blueChip: true, buy: null, sell: null }));
    expect(s.level).toBe("ok");
    expect(answers(s)).toMatchObject({ liquidity: "Only $20.7k (info)" });
  });

  it("isn't growled at for a figure Jupiter didn't send", () => {
    const gaps = token(COIN_A, { liquidity: undefined, holderCount: undefined, firstPool: undefined });
    const s = judge(facts(gaps, { blueChip: true, buy: null, sell: null }));
    expect(s.level).toBe("ok");
    expect(answers(s)).toMatchObject({ liquidity: "? (info)", holders: "? (info)", age: "? (info)" });
    expect(judge(facts(gaps)).level).toBe("warn");
  });
});

describe("ages", () => {
  it("read the way people say them", () => {
    expect(age(12 * 60_000)).toBe("12 min");
    expect(age(5 * HOUR)).toBe("5 h");
    expect(age(30 * 24 * HOUR)).toBe("30 days");
    expect(age(900 * 24 * HOUR)).toBe("2 yrs");
  });
});

describe("sniffing", () => {
  it("asks for the record, the mint and a buy at once, then sells back exactly what the buy gets", async () => {
    const quoter = fakeQuoter({ tokensPerUsdc: 250, exitShare: 0.97 });
    const deps = fakeDeps({ search: fakeSearch([token(COIN_A)]), quote: quoter });
    const res = await sniff(COIN_A, 25, deps);
    expect(res.ok && res.value.level).toBe("ok");
    expect(quoter.calls).toEqual([
      { inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", outputMint: COIN_A, amount: "25000000" },
      { inputMint: COIN_A, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "6250000000" },
    ]);
    expect(res.ok && res.value.roundTrip).toEqual({ inUsdc: 25, outUsdc: 24.25, lossPct: 3 });
  });

  it("asks Jupiter for no quote on a catalog coin, and for no sell on one its record shows is established", async () => {
    const quoter = fakeQuoter();
    const stock = await sniff(NVDAX, 25, fakeDeps({ search: fakeSearch([token(NVDAX)]), quote: quoter }));
    expect(quoter.calls).toEqual([]);
    expect(stock.ok && stock.value.headline).toBe("Blue chip. Nothing smells off.");

    const again = fakeQuoter();
    const big = token(COIN_A, { isVerified: true, liquidity: 2_000_000, holderCount: 100_000, organicScoreLabel: "high" });
    const res = await sniff(COIN_A, 25, fakeDeps({ search: fakeSearch([big]), quote: again }));
    expect(again.calls).toHaveLength(1);
    expect(res.ok && res.value.headline).toBe("Blue chip. Nothing smells off.");
    expect(res.ok && res.value.roundTrip).toBeNull();
  });

  it("does not sell what it could not buy", async () => {
    const quoter = fakeQuoter({ buy: "no_route" });
    await sniff(COIN_A, 25, fakeDeps({ search: fakeSearch([token(COIN_A)]), quote: quoter }));
    expect(quoter.calls).toHaveLength(1);
  });

  it("is not found, not a mint, or not possible right now", async () => {
    expect(await sniff(COIN_A, 25, fakeDeps({ search: fakeSearch([]) }))).toEqual({ ok: false, reason: "not_found" });
    expect(await sniff(COIN_A, 25, fakeDeps({ search: fakeSearch([]), readMint: fakeMintReader({ ok: false, reason: "not_a_mint" }) }))).toEqual({
      ok: false,
      reason: "not_a_mint",
    });
    expect(await sniff(COIN_A, 25, fakeDeps({ search: fakeSearch([token(COIN_A)], "timeout") }))).toEqual({ ok: false, reason: "lookup_failed" });
  });
});
