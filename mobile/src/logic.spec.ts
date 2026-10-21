import { describe, expect, it } from "vitest";
import { MAX_TRADE, coinLine, coinsOf, foldChecks, moreChecks, plainShortFill, actionFor, emptyBag, faceSources, ago, amount, approx, candidateLine, cardLines, cashLede, coverWith, turnKey, chipsFor, clampAmount, count, dockKey, dockNote, fitFigure, fromPaste, fromShare, maxApe, momentLines, money, needsCash, ordered, padHint, pct, price, readablePath, sameName, shareFor, solHolding, solPosition, SOL_MINT, shareOf, shareText, shareWord, sourceLine, typeDigit, usd, verdictHead, verdictWord, worth, type DockState } from "./logic";
import { pnlOf } from "./pnl";
import type { Candidate, Check, Holding } from "./types";

describe("a share", () => {
  it("keeps the link and the words around it, once", () => {
    expect(fromShare({ webUrl: "https://x.com/a/status/1", text: "look https://x.com/a/status/1" })).toEqual({
      url: "https://x.com/a/status/1",
      text: "look https://x.com/a/status/1",
      from: "share",
    });
    expect(fromShare({ webUrl: "https://x.com/a/status/1", text: "https://x.com/a/status/1" })).toEqual({
      url: "https://x.com/a/status/1",
      from: "share",
    });
    expect(fromShare({ text: "  ape GAKD…  " })).toEqual({ text: "ape GAKD…", from: "share" });
  });

  it("that carried nothing is nothing", () => {
    expect(fromShare({ text: " ", webUrl: null })).toBeNull();
    expect(fromShare(null)).toBeNull();
  });
});

describe("a paste", () => {
  it("is a link when it is only a link, and text otherwise", () => {
    expect(fromPaste(" https://pump.fun/coin/abc ")).toEqual({ url: "https://pump.fun/coin/abc", from: "paste" });
    expect(fromPaste("$WIF")).toEqual({ text: "$WIF", from: "paste" });
    expect(fromPaste("look https://x.com/a")).toEqual({ text: "look https://x.com/a", from: "paste" });
    expect(fromPaste("   ")).toBeNull();
  });
});

describe("the amount chips", () => {
  it("are 10, 25, 50 without a cap", () => {
    expect(chipsFor(null)).toEqual([10, 25, 50]);
  });

  it("stop at a warned coin's cap, with the cap one tap away", () => {
    expect(chipsFor(50)).toEqual([10, 25, 50]);
    expect(chipsFor(18)).toEqual([10, 18]);
    expect(chipsFor(5)).toEqual([5]);
    expect(chipsFor(0)).toEqual([]);
    expect(clampAmount(25, 18)).toBe(18);
    expect(clampAmount(25, null)).toBe(25);
  });
});

describe("numbers", () => {
  it("read the way CT writes them", () => {
    expect(usd(6_588_668)).toBe("$6.6M");
    expect(usd(220_011_203)).toBe("$220.0M");
    expect(usd(4_200)).toBe("$4.2k");
    expect(usd(900)).toBe("$900");
    expect(usd(null)).toBe("—");
    expect(money(1077.1)).toBe("$1,077.10");
    expect(money(0.004)).toBe("$0.00");
    expect(money(2_400_000)).toBe("$2.4M");
    expect(price(229.585)).toBe("$229.59");
    expect(price(0.2202673)).toBe("$0.2203");
    expect(price(0.0021)).toBe("$0.0021");
    expect(price(0.0001234)).toBe("$0.0001234");
    expect(price(0.00001234)).toBe("$0.0₄1234");
    expect(price(0.0000001234)).toBe("$0.0₆1234");
    expect(price(0.0001)).toBe("$0.0001");
    expect(pct(2.3275)).toBe("+2.3%");
    expect(pct(-0.37)).toBe("−0.4%");
    expect(pct(812.4)).toBe("+812%");
    expect(count(38)).toBe("38");
    expect(count(1_432)).toBe("1.4k");
    expect(count(267_086)).toBe("267k");
    expect(count(1_234_567)).toBe("1.2M");
  });
});

