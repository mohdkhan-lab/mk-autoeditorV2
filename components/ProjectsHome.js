"use client";
import { useState } from "react";
import { showConfirm, showPrompt } from "./Dialog";
import { SUPPORT_CONFIG, buildWhatsAppUrl } from "../lib/supportConfig";

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
  const [activeTab, setActiveTab] = useState("studio"); // "studio" | "features" | "downloads" | "updates"
  const [menuId, setMenuId] = useState(null); // project id with its ⋮ menu open

  const directWhatsAppUrl = buildWhatsAppUrl({
    topic: "Direct Inquiry / Feedback",
    details: "I am using MK AutoEditor and have a question or feature request.",
  });

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
          <div className="ph__brand" onClick={() => setActiveTab("studio")} style={{ cursor: "pointer" }}>
            <img className="ph__logo" src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logo.svg`} alt="MK AutoEditor" width="28" height="28" />
            <span className="ph__name"><span className="ph__pre">MK</span> AutoEditor</span>
          </div>

          {/* Navigation Tabs */}
          <nav className="ph__nav-tabs">
            <button
              type="button"
              className={`ph__nav-tab ${activeTab === "studio" ? "is-active" : ""}`}
              onClick={() => setActiveTab("studio")}
            >
              <span>🎬</span> Studio
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
              className={`ph__nav-tab ${activeTab === "updates" ? "is-active" : ""}`}
              onClick={() => setActiveTab("updates")}
            >
              <span>🚀</span> Apps &amp; Updates
            </button>
          </nav>

          <div className="ph__actions">
            <button
              type="button"
              className="hub-btn hub-btn--primary"
              style={{ padding: "7px 14px", fontSize: "12.5px" }}
              onClick={onNew}
              title="Create a new video project"
            >
              <span>＋ New Project</span>
            </button>
            <button
              type="button"
              className="ph__support-btn"
              onClick={onOpenSupport}
              title="Get Developer Support"
            >
              <span className="ph__support-icon">💬</span>
              <span>Support</span>
            </button>
          </div>
        </div>
      </header>

      <div className="ph__body">
        {/* HERO BANNER (Visible on Studio & Features) */}
        {(activeTab === "studio" || activeTab === "features") && (
          <section className="hub-hero">
            <div className="hub-hero__chip">
              <span className="hub-hero__dot"></span>
              <span>MK AutoEditor v2.1 • WebCodecs 5x Turbo Engine • WhatsApp Support Connected</span>
            </div>
            <h1 className="hub-hero__title">
              Create, Sync &amp; Render Story Videos <br />
              <span className="hub-hero__highlight">At Lightning Speed</span>
            </h1>
            <p className="hub-hero__desc">
              Import voiceover audio + media clips. Automatically sync timestamps, burn in animated captions, 
              and export ultra-smooth 1080p MP4 directly in your browser or download the full desktop app for 100% offline workflow.
            </p>
            <div className="hub-hero__actions">
              <button type="button" className="hub-btn hub-btn--primary" onClick={onNew}>
                <span>🚀 Launch Web Studio (Free)</span>
              </button>
              <button type="button" className="hub-btn hub-btn--secondary" onClick={() => setActiveTab("downloads")}>
                <span>📥 Download for PC / Mobile</span>
              </button>
              <a
                href={directWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hub-btn hub-btn--wa"
                title="Chat with Mohd Khan on WhatsApp"
              >
                <span>💬 WhatsApp Developer ({SUPPORT_CONFIG.whatsappDisplayNumber || "+91 8198966902"})</span>
              </a>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: STUDIO (Your Projects & Workspaces)                                */}
        {/* ========================================================================= */}
        {activeTab === "studio" && (
          <section>
            <div className="ph__head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 className="ph__title" style={{ fontSize: 24 }}>Your Projects</h2>
                <p className="ph__sub">
                  {projects.length > 0 
                    ? `Pick up where you left off — ${projects.length} saved project${projects.length > 1 ? "s" : ""} on this device.` 
                    : "No projects created yet. Start a fresh cut below or import audio and media files."}
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

            {/* Quick Tips Box */}
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
        {/* TAB 2: FEATURES SHOWCASE                                                  */}
        {/* ========================================================================= */}
        {activeTab === "features" && (
          <section>
            <div className="ph__head">
              <h2 className="ph__title" style={{ fontSize: 26 }}>Engineered for Creator Velocity</h2>
              <p className="ph__sub">Everything you need to turn raw voiceover audio and media into polished 1080p story videos.</p>
            </div>

            <div className="hub-features-grid">
              <div className="hub-feature-card">
                <div className="hub-feature-card__top">
                  <span className="hub-feature-card__icon">⚡</span>
                  <span className="hub-feature-card__badge">Hardware GPU</span>
                </div>
                <h3 className="hub-feature-card__title">5x WebCodecs Turbo Engine</h3>
                <p className="hub-feature-card__desc">
                  Render 1080p MP4 directly inside your browser using GPU hardware acceleration. No server queues, no cloud upload wait, and zero subscription fees.
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
              <button type="button" className="hub-btn hub-btn--primary" onClick={onNew}>
                <span>🚀 Try All Features in Studio Now →</span>
              </button>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DOWNLOADS CENTER                                                   */}
        {/* ========================================================================= */}
        {activeTab === "downloads" && (
          <section>
            <div className="ph__head">
              <h2 className="ph__title" style={{ fontSize: 26 }}>Download MK AutoEditor</h2>
              <p className="ph__sub">Choose the edition that best suits your creative setup — desktop offline or mobile studio.</p>
            </div>

            <div className="hub-downloads-grid">
              {/* Windows PC Card */}
              <div className="hub-download-card hub-download-card--featured">
                <div className="hub-download-card__ribbon">Recommended</div>
                <div className="hub-download-card__head">
                  <span className="hub-download-card__icon">💻</span>
                  <div>
                    <h3 className="hub-download-card__platform">Windows PC Edition</h3>
                    <div className="hub-download-card__ver">Version 2.1 • 64-bit Offline Package</div>
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

              {/* Android Mobile Card */}
              <div className="hub-download-card">
                <div className="hub-download-card__head">
                  <span className="hub-download-card__icon">📱</span>
                  <div>
                    <h3 className="hub-download-card__platform">Android Mobile Studio</h3>
                    <div className="hub-download-card__ver">Version 2.1 via Termux</div>
                  </div>
                </div>
                <p className="hub-download-card__desc">
                  Turn your Android phone into a portable video production studio. Full hardware acceleration directly inside mobile Chrome or Chromium.
                </p>
                <div className="hub-download-card__steps">
                  <div style={{ fontWeight: 700, marginBottom: 6, color: "#10b981" }}>📱 Easy Mobile Setup:</div>
                  <ol>
                    <li>Install <strong>Termux</strong> from F-Droid</li>
                    <li>Run one command to set up Node.js &amp; AutoEditor</li>
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

              {/* Instant Web Card */}
              <div className="hub-download-card">
                <div className="hub-download-card__head">
                  <span className="hub-download-card__icon">🌐</span>
                  <div>
                    <h3 className="hub-download-card__platform">Instant Web Studio</h3>
                    <div className="hub-download-card__ver">Zero Installation Required</div>
                  </div>
                </div>
                <p className="hub-download-card__desc">
                  No downloads or installations needed! Run the complete MK AutoEditor right now in your web browser. Everything saves locally on your device.
                </p>
                <div className="hub-download-card__steps">
                  <div style={{ fontWeight: 700, marginBottom: 6, color: "#60a5fa" }}>🚀 Supported Browsers:</div>
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                    <li>Google Chrome (v94+) — 100% Supported</li>
                    <li>Microsoft Edge — 100% Supported</li>
                    <li>Brave Browser — Hardware Accelerated</li>
                  </ul>
                </div>
                <button
                  type="button"
                  className="hub-btn hub-btn--primary hub-download-card__btn"
                  onClick={onNew}
                >
                  <span>🚀 Launch Web Studio Now</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: APPS & UPDATES HUB                                                 */}
        {/* ========================================================================= */}
        {activeTab === "updates" && (
          <section>
            <div className="ph__head">
              <h2 className="ph__title" style={{ fontSize: 26 }}>Apps &amp; Updates Ecosystem</h2>
              <p className="ph__sub">Stay informed with latest changelogs, upcoming creator software, and direct developer releases by Mohd Khan.</p>
            </div>

            <div className="hub-updates-wrap">
              {/* Left Pane: Latest Changelog */}
              <div className="hub-pane-card">
                <h3 className="hub-pane-card__title">
                  <span>🆕</span> <span>What's New in v2.1</span>
                </h3>
                <ul className="hub-changelog-list">
                  <li className="hub-changelog-item">
                    <span className="hub-changelog-item__tag">Support</span>
                    <div>
                      <strong>Direct WhatsApp Support Connected:</strong> Seamless one-tap developer connection with WhatsApp number <code>+91 8198966902</code>.
                    </div>
                  </li>
                  <li className="hub-changelog-item">
                    <span className="hub-changelog-item__tag">Performance</span>
                    <div>
                      <strong>WebCodecs 5x Turbo Engine:</strong> GPU-accelerated client-side rendering with automatic Opus &amp; AAC audio fallback for Chromebooks and older PCs.
                    </div>
                  </li>
                  <li className="hub-changelog-item">
                    <span className="hub-changelog-item__tag">Audio</span>
                    <div>
                      <strong>Timeline Gap-Fill &amp; SFX Engine:</strong> Automatic transition whoosh sound generation and 1-tap gap fill on timeline.
                    </div>
                  </li>
                  <li className="hub-changelog-item">
                    <span className="hub-changelog-item__tag">Mobile</span>
                    <div>
                      <strong>Android Termux Optimization:</strong> Seamless touch scrolling, pinch zoom, and responsive playback controls on mobile screens.
                    </div>
                  </li>
                </ul>
              </div>

              {/* Right Pane: Mohd Khan Apps Ecosystem */}
              <div className="hub-pane-card">
                <h3 className="hub-pane-card__title">
                  <span>🚀</span> <span>Mohd Khan Creator Apps</span>
                </h3>
                <div className="hub-apps-list">
                  <div className="hub-app-item">
                    <div className="hub-app-item__info">
                      <h4>🎬 MK AutoEditor V2</h4>
                      <p>AI-assisted image + video voiceover timeline studio with 5x fast WebCodecs export.</p>
                    </div>
                    <span className="hub-badge hub-badge--live">v2.1 Live</span>
                  </div>

                  <div className="hub-app-item">
                    <div className="hub-app-item__info">
                      <h4>📥 Bulk Video Downloader</h4>
                      <p>High-speed multi-threaded batch video downloader for content archiving and research.</p>
                    </div>
                    <span className="hub-badge hub-badge--soon">Coming Soon</span>
                  </div>

                  <div className="hub-app-item">
                    <div className="hub-app-item__info">
                      <h4>🎨 Flow MK Studio</h4>
                      <p>Next-gen visual creator workspace and media automation workflow engine.</p>
                    </div>
                    <span className="hub-badge hub-badge--beta">Beta Testing</span>
                  </div>
                </div>

                {/* Developer Contact Card */}
                <div style={{ marginTop: 20, padding: "16px 18px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--amber)", marginBottom: 4 }}>
                    👤 Have a custom feature idea or partnership?
                  </div>
                  <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--muted)" }}>
                    Chat directly with developer <strong>Mohd Khan</strong> on WhatsApp or Telegram to request features, report bugs, or get custom software built.
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a
                      href={directWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hub-btn hub-btn--wa"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                    >
                      <span>💬 WhatsApp ({SUPPORT_CONFIG.whatsappDisplayNumber || "+91 8198966902"})</span>
                    </a>
                    <a
                      href="https://t.me/Mohdashraff18"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hub-btn hub-btn--secondary"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                    >
                      <span>✈️ Telegram (@Mohdashraff18)</span>
                    </a>
                  </div>
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
