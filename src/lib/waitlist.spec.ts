import { describe, expect, it } from "vitest";
import { getIp, looksLikeEmail, makeRateLimiter, parsePlatform, PLATFORMS } from "./waitlist";

describe("parsePlatform", () => {
  it("accepts exactly the three phones the form offers, in any case", () => {
    expect(PLATFORMS.map((p) => parsePlatform(p))).toEqual(["iphone", "android", "seeker"]);
    expect(parsePlatform(" iPhone ")).toBe("iphone");
    expect(parsePlatform("SEEKER")).toBe("seeker");
  });

  it("refuses anything else, so the count stays a count of phones", () => {
    for (const v of ["", "ios", "pixel", "windows phone", null, undefined, 3, ["iphone"]]) {
      expect(parsePlatform(v)).toBeNull();
    }
  });
});

describe("looksLikeEmail", () => {
  it("lets ordinary addresses through and stops obvious non-addresses", () => {
    expect(looksLikeEmail("reader@example.com")).toBe(true);
    expect(looksLikeEmail(" a.b+spot@mail.co.uk ")).toBe(true);
    for (const v of ["reader", "reader@", "@example.com", "reader@example", "a b@example.com", 7, null]) {
      expect(looksLikeEmail(v)).toBe(false);
    }
  });
});

describe("getIp", () => {
  const req = (h: Record<string, string>) => new Request("https://example.com/api/waitlist", { headers: h });

  it("prefers the header Vercel writes over the one a caller can forge", () => {
    expect(getIp(req({ "x-vercel-forwarded-for": "9.9.9.9", "x-forwarded-for": "1.2.3.4" }))).toBe("9.9.9.9");
  });

  it("takes the LAST hop of x-forwarded-for, not the first", () => {
    expect(getIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("10.0.0.1");
  });

  it("gives header-strippers one shared bucket", () => {
    expect(getIp(req({}))).toBe("unknown");
  });
});

describe("makeRateLimiter", () => {
  it("allows up to the cap per caller, then refuses", () => {
    const limit = makeRateLimiter(2);
    expect([limit("a"), limit("a"), limit("a"), limit("b")]).toEqual([true, true, false, true]);
  });
});
