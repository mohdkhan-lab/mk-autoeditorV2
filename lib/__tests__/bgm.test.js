import { describe, it, expect } from "vitest";
import { getBgmDuckedGain, extractVoiceSegments } from "../bgm";

describe("BGM Auto-Ducking", () => {
  it("returns base volume when ducking is disabled or no speech segments exist", () => {
    expect(getBgmDuckedGain(5, [], true, 0.4)).toBe(0.4);
    expect(getBgmDuckedGain(5, [{ start: 2, end: 8 }], false, 0.4)).toBe(0.4);
  });

  it("ducks to 25% during active voiceover speech", () => {
    const segments = [{ start: 2, end: 6 }];
    const gain = getBgmDuckedGain(4, segments, true, 0.4, 0.25);
    expect(gain).toBeCloseTo(0.1, 4); // 0.4 * 0.25 = 0.1
  });

  it("restores to full volume during speech pause", () => {
    const segments = [{ start: 1, end: 3 }, { start: 8, end: 10 }];
    const gain = getBgmDuckedGain(5.5, segments, true, 0.4, 0.25);
    expect(gain).toBe(0.4);
  });

  it("extracts voice segments from caption cues", () => {
    const cues = [{ start: 1, end: 4, text: "Hello world" }];
    const segs = extractVoiceSegments(cues);
    expect(segs.length).toBe(1);
    expect(segs[0].start).toBe(1);
    expect(segs[0].end).toBe(4);
  });
});
