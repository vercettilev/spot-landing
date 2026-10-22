import { describe, expect, it } from "vitest";
import { sessionAt, walletHome } from "./home";

describe("a wallet's home", () => {
  it("is an absolute https address, nothing else", () => {
    expect(walletHome("https://phantom.app/ul/v1")).toBe("https://phantom.app/ul/v1");
    expect(walletHome("https://wallet.example.com")).toBe("https://wallet.example.com");
    expect(walletHome("solana-wallet://v1")).toBeNull();
    expect(walletHome("http://phantom.app/ul/v1")).toBeNull();
    expect(walletHome("https://phantom.app/ul?x=1")).toBeNull();
    expect(walletHome("https://")).toBeNull();
    expect(walletHome("")).toBeNull();
    expect(walletHome(null)).toBeNull();
  });
});

describe("a wallet session", () => {
  const HOME = "https://phantom.app/ul/v1";
  /* A stand-in for MWA's transact: the wallet at `answers` takes the session, any other never answers. */
  function wallets(answers: (config?: { baseUri: string }) => boolean) {
    const calls: (string | null)[] = [];
    const transact = async (session: (w: string) => Promise<string>, config?: { baseUri: string }) => {
      calls.push(config?.baseUri ?? null);
      if (!answers(config)) throw new Error("Session not established: Local association cancelled by user");
      return session("wallet");
    };
    return { calls, transact };
  }

  it("opens at the wallet's home when it has one", async () => {
    const w = wallets(() => true);
    await expect(sessionAt(w.transact, HOME, async () => "signed", () => {})).resolves.toBe("signed");
    expect(w.calls).toEqual([HOME]);
  });

  it("forgets the home when the wallet there never answered, and opens nothing again on its own", async () => {
    const w = wallets((config) => !config);
    let lost = 0;
    await expect(sessionAt(w.transact, HOME, async () => "signed", () => lost++)).rejects.toThrow("Session not established");
    expect(w.calls).toEqual([HOME]);
    expect(lost).toBe(1);
    /* The next tap goes through Android's own pick. */
    await expect(sessionAt(w.transact, null, async () => "signed", () => lost++)).resolves.toBe("signed");
    expect(w.calls).toEqual([HOME, null]);
  });

  it("keeps the home when the wallet answered and its owner said no", async () => {
    const w = wallets(() => true);
    let lost = 0;
    const declined = async () => {
      throw new Error("declined");
    };
    await expect(sessionAt(w.transact, HOME, declined, () => lost++)).rejects.toThrow("declined");
    expect(w.calls).toEqual([HOME]);
    expect(lost).toBe(0);
  });

  it("is Android's pick, once, without a home", async () => {
    const w = wallets(() => false);
    await expect(sessionAt(w.transact, null, async () => "signed", () => {})).rejects.toThrow("Session not established");
    expect(w.calls).toEqual([null]);
  });
});
