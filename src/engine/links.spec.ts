import { describe, expect, it } from "vitest";
import { COIN_A, COIN_B, PAIR_A, WIF } from "@/engine/fakes";
import { decodedLength, findAddresses, isAddress } from "./address";
import { findUrls, readLink } from "./links";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("an address", () => {
  it("is base58 that decodes to 32 bytes", () => {
    expect(isAddress(WIF)).toBe(true);
    expect(isAddress(USDC)).toBe(true);
    expect(decodedLength("11111111111111111111111111111111")).toBe(32);
  });

  it("is not a base58-looking word, a truncated paste or a lowercased copy", () => {
    expect(isAddress(WIF.slice(0, 31))).toBe(false);
    expect(isAddress(`${WIF}9`)).toBe(false);
    expect(isAddress("0OIl" + WIF.slice(4))).toBe(false);
    expect(isAddress(WIF.toLowerCase())).toBe(false);
  });

  it("is found in text first-seen-first, once, and never as USDC or a program", () => {
    const text = `ape ${COIN_B} now. also ${COIN_A}, and ${COIN_B} again. paid in ${USDC} via JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`;
    expect(findAddresses(text)).toEqual([COIN_B, COIN_A]);
  });

  it("is not found inside a longer base58 run, like a transaction signature", () => {
    const sig = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";
    expect(findAddresses(`tx ${sig}`)).toEqual([]);
  });
});

describe("the links in shared text", () => {
  it("are found with and without a scheme, trailing punctuation dropped", () => {
    const text = `look (https://x.com/ana/status/123456789?s=46). or pump.fun/coin/${COIN_A}!`;
    expect(findUrls(text)).toEqual(["https://x.com/ana/status/123456789?s=46", `https://pump.fun/coin/${COIN_A}`]);
  });

  it("are each found once", () => {
    expect(findUrls(`https://pump.fun/coin/${COIN_A} https://pump.fun/coin/${COIN_A}`)).toHaveLength(1);
  });
});

describe("a link", () => {
  it("names the coin a launchpad or terminal page is about", () => {
    for (const url of [
      `https://pump.fun/coin/${COIN_A}`,
      `https://birdeye.so/token/${COIN_A}?chain=solana`,
      `https://solscan.io/token/${COIN_A}`,
      `https://gmgn.ai/sol/token/r3f_${COIN_A}`,
      `https://neo.bullx.io/terminal?chainId=1399811149&address=${COIN_A}`,
      `https://jup.ag/swap/USDC-${COIN_A}`,
      `https://jup.ag/swap/${USDC}-${COIN_A}`,
      `https://t.me/solana_trojanbot?start=r-ana-${COIN_A}`,
    ]) {
      expect(readLink(url)?.addresses, url).toEqual([COIN_A]);
    }
  });

  it("reads an X post as a post, whatever mirror it came through", () => {
    for (const url of [
      "https://x.com/ana_trades/status/1845678901234567890?s=46&t=AbCdEfGhIjKlMnOp",
      "https://twitter.com/ana_trades/status/1845678901234567890",
      "https://mobile.twitter.com/ana_trades/status/1845678901234567890/photo/1",
      "https://fxtwitter.com/ana_trades/status/1845678901234567890",
    ]) {
      const link = readLink(url);
      expect(link?.platform, url).toBe("x");
      expect(link?.post).toEqual({
        platform: "x",
        id: "1845678901234567890",
        canonical: "https://x.com/ana_trades/status/1845678901234567890",
      });
    }
  });

  it("reads TikTok, YouTube and public Telegram posts", () => {
    expect(readLink("https://www.tiktok.com/@ana.trades/video/7412345678901234567?lang=en")?.post).toEqual({
      platform: "tiktok",
      canonical: "https://www.tiktok.com/@ana.trades/video/7412345678901234567",
    });
    for (const url of ["https://youtu.be/dQw4w9WgXcQ?si=x", "https://www.youtube.com/shorts/dQw4w9WgXcQ", "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=3"]) {
      expect(readLink(url)?.post, url).toEqual({ platform: "youtube", id: "dQw4w9WgXcQ", canonical: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
    }
    expect(readLink("https://t.me/s/solana_calls/4821")?.post).toEqual({
      platform: "telegram",
      channel: "solana_calls",
      canonical: "https://t.me/solana_calls/4821",
    });
    expect(readLink("https://t.me/c/1234567890/42")?.post).toBeNull();
  });

  it("knows a shortener when it sees one", () => {
    expect(readLink("https://t.co/AbC123xyz")?.short).toBe(true);
    expect(readLink("https://vm.tiktok.com/ZMabc123/")?.short).toBe(true);
    expect(readLink("https://www.tiktok.com/t/ZTabc123/")?.short).toBe(true);
    expect(readLink(`https://pump.fun/coin/${COIN_A}`)?.short).toBe(false);
  });

  it("keeps Dexscreener's lowercased address aside until Dexscreener says whose it is", () => {
    const lower = "7qbrf6ysyguxuvs6y1q64bdvrfe4zcuuz1jrdovnujnm";
    const link = readLink(`https://dexscreener.com/solana/${lower}`);
    expect(link?.addresses).toEqual([]);
    expect(link?.loose).toEqual([lower]);
    expect(readLink(`https://dexscreener.com/solana/${PAIR_A}`)?.addresses).toEqual([PAIR_A]);
  });

  it("is nothing when it is not a web link", () => {
    expect(readLink("javascript:alert(1)")).toBeNull();
    expect(readLink("not a url")).toBeNull();
    expect(readLink(`ftp://pump.fun/coin/${COIN_A}`)).toBeNull();
  });
});