describe("the report's order", () => {
  it("puts the landing's four questions first", () => {
    const c = (id: Check["id"]): Check => ({ id, label: id, answer: "", status: "good", blocks: false, note: null, observed: null, threshold: null });
    expect(ordered([c("age"), c("holders"), c("liquidity"), c("mint"), c("freeze"), c("honeypot")]).map((x) => x.id)).toEqual([
      "honeypot",
      "freeze",
      "mint",
      "holders",
      "liquidity",
      "age",
    ]);
  });
});

describe("where it came from", () => {
  const share = { from: "share" as const };
  it("names the poster and the app", () => {
    expect(sourceLine({ platform: "x", url: "https://x.com/a/status/1", author: "@ana_trades", text: null }, share)).toBe("from @ana_trades on X");
    expect(sourceLine({ platform: "web", url: "https://pump.fun/coin/abc", author: null, text: null }, share)).toBe("from pump.fun");
    expect(sourceLine({ platform: "text", url: null, author: null, text: "$WIF" }, { from: "paste" })).toBe("from your paste");
  });

  it("says Try it's coin is Spot's pick, not a paste", () => {
    expect(sourceLine({ platform: "text", url: null, author: null, text: "$WIF" }, { from: "try" })).toBe("from Spot");
  });
});

describe("SOL in the bag", () => {
  const bag = (sol: { amount: number; usd: number | null; token?: never }) => ({ ok: true as const, owner: "w", totalUsd: 0, usdc: { amount: 0, raw: "0", usd: 0 }, sol, positions: [], hidden: 0 });
  it("is a coin, Solana, worth all of it, with a dollar kept back from what a sell can take", () => {
    const h = solHolding({ amount: 0.9, usd: 90 })!;
    expect(h.token).toMatchObject({ mint: SOL_MINT, symbol: "SOL", name: "Solana", decimals: 9 });
    expect(h.usd).toBe(90);
    expect(h.amount).toBe(0.9);
    expect(Number(h.raw)).toBe(900_000_000 - 10_000_000);
  });
  it("is the server's card when it sent one", () => {
    const token = { mint: SOL_MINT, symbol: "SOL", name: "Solana", icon: "i", decimals: 9, kind: "coin" as const, priceUsd: 100, mcapUsd: 1, liquidityUsd: 1, holders: 1, change24hPct: 2.5, verified: true, issuer: null, restrictions: [] };
    expect(solHolding({ amount: 1, usd: 100, token })!.token.change24hPct).toBe(2.5);
  });
  it("is nothing when there is none, and nothing to trade under a dollar", () => {
    expect(solHolding({ amount: 0, usd: 0 })).toBeNull();
    expect(solHolding({ amount: 0.5, usd: null })).toBeNull();
    expect(solPosition(SOL_MINT, bag({ amount: 0.008, usd: 0.8 }))).toBeNull();
    expect(solPosition(SOL_MINT, bag({ amount: 0.9, usd: 90 }))?.token.name).toBe("Solana");
    expect(solPosition("EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", bag({ amount: 0.9, usd: 90 }))).toBeNull();
  });
  it("sits among the coins by its worth, and what Spot bought of it counts in the all-time figure", () => {
    const wif = { token: { mint: "wif", symbol: "WIF" }, amount: 100, raw: "100000000", usd: 120 } as unknown as Holding;
    const bonk = { token: { mint: "bonk", symbol: "BONK" }, amount: 1e6, raw: "100000000000", usd: 20 } as unknown as Holding;
    const coins = coinsOf({ ...bag({ amount: 1, usd: 110 }), positions: [wif, bonk] });
    expect(coins.map((c) => c.token.symbol)).toEqual(["WIF", "SOL", "BONK"]);
    const bought = { id: "b", at: "2026-10-21T10:00:00Z", owner: "w", mint: SOL_MINT, symbol: "SOL", icon: null, side: "buy" as const, usdc: 100, amount: 1, exact: false, signature: null };
    expect(pnlOf([bought], coins).open).toBeCloseTo(10, 6);
    expect(coinsOf(bag({ amount: 0, usd: 0 }))).toEqual([]);
  });
});

