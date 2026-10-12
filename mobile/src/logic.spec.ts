import { describe, expect, it } from "vitest";
import { actionFor, ago, amount, chipsFor, clampAmount, count, fromPaste, fromShare, money, ordered, pct, price, readablePath, shareOf, sourceLine, usd, verdictWord } from "./logic";
import type { Check } from "./types";

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
});

describe("the button", () => {
  it("apes, growls, refuses, or asks again", () => {
    expect(actionFor("ok", 25)).toEqual({ label: "Ape 25 USDC", enabled: true, tone: "go" });
    expect(actionFor("warn", 18)).toEqual({ label: "GRRR. Ape 18 USDC", enabled: true, tone: "growl" });
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
