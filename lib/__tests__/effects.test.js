import { describe, it, expect } from "vitest";
import { EFFECTS, getPreDrawTransform, applyCanvasPostEffect, getFfmpegEffectFilter } from "../effects.js";

describe("EFFECTS catalog", () => {
  it("contains all core CapCut-style effects", () => {
    const expected = ["none", "shake", "flash", "glitch", "pulse", "grain", "vignette", "vintage", "noir", "neon", "sunset", "particles", "cinema", "lensflare", "vhs", "lightning"];
    for (const id of expected) {
      expect(EFFECTS[id]).toBeDefined();
      expect(EFFECTS[id].name).toBeDefined();
      expect(EFFECTS[id].icon).toBeDefined();
    }
  });
});

describe("getPreDrawTransform", () => {
  it("returns null for none or missing effect", () => {
    expect(getPreDrawTransform(null)).toBeNull();
    expect(getPreDrawTransform("none")).toBeNull();
  });

  it("computes camera shake coordinates with scale safeguard", () => {
    const t0 = getPreDrawTransform("shake", 80, 0.5, 3);
    expect(t0).toBeDefined();
    expect(typeof t0.dx).toBe("number");
    expect(typeof t0.dy).toBe("number");
    expect(t0.scale).toBeGreaterThanOrEqual(1.0);
  });

  it("computes zoom pulse scale", () => {
    const p = getPreDrawTransform("pulse", 70, 0.25, 2);
    expect(p).toBeDefined();
    expect(p.dx).toBe(0);
    expect(p.dy).toBe(0);
    expect(p.scale).toBeGreaterThanOrEqual(1);
  });
});

describe("applyCanvasPostEffect", () => {
  it("renders all effects without error including particles, cinema, lensflare, vhs, and lightning", () => {
    const mockCtx = {
      save: () => {},
      restore: () => {},
      fillRect: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      createPattern: () => {},
      translate: () => {},
      drawImage: () => {},
      canvas: {},
    };

    for (const effId of Object.keys(EFFECTS)) {
      expect(() => {
        applyCanvasPostEffect(mockCtx, effId, 75, 1.2, 3.0, 1920, 1080);
      }).not.toThrow();
    }
  });
});

describe("getFfmpegEffectFilter", () => {
  it("returns empty string for none or unknown", () => {
    expect(getFfmpegEffectFilter("none")).toBe("");
    expect(getFfmpegEffectFilter("unknown")).toBe("");
  });

  it("generates valid FFmpeg filter strings for all effects", () => {
    expect(getFfmpegEffectFilter("shake", 80)).toContain("crop=");
    expect(getFfmpegEffectFilter("flash", 90)).toContain("fade=t=in:st=0:d=");
    expect(getFfmpegEffectFilter("glitch", 70)).toContain("rgbashift=");
    expect(getFfmpegEffectFilter("grain", 75)).toContain("noise=");
    expect(getFfmpegEffectFilter("vignette", 80)).toContain("vignette=");
    expect(getFfmpegEffectFilter("vintage", 70)).toContain("colorchannelmixer=");
    expect(getFfmpegEffectFilter("noir", 100)).toContain("hue=s=0");
    expect(getFfmpegEffectFilter("neon", 75)).toContain("colorbalance=");
    expect(getFfmpegEffectFilter("sunset", 70)).toContain("colorbalance=");
    expect(getFfmpegEffectFilter("particles", 75)).toContain("noise=");
    expect(getFfmpegEffectFilter("cinema", 100)).toContain("drawbox=");
    expect(getFfmpegEffectFilter("lensflare", 75)).toContain("colorbalance=");
    expect(getFfmpegEffectFilter("vhs", 70)).toContain("rgbashift=");
    expect(getFfmpegEffectFilter("lightning", 85)).toContain("fade=t=in:st=0:d=");
  });
});