describe("a row's worth", () => {
  it("is whole dollars, and cents under a dollar, never a $0 for something", () => {
    expect(worth(374.2)).toBe("$374");
    expect(worth(1.4)).toBe("$1");
    expect(worth(0.27)).toBe("$0.27");
    expect(worth(0.004)).toBe("<$0.01");
    expect(worth(0)).toBe("$0");
    expect(worth(null)).toBe("—");
  });
});

describe("which one?", () => {
  const coin = (mint: string, symbol: string) => ({ token: { mint, symbol } }) as unknown as Candidate;
  it("calls coins namesakes only when they share the name", () => {
    expect(sameName([coin("a", "WIF"), coin("b", "wif")])).toBe(true);
    expect(sameName([coin("a", "WIF"), coin("b", "Bonk")])).toBe(false);
    expect(sameName([coin("a", "WIF")])).toBe(false);
  });
});

describe("the button", () => {
  it("apes, growls, refuses, or asks again", () => {
    expect(actionFor("ok", 25)).toEqual({ label: "Ape $25", enabled: true, tone: "buy" });
    expect(actionFor("warn", 18)).toEqual({ label: "GRRR. Ape $18", enabled: true, tone: "growl" });
    expect(actionFor("block", 25)).toMatchObject({ enabled: false, tone: "stop" });
    expect(actionFor("unknown", 25)).toMatchObject({ label: "Sniff again", enabled: true });
    expect(actionFor("loading", 25)).toMatchObject({ enabled: false });
  });
});

describe("the feed's words", () => {
  const now = Date.parse("2026-10-12T12:00:00Z");
  it("say how long ago", () => {
    expect(ago("2026-10-12T11:59:30Z", now)).toBe("now");
    expect(ago("2026-10-12T11:55:00Z", now)).toBe("5m");
    expect(ago("2026-10-12T09:00:00Z", now)).toBe("3h");
    expect(ago("2026-10-10T12:00:00Z", now)).toBe("2d");
    expect(ago("2026-08-01T12:00:00Z", now)).toBe("10w");
  });

  it("put a verdict in one word", () => {
    expect(verdictWord("ok")).toEqual({ word: "Clean", status: "good" });
    expect(verdictWord("block")).toEqual({ word: "NOPE", status: "bad" });
  });

  it("count a bag", () => {
    expect(amount(6250)).toBe("6,250");
    expect(amount(1_234_567)).toBe("1.2M");
    expect(amount(12.3456)).toBe("12.35");
    expect(amount(0.0015)).toBe("0.0015");
  });

  it("sell a share of a holding without asking for more than is there", () => {
    expect(shareOf("6250000000", 50)).toBe("3125000000");
    expect(shareOf("999", 25)).toBe("249");
    expect(shareOf("6250000000", 100)).toBe("6250000000");
    expect(shareOf("nope", 50)).toBe("0");
  });
});

describe("a shared screenshot", () => {
  it("reaches the reader as a path it can open", () => {
    expect(readablePath("file:///data/user/0/fun.usespot.app/cache/Screenshot_1.png", "android")).toBe("/data/user/0/fun.usespot.app/cache/Screenshot_1.png");
    expect(readablePath("content://media/external/images/media/42", "android")).toBe("content://media/external/images/media/42");
    expect(readablePath("file:///var/mobile/shot.png", "ios")).toBe("file:///var/mobile/shot.png");
  });
});

