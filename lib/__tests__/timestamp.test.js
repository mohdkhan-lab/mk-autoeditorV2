import { describe, it, expect } from "vitest";
import { parseTimestampName, parseTimestampRange } from "../timestamp.js";

describe("parseTimestampRange", () => {
  it("parses user #Start-End formats into start, end, duration", () => {
    expect(parseTimestampRange("#00-04.mp4")).toEqual({ start: 0, end: 4, duration: 4 });
    expect(parseTimestampRange("#04-06.jpg")).toEqual({ start: 4, end: 6, duration: 2 });
    expect(parseTimestampRange("#06-10.mp4")).toEqual({ start: 6, end: 10, duration: 4 });
    expect(parseTimestampRange("#60-65.mp4")).toEqual({ start: 60, end: 65, duration: 5 });
  });

  it("parses minute range formats", () => {
    expect(parseTimestampRange("#01-00_01-05.mp4")).toEqual({ start: 60, end: 65, duration: 5 });
  });

  it("returns null for non-ranges", () => {
    expect(parseTimestampRange("image.png")).toBeNull();
    expect(parseTimestampRange("0-05.png")).toBeNull();
  });
});

describe("parseTimestampName", () => {
  it("parses mm-ss with dash", () => {
    expect(parseTimestampName("0-03.png")).toBe(3);
    expect(parseTimestampName("1-20.jpg")).toBe(80);
  });
  it("parses mm_ss with underscore", () => {
    expect(parseTimestampName("2_05.webp")).toBe(125);
  });
  it("parses hh-mm-ss", () => {
    expect(parseTimestampName("1-02-05.png")).toBe(3725);
  });
  it("parses 4-digit mmss", () => {
    expect(parseTimestampName("0003.png")).toBe(3);
    expect(parseTimestampName("0120.png")).toBe(80);
  });
  it("parses 3-digit mmss", () => {
    expect(parseTimestampName("120.png")).toBe(80);
  });
  it("parses 1-2 digit plain seconds", () => {
    expect(parseTimestampName("3.png")).toBe(3);
    expect(parseTimestampName("45.png")).toBe(45);
  });
  it("strips directories", () => {
    expect(parseTimestampName("imgs/0-09.png")).toBe(9);
  });
  it("reads a leading timecode through stacked/embedded extensions", () => {
    expect(parseTimestampName("0-00.png_213412342134.jpeg.mp4")).toBe(0);
    expect(parseTimestampName("1-33.png_202608280131.jpeg")).toBe(93);
    expect(parseTimestampName("0-05.jpg.mp4")).toBe(5);
  });
  it("strips Flow download datetime stamp after the timecode", () => {
    expect(parseTimestampName("10-24_202608272310.png")).toBe(624);
    expect(parseTimestampName("0-03_202608272310.jpg")).toBe(3);
    expect(parseTimestampName("1-02-05_20260827231059.png")).toBe(3725);
    expect(parseTimestampName("2_05-202608272310.webp")).toBe(125);
  });
  it("parses user's #Start-End range formats correctly", () => {
    expect(parseTimestampName("#00-04.mp4")).toBe(0);
    expect(parseTimestampName("#04-06.jpg")).toBe(4);
    expect(parseTimestampName("#06-10.mp4")).toBe(6);
    expect(parseTimestampName("#10-15.jpg")).toBe(10);
    expect(parseTimestampName("#60-65.mp4")).toBe(60);
    expect(parseTimestampName("#01-00_01-05.mp4")).toBe(60);
  });
  it("parses video files with prefixes and suffixes", () => {
    expect(parseTimestampName("video_0-03.mp4")).toBe(3);
    expect(parseTimestampName("clip-1-20.mov")).toBe(80);
    expect(parseTimestampName("0-03_clip.webm")).toBe(3);
    expect(parseTimestampName("scene1_0-15-scene.mkv")).toBe(15);
    expect(parseTimestampName("intro_0-00-15_broll.mp4")).toBe(15);
  });
  it("returns null for unparseable names", () => {
    expect(parseTimestampName("hero.png")).toBeNull();
    expect(parseTimestampName("scene_a.png")).toBeNull();
    expect(parseTimestampName("")).toBeNull();
  });
});
