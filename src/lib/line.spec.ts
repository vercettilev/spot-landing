import { describe, expect, it } from "vitest";
import { canonicalEmail, credit, join, lineOrder, personFor, spotOf } from "./line";
import { memoryKv } from "./memoryKv";
import { displayLink, parseCode, referralLink } from "./referral";

/**
 * The line decides who gets Spot first, and the page tells people their place
 * and how far a friend moves them. Each promise on the page is checked here:
 * arrival order, one place per inbox, ten spots per friend, no credit for
 * yourself or twice for one friend, and a daily cap per network.
 */

async function lineOf(n: number) {
  const kv = memoryKv();
  const codes: string[] = [];
  for (let i = 1; i <= n; i++) codes.push((await join(kv, personFor(`p${i}@example.com`))).code);
  return { kv, codes };
}
const rankOf = async (kv: ReturnType<typeof memoryKv>, code: string) => (await spotOf(kv, code))!.rank;

describe("the line", () => {
  it("gives newcomers places in order of arrival", async () => {
    const { kv, codes } = await lineOf(3);
    expect(await Promise.all(codes.map((c) => rankOf(kv, c)))).toEqual([1, 2, 3]);
    expect(codes.every((c) => parseCode(c) === c)).toBe(true);
    expect(new Set(codes).size).toBe(3);
  });

  it("gives someone already in line their own code and place back", async () => {
    const { kv, codes } = await lineOf(2);
    const again = await join(kv, personFor("p1@example.com"));
    expect(again).toEqual({ code: codes[0], isNew: false });
    const next = await join(kv, personFor("p3@example.com"));
    expect(next.isNew).toBe(true);
    expect(await rankOf(kv, next.code)).toBe(3);
  });

  it("treats one inbox, typed different ways, as one person", () => {
    expect(canonicalEmail("J.Doe+spot@gmail.com")).toBe("jdoe@gmail.com");
    expect(personFor("j.doe+spot@googlemail.com")).toBe(personFor("jdoe@gmail.com"));
    expect(personFor("jdoe+news@example.com")).toBe(personFor("jdoe@example.com"));
    // Outside Gmail a dot is part of the address.
    expect(personFor("j.doe@example.com")).not.toBe(personFor("jdoe@example.com"));
  });

  it("moves the owner of a link up ten spots for a friend who joins", async () => {
    const { kv, codes } = await lineOf(20);
    const friend = await join(kv, personFor("friend@example.com"));
    expect(await credit(kv, { ref: codes[14], newcomer: personFor("friend@example.com"), ip: "1.1.1.1" })).toBe(true);

    expect(await spotOf(kv, codes[14])).toEqual({ code: codes[14], rank: 5, referrals: 1 });
    expect(await rankOf(kv, codes[4])).toBe(6); // the ten it passed each moved back one
    expect(await rankOf(kv, codes[13])).toBe(15);
    expect(await rankOf(kv, codes[15])).toBe(16); // those behind it did not move
    expect(await rankOf(kv, friend.code)).toBe(21);
  });

  it("stops at the front when fewer than ten are ahead", async () => {
    const { kv, codes } = await lineOf(5);
    await join(kv, personFor("friend@example.com"));
    await credit(kv, { ref: codes[2], newcomer: personFor("friend@example.com"), ip: "1.1.1.1" });
    expect(await rankOf(kv, codes[2])).toBe(1);
    expect(await rankOf(kv, codes[0])).toBe(2);
  });

  it("breaks a tie toward whoever arrived first", async () => {
    const { kv, codes } = await lineOf(23);
    for (const f of ["f1", "f2"]) {
      await join(kv, personFor(`${f}@example.com`));
      await credit(kv, { ref: codes[22], newcomer: personFor(`${f}@example.com`), ip: `9.9.9.${f}` });
    }
    // Number 23, twenty spots up, lands level with number 2 and stands behind them.
    expect(await rankOf(kv, codes[22])).toBe(3);
    expect(await rankOf(kv, codes[1])).toBe(2);
  });

  it("gives no credit for joining through your own link", async () => {
    const { kv, codes } = await lineOf(3);
    expect(await credit(kv, { ref: codes[2], newcomer: personFor("p3@example.com"), ip: "1.1.1.1" })).toBe(false);
    expect(await spotOf(kv, codes[2])).toEqual({ code: codes[2], rank: 3, referrals: 0 });
  });

  it("credits one friend once", async () => {
    const { kv, codes } = await lineOf(15);
    await join(kv, personFor("friend@example.com"));
    const ask = () => credit(kv, { ref: codes[14], newcomer: personFor("friend@example.com"), ip: "1.1.1.1" });
    expect(await ask()).toBe(true);
    expect(await ask()).toBe(false);
    expect(await spotOf(kv, codes[14])).toEqual({ code: codes[14], rank: 5, referrals: 1 });
  });

  it("ignores codes the line does not know, and ones that are not codes", async () => {
    const { kv } = await lineOf(2);
    for (const ref of ["ZZZZZZZ", "nope", "", "0OIL1AB"]) {
      expect(await credit(kv, { ref, newcomer: personFor("friend@example.com"), ip: "1.1.1.1" })).toBe(false);
    }
    expect(await spotOf(kv, "ZZZZZZZ")).toBeNull();
  });

  it("lets one network give five credits a day", async () => {
    const { kv, codes } = await lineOf(60);
    const owner = codes[59];
    const results: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      await join(kv, personFor(`alt${i}@example.com`));
      results.push(await credit(kv, { ref: owner, newcomer: personFor(`alt${i}@example.com`), ip: "5.5.5.5" }));
    }
    expect(results).toEqual([true, true, true, true, true, false]);

    kv.advance(24 * 60 * 60);
    await join(kv, personFor("tomorrow@example.com"));
    expect(await credit(kv, { ref: owner, newcomer: personFor("tomorrow@example.com"), ip: "5.5.5.5" })).toBe(true);
    expect((await spotOf(kv, owner))!.referrals).toBe(6);
  });

  it("puts a code back in line when a request died between the two writes", async () => {
    const { kv } = await lineOf(2);
    const person = personFor("halfway@example.com");
    await kv.setNx(`spot:code:HQFWAY2`, person);
    await kv.setNx(`spot:id:${person}`, "HQFWAY2");
    expect(await spotOf(kv, "HQFWAY2")).toBeNull();

    expect(await join(kv, person)).toEqual({ code: "HQFWAY2", isNew: false });
    expect(await rankOf(kv, "HQFWAY2")).toBe(3);
  });

  it("lists the line front first", async () => {
    const { kv, codes } = await lineOf(12);
    await join(kv, personFor("friend@example.com"));
    await credit(kv, { ref: codes[11], newcomer: personFor("friend@example.com"), ip: "1.1.1.1" });
    const order = await lineOrder(kv);
    expect(order[0]).toBe(codes[0]);
    expect(order[1]).toBe(codes[11]);
    expect(order).toHaveLength(13);
  });
});

describe("referral links", () => {
  it("reads a code however it was typed, and nothing that is not one", () => {
    expect(parseCode(" k7p2qxm ")).toBe("K7P2QXM");
    for (const v of ["K7P2QX", "K7P2QXMM", "K0P2QXM", "K1P2QXM", "K7P2QX!", 42, null]) expect(parseCode(v)).toBeNull();
  });

  it("builds the link to share and the way it reads", () => {
    const url = referralLink("https://www.usespot.fun", "K7P2QXM");
    expect(url).toBe("https://www.usespot.fun/r/K7P2QXM");
    expect(displayLink(url)).toBe("usespot.fun/r/K7P2QXM");
  });
});