describe("the moment after a trade", () => {
  it("says what happened in three lines, loudest where the money is", () => {
    expect(momentLines({ kind: "ape", symbol: "WIF", usdc: 25, amount: 113.5 })).toEqual({ head: "Aped.", big: "$25.00 → 113.5 WIF", small: "In your bag. Sniffed for rugs first.", backdrop: "orange" });
    expect(momentLines({ kind: "cash", symbol: "USDC", usdc: 50, amount: 50 })).toEqual({ head: "Cash in.", big: "$50.00 ready to ape", small: "From SOL, in one tap.", backdrop: "orange" });
    expect(momentLines({ kind: "sell", symbol: "ANSEM", usdc: 9.93, amount: 75.31 })).toEqual({ head: "Sold.", big: "75.31 ANSEM → $9.93", small: "Back in your wallet as cash.", backdrop: "orange" });
  });

  it("leads a sell with what it made, and takes a loss on the chin", () => {
    expect(momentLines({ kind: "sell", symbol: "WIF", usdc: 37.4, amount: 100, gain: { usd: 12.4, pct: 49.6 } })).toEqual({
      head: "Sold.",
      big: "+$12.40 (+49.6%)",
      small: "since you aped\n$37.40 is back in your wallet as cash.",
      backdrop: "green",
    });
    expect(momentLines({ kind: "sell", symbol: "ANSEM", usdc: 9.93, amount: 75.31, gain: { usd: -0.07, pct: -0.7 } })).toEqual({
      head: "Sold.",
      big: "−$0.07 (−0.7%)",
      small: "It happens.\n$9.93 is back in your wallet as cash.",
      backdrop: "orange",
    });
    expect(momentLines({ kind: "sell", symbol: "X", usdc: 5, amount: 1, gain: { usd: 2, pct: null } }).big).toBe("+$2.00");
  });
});

describe("the card people post", () => {
  it("leads with the percentage, says the dollars and the coin, and credits the sniff", () => {
    expect(cardLines({ kind: "sell", symbol: "WIF", usdc: 37.4, amount: 100, gain: { usd: 12.4, pct: 49.6 } })).toEqual({
      figure: "+49.6%",
      line: "+$12.40 on $WIF\nsince I aped",
      foot: "Sniffed for rugs first.",
      tint: "green",
    });
    expect(cardLines({ kind: "sell", symbol: "ANSEM", usdc: 9.93, amount: 75.31, gain: { usd: -0.07, pct: -0.7 } })).toMatchObject({ figure: "−0.7%", foot: "It happens.", tint: "orange" });
    expect(cardLines({ kind: "ape", symbol: "WIF", usdc: 25, amount: 113.5 })).toEqual({ figure: "Aped.", line: "$25.00 of $WIF", foot: "Sniffed for rugs first.", tint: "orange" });
  });

  it("reads as one line when there is no picture to share", () => {
    expect(shareText({ kind: "sell", symbol: "WIF", usdc: 37.4, amount: 100, gain: { usd: 12.4, pct: 49.6 } })).toBe("+49.6%: +$12.40 on $WIF since I aped. Sniffed for rugs first. usespot.fun");
    expect(shareText({ kind: "ape", symbol: "WIF", usdc: 25, amount: 113.5 })).toBe("Aped. $25.00 of $WIF. Sniffed for rugs first. usespot.fun");
    expect(shareText({ kind: "sell", symbol: "ANSEM", usdc: 9.93, amount: 75.31 })).toBe("Sold. 75.31 ANSEM → $9.93. usespot.fun");
  });

  it("sets its figure as big as the card allows: a word at full size, a wide percentage smaller", () => {
    expect(fitFigure("Aped.", 436)).toBe(132);
    expect(fitFigure("+49.6%", 436)).toBe(119);
    expect(fitFigure("+1,234.5%", 436)).toBe(85);
    expect(fitFigure("", 436)).toBe(132);
  });
});

