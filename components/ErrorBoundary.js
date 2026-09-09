"use client";
import React from "react";

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
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{
              marginTop: 16,
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
        </div>
      );
    }
    return this.props.children;
  }
}
