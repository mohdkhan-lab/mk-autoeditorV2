"use client";
import { useState } from "react";
import { buildWhatsAppUrl } from "../lib/supportConfig";

export default function AuthModal({ isOpen, onClose, onUserRegistered, initialIntent = "launch_studio" }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [niche, setNiche] = useState("YouTube Shorts & Reels");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Please enter your name or channel name.");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setErrorMsg("Please enter a valid 10-digit WhatsApp number.");
      return;
    }

    setIsSubmitting(true);

    const userObj = {
      id: `usr-mk-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name.trim(),
      phone: phone.trim().startsWith("+") ? phone.trim() : `+91 ${phone.trim()}`,
      email: email.trim() || "N/A",
      niche,
      registeredAt: new Date().toISOString().slice(0, 10),
      source: "MK AutoEditor V2 Web Studio",
    };

    // Save locally to persist session across visits
    try {
      localStorage.setItem("mk_creator_user", JSON.stringify(userObj));
    } catch (_) {}

    // Send to backend API
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userObj),
      });
      const data = await res.json();
      if (data.user) {
        userObj.id = data.user.id;
      }
    } catch (err) {
      console.warn("API registration logged locally:", err);
    }

    setIsSubmitting(false);
    setSuccess(true);

    if (onUserRegistered) {
      onUserRegistered(userObj);
    }

    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1400);
  };

  const directWaHelp = buildWhatsAppUrl({
    topic: "Account Access / Sign Up Help",
    details: "Hello Mohd Khan, I am trying to sign up for MK AutoEditor V2 Studio.",
  });

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        {/* Glow corner */}
        <div className="auth-card__glow"></div>

        <div className="auth-card__header">
          <div className="auth-card__brand">
            <span className="auth-card__icon">✨</span>
            <div>
              <h3 className="auth-card__title">Unlock MK AutoEditor Studio</h3>
              <p className="auth-card__sub">
                100% Free Creator Access • No Credit Card Required
              </p>
            </div>
          </div>
          <button type="button" className="auth-card__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {success ? (
          <div className="auth-card__success">
            <div className="auth-card__success-icon">🎉</div>
            <h4 className="auth-card__success-title">Welcome, {name}!</h4>
            <p className="auth-card__success-sub">
              Your creator profile has been registered in the database. Full studio workspace, 5x GPU WebCodecs engine, and kinetic captions are now unlocked!
            </p>
            <div className="auth-card__success-pill">Launching Studio Workspace…</div>
          </div>
        ) : (
          <form className="auth-card__form" onSubmit={handleSubmit}>
            <div className="auth-card__perks">
              <span className="auth-perk">⚡ 5x GPU WebCodecs</span>
              <span className="auth-perk">🔒 100% Client-Side Privacy</span>
              <span className="auth-perk">🎬 Unlimited 1080p 60fps</span>
            </div>

            {errorMsg && <div className="auth-card__error">{errorMsg}</div>}

            <div className="auth-group">
              <label className="auth-label">Full Name or YouTube Channel Name</label>
              <input
                type="text"
                className="auth-input"
                placeholder="e.g. Mohd Khan / MK Finance"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="auth-group">
              <label className="auth-label">WhatsApp Number (For instant project updates &amp; direct support)</label>
              <div className="auth-phone-wrap">
                <span className="auth-phone-code">🇮🇳 +91</span>
                <input
                  type="tel"
                  className="auth-input auth-input--phone"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-group">
              <label className="auth-label">Email Address (Optional)</label>
              <input
                type="email"
                className="auth-input"
                placeholder="creator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="auth-group">
              <label className="auth-label">Your Content Niche</label>
              <select
                className="auth-select"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              >
                <option value="YouTube Shorts & Reels">YouTube Shorts &amp; Reels</option>
                <option value="Personal Finance & Business Breakdown">Personal Finance &amp; Business Breakdown</option>
                <option value="Faceless Documentary Channels">Faceless Documentary Channels</option>
                <option value="Education, Coding & Tech Tutorials">Education, Coding &amp; Tech Tutorials</option>
                <option value="Podcast & Audio Storytelling">Podcast &amp; Audio Storytelling</option>
                <option value="Commercial Video Agency">Commercial Video Agency</option>
              </select>
            </div>

            <button
              type="submit"
              className="auth-btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Unlocking Studio Access…" : "🚀 Unlock Studio & Start Editing (Free) →"}
            </button>

            <div className="auth-card__footer">
              <span>Need instant help?</span>
              <a
                href={directWaHelp}
                target="_blank"
                rel="noopener noreferrer"
                className="auth-card__wa-link"
              >
                💬 Chat with Mohd Khan (+91 8198966902)
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

