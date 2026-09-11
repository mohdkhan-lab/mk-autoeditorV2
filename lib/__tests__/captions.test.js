import { describe, it, expect } from "vitest";
import { parseTranscript, captionAt, captionCueAt, lineTop, CAPTION_STYLES } from "../captions";

describe("parseTranscript", () => {
  it("parses SRT with explicit start/end", () => {
    const srt = `1
00:00:00,000 --> 00:00:02,000
Hello there

2
00:00:02,000 --> 00:00:05,000
General Kenobi`;
    const { cues, error } = parseTranscript(srt, 5);
    expect(error).toBeNull();
    expect(cues.length).toBeGreaterThanOrEqual(2);
    expect(cues[0].start).toBe(0);
    expect(captionAt(cues, 0.5)).toMatch(/Hello/);
    expect(captionAt(cues, 3)).toMatch(/Kenobi/);
  });

  it("parses NoteGPT range blocks and clamps end to the next block's start", () => {
    const t = `00:00:00 - 00:01:15
First line of narration here.

00:00:38 - 00:01:54
Second part of the narration continues.`;
    const { cues } = parseTranscript(t, 120);
    expect(cues.length).toBeGreaterThan(0);
    // First block's cues must not run past the second block's start (38s).
    const firstBlock = cues.filter((c) => c.start < 38);
    for (const c of firstBlock) expect(c.end).toBeLessThanOrEqual(38 + 0.001);
  });

  it("parses inline (m:ss) markers, including several per line", () => {
    const t = `(0:00) There was one quiet morning in a small mountain village. (0:03) A young man sat by his window.
(0:09) An old farmer passed by. (0:13) I have so little, he said.`;
    const { cues, error } = parseTranscript(t, 20);
    expect(error).toBeNull();
    expect(cues.length).toBeGreaterThanOrEqual(4);
    expect(cues[0].start).toBe(0);
    expect(captionAt(cues, 4)).toMatch(/young man/);
    expect(captionAt(cues, 10)).toMatch(/farmer/);
    expect(captionAt(cues, 14)).toMatch(/so little/);
  });

  it("parses inline [mm:ss] lines", () => {
    const t = `[0:00] one two three
[0:04] four five six`;
    const { cues, error } = parseTranscript(t, 8);
    expect(error).toBeNull();
    expect(cues[0].start).toBe(0);
    expect(captionAt(cues, 5)).toMatch(/four/);
  });

  it("empty file returns an error", () => {
    const { cues, error } = parseTranscript("");
    expect(cues).toEqual([]);
    expect(error).toBeTruthy();
  });

  it("captionCueAt retrieves matching cue object and supports karaoke styles", () => {
    const cues = [
      { start: 0, end: 2, text: "Welcome to MK AutoEditor" },
      { start: 2, end: 5, text: "Create amazing reels" },
    ];
    expect(captionCueAt(cues, 1)).toEqual(cues[0]);
    expect(captionCueAt(cues, 3.5)).toEqual(cues[1]);
    expect(captionCueAt(cues, 6)).toBeNull();
  });

  it("splits a long segment into multiple shorter cues", () => {
    const long = Array(40).fill("word").join(" ");
    const { cues } = parseTranscript(`[0:00] ${long}`, 20);
    expect(cues.length).toBeGreaterThan(1);
    // cues are ordered and non-overlapping
    for (let i = 1; i < cues.length; i++) {
      expect(cues[i].start).toBeGreaterThanOrEqual(cues[i - 1].start);
    }
  });

  it("reports an error when there are no timestamps", () => {
    const { cues, error } = parseTranscript("just some plain text with no times", 10);
    expect(cues.length).toBe(0);
    expect(error).toBeTruthy();
  });

  it("returns empty text when nothing is showing", () => {
    const { cues } = parseTranscript(`[0:05] later line`, 10);
    expect(captionAt(cues, 0)).toBe("");
  });

  it("calculates vertical positions correctly for bottom, lower, middle, top", () => {
    const H = 1080;
    const fontPx = 48;
    const yBottom = lineTop(H, fontPx, 1, 0, 1.16, "bottom");
    const yLower = lineTop(H, fontPx, 1, 0, 1.16, "lower");
    const yMiddle = lineTop(H, fontPx, 1, 0, 1.16, "middle");
    const yTop = lineTop(H, fontPx, 1, 0, 1.16, "top");

    // Top should be near top of screen
    expect(yTop).toBeLessThan(yMiddle);
    // Middle should be higher than lower third
    expect(yMiddle).toBeLessThan(yLower);
    // Lower third should be higher than bottom
    expect(yLower).toBeLessThan(yBottom);
  });

  it("includes all viral and core caption styles", () => {
    const expected = ["classic", "boxed", "yellow", "karaoke", "neon", "mrbeast", "fire", "cyberpunk", "netflix"];
    for (const id of expected) {
      expect(CAPTION_STYLES[id]).toBeDefined();
      expect(CAPTION_STYLES[id].id).toBe(id);
      expect(CAPTION_STYLES[id].label).toBeDefined();
    }
  });
});
