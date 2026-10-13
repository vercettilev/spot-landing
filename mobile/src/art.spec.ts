import { describe, expect, it } from "vitest";
import { ICON_SVG, MARK_SVG } from "./art";

describe("the puppy without its tile", () => {
  it("keeps the dog and drops the orange", () => {
    expect(ICON_SVG.match(/<path /g)).toHaveLength(3);
    expect(MARK_SVG.match(/<path /g)).toHaveLength(2);
    expect(MARK_SVG).not.toMatch(/FC4E02/i);
    expect(MARK_SVG).toContain('viewBox="22 111 399 262"');
  });
});
