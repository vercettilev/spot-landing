import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64, isAddressLike, short, toAddress } from "./base58";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("a wallet's address", () => {
  it("comes back from Mobile Wallet Adapter as base64 and reads as base58", () => {
    expect(toAddress("xvp6877brTo9ZfNqq8l0MbG75MLS9uDkfKYCA0UvXWE=")).toBe(USDC);
    expect(toAddress("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")).toBe("11111111111111111111111111111111");
  });

  it("already in base58 stays as it is", () => {
    expect(toAddress(USDC)).toBe(USDC);
  });

  it("is told apart from words", () => {
    expect(isAddressLike(` ${USDC} `)).toBe(true);
    expect(isAddressLike("not an address")).toBe(false);
    expect(isAddressLike("0x52908400098527886E0F7030069857D2E4169EE7")).toBe(false);
  });

  it("shortens to its ends", () => {
    expect(short(USDC)).toBe("EPjF…Dt1v");
  });
});

describe("base64, for what the wallet signs", () => {
  it("goes there and back, padded as the wallet expects", () => {
    const text = "Sign this message to authenticate with Jupiter";
    const bytes = new TextEncoder().encode(text);
    expect(bytesToBase64(bytes)).toBe(Buffer.from(text).toString("base64"));
    expect(new TextDecoder().decode(base64ToBytes(bytesToBase64(bytes)))).toBe(text);
    for (const n of [0, 1, 2, 3, 64]) {
      const b = Uint8Array.from({ length: n }, (_, i) => (i * 37) % 256);
      expect(bytesToBase64(b)).toBe(Buffer.from(b).toString("base64"));
    }
  });
});

