"use client";
import React from "react";
import { buildWhatsAppUrl, buildEmailUrl } from "../lib/supportConfig";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    try {
      fetch("/api/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error?.message || String(error),
          stack: error?.stack,
          componentStack: errorInfo?.componentStack,
        }),
      }).catch(() => {});
    } catch (_) {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 24,
          margin: 20,
          background: "#181424",
          border: "1px solid #ff4466",
          borderRadius: 12,
          color: "#fff",
          fontFamily: "sans-serif",
          maxWidth: 800,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
        }}>
          <h2 style={{ color: "#ff4466", marginTop: 0 }}>⚠️ AutoEditor Exception Caught</h2>
          <p style={{ fontSize: 14, color: "#eee" }}>
            <b>Error:</b> {this.state.error?.message || String(this.state.error)}
          </p>
          <pre style={{
            background: "#0d0b14",
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            overflowX: "auto",
            color: "#ff8899"
          }}>
            {this.state.error?.stack}
          </pre>
          {this.state.errorInfo?.componentStack && (
            <details style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
              <summary>Component Stack</summary>
              <pre style={{ background: "#0d0b14", padding: 8, borderRadius: 6 }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.reload();
              }}
              style={{
                padding: "8px 18px",
                background: "#6c5ce7",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ↻ Reload Application
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  const url = buildWhatsAppUrl({
                    error: this.state.error,
                    topic: "App Crash Exception",
                    details: this.state.errorInfo?.componentStack || "",
                  });
                  window.open(url, "_blank");
                }
              }}
              style={{
                padding: "8px 18px",
                background: "#25d366",
                color: "#0b0c10",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              💬 WhatsApp Developer Support
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  const url = buildEmailUrl({
                    error: this.state.error,
                    topic: "App Crash Exception",
                    details: this.state.errorInfo?.componentStack || "",
                  });
                  window.open(url, "_blank");
                }
              }}
              style={{
                padding: "8px 18px",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ✉️ Send Email Report
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
