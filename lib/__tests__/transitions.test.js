import { describe, it, expect } from "vitest";
import { mixTransitions, transitionOf } from "../transitions.js";

// A deterministic rnd() that yields the given fractions in order, then repeats.
const seq = (...vals) => {
  let i = 0;
  return () => vals[(i++) % vals.length];
};

describe("mixTransitions", () => {
  it("returns [] for empty picks or non-positive n", () => {
    expect(mixTransitions([], 5)).toEqual([]);
    expect(mixTransitions(["fade"], 0)).toEqual([]);
    expect(mixTransitions(["fade"], -2)).toEqual([]);
    expect(mixTransitions(null, 3)).toEqual([]);
  });

  it("repeats the single pick across all cuts", () => {
    expect(mixTransitions(["fade"], 4)).toEqual(["fade", "fade", "fade", "fade"]);
  });

  it("never places the same transition on adjacent cuts (2+ picks)", () => {
    const out = mixTransitions(["a", "b", "c"], 6, () => 0);
    for (let i = 1; i < out.length; i++) expect(out[i]).not.toBe(out[i - 1]);
    for (const id of out) expect(["a", "b", "c"]).toContain(id);
    expect(out.length).toBe(6);
  });

  it("is deterministic for a fixed rnd sequence", () => {
    const out = mixTransitions(["a", "b"], 4, seq(0.0));
    expect(out).toEqual(["a", "b", "a", "b"]);
  });
});

describe("TRANSITIONS catalog", () => {
  it("defines all core and dynamic transitions with canvas painters", () => {
    const expected = ["cut", "fade", "fadeblack", "wipeleft", "wiperight", "slideleft", "slideright", "circleopen", "whippan", "spinzoom", "glitchcut"];
    const mockCtx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      beginPath: () => {},
      arc: () => {},
      rect: () => {},
      clip: () => {},
      drawImage: () => {},
      fillRect: () => {},
      canvas: {},
    };

    for (const id of expected) {
      const tr = transitionOf(id);
      expect(tr).toBeDefined();
      expect(tr.label).toBeDefined();
      expect(tr.icon).toBeDefined();
      expect(typeof tr.canvas).toBe("function");

      // Verify canvas painter runs without throwing
      expect(() => {
        tr.canvas(mockCtx, null, null, 0.5, 1920, 1080, 1, 1);
      }).not.toThrow();
    }
  });
});