describe("the stamp and the line under it", () => {
  it("does not say GRRR twice", () => {
    expect(verdictHead("warn", "GRRR. Risky. Ape $50 max.")).toBe("Risky. Spot caps buys at $50.");
    expect(verdictHead("warn", "GRRR. Risky. Ape $1,000 max.")).toBe("Risky. Spot caps buys at $1,000.");
    expect(verdictHead("warn", "GRRR.")).toBe("GRRR.");
    expect(verdictHead("ok", "Blue chip. Nothing smells off.")).toBe("Blue chip. Nothing smells off.");
    expect(verdictHead("block", "Honeypot. Spot won't buy it.")).toBe("Honeypot. Spot won't buy it.");
  });
});

describe("the dock", () => {
  const base: DockState = {
    side: "buy",
    sniff: "ok",
    amount: 25,
    wallet: "mwa",
    cash: 120,
    solCovers: false,
    restricted: false,
    busy: false,
    checking: null,
    held: null,
    sellPct: 50,
  };

  it("locks the key while a trade may still land, whatever else is true", () => {
    expect(dockKey({ ...base, checking: { landed: false, seconds: 73 } })).toEqual({ label: "Checking… 73s left", enabled: false, tone: "wait" });
    expect(dockKey({ ...base, side: "sell", held: 31.2, checking: { landed: true, seconds: 4 } })).toEqual({ label: "Updating your bag…", enabled: false, tone: "wait" });
    expect(dockKey({ ...base, sniff: "warn", cash: 0, checking: { landed: false, seconds: 9 } }).enabled).toBe(false);
    expect(dockNote({ ...base, checking: { landed: false, seconds: 73 } })).toBe("Making sure it went through. You can leave, Spot will tell you.");
  });

  it("apes in dollars, growls, and never offers a buy Spot blocks", () => {
    expect(dockKey(base)).toEqual({ label: "Ape $25", enabled: true, tone: "buy" });
    expect(dockKey({ ...base, sniff: "warn", amount: 18 })).toEqual({ label: "GRRR. Ape $18", enabled: true, tone: "growl" });
    expect(dockKey({ ...base, sniff: "block" })).toMatchObject({ label: "Spot won't buy this", enabled: false });
    expect(dockKey({ ...base, sniff: "block", cash: 0 })).toMatchObject({ enabled: false });
    expect(dockKey({ ...base, sniff: "loading" })).toMatchObject({ label: "Sniffing…", enabled: false });
    expect(dockKey({ ...base, sniff: "error" })).toMatchObject({ label: "Sniff again", enabled: true });
    expect(dockKey({ ...base, busy: true })).toMatchObject({ label: "Aping…", enabled: false });
  });

  it("asks for cash when the dollars are short, and says how to get them", () => {
    expect(needsCash({ ...base, cash: 3 })).toBe(true);
    expect(dockKey({ ...base, cash: 3 })).toEqual({ label: "Add cash", enabled: true, tone: "go" });
    expect(dockNote({ ...base, cash: 3 })).toBe("Only $3.00 in USDC. Add cash, then ape.");
    expect(dockNote({ ...base, cash: 3, solCovers: true })).toBe("Only $3.00 in USDC. Turn some SOL into cash first.");
    expect(needsCash({ ...base, cash: null })).toBe(false);
    /* Right after an ape the cash is spent and the coin is held: nothing to fix, so nothing shouts. */
    expect(dockKey({ ...base, cash: 0, held: 25.09 })).toEqual({ label: "Add cash to ape more", enabled: true, tone: "quiet" });
    expect(dockNote({ ...base, cash: 0, held: 25.09 })).toBe("Sell it anytime: tap Sell below.");
    expect(needsCash({ ...base, cash: 3, wallet: "watch" })).toBe(false);
    expect(needsCash({ ...base, cash: 3, sniff: "block" })).toBe(false);
  });

  it("keeps a coin the issuer won't sell in the US away from US users", () => {
    expect(dockKey({ ...base, restricted: true })).toEqual({ label: "Not for US users", enabled: false, tone: "stop" });
    expect(dockKey({ ...base, restricted: true, cash: 3 }).enabled).toBe(false);
    expect(dockNote({ ...base, restricted: true })).toBe("You said you're in the US. Change that in Settings.");
  });

  it("waits for an amount while the keypad is empty, and still locks while a trade may land", () => {
    expect(dockKey({ ...base, empty: true })).toEqual({ label: "Type an amount", enabled: false, tone: "stop" });
    expect(dockKey({ ...base, side: "sell", held: 31.2, empty: true })).toEqual({ label: "Type an amount", enabled: false, tone: "stop" });
    expect(dockKey({ ...base, empty: true, checking: { landed: false, seconds: 12 } }).label).toBe("Checking… 12s left");
  });

  it("sells a share for what it is worth", () => {
    const sell = { ...base, side: "sell" as const, held: 31.2 };
    expect(dockKey(sell)).toEqual({ label: "Sell 50% for about $16", enabled: true, tone: "sell" });
    expect(dockKey({ ...sell, sellPct: 100 }).label).toBe("Sell all for about $31");
    expect(dockKey({ ...sell, sellPct: 48.4 }).label).toBe("Sell 48.4% for about $15");
    expect(dockKey({ ...sell, held: 0.84, sellPct: 50 }).label).toBe("Sell 50% for about $0.42");
    expect(dockKey({ ...sell, held: null })).toMatchObject({ enabled: false });
    expect(dockKey({ ...sell, busy: true })).toMatchObject({ label: "Selling…", enabled: false });
    expect(dockNote(sell)).toBeNull();
    expect(dockNote({ ...sell, wallet: "watch" })).toBe("You're only tracking this wallet. Connect yours to sell.");
  });

  it("says nothing when the key says it all, and what to do first when there is something", () => {
    expect(dockNote(base)).toBeNull();
    expect(dockNote({ ...base, cash: null })).toBeNull();
    expect(dockNote({ ...base, wallet: "none", cash: null })).toBeNull();
    expect(dockNote({ ...base, sniff: "loading" })).toBeNull();
    expect(dockNote({ ...base, sniff: "block" })).toBeNull();
    expect(dockNote({ ...base, wallet: "watch" })).toBe("You're only tracking this wallet. Connect yours to ape.");
  });
});

