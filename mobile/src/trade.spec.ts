import { describe, expect, it } from "vitest";
import { failedLine, fateLine, fateOf, moved, orderErrorLine, quoteUsd, secondsLeft, settled, shortFill, snapshotOf, type Pending } from "./trade";
import type { Holdings, TokenCard } from "./types";

const COIN = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm";

const bag = (coinRaw: string | null, usdcRaw: string): Holdings => ({
  ok: true,
  owner: "w",
  totalUsd: 0,
  usdc: { amount: Number(usdcRaw) / 1e6, raw: usdcRaw, usd: Number(usdcRaw) / 1e6 },
  sol: { amount: 0.02, usd: 3 },
  positions: coinRaw === null ? [] : [{ token: { mint: COIN } as Holdings["positions"][number]["token"], amount: 1, raw: coinRaw, usd: 1 }],
  hidden: 0,
});

describe("an execute answer", () => {
  it("is landed on Success, failed only when final, and unsure otherwise", () => {
    expect(settled({ ok: true, value: { ok: true, status: "Success", signature: "s", error: null, final: true } })).toBe("landed");
    expect(settled({ ok: true, value: { ok: true, status: "Failed", signature: "s", error: "x", final: true } })).toBe("failed");
    expect(settled({ ok: true, value: { ok: true, status: "Failed", signature: null, error: "x", final: false } })).toBe("unsure");
  });

  it("is unsure whenever the trade may have reached Jupiter", () => {
    for (const error of ["pending", "timeout", "offline", "busy", "lookup_failed", "bad"] as const) {
      expect(settled({ ok: false, error })).toBe("unsure");
    }
    expect(settled({ ok: false, error: "trading_closed" })).toBe("failed");
    expect(settled({ ok: false, error: "needs_key" })).toBe("failed");
  });
});

describe("a wallet that moved", () => {
  it("shows a buy by the coin coming in or the USDC going out", () => {
    const before = snapshotOf(bag("100", "30000000"), COIN)!;
    expect(moved("buy", before, snapshotOf(bag("250", "30000000"), COIN)!)).toBe(true);
    expect(moved("buy", before, snapshotOf(bag("100", "5000000"), COIN)!)).toBe(true);
    expect(moved("buy", before, snapshotOf(bag("100", "30000000"), COIN)!)).toBe(false);
  });

  it("sees a buy of a coin too new to be listed, by the USDC it cost", () => {
    const before = snapshotOf(bag(null, "30000000"), COIN)!;
    expect(before.coin).toBe("0");
    expect(moved("buy", before, snapshotOf(bag(null, "20000000"), COIN)!)).toBe(true);
  });

  it("shows a sell by the coin going out or the USDC coming in", () => {
    const before = snapshotOf(bag("100", "0"), COIN)!;
    expect(moved("sell", before, snapshotOf(bag("50", "0"), COIN)!)).toBe(true);
    expect(moved("sell", before, snapshotOf(bag(null, "0"), COIN)!)).toBe(true);
    expect(moved("sell", before, snapshotOf(bag("100", "12000000"), COIN)!)).toBe(true);
    expect(moved("sell", before, snapshotOf(bag("100", "0"), COIN)!)).toBe(false);
  });

  it("reads amounts past a float's exact range exactly", () => {
    const before = { coin: "9007199254740993", usdc: "0" };
    expect(moved("buy", before, { coin: "9007199254740994", usdc: "0" })).toBe(true);
    expect(moved("sell", before, { coin: "9007199254740992", usdc: "0" })).toBe(true);
  });

  it("is nothing to compare without a bag", () => {
    expect(snapshotOf(null, COIN)).toBeNull();
  });
});

describe("a quote", () => {
  it("pays a sell in USDC and a buy in coins at their price", () => {
    expect(quoteUsd("sell", { outAmount: "6100000" }, { decimals: 9, priceUsd: null })).toBe(6.1);
    expect(quoteUsd("buy", { outAmount: "12500000000" }, { decimals: 9, priceUsd: 2 })).toBe(25);
    expect(quoteUsd("buy", { outAmount: "12500000000" }, { decimals: 9, priceUsd: null })).toBeNull();
    expect(quoteUsd("buy", { outAmount: "12" }, { decimals: 0, priceUsd: 2 })).toBeNull();
    expect(quoteUsd("sell", { outAmount: "n/a" }, { decimals: 6, priceUsd: 1 })).toBeNull();
  });

  it("stops for a yes when it pays much less than the price says", () => {
    expect(shortFill(12, 6.1)).toEqual({ expectedUsd: 12, gotUsd: 6.1 });
    expect(shortFill(25, 23)).toBeNull();
    expect(shortFill(25, 21.5)).toBeNull();
    expect(shortFill(25, 21)).toEqual({ expectedUsd: 25, gotUsd: 21 });
    expect(shortFill(1.5, 0.2)).toBeNull();
    expect(shortFill(25, null)).toBeNull();
  });
});

