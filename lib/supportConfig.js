// Centralized Support Configuration for MK AutoEditor

export const SUPPORT_CONFIG = {
  ownerName: "Mohd Khan",
  appName: "MK AutoEditor",
  tagline: "image + video · voiceover sync",
  
  // Direct WhatsApp Number
  whatsappNumber: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "8198966902",
  whatsappDisplayNumber: "+91 8198966902",
  
  // Developer Email address (private/internal)
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "mohdkhan837218@gmail.com",
  
  // Telegram username without '@' (100% private - phone/email hidden)
  telegramUsername: process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM || "Mohdashraff18",

  // Quick message note
  responseTime: "Direct Support via WhatsApp (+91 8198966902) & Telegram (@Mohdashraff18)",

  // Issue Categories
  categories: [
    { id: "render_failed", label: "Render / MP4 Export Error", icon: "🚀" },
    { id: "audio_sync", label: "Audio / Voiceover Sync Issue", icon: "🎵" },
    { id: "video_playback", label: "Video Preview Freezing / Black Screen", icon: "🎬" },
    { id: "captions_issue", label: "Captions / Subtitles Problem", icon: "💬" },
    { id: "timeline_clips", label: "Timeline / Clips Management", icon: "⏱️" },
    { id: "feature_request", label: "New Feature Suggestion", icon: "💡" },
    { id: "general_help", label: "General Question / How to Use", icon: "❓" },
  ],

  // Pre-compiled FAQs for instant user troubleshooting
  faqs: [
    {
      q: "Render stuck or freezing at 0% or 99%?",
      a: "Make sure you are using Chrome, Edge, or Brave on PC with hardware acceleration enabled. The v2.1 WebCodecs engine renders 5x faster in modern Chromium browsers."
    },
    {
      q: "Audio not playing in preview?",
      a: "Click or tap anywhere on the editor player canvas once. Modern web browsers block autoplay sound until the user interacts with the page."
    },
    {
      q: "Clips showing black frames on timeline?",
      a: "Gaps between clips render black. Tap the '+' button on any gap in the timeline to fill it with your adjacent image or clip."
    },
    {
      q: "Subtitles not matching the spoken words?",
      a: "Go to the Captions tab, click 'Edit Lines' to adjust timestamp offsets, or upload a clean .srt / .vtt file directly."
    }
  ]
};

/**
 * Generate formatted WhatsApp link
 * Direct chat with WhatsApp Number
 */