describe("the keypad", () => {
  it("types dollars, no leading zeros, nothing past the most allowed", () => {
    expect(typeDigit("", "4", 10_000)).toEqual({ next: "4", over: false });
    expect(typeDigit("4", "0", 10_000)).toEqual({ next: "40", over: false });
    expect(typeDigit("", "0", 10_000)).toEqual({ next: "", over: false });
    expect(typeDigit("5", "1", 50)).toEqual({ next: "5", over: true });
    expect(typeDigit("1000", "0", 10_000)).toEqual({ next: "10000", over: false });
    expect(typeDigit("10000", "0", 10_000)).toEqual({ next: "10000", over: true });
  });

  it("offers a most that makes sense: the cash, under the cap and the server's limit", () => {
    expect(maxApe(120.5, null)).toBe(120);
    expect(maxApe(120.5, 50)).toBe(50);
    expect(maxApe(25_000, null)).toBe(MAX_TRADE);
    expect(maxApe(0.4, 50)).toBe(50);
    expect(maxApe(null, null)).toBeNull();
    expect(maxApe(0.4, null)).toBeNull();
  });

  it("says the cap, the cash, or what a sell amount is of the bag", () => {
    const buy = { side: "buy" as const, typed: 40, over: false, cap: null, cash: 120 };
    expect(padHint({ ...buy, held: null })).toBe("$120.00 ready to ape.");
    expect(padHint({ ...buy, typed: 200, held: null })).toBe("More than your $120.00. Add cash first.");
    expect(padHint({ ...buy, cap: 50, held: null })).toBe("Spot caps this one at $50.");
    expect(padHint({ ...buy, over: true, held: null })).toBe("Up to $10,000 a trade.");
    expect(padHint({ ...buy, over: true, cap: 50, held: null })).toBe("Spot caps this one at $50.");
    expect(padHint({ ...buy, cash: null, held: null })).toBe("");
    const sell = { side: "sell" as const, over: false, cap: null, cash: null, held: 31.2 };
    expect(padHint({ ...sell, typed: null })).toBe("You hold $31.20.");
    expect(padHint({ ...sell, typed: 15 })).toBe("48.1% of your $31.20.");
    expect(padHint({ ...sell, typed: 31 })).toBe("99.4% of your $31.20.");
    expect(padHint({ ...sell, typed: 40, over: true })).toBe("You hold $31.20.");
    expect(shareFor(31.2, 31.2)).toBe(100);
    expect(shareFor(0.01, 31.2)).toBe(0.1);
    expect(shareFor(5, 0)).toBe(0);
    expect(shareWord(50)).toBe("50%");
    expect(shareWord(100)).toBe("all");
    expect(approx(15.4)).toBe("about $15");
    expect(approx(0.42)).toBe("about $0.42");
  });
});

