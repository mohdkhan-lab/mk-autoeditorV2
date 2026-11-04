"use client";

export default function BentoGridSection({ onStartProject }) {
  return (
    <section className="bento-section" style={{ margin: "50px 0 60px" }}>
      {/* SECTION HEADER */}
      <div className="ph__head" style={{ textAlign: "center", marginBottom: 36 }}>
        <div className="hub-hero__chip" style={{ margin: "0 auto 12px" }}>
          <span className="hub-hero__dot" style={{ background: "#818cf8", boxShadow: "0 0 8px #818cf8" }}></span>
          <span>Next-Gen Video Production Architecture</span>
        </div>
        <h2 className="ph__title" style={{ fontSize: 32, marginBottom: 12 }}>
          Engineered for Extreme Velocity &amp; Creative Control
        </h2>
        <p className="ph__sub" style={{ maxWidth: 720, margin: "0 auto", fontSize: 14.5 }}>
          Traditional timeline editors require hours of manual clip dragging and cloud rendering queues. MK AutoEditor automates the mechanical work so you can publish daily.
        </p>
      </div>

      {/* BENTO GRID */}
      <div className="bento-grid">
        {/* BENTO 1: WAVEFORM & TIMESTAMP CORE (LARGE SPAN 2) */}
        <div className="bento-card bento-card--large">
          <div className="bento-card__badge-row">
            <span className="bento-pill" style={{ color: "var(--amber)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
              🎙️ Automatic Timestamp Sync
            </span>
            <span className="bento-tag">Instant Alignment</span>
          </div>

          <div className="bento-card__content">
            <h3 className="bento-card__title">
              Drop Voiceover Audio. Watch Clips Snap Into Place.
            </h3>
            <p className="bento-card__desc">
              Name your files with timestamps (e.g. <code>0-05_hook.jpg</code>, <code>0-18_story.png</code>, <code>#1-05_scene.mp4</code>). AutoEditor decodes the filename, analyzes voice waveform peaks, and snaps each asset into the exact frame without manual timeline dragging.
            </p>

            {/* Interactive Visual Waveform Simulator */}
            <div className="bento-visual-waveform">
              <div className="bento-waveform-header">
                <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Waveform Peak Tracker:
                </span>
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "var(--amber)" }}>
                  Auto-Snap Active
                </span>
              </div>

              <div className="bento-soundbars">
                {[30, 65, 90, 45, 100, 75, 40, 85, 95, 60, 30, 70, 100, 80, 50, 90, 65, 40, 85, 100, 50, 75, 90, 35].map((h, i) => (
                  <span
                    key={i}
                    className="bento-soundbar"
                    style={{
                      height: `${h}%`,
                      background: i % 3 === 0 ? "var(--amber)" : i % 2 === 0 ? "#38bdf8" : "rgba(255,255,255,0.25)",
                    }}
                  />
                ))}
              </div>

              <div className="bento-clips-track">
                <div className="bento-clip-tag bento-clip-tag--gold">
                  <span>0-05_hook.jpg (Snaps 5.0s)</span>
                </div>
                <div className="bento-clip-tag bento-clip-tag--cyan">
                  <span>0-18_story.png (Snaps 18.0s)</span>
                </div>
                <div className="bento-clip-tag bento-clip-tag--purple">
                  <span>#1-05_outro.mp4 (Snaps 1m 5s)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BENTO 2: 5X GPU SPEED (MEDIUM SPAN 1) */}
        <div className="bento-card">
          <div className="bento-card__badge-row">
            <span className="bento-pill" style={{ color: "#10b981", borderColor: "rgba(16, 185, 129, 0.3)" }}>
              ⚡ 5x Hardware GPU
            </span>
          </div>

          <div className="bento-card__content">
            <h3 className="bento-card__title">WebCodecs GPU Turbo Render</h3>
            <p className="bento-card__desc">
              Exports 1080p 60fps MP4 directly inside your browser using your computer's native GPU acceleration.
            </p>

            <div className="bento-speed-stat">
              <div className="speed-row">
                <span className="speed-label">Cloud Video SaaS</span>
                <div className="speed-bar speed-bar--slow" style={{ width: "85%" }}>
                  <span>~6 mins (Queue)</span>
                </div>
              </div>
              <div className="speed-row">
                <span className="speed-label" style={{ color: "#10b981", fontWeight: 700 }}>MK AutoEditor GPU</span>
                <div className="speed-bar speed-bar--fast" style={{ width: "25%" }}>
                  <span>45s (Turbo)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BENTO 3: DYNAMIC REELS / SHORTS CAPTIONS (MEDIUM SPAN 1) */}
        <div className="bento-card">
          <div className="bento-card__badge-row">
            <span className="bento-pill" style={{ color: "#a855f7", borderColor: "rgba(168, 85, 247, 0.3)" }}>
              💬 Kinetic Text
            </span>
          </div>

          <div className="bento-card__content">
            <h3 className="bento-card__title">Dynamic Shorts &amp; Reels Captions</h3>
            <p className="bento-card__desc">
              High-impact word-by-word kinetic animated subtitles. Anton &amp; Russo One fonts with high-contrast outlines and vertical 9:16 safe-zones.
            </p>

            <div className="bento-caption-preview">
              <span className="caption-word">VIRAL</span>{" "}
              <span className="caption-word caption-word--highlight">RETENTION</span>{" "}
              <span className="caption-word">CAPTIONS</span>
            </div>
          </div>
        </div>

        {/* BENTO 4: LOCAL-FIRST PRIVACY (LARGE SPAN 2) */}
        <div className="bento-card bento-card--large">
          <div className="bento-card__badge-row">
            <span className="bento-pill" style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}>
              🔒 100% Client-Side Privacy
            </span>
            <span className="bento-tag">Zero Cloud Exposure</span>
          </div>

          <div className="bento-card__content">
            <h3 className="bento-card__title">
              Your Files Never Leave Your Computer.
            </h3>
            <p className="bento-card__desc">
              Unlike cloud-based editing services that upload your personal media, proprietary voice recordings, and raw drafts to remote servers, MK AutoEditor executes entirely on your device via browser IndexedDB and WebAssembly.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
              <div className="privacy-pill">
                <span style={{ color: "#10b981" }}>✓</span> Zero upload latency
              </div>
              <div className="privacy-pill">
                <span style={{ color: "#10b981" }}>✓</span> Unlimited timeline media clips
              </div>
              <div className="privacy-pill">
                <span style={{ color: "#10b981" }}>✓</span> Complete data sovereignty
              </div>
              <button
                type="button"
                onClick={onStartProject}
                className="hub-btn hub-btn--primary hub-btn--sm"
                style={{ marginLeft: "auto" }}
              >
                <span>🚀 Launch Studio Workspace →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
