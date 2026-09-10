import { describe, it, expect } from "vitest";
import {
  generateWhooshPcm, getCachedWhoosh,
  TRANSITION_SFX_LIST, generateSfxPcm, getCachedSfx
} from "../sfx";

describe("SFX engine", () => {
  it("generates stereo whoosh audio PCM buffer", () => {
    const pcm = generateWhooshPcm(48000, 0.2);
    expect(Array.isArray(pcm)).toBe(true);
    expect(pcm.length).toBe(2);
    expect(pcm[0].length).toBe(Math.floor(48000 * 0.2));
    expect(pcm[1].length).toBe(Math.floor(48000 * 0.2));

    let maxAmp = 0;
    for (let i = 0; i < pcm[0].length; i++) {
      const val = Math.abs(pcm[0][i]);
      if (val > maxAmp) maxAmp = val;
      expect(val).toBeLessThanOrEqual(1.0);
    }
    expect(maxAmp).toBeGreaterThan(0.05);
  });

  it("caches whoosh buffer for identical sample rates", () => {
    const a = getCachedWhoosh(48000);
    const b = getCachedWhoosh(48000);
    expect(a).toBe(b);
  });

  it("generates all 6 transition sound effects successfully", () => {
    expect(TRANSITION_SFX_LIST.length).toBe(6);
    for (const item of TRANSITION_SFX_LIST) {
      const pcm = generateSfxPcm(item.id, 44100);
      expect(pcm.length).toBe(2);
      expect(pcm[0].length).toBeGreaterThan(1000);

      // Verify not silent and properly clamped
      let maxAmp = 0;
      for (let i = 0; i < pcm[0].length; i++) {
        const val = Math.abs(pcm[0][i]);
        if (val > maxAmp) maxAmp = val;
        expect(val).toBeLessThanOrEqual(1.0);
      }
      expect(maxAmp).toBeGreaterThan(0.05);

      const cached = getCachedSfx(item.id, 44100);
      expect(cached).toBeDefined();
      expect(cached[0].length).toBe(pcm[0].length);
    }
  });
});
