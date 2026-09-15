import { describe, it, expect } from "vitest";
import {
  SUPPORT_CONFIG,
  buildWhatsAppUrl,
  buildEmailUrl,
  buildDiagnosticReport,
} from "../supportConfig";

describe("Support Configuration & Helpers", () => {
  it("exports valid support configuration", () => {
    expect(SUPPORT_CONFIG.ownerName).toBeTruthy();
    expect(SUPPORT_CONFIG.appName).toBeTruthy();
    expect(SUPPORT_CONFIG.whatsappNumber).toBeTruthy();
    expect(SUPPORT_CONFIG.email).toBeTruthy();
    expect(SUPPORT_CONFIG.categories.length).toBeGreaterThan(0);
    expect(SUPPORT_CONFIG.faqs.length).toBeGreaterThan(0);
  });

  it("builds correct WhatsApp url with encoded message", () => {
    const url = buildWhatsAppUrl({
      error: "WebCodecs initialization failed",
      topic: "render_failed",
      details: "Clip 2 causes freeze",
      userName: "Rahul",
      projectMeta: { name: "Test Story", clipCount: 5, duration: "12s" },
    });

    expect(url).toContain("https://wa.me/");
    expect(url).toContain(SUPPORT_CONFIG.whatsappNumber.replace(/[^0-9]/g, ""));
    expect(url).toContain(encodeURIComponent("WebCodecs initialization failed"));
    expect(url).toContain(encodeURIComponent("Rahul"));
    expect(url).toContain(encodeURIComponent("render_failed"));
  });

  it("builds correct Email mailto url", () => {
    const url = buildEmailUrl({
      error: "Audio decode error",
      topic: "audio_sync",
      details: "MP3 buffer empty",
      userName: "Alex",
    });

    expect(url.startsWith("mailto:")).toBe(true);
    expect(url).toContain(SUPPORT_CONFIG.email);
    expect(decodeURIComponent(url)).toContain("Audio decode error");
    expect(decodeURIComponent(url)).toContain("audio_sync");
  });

  it("generates formatted diagnostic report string", () => {
    const report = buildDiagnosticReport({
      error: { message: "Canvas 2D context lost", stack: "Error: at render.js:42" },
      topic: "render_failed",
      details: "Hardware crash",
      projectMeta: { name: "Ad 1", clipCount: 10, duration: "45s" },
    });

    expect(report).toContain("=== MK AutoEditor Diagnostic Report ===");
    expect(report).toContain("Canvas 2D context lost");
    expect(report).toContain("Hardware crash");
    expect(report).toContain("Ad 1");
  });
});
