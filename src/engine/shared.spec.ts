import { describe, expect, it } from "vitest";
import { COIN_A, COIN_B, fakeDeps, fakeQuoter, fakeSearch, fresh } from "@/engine/fakes";
import { sniffSharing, type SniffAnswer } from "./shared";
import { sniff } from "./sniff";

describe("one sniff for a crowd", () => {
  function counted(answer: (n: number) => SniffAnswer, ms = 0) {
    let runs = 0;
    const run = () => new Promise<SniffAnswer>((r) => setTimeout(() => r(answer(++runs)), ms));
    return { run, runs: () => runs };
  }
  async function real(level: "ok" | "unknown"): Promise<SniffAnswer> {
    const deps = fakeDeps({ search: fakeSearch([fresh(COIN_A)]), ...(level === "unknown" ? { quote: fakeQuoter({ sell: "timeout" }) } : {}) });
    return sniff(COIN_A, 25, deps);
  }

  it("is shared for ten seconds from the verdict, and while it runs", async () => {
    let t = 0;
    const share = sniffSharing(10_000, () => t);
    const ok = await real("ok");
    const s = counted(() => ok, 5);
    const [a, b] = await Promise.all([share(COIN_A, 25, s.run), share(COIN_A, 25, s.run)]);
    expect(a).toBe(b);
    expect(s.runs()).toBe(1);
    t = 9_999;
    await share(COIN_A, 25, s.run);
    expect(s.runs()).toBe(1);
    t = 10_000;
    await share(COIN_A, 25, s.run);
    expect(s.runs()).toBe(2);
  });

  it("is a coin at a size: another coin or another size is its own sniff", async () => {
    const share = sniffSharing(10_000, () => 0);
    const ok = await real("ok");
    const s = counted(() => ok);
    await share(COIN_A, 25, s.run);
    await share(COIN_A, 50, s.run);
    await share(COIN_B, 25, s.run);
    expect(s.runs()).toBe(3);
  });

  it("keeps no sniff that failed or could not finish", async () => {
    const share = sniffSharing(10_000, () => 0);
    const unknown = await real("unknown");
    expect(unknown.ok && unknown.value.level).toBe("unknown");
    const s = counted((n) => (n === 1 ? { ok: false, reason: "lookup_failed" } : unknown));
    await share(COIN_A, 25, s.run);
    await share(COIN_A, 25, s.run);
    await share(COIN_A, 25, s.run);
    expect(s.runs()).toBe(3);
  });
});
