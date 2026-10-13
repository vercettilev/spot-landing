import { describe, expect, it } from "vitest";
import { memoryKv } from "@/lib/memoryKv";
import { day, tallies, tally, tallyWallet } from "./tally";

const NOW = Date.parse("2026-10-13T09:00:00Z");

describe("the tally", () => {
  it("counts each event and its kind by the day, and the wallets seen without keeping them", async () => {
    const kv = memoryKv();
    await tally("sniff", "ok", kv, NOW);
    await tally("sniff", "block", kv, NOW);
    await tally("sniff", "ok", kv, NOW);
    await tally("order", "buy", kv, NOW);
    await tally("landed", undefined, kv, NOW);
    await tallyWallet("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", kv, NOW);
    await tallyWallet("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", kv, NOW);
    await tallyWallet("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", kv, NOW);
    await tally("sniff", "warn", kv, NOW - 86_400_000);

    const [today, yesterday] = await tallies(2, kv, NOW);
    expect(today).toEqual({
      day: "2026-10-13",
      resolve: { all: 0, found: 0, ambiguous: 0, none: 0 },
      sniff: { all: 3, ok: 2, warn: 0, block: 1, unknown: 0 },
      order: { all: 1, buy: 1, sell: 0, cash: 0 },
      landed: 1,
      bag: 0,
      wallets: 2,
    });
    expect(yesterday).toMatchObject({ day: "2026-10-12", sniff: { all: 1, warn: 1 } });
    expect(await kv.get("spot:tally:2026-10-13:wallets")).toBeNull();
  });

  it("counts nothing, and breaks nothing, without a database", async () => {
    await expect(tally("sniff", "ok", null)).resolves.toBeUndefined();
    await expect(tallyWallet("w", null)).resolves.toBeUndefined();
    expect(day(NOW)).toBe("2026-10-13");
  });

  it("forgets a day after ninety", async () => {
    const kv = memoryKv();
    await tally("bag", undefined, kv, NOW);
    kv.advance(89 * 86_400);
    expect((await tallies(1, kv, NOW))[0]!.bag).toBe(1);
    kv.advance(2 * 86_400);
    expect((await tallies(1, kv, NOW))[0]!.bag).toBe(0);
  });
});
