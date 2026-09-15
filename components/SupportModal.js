"use client";
import React, { useState, useEffect } from "react";
import {
  SUPPORT_CONFIG,
  buildWhatsAppUrl,
  buildGmailUrl,
  buildEmailUrl,
  buildDiagnosticReport,
} from "../lib/supportConfig";

export default function SupportModal({
  isOpen,
  onClose,
  initialError = null,
  initialTopic = null,
  projectMeta = null,
}) {
  const [activeTab, setActiveTab] = useState("contact"); // "contact" | "ticket" | "faq"
  const [userName, setUserName] = useState("");
  const [userContact, setUserContact] = useState("");
  const [topic, setTopic] = useState(initialTopic || "render_failed");
  const [details, setDetails] = useState("");
  const [attachDiagnostics, setAttachDiagnostics] = useState(true);
  const [copied, setCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  
  // Ticket submission state
  const [submitting, setSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Pre-fill error if passed
  useEffect(() => {
    if (initialError) {
      const errStr = typeof initialError === "string" ? initialError : initialError?.message || JSON.stringify(initialError);
      setDetails((prev) => (prev ? prev : `Error encountered: ${errStr}`));
      if (!initialTopic) setTopic("render_failed");
    }
  }, [initialError, initialTopic]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentError = initialError || null;

  const handleCopyReport = () => {
    try {
      const report = buildDiagnosticReport({
        error: currentError,
        topic,
        details,
        projectMeta,
      });
      navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      // Fallback
    }
  };

  const handleCopyEmail = () => {
    try {
      navigator.clipboard.writeText(SUPPORT_CONFIG.email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2500);
    } catch (_) {}
  };

  const handleWhatsAppClick = () => {
    const url = buildWhatsAppUrl({
      error: currentError,
      topic,
      details,
      userName: userName || userContact,
      projectMeta,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleGmailClick = () => {
    const url = buildGmailUrl({
      error: currentError,
      topic,
      details,
      userName: userName || userContact,
      projectMeta,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDefaultMailClick = () => {
    const url = buildEmailUrl({
      error: currentError,
      topic,
      details,
      userName: userName || userContact,
      projectMeta,
    });
    window.location.href = url;
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        userName: userName.trim() || "User",
        contact: userContact.trim(),
        topic,
        error: currentError,
        message: details.trim(),
        diagnostics: attachDiagnostics
          ? {
              project: projectMeta,
              userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
              screen: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : null,
              webCodecs: typeof window !== "undefined" && typeof window.VideoEncoder !== "undefined",
            }
          : null,
      };

      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit ticket.");
      }

      setTicketResult(data);
    } catch (err) {
      setSubmitError(err.message || "Failed to connect to support server. Please reach out directly on WhatsApp or Email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal support-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal__card support-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Head */}
        <div className="modal__head">
          <div className="support-modal__header-left">
            <span className="support-modal__icon">💬</span>
            <div>
              <h3 className="modal__title support-modal__title">Help &amp; Developer Support</h3>
              <p className="support-modal__subtitle">
                Direct assistance from {SUPPORT_CONFIG.ownerName} · {SUPPORT_CONFIG.responseTime}
              </p>
            </div>
          </div>
          <button type="button" className="modal__x" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Pre-filled Error Notice Badge (if triggered by an error) */}
        {currentError && (
          <div className="support-error-notice">
            <span className="support-error-notice__icon">⚠️</span>
            <div className="support-error-notice__content">
              <strong>Error Captured:</strong>{" "}
              <span>{typeof currentError === "string" ? currentError : currentError?.message || JSON.stringify(currentError)}</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="support-nav-tabs">
          <button
            type="button"
            className={`support-nav-tab ${activeTab === "contact" ? "is-active" : ""}`}
            onClick={() => setActiveTab("contact")}
          >
            <span>⚡</span> Direct Contact
          </button>
          <button
            type="button"
            className={`support-nav-tab ${activeTab === "ticket" ? "is-active" : ""}`}
            onClick={() => setActiveTab("ticket")}
          >
            <span>📝</span> Submit Ticket
          </button>
          <button
            type="button"
            className={`support-nav-tab ${activeTab === "faq" ? "is-active" : ""}`}
            onClick={() => setActiveTab("faq")}
          >
            <span>💡</span> Instant FAQs
          </button>
        </div>

        {/* TAB 1: DIRECT CONTACT CHANNELS */}
        {activeTab === "contact" && (
          <div className="support-tab-pane">
            <div className="support-channels-grid">
              {/* WhatsApp Option */}
              <div className="support-channel-card support-channel-card--wa">
                <div className="support-channel-card__top">
                  <span className="support-channel-card__badge">Official Channel</span>
                  <span className="support-channel-card__icon">🟢</span>
                </div>
                <h4 className="support-channel-card__title">WhatsApp Channel</h4>
                <p className="support-channel-card__desc">
                  Join our official WhatsApp channel for updates, support guides &amp; developer contact.
                </p>
                <button
                  type="button"
                  className="support-action-btn support-action-btn--wa"
                  onClick={handleWhatsAppClick}
                >
                  <span>📢 Join WhatsApp Channel →</span>
                </button>
              </div>

              {/* Email Option */}
              <div className="support-channel-card support-channel-card--email">
                <div className="support-channel-card__top">
                  <span className="support-channel-card__badge">Direct Email</span>
                  <span className="support-channel-card__icon">✉️</span>
                </div>
                <h4 className="support-channel-card__title">Developer Email</h4>
                <p className="support-channel-card__desc">
                  Send details directly to <strong>{SUPPORT_CONFIG.email}</strong>.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    type="button"
                    className="support-action-btn support-action-btn--email"
                    onClick={handleGmailClick}
                    title="Open Gmail Web Compose directly in your browser"
                  >
                    <span>📧 Compose in Gmail (Web) →</span>
                  </button>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      className="support-action-btn support-action-btn--sub"
                      style={{ fontSize: 11, padding: "6px 8px", flex: 1 }}
                      onClick={handleDefaultMailClick}
                      title="Open default mail client (Outlook / Apple Mail)"
                    >
                      <span>✉️ Default Mail App</span>
                    </button>
                    <button
                      type="button"
                      className="support-action-btn support-action-btn--sub"
                      style={{ fontSize: 11, padding: "6px 8px", flex: 1 }}
                      onClick={handleCopyEmail}
                      title="Copy email address to clipboard"
                    >
                      <span>{emailCopied ? "✓ Copied!" : "📋 Copy Email"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostic Copy Bar */}
            <div className="support-diag-box">
              <div className="support-diag-box__left">
                <span className="support-diag-box__icon">📋</span>
                <div>
                  <div className="support-diag-box__title">Copy Diagnostic Report</div>
                  <div className="support-diag-box__sub">
                    Copies browser specs, screen resolution, and error logs so you can paste them anywhere.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={`support-diag-box__btn ${copied ? "is-copied" : ""}`}
                onClick={handleCopyReport}
              >
                {copied ? "✓ Copied!" : "Copy Report"}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: IN-APP TICKET FORM */}
        {activeTab === "ticket" && (
          <div className="support-tab-pane">
            {ticketResult ? (
              <div className="support-success-card">
                <div className="support-success-card__icon">✓</div>
                <h4 className="support-success-card__title">Ticket Submitted Successfully!</h4>
                <p className="support-success-card__msg">
                  Your ticket <strong>#{ticketResult.ticketId}</strong> has been logged. {SUPPORT_CONFIG.ownerName} has been notified and will review your issue.
                </p>
                <div className="support-success-card__actions">
                  <button
                    type="button"
                    className="support-action-btn support-action-btn--wa"
                    onClick={handleWhatsAppClick}
                  >
                    Send on WhatsApp too for faster reply
                  </button>
                  <button
                    type="button"
                    className="support-action-btn support-action-btn--sub"
                    onClick={() => {
                      setTicketResult(null);
                      setDetails("");
                    }}
                  >
                    Submit Another Query
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="support-form">
                <div className="support-form__row">
                  <label className="support-form__label">
                    <span>Your Name / Contact Info</span>
                    <input
                      type="text"
                      className="support-form__input"
                      placeholder="e.g. Rahul / WhatsApp 9876543210"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <div className="support-form__row">
                  <label className="support-form__label">
                    <span>Issue Category</span>
                    <select
                      className="support-form__select"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    >
                      {SUPPORT_CONFIG.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="support-form__row">
                  <label className="support-form__label">
                    <span>Describe the Problem</span>
                    <textarea
                      className="support-form__textarea"
                      rows={4}
                      placeholder="Tell us what went wrong, which image or audio clip caused an issue, or how we can help..."
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <label className="support-form__checkbox-label">
                  <input
                    type="checkbox"
                    checked={attachDiagnostics}
                    onChange={(e) => setAttachDiagnostics(e.target.checked)}
                  />
                  <span>Attach Browser info &amp; System specs automatically (Recommended)</span>
                </label>

                {submitError && <div className="note note--bad" style={{ marginTop: 8 }}>{submitError}</div>}

                <div className="support-form__actions">
                  <button
                    type="submit"
                    className="render support-submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting Ticket…" : "🚀 Send Support Message"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: INSTANT FAQS */}
        {activeTab === "faq" && (
          <div className="support-tab-pane">
            <div className="support-faq-list">
              {SUPPORT_CONFIG.faqs.map((faq, idx) => (
                <div key={idx} className="support-faq-item">
                  <div className="support-faq-item__q">
                    <span>❓</span> {faq.q}
                  </div>
                  <div className="support-faq-item__a">
                    {faq.a}
                  </div>
                </div>
              ))}
            </div>
            <div className="support-faq-footer">
              Still having trouble?{" "}
              <button
                type="button"
                className="support-link-btn"
                onClick={handleWhatsAppClick}
              >
                Chat directly with {SUPPORT_CONFIG.ownerName} on WhatsApp →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
