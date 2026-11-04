"use client";
import { useState, useEffect } from "react";

export default function HeroPreviewMockup({ onLaunchStudio }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [playheadSec, setPlayheadSec] = useState(14);
  const [activeSubtitle, setActiveSubtitle] = useState("WILL AI NOW PAY DIRECTLY FROM YOUR UPI?");

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPlayheadSec((prev) => {
        const next = prev >= 24 ? 2 : prev + 1;
        if (next < 7) {
          setActiveSubtitle("WILL AI NOW PAY DIRECTLY FROM YOUR UPI?");
        } else if (next < 14) {
          setActiveSubtitle("NO COST EMI: WHERE IS THE PROFIT HIDDEN?");
        } else if (next < 20) {
          setActiveSubtitle("HOW THE INDIAN BANKING SYSTEM ACTUALLY WORKS");
        } else {
          setActiveSubtitle("30-DAY FINANCIAL REVOLUTION BLUEPRINT");
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="hero-mockup">
      <div className="hero-mockup__window">
        {/* Top Window Bar */}
        <div className="hero-mockup__bar">
          <div className="hero-mockup__dots">
            <span className="dot dot--red"></span>
            <span className="dot dot--yellow"></span>
            <span className="dot dot--green"></span>
          </div>

          <div className="hero-mockup__title">
            <span className="hero-mockup__badge">LIVE ENGINE PREVIEW</span>
            <span>MK_AutoEditor_Studio_v2.mkp — 1080p @ 60fps</span>
          </div>

          <div className="hero-mockup__status">
            <span className="pulse-dot"></span>
            <span>WebCodecs GPU: 5.2x</span>
          </div>
        </div>

        {/* Mockup Body: Canvas & Timeline */}
        <div className="hero-mockup__body">
          {/* Top Half: Video Canvas Simulator */}
          <div className="hero-mockup__canvas">
            <div className="hero-mockup__screen">
              {/* Background preview image */}
              <img
                src="/showcase/ai-upi-thumb.jpg"
                alt="AutoEditor Canvas"
                className="hero-mockup__video-frame"
              />

              {/* Watermark */}
              <div className="hero-mockup__watermark">
                <span>MK FINANCE</span>
              </div>

              {/* Dynamic Kinetic Subtitle */}
              <div className="hero-mockup__caption">
                <span className="caption-tag">KINETIC REELS SUBTITLES</span>
                <div className="caption-text">
                  &ldquo;{activeSubtitle.split(" ").map((word, i) => (
                    <span
                      key={i}
                      className={
                        word.includes("AI") ||
                        word.includes("UPI") ||
                        word.includes("COST") ||
                        word.includes("BANKING") ||
                        word.includes("FINANCIAL")
                          ? "caption-highlight"
                          : ""
                      }
                    >
                      {word}{" "}
                    </span>
                  ))}&rdquo;
                </div>
              </div>

              {/* Center Play Button Overlay */}
              <button
                type="button"
                className="hero-mockup__play-btn"
                onClick={() => setIsPlaying(!isPlaying)}
                title={isPlaying ? "Pause Preview" : "Play Preview"}
              >
                <span>{isPlaying ? "❚❚" : "▶"}</span>
              </button>
            </div>
          </div>

          {/* Bottom Half: Snapped Timeline Tracks */}
          <div className="hero-mockup__timeline">
            {/* Time ruler */}
            <div className="mockup-ruler">
              <span>00:00</span>
              <span>00:05</span>
              <span>00:10</span>
              <span>00:15</span>
              <span>00:20</span>
              <span>00:25</span>
            </div>

            {/* Audio Voiceover Waveform Track */}
            <div className="mockup-track mockup-track--audio">
              <div className="mockup-track__label">
                <span>🎤 Voiceover Track (Speech Peaks)</span>
                <span className="mockup-track__badge">Auto-Aligned</span>
              </div>
              <div className="mockup-waveform">
                {/* Waveform bars */}
                {Array.from({ length: 48 }).map((_, idx) => {
                  const h = 20 + Math.sin(idx * 0.7) * 45 + ((idx % 5) * 6);
                  return (
                    <div
                      key={idx}
                      className="waveform-bar"
                      style={{ height: `${Math.max(12, Math.min(85, h))}%` }}
                    ></div>
                  );
                })}
              </div>
            </div>

            {/* Visual Media Track with Timestamp Snapping */}
            <div className="mockup-track mockup-track--media">
              <div className="mockup-track__label">
                <span>🖼️ Media Snapped By Timestamp</span>
                <span className="mockup-track__badge mockup-track__badge--gold">1-Click Auto Cut</span>
              </div>
              <div className="mockup-clips">
                <div className="mockup-clip" style={{ flex: "0 0 18%" }}>
                  <span className="clip-time">0-00</span>
                  <span className="clip-name">Hook_AI.jpg</span>
                </div>
                <div className="mockup-clip" style={{ flex: "0 0 22%" }}>
                  <span className="clip-time">0-04</span>
                  <span className="clip-name">UPI_Pay.png</span>
                </div>
                <div className="mockup-clip" style={{ flex: "0 0 28%" }}>
                  <span className="clip-time">0-10</span>
                  <span className="clip-name">Server_Flow.mp4</span>
                </div>
                <div className="mockup-clip" style={{ flex: "0 0 32%" }}>
                  <span className="clip-time">0-18</span>
                  <span className="clip-name">Finance_Chart.jpg</span>
                </div>
              </div>
            </div>

            {/* Playhead */}
            <div
              className="mockup-playhead"
              style={{ left: `${Math.min(95, Math.max(5, (playheadSec / 25) * 100))}%` }}
            >
              <div className="mockup-playhead__marker">00:{String(playheadSec).padStart(2, "0")}</div>
              <div className="mockup-playhead__line"></div>
            </div>
          </div>
        </div>

        {/* Mockup Footer Bar with 1-Click Launch */}
        <div className="hero-mockup__footer">
          <div className="hero-mockup__chips">
            <span className="m-chip">⚡ WebCodecs Hardware Render</span>
            <span className="m-chip">🔒 100% Client-Side Private</span>
            <span className="m-chip">🎬 1080p 60fps Native MP4</span>
          </div>

          <button
            type="button"
            className="hero-mockup__cta"
            onClick={onLaunchStudio}
          >
            <span>Launch This Studio Workspace →</span>
          </button>
        </div>
      </div>
    </div>
  );
}

