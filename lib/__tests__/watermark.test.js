import { describe, it, expect } from "vitest";
import { getWatermarkBounds } from "../watermark";

describe("Watermark bounds", () => {
  it("computes top-right bounds correctly", () => {
    const bounds = getWatermarkBounds(1080, 1920, 200, 100, "top-right", 0.1, 20);
    expect(bounds).toBeTruthy();
    expect(bounds.width).toBe(108); // 10% of 1080
    expect(bounds.height).toBe(54);  // 1:2 aspect
    expect(bounds.x).toBe(1080 - 108 - 20);
    expect(bounds.y).toBe(20);
  });

  it("computes bottom-left bounds correctly", () => {
    const bounds = getWatermarkBounds(1920, 1080, 100, 100, "bottom-left", 0.1, 30);
    expect(bounds).toBeTruthy();
    expect(bounds.x).toBeGreaterThan(0);
    expect(bounds.y).toBeLessThan(1080);
  });

  it("computes top-center bounds centered horizontally", () => {
    const bounds = getWatermarkBounds(1080, 1920, 200, 100, "top-center", 0.1, 24);
    expect(bounds).toBeTruthy();
    const expectedX = Math.round((1080 - bounds.width) / 2);
    expect(bounds.x).toBe(expectedX);
    expect(bounds.y).toBe(24);
  });

  it("computes center bounds perfectly centered in frame", () => {
    const bounds = getWatermarkBounds(1080, 1920, 200, 100, "center", 0.1, 24);
    expect(bounds).toBeTruthy();
    expect(bounds.x).toBe(Math.round((1080 - bounds.width) / 2));
    expect(bounds.y).toBe(Math.round((1920 - bounds.height) / 2));
  });

  it("computes bottom-center bounds correctly", () => {
    const bounds = getWatermarkBounds(1080, 1920, 200, 100, "bottom-center", 0.1, 30);
    expect(bounds).toBeTruthy();
    expect(bounds.x).toBe(Math.round((1080 - bounds.width) / 2));
    expect(bounds.y).toBe(1920 - bounds.height - 30);
  });
});