describe("which one?", () => {
  it("tells same-named coins apart by size and holders", () => {
    expect(candidateLine({ name: "Pepe", mcapUsd: 1_179_967, holders: 22_958 })).toBe("Pepe. $1.2M market cap, 23k holders");
    expect(candidateLine({ name: "pesos", mcapUsd: 9_096, holders: 2 })).toBe("pesos. $9.1k market cap, 2 holders");
    expect(candidateLine({ name: "New", mcapUsd: null, holders: null })).toBe("New");
  });
});

describe("adding cash", () => {
  it("locks the swap key while a swap may still land", () => {
    expect(turnKey({ pending: { landed: false, seconds: 64 }, busy: false, chosen: 25 })).toEqual({ label: "Checking… 64s left", enabled: false });
    expect(turnKey({ pending: { landed: true, seconds: 3 }, busy: false, chosen: 25 })).toEqual({ label: "Updating your bag…", enabled: false });
    expect(turnKey({ pending: null, busy: true, chosen: 25 })).toEqual({ label: "Turning…", enabled: false });
    expect(turnKey({ pending: null, busy: false, chosen: 50 })).toEqual({ label: "Turn $50 of SOL into cash", enabled: true });
  });

  it("says what the wallet has, never leading with $0.00, and nothing when it has nothing", () => {
    expect(cashLede(0, 90)).toBe("You have about $90 in SOL.");
    expect(cashLede(3, 90)).toBe("You have $3.00 in cash and about $90 in SOL.");
    expect(cashLede(3, 0.3)).toBe("You have $3.00 in cash.");
    expect(cashLede(0, 0)).toBeNull();
    expect(cashLede(null, null)).toBeNull();
  });

  it("picks the swap that covers the ape", () => {
    expect(coverWith([25, 50, 100], 25, 3)).toBe(25);
    expect(coverWith([25, 50, 100], 80, 3)).toBe(100);
    expect(coverWith([25, 50, 89], 500, 0)).toBe(89);
    expect(coverWith([25, 50], null, null)).toBe(25);
    expect(coverWith([], 25, 0)).toBeNull();
  });
});

describe("the bag", () => {
  it("is empty under a dollar", () => {
    expect(emptyBag(0)).toBe(true);
    expect(emptyBag(0.62)).toBe(true);
    expect(emptyBag(255.55)).toBe(false);
  });
});

