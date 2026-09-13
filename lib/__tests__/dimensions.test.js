import { describe, it, expect } from "vitest";
import { resolveDimensions } from "../dimensions.js";

describe("resolveDimensions", () => {
  it("returns 1920x1080 for 16:9", () => {
    expect(resolveDimensions("16:9")).toEqual({ width: 1920, height: 1080 });
  });
  it("returns 1080x1920 for 9:16", () => {
    expect(resolveDimensions("9:16")).toEqual({ width: 1080, height: 1920 });
  });
  it("returns 1080x1080 for 1:1", () => {
    expect(resolveDimensions("1:1")).toEqual({ width: 1080, height: 1080 });
  });
  it("returns 1080x1350 for 4:5", () => {
    expect(resolveDimensions("4:5")).toEqual({ width: 1080, height: 1350 });
  });
  it("uses the sample image (even-rounded) for auto", () => {
    expect(resolveDimensions("auto", { width: 1281, height: 721 })).toEqual({
      width: 1280,
      height: 720,
    });
  });
  it("falls back to 16:9 for auto without a sample", () => {
    expect(resolveDimensions("auto")).toEqual({ width: 1920, height: 1080 });
  });
});

describe("capTo720", () => {
  it("caps 16:9 1920x1080 down to 1280x720", async () => {
    const { capTo720 } = await import("../dimensions.js");
    expect(capTo720({ width: 1920, height: 1080 })).toEqual({ width: 1280, height: 720 });
  });
  it("caps 9:16 1080x1920 down to 720x1280 without distorting aspect ratio", async () => {
    const { capTo720 } = await import("../dimensions.js");
    expect(capTo720({ width: 1080, height: 1920 })).toEqual({ width: 720, height: 1280 });
  });
});
