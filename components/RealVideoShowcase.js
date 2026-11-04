"use client";
import { useState, useRef } from "react";

const SHOWCASE_ITEMS = [
  {
    id: "ai-upi",
    title: "Will AI Now Pay Directly From Your UPI?",
    tagline: "High-retention personal finance & fintech explainer cut with automated timestamp snapping.",
    channel: "MK Finance (@MKFinance18)",
    duration: "11:01",
    resolution: "1080p Full HD",
    fps: "60 fps",
    thumb: "/showcase/ai-upi-thumb.jpg",
    previewVideo: "/showcase/ai-upi-preview.mp4",
    youtubeUrl: "https://www.youtube.com/@MKFinance18",
    badge: "Fintech & AI Breakdown",
    accentColor: "#38bdf8",
    stats: {
      timeSaved: "70% Faster Turnaround",
      clipsCount: "48 Scenes Synced",
      feature: "Voiceover Waveform Auto-Cut",
    },
    howItWasMade: [
      "Voiceover dropped as primary track — silence threshold automatically removed 18 awkward pauses.",
      "Images named with timestamps (0-05_upi.jpg, 0-18_ai_agent.png) snapped into place without dragging.",
      "WebCodecs GPU engine rendered 1080p 60fps MP4 in 2 minutes 15 seconds.",
    ],
  },
  {
    id: "no-cost-emi",
    title: "Where is the Cost Hidden in No Cost EMI?",
    tagline: "Dynamic kinetic captions, gold highlight styling, and zoom transitions for consumer finance.",
    channel: "MK Finance (@MKFinance18)",
    duration: "07:52",
    resolution: "1080p Full HD",
    fps: "60 fps",
    thumb: "/showcase/no-cost-emi-thumb.jpg",
    previewVideo: "/showcase/no-cost-emi-preview.mp4",
    youtubeUrl: "https://www.youtube.com/@MKFinance18",
    badge: "Dynamic Subtitles & Pacing",
    accentColor: "var(--amber)",
    stats: {
      timeSaved: "1-Click Subtitles",
      clipsCount: "34 Timestamp Cuts",
      feature: "Kinetic Gold Subtitles",
    },
    howItWasMade: [
      "Auto-generated subtitle track with high-contrast Anton 72px bold typography.",
      "Keyword highlights dynamically colored in gold (#fbbf24) for maximum viewer retention.",
      "6+ seamless crossfades paired with automatic Whoosh sound effects at scene changes.",
    ],
  },
  {
    id: "banking-system",
    title: "How Money & The Banking System Actually Works",
    tagline: "Long-form documentary cut featuring multi-scene pacing, custom watermark and high-bitrate export.",
    channel: "MK Finance (@MKFinance18)",
    duration: "09:53",
    resolution: "1080p Full HD",
    fps: "60 fps",
    thumb: "/showcase/banking-system-thumb.jpg",
    previewVideo: "/showcase/banking-system-preview.mp4",
    youtubeUrl: "https://www.youtube.com/@MKFinance18",
    badge: "Long-Form Documentary",
    accentColor: "#10b981",
    stats: {
      timeSaved: "Zero Server Latency",
      clipsCount: "62 Document Clips",
      feature: "High-Bitrate H.264",
    },
    howItWasMade: [
      "Loaded 60+ historical banking archives and economic charts with timestamp naming.",
      "Custom channel logo watermark burned in the top-right corner with 85% opacity.",
      "100% client-side IndexedDB cache ensured no browser crashes during heavy 10-minute editing.",
    ],
  },
  {
    id: "30-days-wealth",
    title: "30 Days Financial Freedom Blueprint",
    tagline: "Viral hook pacing, fast cuts every 3 seconds, and high-impact sound design.",
    channel: "MK Finance (@MKFinance18)",
    duration: "09:31",
    resolution: "1080p Full HD",
    fps: "60 fps",
    thumb: "/showcase/30-days-thumb.jpg",
    previewVideo: "/showcase/30-days-preview.mp4",
    youtubeUrl: "https://www.youtube.com/@MKFinance18",
    badge: "Viral Retention Strategy",
    accentColor: "#a855f7",
    stats: {
      timeSaved: "5x GPU Acceleration",
      clipsCount: "55 Fast Cuts",
      feature: "Whoosh & Glitch SFX",
    },
    howItWasMade: [
      "High-energy hook crafted with 3-second rapid image transitions.",
      "Integrated glitch SFX and directional slide transitions for smooth retention.",
      "Exported in 1080p 60fps ready for YouTube direct upload.",
    ],
  },
];