export function buildWhatsAppUrl({ error, topic, details, userName, projectMeta } = {}) {
  const rawNumber = (SUPPORT_CONFIG.whatsappNumber || "8198966902").replace(/[^0-9]/g, "");
  // Ensure country code: 10-digit Indian numbers require '91' prefix for wa.me
  const number = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;

  let message = `Hello ${SUPPORT_CONFIG.ownerName},\nI need support with *${SUPPORT_CONFIG.appName}*.\n\n`;
  
  if (userName) message += `👤 *Name/Contact:* ${userName}\n`;
  if (topic) message += `📌 *Issue Category:* ${topic}\n`;
  if (error) message += `⚠️ *Error:* ${typeof error === "string" ? error : error.message || JSON.stringify(error)}\n`;
  if (details) message += `📝 *Description:* ${details}\n`;
  
  if (projectMeta) {
    message += `\n📊 *Project Stats:* ${projectMeta.clipCount || 0} clips, duration: ${projectMeta.duration || "N/A"}\n`;
  }
  
  if (typeof window !== "undefined") {
    message += `💻 *Browser/OS:* ${navigator.userAgent.slice(0, 120)}\n`;
    message += `🕒 *Time:* ${new Date().toLocaleString()}\n`;
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * Generate Telegram Direct Chat Link
 * Phone number and personal email are 100% hidden by Telegram
 */
export function buildTelegramUrl({ ticketId, userName, topic, details, error } = {}) {
  const username = (SUPPORT_CONFIG.telegramUsername || "Mohdashraff18").replace(/^@/, "");
  return `https://t.me/${username}`;
}

/**
 * Generate direct Web Gmail compose link (works in all web browsers without opening desktop app)
 */
export function buildGmailUrl({ error, topic, details, userName, projectMeta, ticketId } = {}) {
  const email = SUPPORT_CONFIG.email;
  const ticketPrefix = ticketId ? `[Ticket #${ticketId}] ` : "";
  const subject = `[${SUPPORT_CONFIG.appName} Support] ${ticketPrefix}${topic || "User Help Request"}`;
  
  let body = `Hello ${SUPPORT_CONFIG.ownerName},\n\nI need help with ${SUPPORT_CONFIG.appName}.\n\n`;
  if (ticketId) body += `🎫 Ticket ID: #${ticketId}\n`;
  if (userName) body += `👤 Name / Contact: ${userName}\n`;
  if (topic) body += `📌 Issue Type: ${topic}\n`;
  if (error) body += `⚠️ Error: ${typeof error === "string" ? error : error.message || JSON.stringify(error)}\n`;
  if (details) body += `📝 Details: ${details}\n\n`;
  
  if (projectMeta) {
    body += `📊 Project: ${projectMeta.name || "Untitled"} (${projectMeta.clipCount || 0} clips, duration: ${projectMeta.duration || "N/A"})\n`;
  }
  
  if (typeof window !== "undefined") {
    body += `💻 Browser / Platform: ${navigator.userAgent}\n`;
    body += `🖥️ Screen Size: ${window.innerWidth}x${window.innerHeight}\n`;
    body += `🕒 Timestamp: ${new Date().toISOString()}\n`;
  }

  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Generate standard mailto: link with pre-filled error info
 */
export function buildEmailUrl({ error, topic, details, userName, projectMeta, ticketId } = {}) {
  const email = SUPPORT_CONFIG.email;
  const ticketPrefix = ticketId ? `[Ticket #${ticketId}] ` : "";
  const subject = `[${SUPPORT_CONFIG.appName} Support] ${ticketPrefix}${topic || "User Help Request"}`;
  
  let body = `Hello ${SUPPORT_CONFIG.ownerName},\n\nI encountered an issue while using ${SUPPORT_CONFIG.appName}.\n\n`;
  if (ticketId) body += `🎫 Ticket ID: #${ticketId}\n`;
  if (userName) body += `👤 Name / Contact: ${userName}\n`;
  if (topic) body += `📌 Issue Type: ${topic}\n`;
  if (error) body += `⚠️ Error: ${typeof error === "string" ? error : error.message || JSON.stringify(error)}\n`;
  if (details) body += `📝 Details: ${details}\n\n`;
  
  if (projectMeta) {
    body += `📊 Project: ${projectMeta.name || "Untitled"} (${projectMeta.clipCount || 0} clips, duration: ${projectMeta.duration || "N/A"})\n`;
  }
  
  if (typeof window !== "undefined") {
    body += `💻 Browser / Platform: ${navigator.userAgent}\n`;
    body += `🖥️ Screen Size: ${window.innerWidth}x${window.innerHeight}\n`;
    body += `🕒 Timestamp: ${new Date().toISOString()}\n`;
  }

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Generate full diagnostic report string for clipboard
 */
export function buildDiagnosticReport({ error, topic, details, projectMeta, ticketId } = {}) {
  const parts = [
    `=== ${SUPPORT_CONFIG.appName} Diagnostic Report ===`,
    ticketId ? `Ticket ID: #${ticketId}` : null,
    `Date/Time: ${new Date().toLocaleString()}`,
    `App: ${SUPPORT_CONFIG.appName} v2.1 Studio`,
    `Telegram Support: @${(SUPPORT_CONFIG.telegramUsername || "Mohdashraff18").replace(/^@/, "")}`,
    `WhatsApp Support: ${SUPPORT_CONFIG.whatsappDisplayNumber || SUPPORT_CONFIG.whatsappNumber || "+91 8198966902"}`,
    `Topic: ${topic || "General"}`,
    error ? `Error: ${typeof error === "string" ? error : error.message || JSON.stringify(error)}` : null,
    error?.stack ? `Stack Trace:\n${error.stack}` : null,
    details ? `User Notes: ${details}` : null,
    projectMeta ? `Project: ${projectMeta.name || "Untitled"} | ${projectMeta.clipCount || 0} clips | Duration: ${projectMeta.duration || "0s"}` : null,
    typeof window !== "undefined" ? `User Agent: ${navigator.userAgent}` : null,
    typeof window !== "undefined" ? `Viewport: ${window.innerWidth}x${window.innerHeight} (dpr: ${window.devicePixelRatio || 1})` : null,
    typeof window !== "undefined" ? `WebCodecs Supported: ${typeof window.VideoEncoder !== "undefined" ? "YES" : "NO"}` : null,
    `====================================`
  ].filter(Boolean);

  return parts.join("\n");
}
