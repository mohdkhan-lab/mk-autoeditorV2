"use client";
import { useState, useEffect } from "react";

const TUTORIAL_STEPS = [
  {
    id: "step-1",
    num: "01",
    badge: "Audio & Waveform",
    title: "1. Voiceover Audio Upload & Waveform Analysis",
    subtitle: "Drop your audio voiceover (.mp3, .wav, .m4a). The engine analyzes speech peaks and silent pauses automatically.",
    icon: "🎙️",
    timeTag: "00:00 - 00:32",
    codeLog: "[AUDIO] Voiceover analyzed: 44.1kHz Stereo • 1,420 peak frames detected • Silence threshold: -36dB",
    simulation: {
      screenType: "audio",
      highlight: "Waveform Peaks & Silence Trimming Active",
      actionText: "Voiceover loaded: 'story_voiceover.mp3' (2m 14s)",
      detail: "Smart audio detector creates high-resolution visual waveform so you can see every word spoken.",
    },
  },
  {
    id: "step-2",
    num: "02",
    badge: "Secret Formula",
    title: "2. Smart Timestamp File Naming (Auto-Snapping)",
    subtitle: "Name images or video clips with time tags (e.g. 0-05_hook.jpg, 0-18_story.png, #1-05_scene.mp4).",
    icon: "🏷️",
    timeTag: "00:32 - 01:05",
    codeLog: "[TIMELINE] Auto-Sync: 14 clips snapped to exact millisecond timestamps matching voiceover",
    simulation: {
      screenType: "timestamp",
      highlight: "Clips Auto-Placed at Exact Millisecond",
      actionText: "Dropped: 0-05_hook.jpg, 0-18_scene.png, #1-05_outro.mp4",
      detail: "No manual dragging! Files automatically snap to their timestamp positions across the timeline.",
    },
  },
  {
    id: "step-3",
    num: "03",
    badge: "Visual Timeline",
    title: "3. Interactive Timeline, Trimming & Gap Filling",
    subtitle: "Scrub smoothly through clips. Click '+' on any black gap to automatically extend previous clip or fill.",
    icon: "⏱️",
    timeTag: "01:05 - 01:42",
    codeLog: "[TIMELINE] Multi-track sync: 60fps canvas buffer ready • Auto gap-fill applied to 2 sections",
    simulation: {
      screenType: "timeline",
      highlight: "Realtime 60fps Scrubbing & Seamless Gap Fill",
      actionText: "Scrubbing Playhead • Split with 'S' • Delete with 'Del'",
      detail: "Interactive scrubbing allows frame-by-frame precision trimming with instant canvas preview.",
    },
  },
  {
    id: "step-4",
    num: "04",
    badge: "Reels & Shorts",
    title: "4. Dynamic Viral Captions & Subtitle Styling",
    subtitle: "Add .srt / .vtt subtitles with viral creator fonts (Anton, Russo One, Bangers) and gold highlights.",
    icon: "💬",
    timeTag: "01:42 - 02:18",
    codeLog: "[CAPTIONS] Subtitles burned: Font: Anton 72px • Gold highlight active • 9:16 Shorts safe-zone OK",
    simulation: {
      screenType: "captions",
      highlight: "High-Impact Kinetic Subtitles Active",
      actionText: "Auto-caption preview: 'HOW WE BUILT 100K FOLLOWERS IN 30 DAYS'",
      detail: "High retention animated text overlay designed to maximize viewer engagement on YouTube Shorts & Reels.",
    },
  },
  {
    id: "step-5",
    num: "05",
    badge: "5x GPU Engine",
    title: "5. 1-Click WebCodecs 5x GPU Hardware Render",
    subtitle: "Render 1080p 60fps MP4 directly inside your browser. 5x faster than cloud servers, with zero latency.",
    icon: "🚀",
    timeTag: "02:18 - 02:45",
    codeLog: "[RENDER] WebCodecs GPU Active • 1080p 60fps @ 14Mbps • Export speed: 5.4x realtime • 100% Client-Side",
    simulation: {
      screenType: "render",
      highlight: "Hardware Accelerated GPU Export Completed",
      actionText: "Export Progress: 100% [████████████] • video_final.mp4 ready",
      detail: "Hardware acceleration exports video in seconds directly to your Downloads folder. Zero server queue!",
    },
  },
];

