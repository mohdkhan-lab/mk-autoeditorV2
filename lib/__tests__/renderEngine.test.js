import { describe, it, expect } from "vitest";
import { startKeepAwake } from "../webcodecsRender.js";
import { transitionOf } from "../transitions.js";
import { applyCanvasPostEffect } from "../effects.js";

describe("Render Engine Safeguards", () => {
  it("startKeepAwake returns a cleanup function without throwing or audio oscillators", () => {
    const stop = startKeepAwake();
    expect(typeof stop).toBe("function");
    expect(() => stop()).not.toThrow();
  });

  it("all transitions render cleanly with both video and image drawables", () => {
    const transitions = ["cut", "fade", "fadeblack", "wipeleft", "wiperight", "slideleft", "slideright", "circleopen", "whippan", "spinzoom", "glitchcut"];
    const mockCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      rect: () => {},
      arc: () => {},
      clip: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      fillRect: () => {},
      drawImage: () => {},
      globalAlpha: 1,
      fillStyle: "",
      canvas: { width: 1280, height: 720 },
    };

    const mockImg = { width: 1280, height: 720, naturalWidth: 1280, naturalHeight: 720 };
    const mockVideo = { width: 1280, height: 720, videoWidth: 1280, videoHeight: 720 };

    for (const t of transitions) {
      const tr = transitionOf(t);
      expect(tr).toBeDefined();
      expect(typeof tr.canvas).toBe("function");

      // Test with image -> video, video -> image, video -> video
      expect(() => tr.canvas(mockCtx, mockImg, mockVideo, 0.5, 1280, 720, 1.0, 1.0)).not.toThrow();
      expect(() => tr.canvas(mockCtx, mockVideo, mockImg, 0.5, 1280, 720, 1.0, 1.0)).not.toThrow();
      expect(() => tr.canvas(mockCtx, mockVideo, mockVideo, 0.5, 1280, 720, 1.0, 1.0)).not.toThrow();
      expect(() => tr.canvas(mockCtx, null, mockVideo, 0.5, 1280, 720, 1.0, 1.0)).not.toThrow();
    }
  });

  it("effects apply cleanly on video and image frames without errors", () => {
    const effects = ["none", "particles", "cinemascope", "warmglow", "vignette", "vintage"];
    const mockCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      rect: () => {},
      arc: () => {},
      fill: () => {},
      fillRect: () => {},
      drawImage: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      globalAlpha: 1,
      fillStyle: "",
    };

    for (const eff of effects) {
      expect(() => applyCanvasPostEffect(mockCtx, eff, 100, 2.5, 5.0, 1280, 720)).not.toThrow();
    }
  });
});
