import { describe, it, expect } from "vitest";
import { generateWhooshPcm, getCachedWhoosh } from "../sfx";

describe("SFX engine", () => {
  it("generates stereo whoosh audio PCM buffer", () => {
    const pcm = generateWhooshPcm(48000, 0.2);
    expect(Array.isArray(pcm)).toBe(true);
    expect(pcm.length).toBe(2);
    expect(pcm[0].length).toBe(Math.floor(48000 * 0.2));
    expect(pcm[1].length).toBe(Math.floor(48000 * 0.2));

    // Check non-silent output and amplitude bounds
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
});