export default function RealVideoShowcase({ onStartProject }) {
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const videoRefs = useRef({});

  const handleMouseEnter = (id) => {
    setHoveredId(id);
    const v = videoRefs.current[id];
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
  };

  const handleMouseLeave = (id) => {
    setHoveredId(null);
    const v = videoRefs.current[id];
    if (v) {
      v.pause();
    }
  };

  return (
    <section className="showcase-section" style={{ margin: "50px 0 60px" }}>
      {/* SECTION HEADER WITH AUTHORITY BADGE */}
      <div className="ph__head" style={{ textAlign: "center", marginBottom: 36 }}>
        <div className="hub-hero__chip" style={{ margin: "0 auto 12px" }}>
          <span className="hub-hero__dot" style={{ background: "#ef4444", boxShadow: "0 0 8px #ef4444" }}></span>
          <span>Verified Production Proof • MK Finance YouTube Pipeline</span>
        </div>
        <h2 className="ph__title" style={{ fontSize: 32, marginBottom: 12 }}>
          Real YouTube Videos Created with MK AutoEditor V2
        </h2>
        <p className="ph__sub" style={{ maxWidth: 740, margin: "0 auto", fontSize: 14.5 }}>
          These high-retention personal finance videos were scripted, voiceover-synced, and rendered using <strong>MK AutoEditor V2</strong> for <a href="https://www.youtube.com/@MKFinance18" target="_blank" rel="noopener noreferrer" style={{ color: "var(--amber)", fontWeight: 700, textDecoration: "underline" }}>@MKFinance18 on YouTube</a>. Hover over any card for a live preview cut!
        </p>
      </div>

      {/* SHOWCASE CARDS GRID */}
      <div className="showcase-grid">
        {SHOWCASE_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`showcase-card ${hoveredId === item.id ? "is-hovered" : ""}`}
            onMouseEnter={() => handleMouseEnter(item.id)}
            onMouseLeave={() => handleMouseLeave(item.id)}
            onClick={() => setActiveModalItem(item)}
          >
            {/* Video Preview Container */}
            <div className="showcase-card__media">
              {/* Fallback Image */}
              <img
                src={item.thumb}
                alt={item.title}
                className="showcase-card__img"
              />

              {/* Looping Muted Teaser Video */}
              <video
                ref={(el) => (videoRefs.current[item.id] = el)}
                src={item.previewVideo}
                muted
                loop
                playsInline
                preload="metadata"
                className={`showcase-card__video ${hoveredId === item.id ? "is-visible" : ""}`}
              />

              {/* Play Overlay Icon */}
              <div className="showcase-card__play-badge">
                <span>▶ Preview</span>
              </div>

              {/* Badges on Top of Media */}
              <div className="showcase-card__top-pills">
                <span className="pill pill--active" style={{ background: "rgba(0,0,0,0.75)", color: item.accentColor, border: `1px solid ${item.accentColor}` }}>
                  {item.badge}
                </span>
                <span className="pill pill--active" style={{ background: "rgba(0,0,0,0.75)", color: "#fff" }}>
                  ⏱️ {item.duration}
                </span>
              </div>
            </div>

            {/* Video Info Content */}
            <div className="showcase-card__body">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 800 }}>▶</span>
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{item.channel}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono, monospace)" }}>
                  {item.resolution}
                </span>
              </div>

              <h3 className="showcase-card__title">{item.title}</h3>
              <p className="showcase-card__desc">{item.tagline}</p>

              {/* Metrics Pill Grid */}
              <div className="showcase-metrics-row">
                <div className="showcase-metric-pill">
                  <span className="metric-icon">⚡</span>
                  <span>{item.stats.timeSaved}</span>
                </div>
                <div className="showcase-metric-pill">
                  <span className="metric-icon">🎬</span>
                  <span>{item.stats.clipsCount}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="showcase-card__foot">
                <button
                  type="button"
                  className="hub-btn hub-btn--primary"
                  style={{ flex: 1, fontSize: 12.5, padding: "8px 12px", justifyContent: "center" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveModalItem(item);
                  }}
                >
                  <span>🔍 Case Study &amp; Workflow</span>
                </button>
                <a
                  href={item.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hub-btn hub-btn--secondary"
                  style={{ fontSize: 12.5, padding: "8px 12px", justifyContent: "center" }}
                  onClick={(e) => e.stopPropagation()}
                  title="Watch on official YouTube channel"
                >
                  <span>📺 YouTube ↗</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AUTHORITY SOCIAL PROOF BAR */}
      <div className="showcase-banner">
        <div className="showcase-banner__left">
          <span style={{ fontSize: 32 }}>🏆</span>
          <div>
            <h4 style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: 0 }}>
              Tested on Real Production Videos with 100K+ Views
            </h4>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>
              MK AutoEditor is not a prototype — it powers actual YouTube channel video production pipelines every day.
            </p>
          </div>
        </div>

        <div className="showcase-banner__right">
          <button
            type="button"
            onClick={onStartProject}
            className="hub-btn hub-btn--gold"
            style={{ padding: "11px 22px", fontSize: 14 }}
          >
            <span>🚀 Create Your Video with AutoEditor</span>
          </button>
        </div>
      </div>

      {/* CINEMA CASE STUDY MODAL */}
      {activeModalItem && (
        <div className="modal-overlay" onClick={() => setActiveModalItem(null)}>
          <div className="cinema-modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="cinema-modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>🎬</span>
                <div>
                  <h3 className="modal-title" style={{ fontSize: 18 }}>{activeModalItem.title}</h3>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    Case Study • {activeModalItem.channel} • {activeModalItem.resolution} ({activeModalItem.fps})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="modal-close-btn"
                style={{ fontSize: 16 }}
              >
                ✕
              </button>
            </div>

            {/* Video Player in Cinema Mode */}
            <div className="cinema-video-wrap">
              <video
                src={activeModalItem.previewVideo}
                autoPlay
                controls
                loop
                playsInline
                className="cinema-video-player"
              />
            </div>

            {/* Editing Formula Breakdown */}
            <div className="cinema-breakdown-box">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <strong style={{ color: "var(--amber)", fontSize: 14 }}>
                  ⚡ How this video was produced in MK AutoEditor V2:
                </strong>
                <span className="pill pill--active" style={{ fontSize: 11 }}>
                  {activeModalItem.stats.feature}
                </span>
              </div>

              <ul className="cinema-steps-list">
                {activeModalItem.howItWasMade.map((step, idx) => (
                  <li key={idx} className="cinema-step-item">
                    <span className="cinema-step-num">{idx + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Modal Footer CTAs */}
            <div className="cinema-modal-foot">
              <button
                type="button"
                onClick={() => {
                  setActiveModalItem(null);
                  onStartProject();
                }}
                className="hub-btn hub-btn--primary"
                style={{ flex: 1, justifyContent: "center", padding: "12px" }}
              >
                <span>🚀 Launch AutoEditor &amp; Make Similar Video</span>
              </button>

              <a
                href={activeModalItem.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hub-btn hub-btn--secondary"
                style={{ justifyContent: "center", padding: "12px" }}
              >
                <span>📺 Watch on YouTube ↗</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
