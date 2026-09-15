import { describe, it, expect } from "vitest";
import {
  SUPPORT_CONFIG,
  buildWhatsAppUrl,
  buildTelegramUrl,
  buildGmailUrl,
  buildEmailUrl,
  buildDiagnosticReport,
} from "../supportConfig";

describe("Support Configuration & Helpers", () => {
  it("exports valid support configuration with Telegram and WhatsApp Channel", () => {
    expect(SUPPORT_CONFIG.ownerName).toBeTruthy();
    expect(SUPPORT_CONFIG.appName).toBeTruthy();
    expect(SUPPORT_CONFIG.whatsappChannelUrl).toBe("https://whatsapp.com/channel/0029VbDteqXIN9ivtJxB4Q3E");
    expect(SUPPORT_CONFIG.telegramUsername).toBe("Mohdashraff18");
    expect(SUPPORT_CONFIG.categories.length).toBeGreaterThan(0);
    expect(SUPPORT_CONFIG.faqs.length).toBeGreaterThan(0);
  });

  it("builds correct Telegram direct chat url", () => {
    const url = buildTelegramUrl({
      topic: "render_failed",
      userName: "Rahul",
    });

    expect(url).toBe("https://t.me/Mohdashraff18");
  });

  it("builds correct WhatsApp channel url", () => {
    const url = buildWhatsAppUrl({
      error: "WebCodecs initialization failed",
      topic: "render_failed",
      details: "Clip 2 causes freeze",
      userName: "Rahul",
      projectMeta: { name: "Test Story", clipCount: 5, duration: "12s" },
    });

    expect(url).toBe("https://whatsapp.com/channel/0029VbDteqXIN9ivtJxB4Q3E");
  });

  it("builds direct Gmail web compose url", () => {
    const url = buildGmailUrl({
      error: "Render timeout",
      topic: "render_failed",
      details: "Screen black on frame 10",
      userName: "Khan",
    });

    expect(url.startsWith("https://mail.google.com/mail/?view=cm")).toBe(true);
    expect(url).toContain(encodeURIComponent("mohdkhan837218@gmail.com"));
    expect(url).toContain(encodeURIComponent("[MK AutoEditor Support] render_failed"));
    expect(url).toContain(encodeURIComponent("Screen black on frame 10"));
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

  it("includes ticketId in Gmail url and diagnostic report", () => {
    const gmailUrl = buildGmailUrl({
      ticketId: "TICK-TEST-999",
      userName: "Rahul",
      topic: "render_failed",
      details: "Render stuck",
    });

    expect(gmailUrl).toContain(encodeURIComponent("[Ticket #TICK-TEST-999]"));
    expect(gmailUrl).toContain(encodeURIComponent("🎫 Ticket ID: #TICK-TEST-999"));

    const report = buildDiagnosticReport({
      ticketId: "TICK-TEST-999",
      topic: "render_failed",
    });

    expect(report).toContain("Ticket ID: #TICK-TEST-999");
    expect(report).toContain("Telegram Support: @Mohdashraff18");
  });
});