describe("a coin's face", () => {
  const cid = "bafkreibk3covs5ltyqxa272uodhculbr6kea6betidfwy3ajsav2vjzyum";
  it("tries IPFS through gateways that answer, the same picture from each", () => {
    expect(faceSources(`https://${cid}.ipfs.nftstorage.link`)).toEqual([
      `https://4everland.io/ipfs/${cid}`,
      `https://${cid}.ipfs.nftstorage.link`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
    ]);
    expect(faceSources(`ipfs://${cid}/logo.png`)).toEqual([
      `https://4everland.io/ipfs/${cid}/logo.png`,
      `https://gateway.pinata.cloud/ipfs/${cid}/logo.png`,
      `https://ipfs.io/ipfs/${cid}/logo.png`,
    ]);
    expect(faceSources(`https://ipfs.io/ipfs/QmYfUZh6dXGTjexNNXnUgNazU8MVsK1dcfvrPDGz3dRrNz`)).toEqual([
      "https://4everland.io/ipfs/QmYfUZh6dXGTjexNNXnUgNazU8MVsK1dcfvrPDGz3dRrNz",
      "https://ipfs.io/ipfs/QmYfUZh6dXGTjexNNXnUgNazU8MVsK1dcfvrPDGz3dRrNz",
      "https://gateway.pinata.cloud/ipfs/QmYfUZh6dXGTjexNNXnUgNazU8MVsK1dcfvrPDGz3dRrNz",
    ]);
  });

  it("tries anything else as given, and nothing when there is none", () => {
    expect(faceSources("https://arweave.net/FyNde0I6M7gOYB6Ui_wnCFPraX4AQIaEcr6rB9gWPAQ")).toEqual(["https://arweave.net/FyNde0I6M7gOYB6Ui_wnCFPraX4AQIaEcr6rB9gWPAQ"]);
    expect(faceSources(null)).toEqual([]);
  });
});

describe("a bad quote's question", () => {
  it("says the price is bad, without a pool the receipt may call big", () => {
    expect(plainShortFill("Thin pool. Your $25 only buys about $12 of it.")).toBe("Bad price right now. Your $25 only buys about $12 of it.");
    expect(plainShortFill("Thin pool. You'd get $7 back, not $10.")).toBe("Bad price right now. You'd get $7 back, not $10.");
    expect(plainShortFill("Something else.")).toBe("Something else.");
  });
});

describe("the receipt, shortened", () => {
  const ck = (id: Check["id"], status: Check["status"] = "good"): Check => ({ id, label: id, answer: "", status, blocks: false, note: null, observed: null, threshold: null });
  it("shows every check that isn't clean, in the report's order, and folds the clean ones", () => {
    const clean = foldChecks([ck("age"), ck("liquidity"), ck("holders"), ck("mint"), ck("freeze"), ck("honeypot")]);
    expect(clean.shown).toEqual([]);
    expect(clean.folded.map((c) => c.id)).toEqual(["honeypot", "freeze", "mint", "holders", "liquidity", "age"]);
    const risky = foldChecks([ck("age", "warn"), ck("liquidity"), ck("holders"), ck("mint", "warn"), ck("freeze"), ck("honeypot", "unknown")]);
    expect(risky.shown.map((c) => c.id)).toEqual(["honeypot", "mint", "age"]);
    expect(risky.folded.map((c) => c.id)).toEqual(["freeze", "holders", "liquidity"]);
  });

  it("says how many checks the fold holds: all of them, or the rest", () => {
    expect(moreChecks(8, true)).toBe("All 8 checks clear");
    expect(moreChecks(1, true)).toBe("1 check, clear");
    expect(moreChecks(2)).toBe("2 more checks clear");
    expect(moreChecks(1)).toBe("1 more check clear");
  });

  it("names the coin, and says when it is a stock coin", () => {
    expect(coinLine({ name: "dogwifhat", kind: "coin" })).toBe("dogwifhat");
    expect(coinLine({ name: "Tesla xStock", kind: "stock" })).toBe("Tesla xStock, a stock coin");
  });
});
