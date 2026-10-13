import { describe, expect, it } from "vitest";
import { books, gain, pnlOf, saleGain, since, sinceLine, tradeLine, type Trade } from "./pnl";

const COIN = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm";
const trade = (side: Trade["side"], usdc: number, amount: number, at: string, extra: Partial<Trade> = {}): Trade => ({
  id: `${side}-${at}`,
  at,
  owner: "w",
  mint: COIN,
  symbol: "ANSEM",
  icon: null,
  side,
  usdc,
  amount,
  exact: true,
  signature: null,
  ...extra,
});

describe("a coin's book", () => {
  it("adds up a buy and the sell of all of it", () => {
    const b = books([trade("buy", 10, 75.31, "2026-10-12T19:25:00Z"), trade("sell", 9.93, 75.31, "2026-10-12T19:26:00Z")]).get(COIN)!;
    expect(b.held).toBe(0);
    expect(b.basis).toBe(0);
    expect(b.realized).toBeCloseTo(-0.07, 6);
    expect(b.trades).toBe(2);
  });

  it("takes a partial sell's share of the cost, whatever order the trades are given in", () => {
    const b = books([trade("sell", 6, 50, "2026-10-12T19:26:00Z"), trade("buy", 10, 100, "2026-10-12T19:25:00Z")]).get(COIN)!;
    expect(b.held).toBe(50);
    expect(b.basis).toBe(5);
    expect(b.realized).toBe(1);
  });

  it("counts only the Spot part of a sell bigger than what Spot bought", () => {
    const b = books([trade("buy", 10, 100, "2026-10-12T19:25:00Z"), trade("sell", 40, 200, "2026-10-12T19:26:00Z")]).get(COIN)!;
    expect(b.held).toBe(0);
    expect(b.realized).toBe(10);
  });

  it("ignores a sell of a coin Spot never bought", () => {
    const b = books([trade("sell", 40, 200, "2026-10-12T19:26:00Z")]).get(COIN)!;
    expect(b.realized).toBe(0);
    expect(b.held).toBe(0);
  });
});

describe("since you aped", () => {
  const b = books([trade("buy", 10, 100, "2026-10-12T19:25:00Z")]).get(COIN)!;

  it("is what the held coins are worth now against what they cost", () => {
    expect(since(b, { amount: 100, usd: 12 })).toEqual({ usd: 2, pct: 20 });
    expect(sinceLine(since(b, { amount: 100, usd: 9.4 })!)).toBe("−$0.60 (−6.0%)");
  });

  it("counts only what the wallet still holds, and nothing when Spot bought none of it", () => {
    expect(since(b, { amount: 50, usd: 6 })!.usd).toBeCloseTo(1, 9);
    expect(since(b, null)).toBeNull();
    expect(since(books([trade("sell", 1, 1, "2026-10-12T19:26:00Z")]).get(COIN)!, { amount: 100, usd: 12 })).toBeNull();
  });
});

describe("one sale", () => {
  it("makes what it sold for less what that part cost", () => {
    const b = books([trade("buy", 10, 100, "2026-10-12T19:25:00Z")]).get(COIN);
    expect(saleGain(b, 50, 7)).toEqual({ usd: 2, pct: 40 });
    expect(saleGain(b, 100, 9.3)!.usd).toBeCloseTo(-0.7, 9);
    expect(saleGain(b, 200, 30)).toEqual({ usd: 5, pct: 50 });
    expect(saleGain(undefined, 50, 7)).toBeNull();
  });
});

describe("all your apes", () => {
  it("add the realized and the open up", () => {
    const trades = [
      trade("buy", 10, 75.31, "2026-10-12T19:25:00Z"),
      trade("sell", 9.93, 75.31, "2026-10-12T19:26:00Z"),
      trade("buy", 25, 100, "2026-10-12T19:30:00Z", { mint: "wif", symbol: "WIF", id: "wif-buy" }),
    ];
    const pnl = pnlOf(trades, [{ token: { mint: "wif" }, amount: 100, usd: 30 }]);
    expect(pnl.realized).toBeCloseTo(-0.07, 6);
    expect(pnl.open).toBe(5);
    expect(pnl.all).toBeCloseTo(4.93, 6);
    expect(pnl.trades).toBe(3);
    expect(gain(pnl.all)).toBe("+$4.93");
    expect(gain(-0.07)).toBe("−$0.07");
  });
});

describe("a trade's line", () => {
  it("says what went in and what came out, with a tilde on the quote's figures", () => {
    expect(tradeLine(trade("buy", 10, 75.31, "2026-10-12T19:25:00Z"))).toBe("$10.00 → 75.31 ANSEM");
    expect(tradeLine(trade("sell", 9.93, 75.31, "2026-10-12T19:26:00Z"))).toBe("75.31 ANSEM → $9.93");
    expect(tradeLine(trade("buy", 25, 113.5, "2026-10-12T19:25:00Z", { exact: false, symbol: "WIF" }))).toBe("~$25.00 → ~113.5 WIF");
  });
});
