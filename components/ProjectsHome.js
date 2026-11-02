"use client";
import { useState } from "react";
import { showConfirm, showPrompt } from "./Dialog";
import { SUPPORT_CONFIG, buildWhatsAppUrl, buildTelegramUrl, buildEmailUrl } from "../lib/supportConfig";

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
  const [activeTab, setActiveTab] = useState("apps"); // "apps" | "studio" | "features" | "downloads" | "support"
  const [menuId, setMenuId] = useState(null);

  // Support form state
  const [supportApp, setSupportApp] = useState("MK AutoEditor V2");
  const [supportCategory, setSupportCategory] = useState("Bug Report / Issue");
  const [supportName, setSupportName] = useState("");
  const [supportDetails, setSupportDetails] = useState("");

  const directWhatsAppUrl = buildWhatsAppUrl({
    topic: "Direct Inquiry / Feedback",
    details: "Hello Mohd Khan, I am visiting MK Studio Hub and have a question or request.",
  });

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    const url = buildWhatsAppUrl({
      topic: `[${supportApp}] ${supportCategory}`,
      userName: supportName.trim() || "User",
      details: supportDetails.trim() || "I need assistance with this application.",
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
      {/* GLOBAL HEADER WITH NAVIGATION TABS */}
      <header className="ph__topbar">
        <div className="ph__bar">
          <div className="ph__brand" onClick={() => setActiveTab("apps")} style={{ cursor: "pointer" }}>
            <img className="ph__logo" src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logo.svg`} alt="MK Studio" width="28" height="28" />
            <span className="ph__name"><span className="ph__pre">MK</span> Studio</span>
          </div>

          {/* Navigation Tabs */}
          <nav className="ph__nav-tabs">
            <button
              type="button"
              className={`ph__nav-tab ${activeTab === "apps" ? "is-active" : ""}`}
              onClick={() => setActiveTab("apps")}
            >
              <span>🌟</span> All Apps
            </button>
            <button
              type="button"
              className={`ph__nav-tab ${activeTab === "studio" ? "is-active" : ""}`}
              onClick={() => setActiveTab("studio")}
            >
              <span>🎬</span> Video Studio
            </button>
            <button
              type="button"
              className={`ph__nav-tab ${activeTab === "features" ? "is-active" : ""}`}
              onClick={() => setActiveTab("features")}
            >
              <span>✨</span> Features
            </button>
            <button
              type="button"
              className={`ph__nav-tab ${activeTab === "downloads" ? "is-active" : ""}`}
              onClick={() => setActiveTab("downloads")}
            >
              <span>📥</span> Downloads
            </button>
            <button
              type="button"
              className={`ph__nav-tab ${activeTab === "support" ? "is-active" : ""}`}
              onClick={() => setActiveTab("support")}
            >
              <span>🛠️</span> Help &amp; Problems
            </button>
          </nav>

          <div className="ph__actions">
            <button
              type="button"
              className="hub-btn hub-btn--primary"
              style={{ padding: "7px 14px", fontSize: "12.5px" }}
              onClick={() => {
                setActiveTab("studio");
                onNew();
              }}
              title="Launch online editor directly"
            >
              <span>🚀 Launch Studio</span>
            </button>
            <a
              href={directWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hub-btn hub-btn--wa"
              style={{ padding: "7px 12px", fontSize: "12px" }}
              title="Chat with Mohd Khan on WhatsApp"
            >
              <span>💬 +91 8198966902</span>
            </a>
          </div>
        </div>
      </header>

      <div className="ph__body">
        {/* ========================================================================= */}
        {/* TAB 1: ALL APPS & ECOSYSTEM (PORTAL HOME)                                 */}
        {/* ========================================================================= */}
        {activeTab === "apps" && (
          <section>
            <div className="hub-hero">
              <div className="hub-hero__chip">
                <span className="hub-hero__dot"></span>
                <span>Mohd Khan Studio • High-Performance Software &amp; Creator Tools</span>
              </div>
              <h1 className="hub-hero__title">
                Software Built for Velocity, <br />
                <span className="hub-hero__highlight">Precision &amp; Creative Freedom</span>
              </h1>
              <p className="hub-hero__desc">
                Welcome to the official <strong>Mohd Khan Studio</strong> ecosystem. Discover in-browser video editors with audio voiceover sync, high-throughput bulk media downloaders, and desktop automation tools. All software, releases, and direct WhatsApp developer support in one place.
              </p>
              <div className="hub-hero__actions">
                <button
                  type="button"
                  className="hub-btn hub-btn--primary"
                  onClick={() => {
                    setActiveTab("studio");
                    onNew();
                  }}
                >
                  <span>🚀 Launch AutoEditor Online (Free)</span>
                </button>
                <button type="button" className="hub-btn hub-btn--secondary" onClick={() => setActiveTab("downloads")}>
                  <span>📥 Download Desktop Apps</span>
                </button>
                <a
                  href={directWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hub-btn hub-btn--wa"
                  title="Direct WhatsApp Support"
                >
                  <span>💬 WhatsApp Developer ({SUPPORT_CONFIG.whatsappDisplayNumber || "+91 8198966902"})</span>
                </a>
              </div>
            </div>

            {/* Featured Applications Grid */}
            <div className="ph__head">
              <h2 className="ph__title" style={{ fontSize: 24 }}>Featured Applications</h2>
              <p className="ph__sub">Explore our production-grade software suites and web applications.</p>
            </div>

            <div className="hub-features-grid" style={{ marginBottom: 40 }}>
              {/* App 1: MK AutoEditor V2 */}
              <div className="hub-feature-card" style={{ borderColor: "rgba(245, 158, 11, 0.45)", background: "linear-gradient(180deg, rgba(28, 30, 42, 0.9) 0%, rgba(18, 20, 28, 0.9) 100%)" }}>
                <div className="hub-feature-card__top">
                  <span className="hub-feature-card__icon">🎬</span>
                  <span className="hub-feature-card__badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", borderColor: "rgba(16, 185, 129, 0.3)" }}>
                    Live Web App • v2.1
                  </span>
                </div>
                <h3 className="hub-feature-card__title">MK AutoEditor V2</h3>
                <p className="hub-feature-card__desc" style={{ marginBottom: 14 }}>
                  AI &amp; timeline video editor with automatic voiceover audio waveform sync, 5x fast GPU WebCodecs render, and dynamic TikTok/Reels captions.
                </p>
                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    type="button"
                    className="hub-btn hub-btn--primary"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => {
                      setActiveTab("studio");
                      onNew();
                    }}
                  >
                    <span>🚀 Launch Online Studio ↗</span>
                  </button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="hub-btn hub-btn--secondary"
                      style={{ flex: 1, fontSize: 11, padding: "6px" }}
                      onClick={() => setActiveTab("downloads")}
                    >
                      <span>📥 PC ZIP</span>
                    </button>
                    <button
                      type="button"
                      className="hub-btn hub-btn--secondary"
                      style={{ flex: 1, fontSize: 11, padding: "6px" }}
                      onClick={() => setActiveTab("downloads")}
                    >
                      <span>📱 Android</span>
                    </button>
                    <a
                      href={buildWhatsAppUrl({ topic: "MK AutoEditor Support", details: "I have a question or issue regarding MK AutoEditor V2." })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hub-btn hub-btn--wa"
                      style={{ flex: 1, fontSize: 11, padding: "6px" }}
                    >
                      <span>💬 Help</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* App 2: OmniGrab Pro (Bulk Video Downloader) */}
              <div className="hub-feature-card">
                <div className="hub-feature-card__top">
                  <span className="hub-feature-card__icon">📥</span>
                  <span className="hub-feature-card__badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}>
                    Desktop App • v1.0
                  </span>
                </div>
                <h3 className="hub-feature-card__title">OmniGrab Pro</h3>
                <p className="hub-feature-card__desc" style={{ marginBottom: 14 }}>
                  High-speed multi-threaded batch video and media downloader built on Electron, FastAPI, and yt-dlp. Full channels, playlists, and 4K media extraction.
                </p>
                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                  <a
                    href="https://github.com/mohdkhan-lab/bulk-video-downloader"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hub-btn hub-btn--secondary"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <span>💻 View Desktop Releases ↗</span>
                  </a>
                  <a
                    href={buildWhatsAppUrl({ topic: "OmniGrab Pro Inquiry", details: "I would like to download or request platforms for OmniGrab Pro bulk downloader." })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hub-btn hub-btn--wa"
                    style={{ width: "100%", justifyContent: "center", fontSize: 11, padding: "6px" }}
                  >
                    <span>💬 Request Features &amp; Setup Help</span>
                  </a>
                </div>
              </div>

              {/* App 3: Flow MK Studio */}
              <div className="hub-feature-card">
                <div className="hub-feature-card__top">
                  <span className="hub-feature-card__icon">⚡</span>
                  <span className="hub-feature-card__badge" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7", borderColor: "rgba(168, 85, 247, 0.3)" }}>
                    Pro Suite Beta
                  </span>
                </div>
                <h3 className="hub-feature-card__title">Flow MK Studio</h3>
                <p className="hub-feature-card__desc" style={{ marginBottom: 14 }}>
                  Multi-account browser workspace and automated video job queue. Completely isolated Google profiles with zero session leakage and SQLite database.
                </p>
                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                  <a
                    href="https://github.com/mohdkhan-lab/Flow-Mk-Studio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hub-btn hub-btn--secondary"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <span>⚙️ View Desktop Suite ↗</span>
                  </a>
                  <a
                    href={buildWhatsAppUrl({ topic: "Flow MK Studio Access", details: "I want to join the Flow MK Studio beta or discuss automation workflows." })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hub-btn hub-btn--wa"
                    style={{ width: "100%", justifyContent: "center", fontSize: 11, padding: "6px" }}
                  >
                    <span>💬 Request Beta Access</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Updates & Changelog Dual Pane */}
            <div className="hub-updates-wrap">
              <div className="hub-pane-card">
                <h3 className="hub-pane-card__title">
                  <span>🆕</span> <span>Latest Updates &amp; Changelog</span>
                </h3>
                <ul className="hub-changelog-list">
                  <li className="hub-changelog-item">
                    <span className="hub-changelog-item__tag">MK AutoEditor</span>
                    <div>
                      <strong>v2.1 Stable:</strong> Direct WhatsApp support (+91 8198966902) connected, 5x WebCodecs GPU turbo engine, and gap-fill SFX transitions.
                    </div>
                  </li>
                  <li className="hub-changelog-item">
                    <span className="hub-changelog-item__tag">OmniGrab Pro</span>
                    <div>
                      <strong>v1.0.0:</strong> Multi-stream parallel video extraction, yt-dlp auto-updates, and native Electron dark UI.
                    </div>
                  </li>
                  <li className="hub-changelog-item">
                    <span className="hub-changelog-item__tag">Flow Studio</span>
                    <div>
                      <strong>Phase 1–4 Beta:</strong> Isolated Chromium profile state machine, Playwright queue controller, and SQLite local storage.
                    </div>
                  </li>
                </ul>
              </div>

              {/* Developer Connect Box */}
              <div className="hub-pane-card" style={{ display: "flex", flexDirection: "column" }}>
                <h3 className="hub-pane-card__title">
                  <span>👤</span> <span>Developer &amp; Support Direct Access</span>
                </h3>
                <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 18 }}>
                  Have an issue with any application, or want a custom tool/feature developed? Connect directly with developer <strong>Mohd Khan</strong> for instant solutions.
                </p>
                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                  <a
                    href={directWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hub-btn hub-btn--wa"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <span>💬 WhatsApp Developer ({SUPPORT_CONFIG.whatsappDisplayNumber || "+91 8198966902"})</span>
                  </a>
                  <div style={{ display: "flex", gap: 10 }}>
                    <a
                      href={buildTelegramUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hub-btn hub-btn--secondary"
                      style={{ flex: 1, justifyContent: "center", fontSize: 12 }}
                    >
                      <span>✈️ Telegram (@{SUPPORT_CONFIG.telegramUsername})</span>
                    </a>
                    <button
                      type="button"
                      className="hub-btn hub-btn--secondary"
                      style={{ flex: 1, justifyContent: "center", fontSize: 12 }}
                      onClick={() => setActiveTab("support")}
                    >
                      <span>🛠️ Report Problem</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: VIDEO STUDIO (Projects Manager & In-Browser Editor)                 */}
        {/* ========================================================================= */}
        {activeTab === "studio" && (
          <section>
            <div className="ph__head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 className="ph__title" style={{ fontSize: 24 }}>MK AutoEditor — Studio Workspaces</h2>
                <p className="ph__sub">
                  {projects.length > 0 
                    ? `Pick up where you left off — ${projects.length} saved project${projects.length > 1 ? "s" : ""} on this device.` 
                    : "Create a fresh cut below or import your audio voiceover and media clips."}
                </p>
              </div>
            </div>

            <div className="ph__grid">
              <button className="ph__new" onClick={onNew}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, color: "var(--amber)", fontWeight: 700, fontSize: 14 }}>
                <span>💡</span> <span>Pro Tip: Timestamp Auto-Sync Naming</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                Name your images or video files with their starting timestamp (e.g. <code style={{ color: "#fbbf24", background: "rgba(245, 158, 11, 0.15)", padding: "2px 6px", borderRadius: 4 }}>0-12_scene.jpg</code> for 12 seconds, or <code style={{ color: "#fbbf24", background: "rgba(245, 158, 11, 0.15)", padding: "2px 6px", borderRadius: 4 }}>#1-05.mp4</code> for 1 min 05 sec). When you drop them with your voiceover audio, MK AutoEditor automatically places them at the exact millisecond!
              </p>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FEATURES SHOWCASE                                                  */}
        {/* ========================================================================= */}
        {activeTab === "features" && (
          <section>
            <div className="ph__head">
              <h2 className="ph__title" style={{ fontSize: 26 }}>AutoEditor Engine Features</h2>
              <p className="ph__sub">State-of-the-art client-side video processing built for creator speed.</p>
            </div>

            <div className="hub-features-grid">
              <div className="hub-feature-card">
                <div className="hub-feature-card__top">
                  <span className="hub-feature-card__icon">⚡</span>
                  <span className="hub-feature-card__badge">Hardware GPU</span>
                </div>
                <h3 className="hub-feature-card__title">5x WebCodecs Turbo Engine</h3>
                <p className="hub-feature-card__desc">
                  Render 1080p MP4 directly inside your browser using GPU hardware acceleration. No server queues, zero cloud upload wait, and completely free.
                </p>
              </div>

              <div className="hub-feature-card">
                <div className="hub-feature-card__top">
                  <span className="hub-feature-card__icon">🎙️</span>
                  <span className="hub-feature-card__badge">Auto Alignment</span>
                </div>
                <h3 className="hub-feature-card__title">Audio &amp; Voiceover Sync</h3>
                <p className="hub-feature-card__desc">
                  Interactive multi-channel waveform peak detector. Smart automatic timestamp positioning matches your audio narrations down to the exact frame.
                </p>
              </div>

              <div className="hub-feature-card">
                <div className="hub-feature-card__top">
                  <span className="hub-feature-card__icon">💬</span>
                  <span className="hub-feature-card__badge">TikTok / Reels</span>
                </div>
                <h3 className="hub-feature-card__title">Dynamic Burn-in Subtitles</h3>
                <p className="hub-feature-card__desc">
                  Auto subtitle timing with .srt &amp; .vtt support. Customize high-impact viral caption fonts, outlines, gold accent highlights, and vertical safe-zones.
                </p>
              </div>

              <div className="hub-feature-card">
                <div className="hub-feature-card__top">
                  <span className="hub-feature-card__icon">🎬</span>
                  <span className="hub-feature-card__badge">Cinematic FX</span>
                </div>
                <h3 className="hub-feature-card__title">6+ Transitions &amp; Sound FX</h3>
                <p className="hub-feature-card__desc">
                  Seamless crossfades, zoom-ins, directional wipes, and glitch effects paired with automatic whoosh sound effects for high viewer retention.
                </p>
              </div>

              <div className="hub-feature-card">
                <div className="hub-feature-card__top">
                  <span className="hub-feature-card__icon">🔒</span>
                  <span className="hub-feature-card__badge">100% Private</span>
                </div>
                <h3 className="hub-feature-card__title">Local-First Storage</h3>
                <p className="hub-feature-card__desc">
                  Your videos, photos, and voice recordings never leave your device. All assets are safely stored in browser IndexedDB with zero cloud exposure.
                </p>
              </div>

              <div className="hub-feature-card">
                <div className="hub-feature-card__top">
                  <span className="hub-feature-card__icon">📱</span>
                  <span className="hub-feature-card__badge">Cross Platform</span>
                </div>
                <h3 className="hub-feature-card__title">PC &amp; Android Ready</h3>
                <p className="hub-feature-card__desc">
                  Optimized for desktop Chrome, Edge, and Brave with keyboard shortcuts, plus mobile touchscreen timeline support via Android Termux.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 36, textAlign: "center" }}>
              <button
                type="button"
                className="hub-btn hub-btn--primary"
                onClick={() => {
                  setActiveTab("studio");
                  onNew();
                }}
              >
                <span>🚀 Try In Studio Workspace Now →</span>
              </button>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: DOWNLOADS CENTER                                                   */}
        {/* ========================================================================= */}
        {activeTab === "downloads" && (
          <section>
            <div className="ph__head">
              <h2 className="ph__title" style={{ fontSize: 26 }}>Downloads Center</h2>
              <p className="ph__sub">Download offline packages for Windows PC or setup portable mobile editing on Android.</p>
            </div>

            <div className="hub-downloads-grid">
              {/* Windows PC Card */}
              <div className="hub-download-card hub-download-card--featured">
                <div className="hub-download-card__ribbon">Recommended</div>
                <div className="hub-download-card__head">
                  <span className="hub-download-card__icon">💻</span>
                  <div>
                    <h3 className="hub-download-card__platform">MK AutoEditor for Windows</h3>
                    <div className="hub-download-card__ver">v2.1 Stable • 64-bit Offline Package</div>
                  </div>
                </div>
                <p className="hub-download-card__desc">
                  Best for heavy 4K/1080p video renders and long-duration documentary projects. Zero upload latency, unlimited timeline clips, and instant 1-click startup.
                </p>
                <div className="hub-download-card__steps">
                  <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--amber)" }}>⚡ Quick 3-Step Setup:</div>
                  <ol>
                    <li>Download &amp; Extract the ZIP package</li>
                    <li>Double-click <strong>start.bat</strong> to launch</li>
                    <li>Studio automatically opens in your default browser!</li>
                  </ol>
                </div>
                <a
                  href="https://github.com/mohdkhan-lab/mk-autoeditorV2/archive/refs/heads/main.zip"
                  className="hub-btn hub-btn--primary hub-download-card__btn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>📥 Download Windows Package (.ZIP)</span>
                </a>
              </div>

              {/* OmniGrab Pro Card */}
              <div className="hub-download-card">
                <div className="hub-download-card__head">
                  <span className="hub-download-card__icon">📥</span>
                  <div>
                    <h3 className="hub-download-card__platform">OmniGrab Pro Desktop</h3>
                    <div className="hub-download-card__ver">Bulk Video Downloader • Electron App</div>
                  </div>
                </div>
                <p className="hub-download-card__desc">
                  Batch social media &amp; streaming video downloader for Windows. Fast multi-threaded extraction with playlist and 4K support.
                </p>
                <div className="hub-download-card__steps">
                  <div style={{ fontWeight: 700, marginBottom: 6, color: "#38bdf8" }}>📺 Capabilities:</div>
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                    <li>Up to 4K 60fps &amp; High-Bitrate MP3</li>
                    <li>Multi-platform video &amp; playlist extraction</li>
                    <li>Zero throttling batch engine</li>
                  </ul>
                </div>
                <a
                  href="https://github.com/mohdkhan-lab/bulk-video-downloader"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hub-btn hub-btn--secondary hub-download-card__btn"
                >
                  <span>💻 Get OmniGrab Releases →</span>
                </a>
              </div>

              {/* Android Mobile Card */}
              <div className="hub-download-card">
                <div className="hub-download-card__head">
                  <span className="hub-download-card__icon">📱</span>
                  <div>
                    <h3 className="hub-download-card__platform">Android Mobile Studio</h3>
                    <div className="hub-download-card__ver">v2.1 via Termux Setup</div>
                  </div>
                </div>
                <p className="hub-download-card__desc">
                  Turn your Android phone into a portable video production studio. Full hardware acceleration directly inside mobile Chrome or Chromium.
                </p>
                <div className="hub-download-card__steps">
                  <div style={{ fontWeight: 700, marginBottom: 6, color: "#10b981" }}>📱 Easy Mobile Setup:</div>
                  <ol>
                    <li>Install <strong>Termux</strong> from F-Droid</li>
                    <li>Run setup command from our guide</li>
                    <li>Open <code>http://localhost:3000</code> in Chrome</li>
                  </ol>
                </div>
                <a
                  href="https://github.com/mohdkhan-lab/mk-autoeditorV2/blob/main/docs/termux-android-setup.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hub-btn hub-btn--secondary hub-download-card__btn"
                >
                  <span>📖 View Android Setup Guide →</span>
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
                    <label className="hub-form-label">Select Application</label>
                    <select
                      className="hub-form-select"
                      value={supportApp}
                      onChange={(e) => setSupportApp(e.target.value)}
                    >
                      <option value="MK AutoEditor V2">🎬 MK AutoEditor V2 (Web / Windows)</option>
                      <option value="OmniGrab Pro">📥 OmniGrab Pro (Bulk Downloader)</option>
                      <option value="Flow MK Studio">⚡ Flow MK Studio (Automation)</option>
                      <option value="Custom App Request">💡 Request New App / Custom Software</option>
                      <option value="General Question">❓ General Feedback / Question</option>
                    </select>
                  </div>

                  <div className="hub-form-group">
                    <label className="hub-form-label">Issue Category</label>
                    <select
                      className="hub-form-select"
                      value={supportCategory}
                      onChange={(e) => setSupportCategory(e.target.value)}
                    >
                      <option value="Bug Report / Error">⚠️ Bug Report / Error</option>
                      <option value="Export / Render Freeze">🚀 Export / Render Problem</option>
                      <option value="Download / Setup Help">📥 Installation &amp; Setup Help</option>
                      <option value="Feature Suggestion">💡 New Feature Suggestion</option>
                      <option value="Custom Software Inquiry">💼 Build Custom Software / Partnership</option>
                    </select>
                  </div>

                  <div className="hub-form-group">
                    <label className="hub-form-label">Your Name / Contact Info</label>
                    <input
                      type="text"
                      className="hub-form-input"
                      placeholder="e.g. Rahul / rahul@example.com"
                      value={supportName}
                      onChange={(e) => setSupportName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="hub-form-group">
                    <label className="hub-form-label">Describe Problem or Details</label>
                    <textarea
                      className="hub-form-textarea"
                      placeholder="Tell us what problem occurred or what feature you need..."
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
                  <span>⚡</span> <span>Direct Support Channels</span>
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
                    href={buildEmailUrl({ topic: "Support Request" })}
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