export default function TutorialSection({ onStartProject }) {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(20);

  // Auto-play timer simulation
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setActiveStep((s) => (s + 1) % TUTORIAL_STEPS.length);
            return 20;
          }
          return prev + 5;
        });
      }, 400);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const current = TUTORIAL_STEPS[activeStep];

  const handleStepClick = (idx) => {
    setActiveStep(idx);
    setProgress(20 + idx * 15);
  };

  return (
    <div className="tutorial-section">
      {/* HEADER */}
      <div className="ph__head" style={{ textAlign: "center", marginBottom: 32 }}>
        <div className="hub-hero__chip" style={{ margin: "0 auto 12px" }}>
          <span className="hub-hero__dot"></span>
          <span>MK AutoEditor V2 • Complete Walkthrough Masterclass</span>
        </div>
        <h2 className="ph__title" style={{ fontSize: 32, marginBottom: 10 }}>
          See How MK AutoEditor Works in Action
        </h2>
        <p className="ph__sub" style={{ maxWidth: 720, margin: "0 auto" }}>
          Master the automated video sync workflow used by creators to produce high-retention YouTube Shorts, Reels, and documentary cuts in minutes.
        </p>
      </div>

      {/* MOCK VIDEO PLAYER CONTAINER */}
      <div className="tutorial-player-box">
        {/* Top OS Window Bar */}
        <div className="tutorial-player-topbar">
          <div className="tutorial-dots">
            <span className="t-dot t-dot--red"></span>
            <span className="t-dot t-dot--yellow"></span>
            <span className="t-dot t-dot--green"></span>
          </div>
          <div className="tutorial-player-title">
            <span>🎬</span> MK AutoEditor V2 — Workflow Tutorial &amp; Simulator
          </div>
          <div className="tutorial-player-pill">
            <span style={{ color: "#10b981" }}>●</span> 1080p 60fps • WebCodecs GPU
          </div>
        </div>

        {/* Video Simulation Canvas / Screen */}
        <div className="tutorial-player-screen">
          {/* Animated Ambient Glow */}
          <div className="t-screen-glow"></div>

          {/* Main Visual Display */}
          <div className="t-screen-content">
            <div className="t-screen-badge-row">
              <span className="t-screen-step-tag">Step {current.num} / 05</span>
              <span className="t-screen-feature-tag">{current.badge}</span>
              <span className="t-screen-time-tag">{current.timeTag}</span>
            </div>

            <div className="t-screen-center">
              <div className="t-screen-icon-wrap">
                <span className="t-screen-big-icon">{current.icon}</span>
              </div>

              <div className="t-screen-info">
                <h3 className="t-screen-title">{current.title}</h3>
                <p className="t-screen-desc">{current.subtitle}</p>
                <div className="t-screen-highlight-box">
                  <span className="t-screen-highlight-bullet">⚡</span>
                  <strong>{current.simulation.highlight}:</strong> {current.simulation.actionText}
                </div>
              </div>
            </div>

            {/* Visual Simulator Track Waveform Graphic */}
            <div className="t-simulator-visual-track">
              <div className="t-track-label">Timeline Waveform &amp; Clip Alignment Preview:</div>
              <div className="t-track-bars">
                {[45, 80, 25, 95, 60, 100, 30, 85, 40, 70, 90, 50, 85, 30, 95, 60, 100, 45, 80, 25].map((h, i) => (
                  <span
                    key={i}
                    className="t-wave-bar"
                    style={{
                      height: `${h}%`,
                      background: i % 4 === 0 ? "var(--amber)" : i % 2 === 0 ? "#38bdf8" : "rgba(255,255,255,0.3)",
                    }}
                  />
                ))}
              </div>
              <div className="t-track-clips-row">
                <div className="t-clip-block t-clip-block--1">
                  <span>0-05_hook.jpg</span>
                </div>
                <div className="t-clip-block t-clip-block--2">
                  <span>0-18_story.png</span>
                </div>
                <div className="t-clip-block t-clip-block--3">
                  <span>#1-05_scene.mp4</span>
                </div>
                <div className="t-clip-block t-clip-block--4">
                  <span>#1-45_outro.jpg</span>
                </div>
              </div>
            </div>

            {/* Terminal Command Log */}
            <div className="t-screen-terminal">
              <span className="t-term-prompt">❯</span> {current.codeLog}
            </div>
          </div>

          {/* Interactive Player Controls */}
          <div className="tutorial-player-controls">
            <button
              type="button"
              className="t-ctrl-btn t-ctrl-btn--play"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Pause Simulator" : "Play Simulation Walkthrough"}
            >
              <span>{isPlaying ? "⏸️ Pause" : "▶ Play Walkthrough"}</span>
            </button>

            {/* Progress Scrubber */}
            <div className="t-scrubber-wrap">
              <div className="t-scrubber-track">
                <div className="t-scrubber-fill" style={{ width: `${progress}%` }}></div>
                <div className="t-scrubber-thumb" style={{ left: `${progress}%` }}></div>
              </div>
            </div>

            <div className="t-time-readout">
              {current.timeTag}
            </div>

            <div className="t-nav-btns">
              <button
                type="button"
                className="t-step-nav-btn"
                disabled={activeStep === 0}
                onClick={() => handleStepClick(activeStep - 1)}
                title="Previous step"
              >
                ◀ Prev
              </button>
              <button
                type="button"
                className="t-step-nav-btn"
                disabled={activeStep === TUTORIAL_STEPS.length - 1}
                onClick={() => handleStepClick(activeStep + 1)}
                title="Next step"
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>

        {/* Step Selector Tabs Under Player */}
        <div className="tutorial-step-tabs">
          {TUTORIAL_STEPS.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              className={`t-step-tab ${activeStep === idx ? "is-active" : ""}`}
              onClick={() => handleStepClick(idx)}
            >
              <span className="t-step-tab-num">{s.num}</span>
              <div className="t-step-tab-info">
                <span className="t-step-tab-badge">{s.badge}</span>
                <span className="t-step-tab-title">{s.title.split(". ")[1]}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* QUICK CTA: START CREATING NOW */}
      <div style={{ textAlign: "center", margin: "32px 0 54px" }}>
        <button
          type="button"
          onClick={onStartProject}
          className="hub-btn hub-btn--primary"
          style={{ fontSize: 16, padding: "14px 32px", borderRadius: 12 }}
        >
          <span>🚀 Launch Studio &amp; Start Cutting Your Video Now →</span>
        </button>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
          No login required to start • 100% Free • All files stay safely on your PC
        </p>
      </div>

      {/* DEEP-DIVE STEP-BY-STEP MASTERCLASS CARDS */}
      <div className="ph__head">
        <h3 className="ph__title" style={{ fontSize: 24 }}>
          AutoEditor Kaise Chalayein? (Detailed Step-by-Step Guide)
        </h3>
        <p className="ph__sub">
          Complete guide to understanding timestamp naming, timeline shortcuts, and exporting ultra-sharp video.
        </p>
      </div>

      <div className="hub-features-grid" style={{ marginBottom: 40 }}>
        {/* Guide 1 */}
        <div className="hub-feature-card">
          <div className="hub-feature-card__top">
            <span className="hub-feature-card__icon">🎙️</span>
            <span className="hub-feature-card__badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
              Phase 1 • Voiceover
            </span>
          </div>
          <h4 className="hub-feature-card__title">Step 1: Audio / Voiceover Upload</h4>
          <p className="hub-feature-card__desc">
            Apna voiceover audio file (<strong>.mp3, .wav, ya .m4a</strong>) editor me drop karein. Engine automatically audio ke waveform peaks generate karega aur beech ke silent pauses identify karega.
          </p>
          <div className="guide-tip-pill">
            💡 <strong>Pro Tip:</strong> Agar audio me background noise hai toh clear recording use karein taaki waveform snapping accurate ho sake.
          </div>
        </div>

        {/* Guide 2: Secret Timestamp Rule */}
        <div className="hub-feature-card" style={{ border: "1px solid rgba(245, 158, 11, 0.4)", background: "linear-gradient(180deg, rgba(28, 30, 42, 0.95) 0%, rgba(18, 20, 28, 0.95) 100%)" }}>
          <div className="hub-feature-card__top">
            <span className="hub-feature-card__icon">🏷️</span>
            <span className="hub-feature-card__badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--amber)" }}>
              Phase 2 • The Secret Formula
            </span>
          </div>
          <h4 className="hub-feature-card__title">Step 2: Smart Timestamp Naming Formula</h4>
          <p className="hub-feature-card__desc">
            Images aur video clips ko manually timeline par drag karne ki zaroorat nahi hai! Bas unke naam me starting second likh dein:
          </p>
          <ul style={{ fontSize: 13, color: "var(--muted)", margin: "8px 0 12px", paddingLeft: 18, lineHeight: 1.7 }}>
            <li><code style={{ color: "var(--amber)" }}>0-05_hook.jpg</code> → 5th second par place hoga.</li>
            <li><code style={{ color: "var(--amber)" }}>0-22_story.png</code> → 22nd second par place hoga.</li>
            <li><code style={{ color: "var(--amber)" }}>#1-15_scene.mp4</code> → 1 min 15 sec par snap hoga.</li>
          </ul>
          <div className="guide-tip-pill">
            ⚡ <strong>Magic Sync:</strong> Sabhi files ko ek saath drop karein — AutoEditor har clip ko exact millisecond par fit kar deta hai!
          </div>
        </div>

        {/* Guide 3 */}
        <div className="hub-feature-card">
          <div className="hub-feature-card__top">
            <span className="hub-feature-card__icon">💬</span>
            <span className="hub-feature-card__badge" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7" }}>
              Phase 3 • Kinetic Text
            </span>
          </div>
          <h4 className="hub-feature-card__title">Step 3: Dynamic Reels &amp; Shorts Subtitles</h4>
          <p className="hub-feature-card__desc">
            Captions tab me jaakar .srt ya .vtt subtitle file load karein. Trending viral creator fonts jaise <strong>Anton, Russo One, aur Bangers</strong> chunein. Text par gold highlight aur dark outline add karein jo mobile screen par crisp dikhe.
          </p>
          <div className="guide-tip-pill">
            📱 <strong>Shorts Safe-Zone:</strong> Vertical 9:16 mode me bottom buttons aur title area ko chhodkar safe zone me captions render hote hain.
          </div>
        </div>

        {/* Guide 4 */}
        <div className="hub-feature-card">
          <div className="hub-feature-card__top">
            <span className="hub-feature-card__icon">⚡</span>
            <span className="hub-feature-card__badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
              Phase 4 • GPU Export
            </span>
          </div>
          <h4 className="hub-feature-card__title">Step 4: 5x Fast WebCodecs GPU Render</h4>
          <p className="hub-feature-card__desc">
            Export tab par click karein aur <strong>"Render 1080p MP4"</strong> dabayein. Engine aapke computer ke hardware GPU (WebCodecs) ko use karta hai. Video bina kisi server queue ya cloud upload ke direct aapke device me second me export ho jaata hai.
          </p>
          <div className="guide-tip-pill">
            🔒 <strong>100% Privacy:</strong> Aapke photos, videos, aur recordings kabhi kisi cloud server par upload nahi hote — sab kuch offline local rehta hai.
          </div>
        </div>
      </div>

      {/* KEYBOARD SHORTCUTS CHEAT SHEET */}
      <div className="shortcuts-box">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>⌨️</span>
          <div>
            <h4 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>
              Keyboard Shortcuts for 10x Editing Speed
            </h4>
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
              AutoEditor includes professional non-linear editor hotkeys.
            </span>
          </div>
        </div>

        <div className="shortcuts-grid">
          <div className="shortcut-item">
            <kbd className="kbd-pill">Space</kbd>
            <span className="shortcut-desc">Play / Pause video preview</span>
          </div>
          <div className="shortcut-item">
            <kbd className="kbd-pill">S</kbd>
            <span className="shortcut-desc">Split clip at current playhead</span>
          </div>
          <div className="shortcut-item">
            <kbd className="kbd-pill">Del / Backspace</kbd>
            <span className="shortcut-desc">Delete currently selected clip</span>
          </div>
          <div className="shortcut-item">
            <kbd className="kbd-pill">J / K / L</kbd>
            <span className="shortcut-desc">Rewind (J), Pause (K), Forward (L)</span>
          </div>
          <div className="shortcut-item">
            <kbd className="kbd-pill">Ctrl + Z</kbd>
            <span className="shortcut-desc">Undo last edit action</span>
          </div>
          <div className="shortcut-item">
            <kbd className="kbd-pill">F</kbd>
            <span className="shortcut-desc">Toggle Fullscreen Canvas Preview</span>
          </div>
        </div>
      </div>
    </div>
  );
}
