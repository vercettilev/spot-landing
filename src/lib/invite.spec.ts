import { describe, expect, it } from "vitest";
import { claim, inviteLinks, inviteState, maskEmail, planInvites, release, unsubscribe, unsubscribeLinks, unsubscribeToken } from "./invite";
import { inviteMail } from "./inviteMail";
import { join, personFor } from "./line";
import { memoryKv } from "./memoryKv";
import type { SignupRecord } from "./store";

/**
 * The invites decide who hears first that Spot is ready, and they can't be
 * taken back once sent. Each promise is checked here: line order, one invite
 * per person ever, nobody whose phone has no link yet, nobody who said stop,
 * and an unsubscribe link only its owner can use.
 */

const rec = (email: string, platform: string, at: string, code?: string): SignupRecord => ({
  email,
  platform,
  created_at: `2026-10-${at}T00:00:00.000Z`,
  source: "landing",
  ...(code ? { code } : {}),
});

const none = { invited: new Set<string>(), unsubscribed: new Set<string>() };
const links = { android: "https://example.com/apk", seeker: "https://example.com/apk" };

describe("who gets invited next", () => {
  it("goes in line order, then anyone the line does not know by arrival", () => {
    const records = [rec("c@x.com", "android", "12", "CCC"), rec("a@x.com", "android", "13", "AAA"), rec("old@x.com", "android", "10"), rec("b@x.com", "android", "14", "BBB")];
    const plan = planInvites(records, ["AAA", "BBB", "CCC"], none, links, 10);
    expect(plan.next.map((i) => i.email)).toEqual(["a@x.com", "b@x.com", "c@x.com", "old@x.com"]);
    expect(plan.next.map((i) => i.place)).toEqual([1, 2, 3, null]);
  });

  it("stops at the count, and counts everyone per phone", () => {
    const records = [rec("a@x.com", "android", "11", "A"), rec("b@x.com", "android", "12", "B"), rec("i@x.com", "iphone", "13", "I"), rec("u@x.com", "unknown", "14", "U")];
    const plan = planInvites(records, ["A", "B", "I", "U"], none, links, 1);
    expect(plan.next.map((i) => i.email)).toEqual(["a@x.com"]);
    expect(plan.byPhone.android).toEqual({ onList: 2, invited: 0, unsubscribed: 0, waiting: 2, noLink: 0 });
    expect(plan.byPhone.iphone).toEqual({ onList: 1, invited: 0, unsubscribed: 0, waiting: 0, noLink: 1 });
    expect(plan.byPhone.unknown?.noLink).toBe(1);
  });

  it("skips who was invited and who unsubscribed", () => {
    const records = [rec("a@x.com", "android", "11", "A"), rec("b@x.com", "android", "12", "B"), rec("c@x.com", "android", "13", "C")];
    const state = { invited: new Set([personFor("a@x.com")]), unsubscribed: new Set([personFor("b@x.com")]) };
    const plan = planInvites(records, ["A", "B", "C"], state, links, 10);
    expect(plan.next.map((i) => i.email)).toEqual(["c@x.com"]);
    expect(plan.byPhone.android).toMatchObject({ invited: 1, unsubscribed: 1, waiting: 1 });
  });

  it("treats one inbox typed two ways as one person", () => {
    const records = [rec("j.doe@gmail.com", "android", "11", "A"), rec("jdoe+spot@gmail.com", "android", "12", "B")];
    expect(planInvites(records, ["A", "B"], none, links, 10).next).toHaveLength(1);
  });
});

describe("each phone's link", () => {
  it("takes only https links, and gives Seeker Android's unless it has its own", () => {
    expect(inviteLinks({ INVITE_URL_ANDROID: "https://a.example/apk" })).toEqual({ android: "https://a.example/apk", seeker: "https://a.example/apk", iphone: undefined });
    expect(inviteLinks({ INVITE_URL_ANDROID: "https://a.example", INVITE_URL_SEEKER: "https://dapp.example" }).seeker).toBe("https://dapp.example");
    expect(inviteLinks({ INVITE_URL_ANDROID: "http://insecure.example", INVITE_URL_IPHONE: "javascript:alert(1)" })).toEqual({ android: undefined, seeker: undefined, iphone: undefined });
  });
});

describe("one invite per person", () => {
  it("lets one request claim a person, and gives the claim back when the email fails", async () => {
    const kv = memoryKv();
    const p = personFor("a@x.com");
    expect(await claim(kv, p)).toBe(true);
    expect(await claim(kv, p)).toBe(false);
    await release(kv, p);
    expect(await claim(kv, p)).toBe(true);
  });

  it("reads the invite state and the line in one go", async () => {
    const kv = memoryKv();
    const { code } = await join(kv, personFor("a@x.com"));
    await claim(kv, personFor("a@x.com"));
    const state = await inviteState(kv);
    expect(state.order).toEqual([code]);
    expect(state.invited.has(personFor("a@x.com"))).toBe(true);
    expect(state.unsubscribed.size).toBe(0);
  });
});

describe("unsubscribe", () => {
  it("works with the person's own link, and only theirs", async () => {
    const kv = memoryKv();
    const p = personFor("a@x.com");
    const token = await unsubscribeToken(kv, p);
    expect(await unsubscribeToken(kv, p)).toBe(token); // one secret per person, kept
    expect(unsubscribeLinks(p, token, "https://www.usespot.fun")).toEqual({
      page: `https://www.usespot.fun/unsubscribe?p=${p}&t=${token}`,
      oneClick: `https://www.usespot.fun/api/unsubscribe?p=${p}&t=${token}`,
    });
    expect(await unsubscribe(kv, p, "0".repeat(32))).toBe(false);
    expect(await unsubscribe(kv, personFor("b@x.com"), token)).toBe(false);
    expect(await unsubscribe(kv, "test", "test")).toBe(false);
    expect(await unsubscribe(kv, p, token)).toBe(true);
    expect((await inviteState(kv)).unsubscribed.has(p)).toBe(true);
  });
});

describe("the invite email", () => {
  const out = { page: "https://www.usespot.fun/unsubscribe?p=x&t=y", oneClick: "https://www.usespot.fun/api/unsubscribe?p=x&t=y" };
  const m = inviteMail({ platform: "seeker", place: 12, link: "https://example.com/apk?a=1&b=2", unsubscribe: out, postalAddress: "" });

  it("names the phone, the place and the key", () => {
    expect(m.subject).toBe("You're in: Spot is ready for Solana Seeker");
    expect(m.text).toContain("You were #12 in line");
    expect(m.text).toContain("Get Spot for Seeker: https://example.com/apk?a=1&b=2");
    expect(m.html).toContain('href="https://example.com/apk?a=1&amp;b=2"');
  });

  it("leaves the place out when the line never gave one", () => {
    expect(inviteMail({ platform: "android", place: null, link: "https://e.example", unsubscribe: out }).text).not.toContain("in line");
  });

  it("carries the page that asks in its footer, and one-click unsubscribe in its headers", () => {
    expect(m.html).toContain('href="https://www.usespot.fun/unsubscribe?p=x&amp;t=y"');
    expect(m.text).toContain("Unsubscribe: https://www.usespot.fun/unsubscribe?p=x&t=y");
    expect(m.headers).toEqual({
      "List-Unsubscribe": "<https://www.usespot.fun/api/unsubscribe?p=x&t=y>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});

describe("addresses on the owner's page", () => {
  it("are masked", () => {
    expect(maskEmail("satoshi.nakamoto@example.com")).toBe("sa••••••@example.com");
    expect(maskEmail("ab@x.com")).toBe("ab•@x.com");
  });
});