describe("a trade that did not start", () => {
  it("says why in plain words", () => {
    expect(orderErrorLine("refused", { message: "1 Insufficient funds" }, "buy")).toBe("Not enough USDC. Add cash, then ape.");
    expect(orderErrorLine("refused", { message: "Insufficient SOL for fees" }, "buy")).toBe("Add a little SOL for fees first, about $1 worth.");
    expect(orderErrorLine("refused", { message: "Insufficient funds" }, "sell")).toBe("Your wallet holds less than that now. Refresh your bag.");
    expect(orderErrorLine("refused", undefined, "buy")).toBe("Jupiter wouldn't take this trade. Try again.");
    expect(orderErrorLine("offline", undefined, "buy")).toBe("No internet. Nothing was spent.");
    expect(orderErrorLine("over_cap", undefined, "buy")).toBe("Too much for this coin. Pick a smaller amount.");
  });

  it("and one the chain turned down says nothing changed hands", () => {
    const failed = (error: string) => ({ ok: true as const, value: { ok: true as const, status: "Failed" as const, signature: "s", error, final: true } });
    expect(failedLine(failed("Slippage tolerance exceeded"), "buy")).toBe("Price moved too fast. Nothing was bought. Try again.");
    expect(failedLine(failed("custom program error"), "sell")).toBe("Didn't go through. Nothing was sold.");
  });
});

describe("a trade still waited on", () => {
  const p: Pending = {
    owner: "w",
    mint: COIN,
    token: { mint: COIN, symbol: "X" } as TokenCard,
    side: "buy",
    landed: false,
    before: { coin: "0", usdc: "30000000" },
    until: 100_000,
    text: "Aped $10 of $X",
    signature: null,
  };

  it("has landed once the wallet shows it, whatever the clock says", () => {
    expect(fateOf(p, { coin: "75", usdc: "30000000" }, 1)).toBe("landed");
    expect(fateOf(p, { coin: "0", usdc: "20000000" }, 999_999)).toBe("landed");
  });

  it("is looked for until a little after it could last land, and counts the seconds down", () => {
    expect(fateOf(p, { coin: "0", usdc: "30000000" }, 100_000)).toBeNull();
    expect(fateOf(p, null, 105_000)).toBeNull();
    expect(fateOf(p, { coin: "0", usdc: "30000000" }, 106_000)).toBeNull();
    expect(secondsLeft(p, 10_000)).toBe(96);
    expect(secondsLeft(p, 100_000)).toBe(6);
    expect(secondsLeft(p, 105_500)).toBe(1);
    expect(secondsLeft(p, 200_000)).toBe(0);
  });

  it("is lost after that, or unread when the wallet could not be read either side", () => {
    expect(fateOf(p, { coin: "0", usdc: "30000000" }, 106_001)).toBe("lost");
    expect(fateOf(p, null, 106_001)).toBe("unread");
    expect(fateOf({ ...p, before: null }, { coin: "99", usdc: "0" }, 106_001)).toBe("unread");
  });

  it("that already landed only waits for the bag, and never turns into a loss", () => {
    const landed = { ...p, landed: true, until: 12_000 };
    expect(fateOf(landed, { coin: "0", usdc: "30000000" }, 12_000)).toBeNull();
    expect(fateOf(landed, { coin: "0", usdc: "30000000" }, 12_001)).toBe("landed");
    expect(fateOf(landed, null, 12_001)).toBe("landed");
    expect(secondsLeft(landed, 10_000)).toBe(2);
  });

  it("says what became of it in plain words", () => {
    expect(fateLine(p, "landed")).toBe("Aped $10 of $X.");
    expect(fateLine(p, "lost")).toBe("Didn't go through. Nothing was bought.");
    expect(fateLine({ ...p, side: "sell" }, "lost")).toBe("Didn't go through. Nothing was sold.");
    expect(fateLine(p, "unread")).toBe("Couldn't read your wallet. Check your bag before you go again.");
  });
});
