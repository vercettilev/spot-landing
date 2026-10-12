import { describe, expect, it } from "vitest";
import {
  COIN_A,
  HOUR,
  NOW,
  NVDAX,
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
      freeze: "Yes (good)",
      mint: "Yes (good)",
      liquidity: "Yes (good)",
      holders: "Yes (good)",
      age: "30 days (good)",
    });
  });

  it("prices the round trip", () => {
    expect(s.roundTrip).toEqual({ inUsdc: 25, outUsdc: 24.5, lossPct: 2 });
    expect(check(s, "honeypot")?.note).toBe("Round trip −2%.");
  });
});

describe("a fresh coin", () => {
  const s = judge(facts(fresh(COIN_A)));

  it("is warned, not blocked", () => {
    expect(s.level).toBe("warn");
    expect(s.checks.some((c) => c.blocks && c.status === "bad")).toBe(false);
  });

  it("says why in CT", () => {
    expect(answers(s)).toMatchObject({
      liquidity: "Only $4.2k (warn)",
      holders: "Only 38 (warn)",
      age: "12 min (warn)",
    });
    expect(check(s, "age")?.note).toBe("Fresh launch.");
  });

  it("is capped at 2% of its pool, never above the warn cap", () => {
    expect(s.maxBuyUsdc).toBe(50);
    expect(judge(facts(fresh(COIN_A, { liquidity: 900 }))).maxBuyUsdc).toBe(18);
    expect(judge(facts(fresh(COIN_A, { liquidity: 20 }))).maxBuyUsdc).toBe(1);
    expect(s.headline).toBe("GRRR. Ape small: 50 USDC max.");
  });

  it("with a dev who can still mint is a growl, not a wall", () => {
    const m = judge(facts(fresh(COIN_A), { mint: { mintAuthority: "Dev111" } }));
    expect(m.level).toBe("warn");
    expect(check(m, "mint")).toMatchObject({ answer: "No", status: "warn", blocks: false, note: "Dev can still print more." });
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
    expect(check(s, "honeypot")?.note).toBe("Selling straight back returns only 36%.");
  });

  it("a live freeze key, read from the chain", () => {
    const s = judge(facts(token(COIN_A), { mint: { freezeAuthority: "Dev111" } }));
    expect(s.level).toBe("block");
    expect(s.headline).toBe("Dev can freeze your bag. Spot won't buy it.");
  });

  it("a live freeze key, from Ultra when the chain did not answer", () => {
    const s = judge(facts(token(COIN_A, { freezeAuthority: "Dev111" }), { chain: { ok: false, reason: "timeout" } }));
    expect(check(s, "freeze")).toMatchObject({ answer: "No", status: "bad", blocks: true });
  });

  it("a pause switch, a paused token, accounts that start frozen", () => {
    expect(check(judge(facts(token(COIN_A), { mint: { pause: { authority: "P111", paused: false } } })), "freeze")?.note).toBe(
      "Dev can pause every transfer.",
    );
    expect(judge(facts(token(COIN_A), { mint: { pause: { authority: null, paused: true } } })).headline).toBe(
      "Transfers are paused right now. Spot won't buy it.",
    );
    expect(judge(facts(token(COIN_A), { mint: { startsFrozen: true } })).level).toBe("block");
  });

  it("a permanent delegate", () => {
    const s = judge(facts(token(COIN_A), { mint: { program: "token-2022", permanentDelegate: "Del111" } }));
    expect(s.level).toBe("block");
    expect(s.headline).toBe("Dev can take your bag. Spot won't buy it.");
  });

  it("a token that cannot move", () => {
    const s = judge(facts(token(COIN_A), { mint: { program: "token-2022", nonTransferable: true } }));
    expect(check(s, "honeypot")).toMatchObject({ answer: "Yes", status: "bad", note: "This token can't be moved, so it can't be sold." });
  });

  it("a tax of half or more", () => {
    const s = judge(facts(token(COIN_A), { mint: { program: "token-2022", transferFeeBps: 6_000 } }));
    expect(s.level).toBe("block");
    expect(s.headline).toBe("The tax eats the bag. Spot won't buy it.");
  });

  it("no route in at all", () => {
    const s = judge(facts(token(COIN_A), { buy: { ok: false, reason: "no_route" }, sell: null }));
    expect(s.level).toBe("block");
    expect(s.headline).toBe("No route to buy this right now.");
    expect(check(s, "honeypot")).toMatchObject({ status: "unknown", blocks: false });
  });
});

describe("what only growls", () => {
  it("a thin exit", () => {
    const s = judge(facts(token(COIN_A), { back: 20 }));
    expect(s.level).toBe("warn");
    expect(check(s, "honeypot")).toMatchObject({ answer: "Exit −20%", status: "warn", blocks: false });
  });

  it("a small transfer tax, and a transfer hook", () => {
    const s = judge(facts(token(COIN_A), { mint: { program: "token-2022", transferFeeBps: 300, transferHook: "Hook111" } }));
    expect(s.level).toBe("warn");
    expect(answers(s)).toMatchObject({ tax: "3% (warn)", hook: "Yes (warn)" });
  });

  it("Jupiter's own flag", () => {
    expect(judge(facts(token(COIN_A, { audit: { isSus: true } }))).level).toBe("warn");
  });

  it("a mint key on something big, old and verified is only noted", () => {
    const big = token(COIN_A, { liquidity: 3_000_000, holderCount: 70_000, isVerified: true, organicScoreLabel: "high" });
    const s = judge(facts(big, { mint: { mintAuthority: "Bridge111" } }));
    expect(s.level).toBe("ok");
    expect(check(s, "mint")).toMatchObject({ status: "info", note: "Big, old and verified: likely a bridge or a DAO." });
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
    expect(answers(s)).toMatchObject({ freeze: "No (info)", delegate: "Issuer (info)", mint: "No (info)", liquidity: "Only $1.2k (info)" });
  });

  it("carries its issuer and who may not hold it", () => {
    expect(s.token).toMatchObject({ kind: "stock", issuer: "xstocks", restrictions: ["us-persons"] });
  });

  it("is still blocked when there is no way out", () => {
    expect(judge(facts(stock, { sell: { ok: false, reason: "no_route" } })).level).toBe("block");
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
