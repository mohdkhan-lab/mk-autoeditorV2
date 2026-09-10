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
});
