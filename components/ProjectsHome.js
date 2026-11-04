"use client";
import { useState } from "react";
import { showConfirm, showPrompt } from "./Dialog";
import { SUPPORT_CONFIG, buildWhatsAppUrl, buildTelegramUrl, buildEmailUrl } from "../lib/supportConfig";
import TutorialSection from "./TutorialSection";
import RealVideoShowcase from "./RealVideoShowcase";
import BentoGridSection from "./BentoGridSection";

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString();
}

function clock(sec) {
  if (!sec || !isFinite(sec)) return "";
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ProjectsHome({
  projects,
  onNew,
  onOpen,
  onRename,
  onDelete,
  storage,
  onOpenSupport,
}) {
  // Tabs: "studio" | "tutorial" | "features" | "downloads" | "support"
  const [activeTab, setActiveTab] = useState("studio");
  const [menuId, setMenuId] = useState(null);

  // Support form state
  const [supportCategory, setSupportCategory] = useState("Bug Report / Error");
  const [supportName, setSupportName] = useState("");
  const [supportDetails, setSupportDetails] = useState("");

  const directWhatsAppUrl = buildWhatsAppUrl({
    topic: "AutoEditor Direct Assistance",
    details: "Hello Mohd Khan, I am using MK AutoEditor V2 and have a question or need support.",
  });

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    const url = buildWhatsAppUrl({
      topic: `[MK AutoEditor V2] ${supportCategory}`,
      userName: supportName.trim() || "Creator",
      details: supportDetails.trim() || "I need assistance with MK AutoEditor V2.",
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const doRename = async (p) => {
    setMenuId(null);
    const name = await showPrompt("Rename project", {
      title: "Rename project",
      defaultValue: p.name || "Untitled project",
      okText: "Rename",
    });
    if (name && name.trim()) onRename(p.id, name.trim());
  };

  const doDelete = async (p) => {
    setMenuId(null);
    const ok = await showConfirm(
      `Delete "${p.name || "Untitled"}"? This permanently removes the project and its media from this device.`,
      { title: "Delete project", okText: "Delete", danger: true }
    );
    if (ok) onDelete(p.id);
  };

  return (
    <main className="ph" onClick={() => menuId && setMenuId(null)}>
      {/* GLOBAL HEADER WITH DEDICATED TOOL NAVIGATION */}
      <header className="ph__topbar">
        <div className="ph__bar">
          <div className="ph__brand" onClick={() => setActiveTab("studio")} style={{ cursor: "pointer" }}>
            <img className="ph__logo" src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logo.svg`} alt="MK AutoEditor" width="28" height="28" />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span className="ph__name">
                <span className="ph__pre">MK</span> AutoEditor <span style={{ color: "var(--amber)", fontSize: 13, fontWeight: 800 }}>V2</span>
              </span>
              <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.03em" }}>Official Web Studio</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="ph__nav-tabs">
            <button
              type="button"
              className={`ph__nav-tab ${activeTab === "studio" ? "is-active" : ""}`}
              onClick={() => setActiveTab("studio")}
            >
              <span>🎬</span> Workspace
            </button>
            <button
              type="button"
              className={`ph__nav-tab ${activeTab === "showcase" ? "is-active" : ""}`}
              onClick={() => setActiveTab("showcase")}
            >
              <span>🔥</span> Real Video Samples
            </button>
            <button
              type="button"
              className={`ph__nav-tab ${activeTab === "tutorial" ? "is-active" : ""}`}
              onClick={() => setActiveTab("tutorial")}
            >
              <span>🎥</span> Video Tutorial &amp; Guide
            </button>
            <button
              type="button"
              className={`ph__nav-tab ${activeTab === "features" ? "is-active" : ""}`}
              onClick={() => setActiveTab("features")}
            >
              <span>✨</span> Engine Features
            </button>
            <button
              type="button"
              className={`ph__nav-tab ${activeTab === "downloads" ? "is-active" : ""}`}
              onClick={() => setActiveTab("downloads")}
            >
              <span>📥</span> Offline Download
            </button>
            <button
              type="button"
              className={`ph__nav-tab ${activeTab === "support" ? "is-active" : ""}`}
              onClick={() => setActiveTab("support")}
            >
              <span>🛠️</span> WhatsApp Help
            </button>
          </nav>

          <div className="ph__actions">
            <button
              type="button"
              className="hub-btn hub-btn--primary"
              style={{ padding: "8px 18px", fontSize: "13px", fontWeight: 700 }}
              onClick={onNew}
              title="Create a new video project immediately"
            >
              <span>＋ New Project</span>
            </button>
            <a
              href={directWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hub-btn hub-btn--wa"
              style={{ padding: "8px 14px", fontSize: "12.5px" }}
              title="Direct WhatsApp Help with Mohd Khan"
            >
              <span>💬 WhatsApp: 8198966902</span>
            </a>
          </div>
        </div>
      </header>

      <div className="ph__body">
        {/* ========================================================================= */}
        {/* TAB 1: STUDIO WORKSPACE (PROJECTS & NEW PROJECT HERO)                     */}
        {/* ========================================================================= */}
        {activeTab === "studio" && (
          <section>
            {/* HERO BANNER DEDICATED SOLELY TO MK AUTOEDITOR */}
            <div className="hub-hero">
              <div className="hub-hero__chip">
                <span className="hub-hero__dot"></span>
                <span>MK AutoEditor V2 • Dedicated High-Velocity Video Studio</span>
              </div>
              <h1 className="hub-hero__title">
                Automated Audio Voiceover Sync, <br />
                <span className="hub-hero__highlight">Dynamic Subtitles &amp; 5x GPU Export</span>
              </h1>
              <p className="hub-hero__desc">
                Sync timestamp-named images and video clips to voiceover audio in seconds. Built with a 5x hardware WebCodecs GPU turbo engine, interactive waveform trimming, and viral TikTok / Reels caption styles. 100% private in your browser.
              </p>
              <div className="hub-hero__actions">
                <button
                  type="button"
                  className="hub-btn hub-btn--primary"
                  onClick={onNew}
                  style={{ fontSize: 14.5, padding: "10px 22px" }}
                >
                  <span>🚀 Create New Video Project (Free)</span>
                </button>
                <button
                  type="button"
                  className="hub-btn hub-btn--gold"
                  onClick={() => setActiveTab("showcase")}
                >
                  <span>🔥 Watch Real YouTube Samples</span>
                </button>
                <button
                  type="button"
                  className="hub-btn hub-btn--secondary"
                  onClick={() => setActiveTab("tutorial")}
                >
                  <span>🎥 Watch Video Tutorial &amp; Workflow Guide</span>
                </button>
                <button
                  type="button"
                  className="hub-btn hub-btn--secondary"
                  onClick={() => setActiveTab("downloads")}
                >
                  <span>📥 Download Offline PC App</span>
                </button>
                <a
                  href={directWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hub-btn hub-btn--wa"
                  title="Direct WhatsApp Support with Mohd Khan"
                >
                  <span>💬 WhatsApp Developer (+91 8198966902)</span>
                </a>
              </div>
            </div>

            {/* WORKSPACE PROJECTS SECTION */}
            <div className="ph__head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 className="ph__title" style={{ fontSize: 24 }}>My Video Workspaces</h2>
                <p className="ph__sub">
                  {projects.length > 0 
                    ? `Pick up where you left off — ${projects.length} saved project${projects.length > 1 ? "s" : ""} on this device.` 
                    : "Create a fresh cut below or import your audio voiceover and media clips."}
                </p>
              </div>

              {storage && (
                <div style={{ fontSize: 12, color: "var(--muted)", background: "rgba(255,255,255,0.04)", padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                  💾 Storage: ~{Math.round((storage.usage || 0) / (1024 * 1024))} MB cached locally
                </div>
              )}
            </div>

            <div className="ph__grid">
              <button className="ph__new" onClick={onNew} title="Create a new cut">
                <span className="ph__new-plus">＋</span>
                <span className="ph__new-label">New project</span>
              </button>

              {projects.map((p) => (
                <div key={p.id} className="pcard" onClick={() => onOpen(p.id)}>
                  <div className="pcard__thumb">
                    {p.thumb ? <img src={p.thumb} alt="" /> : <span className="pcard__noimg">▦</span>}
                    {p.durationSec ? <span className="pcard__dur">{clock(p.durationSec)}</span> : null}
                  </div>
                  <div className="pcard__foot">
                    <div className="pcard__meta">
                      <span className="pcard__name" title={p.name}>{p.name || "Untitled"}</span>
                      <span className="pcard__sub">
                        {p.clipCount ? `${p.clipCount} clip${p.clipCount > 1 ? "s" : ""} · ` : ""}{timeAgo(p.updatedAt)}
                      </span>
                    </div>
                    <div className="pcard__menuwrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="pcard__menu"
                        aria-label="Project options"
                        onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                      >⋮</button>
                      {menuId === p.id && (
                        <div className="pcard__pop">
                          <button onClick={() => doRename(p)}>Rename</button>
                          <button className="pcard__pop-del" onClick={() => doDelete(p)}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pro Tip Banner */}
            <div style={{ marginTop: 40, padding: "20px 24px", background: "rgba(22, 24, 34, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--amber)", fontWeight: 700, fontSize: 14 }}>
                  <span>💡</span> <span>The Timestamp Auto-Sync Secret Formula</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("tutorial")}
                  style={{ background: "none", border: "none", color: "var(--amber)", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                >
                  View Full Tutorial Video &amp; Guide →
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                Name your images or video files with their starting timestamp (e.g. <code style={{ color: "#fbbf24", background: "rgba(245, 158, 11, 0.15)", padding: "2px 6px", borderRadius: 4 }}>0-12_scene.jpg</code> for 12 seconds, or <code style={{ color: "#fbbf24", background: "rgba(245, 158, 11, 0.15)", padding: "2px 6px", borderRadius: 4 }}>#1-05.mp4</code> for 1 min 05 sec). When you drop them with your voiceover audio, MK AutoEditor automatically places them at the exact millisecond!
              </p>
            </div>
            {/* BENTO ARCHITECTURE SECTION */}
            <BentoGridSection onStartProject={onNew} />

            {/* REAL VIDEOS SHOWCASE SECTION (PRODUCED FOR @MKFINANCE18) */}
            <RealVideoShowcase onStartProject={onNew} />
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DEDICATED REAL VIDEO SHOWCASE & CASE STUDIES                       */}
        {/* ========================================================================= */}
        {activeTab === "showcase" && (
          <section>
            <RealVideoShowcase onStartProject={onNew} />
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: INTERACTIVE VIDEO TUTORIAL & MASTERCLASS WALKTHROUGH               */}
        {/* ========================================================================= */}
        {activeTab === "tutorial" && (
          <section>
            <TutorialSection onStartProject={onNew} />
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ENGINE FEATURES (BENTO ARCHITECTURE)                              */}
        {/* ========================================================================= */}
        {activeTab === "features" && (
          <section>
            <BentoGridSection onStartProject={onNew} />
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: DOWNLOADS CENTER (ZERO GITHUB EXPOSURE)                           */}
        {/* ========================================================================= */}
        {activeTab === "downloads" && (
          <section>
            <div className="ph__head">
              <h2 className="ph__title" style={{ fontSize: 26 }}>Downloads &amp; Offline Portable Setup</h2>
              <p className="ph__sub">Run MK AutoEditor completely offline on Windows PC or setup portable mobile editing on Android.</p>
            </div>

            <div className="hub-downloads-grid">
              {/* Windows PC Card */}
              <div className="hub-download-card hub-download-card--featured">
                <div className="hub-download-card__ribbon">Recommended</div>
                <div className="hub-download-card__head">
                  <span className="hub-download-card__icon">💻</span>
                  <div>
                    <h3 className="hub-download-card__platform">MK AutoEditor for Windows</h3>
                    <div className="hub-download-card__ver">v2.2 Stable • 64-bit Offline Portable Edition</div>
                  </div>
                </div>
                <p className="hub-download-card__desc">
                  Best for heavy 4K/1080p video renders and long-duration documentary projects. Zero upload latency, unlimited timeline clips, and instant 1-click startup without installation.
                </p>
                <div className="hub-download-card__steps">
                  <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--amber)" }}>⚡ Quick 3-Step Setup:</div>
                  <ol>
                    <li>Download &amp; Extract the offline package (.ZIP)</li>
                    <li>Double-click <strong>start.bat</strong> to launch</li>
                    <li>Studio automatically opens in your default browser at localhost:3000!</li>
                  </ol>
                </div>
                <a
                  href={`https://wa.me/91${SUPPORT_CONFIG.whatsappNumber}?text=${encodeURIComponent(
                    "Hello Mohd Khan, I want to download the MK AutoEditor V2 Windows offline desktop package."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hub-btn hub-btn--primary hub-download-card__btn"
                >
                  <span>📥 Get Offline Windows Package (.ZIP)</span>
                </a>
              </div>

              {/* Android Mobile Card */}
              <div className="hub-download-card">
                <div className="hub-download-card__head">
                  <span className="hub-download-card__icon">📱</span>
                  <div>
                    <h3 className="hub-download-card__platform">Android Mobile Studio</h3>
                    <div className="hub-download-card__ver">v2.2 Mobile Edition via Termux</div>
                  </div>
                </div>
                <p className="hub-download-card__desc">
                  Turn your Android phone into a portable video production studio. Full hardware acceleration directly inside mobile Chrome or Chromium.
                </p>
                <div className="hub-download-card__steps">
                  <div style={{ fontWeight: 700, marginBottom: 6, color: "#10b981" }}>📱 Easy Mobile Setup:</div>
                  <ol>
                    <li>Install <strong>Termux</strong> from F-Droid</li>
                    <li>Run <code>pkg update && pkg install nodejs</code></li>
                    <li>Launch local studio and open <code>http://localhost:3000</code></li>
                  </ol>
                </div>
                <a
                  href={`https://wa.me/91${SUPPORT_CONFIG.whatsappNumber}?text=${encodeURIComponent(
                    "Hello Mohd Khan, please share the Termux Android setup commands for MK AutoEditor V2."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hub-btn hub-btn--secondary hub-download-card__btn"
                >
                  <span>💬 Request Android Setup Guide on WhatsApp</span>
                </a>
              </div>

              {/* Commercial PRO License Card */}
              <div className="hub-download-card" style={{ border: "1px solid rgba(245, 158, 11, 0.4)", background: "linear-gradient(180deg, rgba(28, 30, 42, 0.95) 0%, rgba(18, 20, 28, 0.95) 100%)" }}>
                <div className="hub-download-card__head">
                  <span className="hub-download-card__icon">💎</span>
                  <div>
                    <h3 className="hub-download-card__platform">Commercial PRO License</h3>
                    <div className="hub-download-card__ver" style={{ color: "var(--amber)" }}>Lifetime Access • One-time ₹499</div>
                  </div>
                </div>
                <p className="hub-download-card__desc">
                  For professional YouTubers, video editors, and agencies. Unlocks uncapped rendering speed, priority WhatsApp bug fixes, and watermark-free commercial rights.
                </p>
                <div className="hub-download-card__steps">
                  <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--amber)" }}>✨ PRO Benefits:</div>
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: 13, color: "var(--muted)" }}>
                    <li>4K 60fps Ultra-Sharp Video Exports</li>
                    <li>Zero Watermarks &amp; Unlimited Video Duration</li>
                    <li>Priority 1-on-1 WhatsApp Support with Mohd Khan</li>
                  </ul>
                </div>
                <a
                  href={`https://wa.me/91${SUPPORT_CONFIG.whatsappNumber}?text=${encodeURIComponent(
                    "Hello Mohd Khan, I want to purchase the PRO Lifetime License for MK AutoEditor V2 (₹499)."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hub-btn hub-btn--wa hub-download-card__btn"
                >
                  <span>💬 Get PRO Lifetime License on WhatsApp</span>
                </a>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: DEDICATED HELP & PROBLEM RESOLUTION CENTER                         */}
        {/* ========================================================================= */}
        {activeTab === "support" && (
          <section>
            <div className="ph__head">
              <h2 className="ph__title" style={{ fontSize: 26 }}>Help &amp; Problem Resolution Center</h2>
              <p className="ph__sub">Facing an issue, bug, or have a question? Submit below for immediate assistance from Mohd Khan.</p>
            </div>

            <div className="hub-updates-wrap">
              {/* Left Form: Direct Ticket & WhatsApp Generator */}
              <div className="hub-pane-card">
                <h3 className="hub-pane-card__title">
                  <span>🛠️</span> <span>Submit Support Request</span>
                </h3>

                <form onSubmit={handleSupportSubmit} className="hub-support-form">
                  <div className="hub-form-group">
                    <label className="hub-form-label">Issue Category</label>
                    <select
                      className="hub-form-select"
                      value={supportCategory}
                      onChange={(e) => setSupportCategory(e.target.value)}
                    >
                      <option value="Bug Report / Error">⚠️ Bug Report / Error</option>
                      <option value="Audio Voiceover Sync Issue">🎵 Audio / Voiceover Sync Issue</option>
                      <option value="Export / Render Freeze">🚀 Export / WebCodecs Render Problem</option>
                      <option value="Captions / Subtitles">💬 Captions / Subtitles Problem</option>
                      <option value="Download / Setup Help">📥 Installation &amp; Setup Help</option>
                      <option value="PRO License Inquiry">💎 PRO License / Key Inquiry</option>
                      <option value="General Question">❓ General Question / How to Use</option>
                    </select>
                  </div>

                  <div className="hub-form-group">
                    <label className="hub-form-label">Your Name / Contact Info</label>
                    <input
                      type="text"
                      className="hub-form-input"
                      placeholder="e.g. Rahul / +91 9876543210"
                      value={supportName}
                      onChange={(e) => setSupportName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="hub-form-group">
                    <label className="hub-form-label">Describe Problem or Question</label>
                    <textarea
                      className="hub-form-textarea"
                      placeholder="Tell us what problem occurred or what help you need..."
                      value={supportDetails}
                      onChange={(e) => setSupportDetails(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="hub-btn hub-btn--wa" style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
                    <span>💬 Send Problem on WhatsApp ({SUPPORT_CONFIG.whatsappDisplayNumber || "+91 8198966902"})</span>
                  </button>
                </form>
              </div>

              {/* Right Box: Direct Channels */}
              <div className="hub-pane-card" style={{ display: "flex", flexDirection: "column" }}>
                <h3 className="hub-pane-card__title">
                  <span>⚡</span> <span>Direct Developer Support</span>
                </h3>
                <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 18 }}>
                  Support is provided directly by lead developer <strong>Mohd Khan</strong>. Your questions and issues receive prompt attention with personalized troubleshooting.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: "auto" }}>
                  <a
                    href={directWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hub-btn hub-btn--wa"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <span>💬 WhatsApp: {SUPPORT_CONFIG.whatsappDisplayNumber || "+91 8198966902"}</span>
                  </a>
                  <a
                    href={buildTelegramUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hub-btn hub-btn--secondary"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <span>✈️ Telegram: @{SUPPORT_CONFIG.telegramUsername}</span>
                  </a>
                  <a
                    href={buildEmailUrl({ topic: "AutoEditor Support Request" })}
                    className="hub-btn hub-btn--secondary"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <span>✉️ Email: {SUPPORT_CONFIG.email}</span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* FLOATING WHATSAPP PILL BUTTON */}
      <a
        href={directWhatsAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hub-floating-wa"
        title={`Chat with Mohd Khan on WhatsApp (${SUPPORT_CONFIG.whatsappDisplayNumber || "+91 8198966902"})`}
      >
        <span className="hub-floating-wa__dot"></span>
        <span>💬 WhatsApp Support</span>
      </a>
    </main>
  );
}
