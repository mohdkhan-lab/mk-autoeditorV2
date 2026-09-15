"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./globals.css";
import { parseTimestampName } from "../lib/timestamp";
import { buildTimeline, trimClips, LEAD_IN } from "../lib/timeline";
import { resolveDimensions, capTo720 } from "../lib/dimensions";
import { getAudioDuration } from "../lib/audio";
import { getWaveformPeaks } from "../lib/waveform";
import { renderVideo, cancelRender, getActiveRender, reconnectRender, probeBackend } from "../lib/serverRender";
import { renderWebCodecs, webCodecsCanRender, pickRenderProfile, startKeepAwake } from "../lib/webcodecsRender";
import { DEFAULT_TRANSITION_DURATION, mixTransitions } from "../lib/transitions";
import { parseTranscript } from "../lib/captions";
import Dropzone from "../components/Dropzone";
import Editor from "../components/Editor";
import ProjectsHome from "../components/ProjectsHome";
import ErrorBoundary from "../components/ErrorBoundary";
import SupportModal from "../components/SupportModal";
import { DialogHost, showAlert, showPrompt } from "../components/Dialog";
import {
  requestPersist, storageEstimate, listProjects, getProject, saveProject,
  renameProject, deleteProject, getMedia, syncMedia, newId,
} from "../lib/projectStore";

function isVideoFile(f) {
  if (!f) return false;
  if (f.type && f.type.startsWith("video/")) return true;
  return /\.(mp4|mov|webm|mkv|avi|m4v|3gp|wmv)$/i.test(f.name || "");
}

function isImageFile(f) {
  if (!f) return false;
  if (f.type && f.type.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(f.name || "");
}

function isMediaFile(f) {
  return isVideoFile(f) || isImageFile(f);
}

function makePlaceholderPoster(label = "Media", width = 1280, height = 720) {
  try {
    const c = document.createElement("canvas");
    c.width = width; c.height = height;
    const ctx = c.getContext("2d");
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#1e293b");
      grad.addColorStop(1, "#0f172a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = Math.max(2, Math.round(width / 360));
      const cx = width / 2, cy = height / 2, r = Math.min(width, height) * 0.16;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      const tri = r * 0.55;
      ctx.moveTo(cx - tri * 0.4, cy - tri * 0.65);
      ctx.lineTo(cx + tri * 0.75, cy);
      ctx.lineTo(cx - tri * 0.4, cy + tri * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = `600 ${Math.max(14, Math.round(height * 0.045))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(label, cx, cy + r + Math.round(height * 0.08));
      return c.toDataURL("image/jpeg", 0.82);
    }
  } catch (_) {}
  return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='720' viewBox='0 0 1280 720'><rect width='1280' height='720' fill='%231e293b'/><circle cx='640' cy='360' r='100' fill='%23334155'/><polygon points='610,310 690,360 610,410' fill='%23ffffff'/></svg>";
}

function loadImageEl(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { img.url = url; img.fileName = file.name; resolve(img); };
    img.onerror = () => {
      const fallbackUrl = makePlaceholderPoster(file.name || "Image", 1280, 720);
      const fallbackImg = new Image();
      fallbackImg.onload = () => { fallbackImg.url = fallbackUrl; fallbackImg.fileName = file.name; resolve(fallbackImg); };
      fallbackImg.src = fallbackUrl;
    };
    img.src = url;
  });
}

// Load a video clip as a still-poster Image (so the timeline/canvas draw it just
// like a photo) while carrying the video's URL + duration for the trim scrubber
// and export. img.url = poster (drawable), img.videoUrl = the actual video.
function loadVideoEl(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    let resolved = false;

    const finish = (posterSrc, w, h, dur) => {
      if (resolved) return;
      resolved = true;
      const finalPoster = posterSrc || makePlaceholderPoster(file.name || "Video", w || 1280, h || 720);
      const img = new Image();
      img.onload = () => {
        img.url = finalPoster;
        img.fileName = file.name;
        img.isVideo = true;
        img.videoUrl = url;
        img.videoDuration = dur || 0;
        resolve(img);
      };
      img.onerror = () => {
        const svgFallback = makePlaceholderPoster(file.name || "Video", 1280, 720);
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          fallbackImg.url = svgFallback;
          fallbackImg.fileName = file.name;
          fallbackImg.isVideo = true;
          fallbackImg.videoUrl = url;
          fallbackImg.videoDuration = dur || 0;
          resolve(fallbackImg);
        };
        fallbackImg.src = svgFallback;
      };
      img.src = finalPoster;
    };

    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;

    // Safety timeout: fallback after 2.5s if hardware decoder hangs
    const timer = setTimeout(() => {
      if (!resolved) {
        finish(null, v.videoWidth || 1280, v.videoHeight || 720, v.duration || 0);
      }
    }, 2500);

    const tryCapture = () => {
      try {
        if (v.videoWidth > 0 && v.videoHeight > 0) {
          const c = document.createElement("canvas");
          c.width = v.videoWidth; c.height = v.videoHeight;
          const ctx = c.getContext("2d");
          ctx.drawImage(v, 0, 0, c.width, c.height);
          const dataUrl = c.toDataURL("image/jpeg", 0.85);
          clearTimeout(timer);
          finish(dataUrl, c.width, c.height, v.duration);
          return true;
        }
      } catch (_) {}
      return false;
    };

    v.onseeked = () => {
      if (!tryCapture()) setTimeout(tryCapture, 80);
    };

    const onDataReady = () => {
      if (v.currentTime > 0) {
        tryCapture();
      } else {
        try {
          v.currentTime = Math.min(0.1, (v.duration || 1) / 2);
        } catch (_) {
          tryCapture();
        }
      }
    };

    v.onloadeddata = onDataReady;
    v.onloadedmetadata = () => {
      if (v.readyState >= 2) onDataReady();
    };
    v.oncanplay = onDataReady;
    v.onerror = () => {
      clearTimeout(timer);
      finish(null, 1280, 720, 0);
    };

    v.src = url;
    try { v.load(); } catch (_) {}
  });
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Run an async fn over items with a concurrency limit. Loading 250 large images
// (or opening 250 IndexedDB reads) all at once spikes memory/CPU and freezes the
// tab; a small limit keeps it fast without the freeze.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  });
  await Promise.all(workers);
  return out;
}

// Undo/redo over one composition snapshot. Object URLs are intentionally never
// revoked, so an undone snapshot still points at a live image.
function useHistory(initial) {
  const [hist, setHist] = useState({ past: [], present: initial, future: [] });
  const commit = useCallback((updater) => {
    setHist((h) => {
      const next = typeof updater === "function" ? updater(h.present) : updater;
      if (next === h.present) return h;
      return { past: [...h.past, h.present], present: next, future: [] };
    });
  }, []);
  const undo = useCallback(() => setHist((h) => {
    if (!h.past.length) return h;
    const prev = h.past[h.past.length - 1];
    return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] };
  }), []);
  const redo = useCallback(() => setHist((h) => {
    if (!h.future.length) return h;
    const nxt = h.future[0];
    return { past: [...h.past, h.present], present: nxt, future: h.future.slice(1) };
  }), []);
  const reset = useCallback((present) => setHist({ past: [], present, future: [] }), []);
  return [
    hist.present, commit,
    { undo, redo, canUndo: hist.past.length > 0, canRedo: hist.future.length > 0, reset },
  ];
}

// A slot is one point on the timeline: { id, seconds, file, img, empty }.
// Empty slots are placeholders (a removed image or the lead-in you filled out).
export default function Home() {
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [peaks, setPeaks] = useState([]);
  const [aspect, setAspect] = useState("16:9");
  const [fps, setFps] = useState(30);
  const [renderQuality, setRenderQuality] = useState("full"); // "full" | "720p"
  const [transitionDuration, setTransitionDuration] = useState(DEFAULT_TRANSITION_DURATION);
  const [fadeIn, setFadeIn] = useState(0.5);          // opening fade seconds (0 = off)
  const [fadeOut, setFadeOut] = useState(0.6);        // ending fade seconds (0 = off)
  const [motionByName, setMotionByName] = useState({}); // clip name -> zoomin | zoomout
  const [motionAmount, setMotionAmount] = useState(0.08); // Ken Burns zoom depth (0–0.2)
  const [effectsByName, setEffectsByName] = useState({}); // clip name -> effect id
  const [effectIntensityByName, setEffectIntensityByName] = useState({}); // clip name -> intensity (10–100)
  const [trimByName, setTrimByName] = useState({});   // video clip name -> in-point seconds
  const [volumeByName, setVolumeByName] = useState({}); // video clip name -> 0..1 (default 0.5)
  const [fitByName, setFitByName] = useState({});     // video clip name -> "fit" (fast-fwd, default) | "trim" (1x)
  const [trimEnd, setTrimEnd] = useState(0); // export end point (0 = untrimmed / full audio)
  const [captionRaw, setCaptionRaw] = useState(null); // uploaded transcript text
  const [captionName, setCaptionName] = useState(null);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [captionStyle, setCaptionStyle] = useState("classic");
  const [captionSize, setCaptionSize] = useState("md");
  const [captionLineHeight, setCaptionLineHeight] = useState(null); // null = per-style default
  const [captionFontScale, setCaptionFontScale] = useState(null);   // null = use the size preset
  const [captionPos, setCaptionPos] = useState("bottom");
  const [captionFont, setCaptionFont] = useState("default");
  const [bgmFile, setBgmFile] = useState(null);
  const [bgmVolume, setBgmVolume] = useState(0.25);
  const [bgmDucking, setBgmDucking] = useState(true);
  const [transitionSfx, setTransitionSfx] = useState(true);
  const [transitionSfxVol, setTransitionSfxVol] = useState(0.5);
  const [transitionSfxType, setTransitionSfxType] = useState("whoosh");
  const [transitionSfxMode, setTransitionSfxMode] = useState("smart");
  const [watermarkFile, setWatermarkFile] = useState(null);
  const [watermarkPos, setWatermarkPos] = useState("top-right");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.85);
  const [watermarkScale, setWatermarkScale] = useState(0.12);
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkIsCircle, setWatermarkIsCircle] = useState(false);
  const [watermarkShadow, setWatermarkShadow] = useState(true);
  const [watermarkMargin, setWatermarkMargin] = useState(24);
  const [watermarkFadeIn, setWatermarkFadeIn] = useState(false);
  const [watermarkTextColor, setWatermarkTextColor] = useState("#ffffff");
  const [watermarkTextBg, setWatermarkTextBg] = useState(true);
  const [importing, setImporting] = useState(null);   // { done, total } while decoding imports
  const [built, setBuilt] = useState(false);          // committed images to the timeline?
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outUrl, setOutUrl] = useState(null);
  const [error, setError] = useState(null);
  // A render that was already running when this tab loaded (e.g. reopened after
  // closing the browser mid-render). Shown as a banner and reconnected to.
  const [resume, setResume] = useState(null); // { busy, progress, url, error }
  // Projects: everything is stored client-side in IndexedDB (see lib/projectStore).
  const [view, setView] = useState("list");            // "list" (projects grid) | "editor"
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null); // { id, name, createdAt }
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [loadingProject, setLoadingProject] = useState(false);
  const [supportState, setSupportState] = useState({ open: false, error: null, topic: null });
  const openSupport = useCallback((opts = {}) => {
    setSupportState({
      open: true,
      error: opts.error || null,
      topic: opts.topic || null,
    });
  }, []);
  const saveRef = useRef(null);
  const idRef = useRef(0);
  const nextId = () => `s${idRef.current++}`;

  // Global error listener to trap client-side exceptions and log them
  useEffect(() => {
    const handleErr = (e) => {
      fetch("/api/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "window.error",
          message: e.message,
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
          stack: e.error ? e.error.stack : null,
        }),
      }).catch(() => {});
    };
    const handleRej = (e) => {
      fetch("/api/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "unhandledrejection",
          reason: String(e.reason),
          stack: e.reason && e.reason.stack ? e.reason.stack : null,
        }),
      }).catch(() => {});
    };
    window.addEventListener("error", handleErr);
    window.addEventListener("unhandledrejection", handleRej);
    return () => {
      window.removeEventListener("error", handleErr);
      window.removeEventListener("unhandledrejection", handleRej);
    };
  }, []);

  // Composition (undoable): slots + per-clip transition choices, snapshotted together.
  const [doc, commitDoc, { undo, redo, canUndo, canRedo, reset: resetDoc }] =
    useHistory({ slots: [], transitionsByName: {} });
  const { slots, transitionsByName } = doc;

  const onAudio = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    setError(null);
    try {
      const d = await getAudioDuration(file);
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setAudioDuration(d);
      getWaveformPeaks(file).then(setPeaks);
    } catch (e) { setError(e.message); }
  }, []);

  const onAudioFile = useCallback((file) => {
    if (file) onAudio([file]);
  }, [onAudio]);

  // Import images & videos, merged by timestamp: a file whose timestamp matches an
  // existing slot fills/replaces it; otherwise it becomes a new slot.
  const addImages = useCallback(async (fileList) => {
    const files = Array.from(fileList).filter(isMediaFile);
    if (!files.length) return;
    // Decoding many files (esp. video posters) takes a few seconds with no UI —
    // show live "loaded X of N" progress, ticking up as each file finishes.
    setImporting({ done: 0, total: files.length });
    try {
      const loaded = await Promise.all(
        files.map(async (f) => {
          const isVid = isVideoFile(f);
          const img = isVid ? await loadVideoEl(f) : await loadImageEl(f);
          setImporting((p) => (p ? { ...p, done: p.done + 1 } : p));
          return { file: f, seconds: parseTimestampName(f.name), img };
        })
      );
      commitDoc((d) => {
      const next = d.slots.map((s) => ({ ...s }));
      for (const { file, seconds, img } of loaded) {
        const slot = seconds != null ? next.find((s) => s.seconds === seconds) : null;
        if (slot) {
          slot.file = file; slot.img = img; slot.empty = false;
        } else {
          next.push({ id: nextId(), seconds, file, img, empty: false });
        }
      }
      return { ...d, slots: next };
      });
    } finally {
      setImporting(null);
    }
  }, [commitDoc]);

  // Swap the image/video in one slot, keeping its timestamp.
  const replaceImage = useCallback(async (id, file) => {
    if (!file || !isMediaFile(file)) return;
    const isVid = isVideoFile(file);
    const img = isVid ? await loadVideoEl(file) : await loadImageEl(file);
    commitDoc((d) => ({
      ...d,
      slots: d.slots.map((s) => (s.id === id ? { ...s, file, img, empty: false } : s)),
    }));
  }, [commitDoc]);

  // Discard a staged image entirely (used in the pre-build import tray).
  const discardImage = useCallback((id) => {
    commitDoc((d) => ({ ...d, slots: d.slots.filter((s) => s.id !== id) }));
  }, [commitDoc]);

  // Removing an image turns its slot into a placeholder — neighbours don't move.
  const removeImage = useCallback((id) => {
    commitDoc((d) => ({
      ...d,
      slots: d.slots.map((s) => (s.id === id ? { ...s, file: null, img: null, empty: true } : s)),
    }));
  }, [commitDoc]);

  // Fill a gap. LEAD_IN adds a new slot at 0; otherwise fill the empty slot.
  const fillGap = useCallback(async (name, file) => {
    if (!file || !isMediaFile(file)) return;
    const isVid = isVideoFile(file);
    const img = isVid ? await loadVideoEl(file) : await loadImageEl(file);
    commitDoc((d) => {
      if (name === LEAD_IN) {
        return { ...d, slots: [...d.slots, { id: nextId(), seconds: 0, file, img, empty: false }] };
      }
      return { ...d, slots: d.slots.map((s) => (s.id === name ? { ...s, file, img, empty: false } : s)) };
    });
  }, [commitDoc]);

  // Roll edit: move the boundary between an image and the next clip by setting
  // the next clip's slot start. buildTimeline re-derives both durations; total
  // length and every other slot are untouched. One commit = one undo step.
  const resizeBoundary = useCallback((id, seconds) => {
    commitDoc((d) => ({
      ...d,
      slots: d.slots.map((s) => (s.id === id ? { ...s, seconds: +seconds.toFixed(3) } : s)),
    }));
  }, [commitDoc]);

  // Read an uploaded transcript; parsing happens in a memo below so it re-syncs
  // if the audio length changes.
  const [editedCues, setEditedCues] = useState(null);
  const onCaptionFile = useCallback(async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      setEditedCues(null);
      setCaptionRaw(text);
      setCaptionName(file.name);
      setCaptionsOn(true);
    } catch (e) { setError(e.message || String(e)); }
  }, []);
  const captionParse = useMemo(
    () => (captionRaw ? parseTranscript(captionRaw, audioDuration) : { cues: [], error: null }),
    [captionRaw, audioDuration]
  );
  const captionCues = editedCues || captionParse.cues;
  const captionError = captionParse.error;

  // On load, reconnect to a render that's still running on the server.
  useEffect(() => {
    let alive = true;
    (async () => {
      const active = await getActiveRender();
      if (!alive || !active) return;
      setResume({ busy: true, progress: (active.percent || 0) / 100, url: null, error: null });
      try {
        const blob = await reconnectRender(active.jobId, (p) => {
          if (alive) setResume((r) => (r ? { ...r, progress: p } : r));
        });
        if (alive) setResume({ busy: false, progress: 1, url: URL.createObjectURL(blob), error: null });
      } catch (e) {
        if (alive) setResume({ busy: false, progress: 0, url: null, error: e.message || String(e) });
      }
    })();
    return () => { alive = false; };
  }, []);

  const setTransition = useCallback((name, type) => {
    commitDoc((d) => ({ ...d, transitionsByName: { ...d.transitionsByName, [name]: type } }));
  }, [commitDoc]);
  const applyTransitionAll = useCallback((type, clipNames) => {
    commitDoc((d) => {
      const next = {};
      // Skip the first clip — it has no incoming cut.
      for (let i = 1; i < clipNames.length; i++) next[clipNames[i]] = type;
      return { ...d, transitionsByName: next };
    });
  }, [commitDoc]);

  const setMotion = useCallback((name, type) => {
    setMotionByName((prev) => ({ ...prev, [name]: type }));
  }, []);
  const setTrim = useCallback((name, seconds) => {
    setTrimByName((prev) => ({ ...prev, [name]: Math.max(0, +seconds || 0) }));
  }, []);
  const setVolume = useCallback((name, vol) => {
    setVolumeByName((prev) => ({ ...prev, [name]: Math.min(1, Math.max(0, +vol || 0)) }));
  }, []);
  const setFit = useCallback((name, mode) => {
    setFitByName((prev) => ({ ...prev, [name]: mode }));
  }, []);
  const applyMotionAll = useCallback((type, names) => {
    setMotionByName(() => { const next = {}; for (const n of names) next[n] = type; return next; });
  }, []);
  const applyMotionAlternate = useCallback((names) => {
    setMotionByName(() => {
      const next = {};
      names.forEach((n, i) => { next[n] = i % 2 === 0 ? "zoomin" : "zoomout"; });
      return next;
    });
  }, []);
  const setEffect = useCallback((name, effectId) => {
    setEffectsByName((prev) => ({ ...prev, [name]: effectId }));
  }, []);
  const setEffectIntensity = useCallback((name, intensity) => {
    setEffectIntensityByName((prev) => ({ ...prev, [name]: Math.max(10, Math.min(100, +intensity || 70)) }));
  }, []);
  const applyEffectAll = useCallback((effectId, intensity) => {
    setEffectsByName(() => {
      const next = {};
      for (const s of slots) if (!s.empty) next[s.id] = effectId;
      return next;
    });
    if (intensity != null) {
      setEffectIntensityByName(() => {
        const next = {};
        for (const s of slots) if (!s.empty) next[s.id] = intensity;
        return next;
      });
    }
  }, [slots]);
  // Random mix: assign each cut a transition drawn randomly from `picks`
  // (no back-to-back repeats). One commit = one undo step.
  const applyTransitionMix = useCallback((picks, clipNames) => {
    const cutNames = clipNames.slice(1); // first image has no incoming transition
    const assigned = mixTransitions(picks, cutNames.length);
    commitDoc((d) => {
      const next = {};
      cutNames.forEach((name, i) => { next[name] = assigned[i]; });
      return { ...d, transitionsByName: next };
    });
  }, [commitDoc]);

  // Keyboard: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo.
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const items = useMemo(
    () => slots.map((s) => ({
      name: s.id, seconds: s.seconds, empty: s.empty,
      label: (s.img && s.img.fileName) || (s.file && s.file.name) || s.id,
    })),
    [slots]
  );
  // Images and videos are uploaded on separate maps (the backend tells them apart
  // by extension anyway, but this keeps the client render spec explicit).
  const imagesByName = useMemo(() => {
    const m = {};
    for (const s of slots) if (!s.empty && s.file && !(s.img && s.img.isVideo)) m[s.id] = s.file;
    return m;
  }, [slots]);
  const videosByName = useMemo(() => {
    const m = {};
    for (const s of slots) if (!s.empty && s.file && s.img && s.img.isVideo) m[s.id] = s.file;
    return m;
  }, [slots]);
  // Video URL + duration per clip, for the trim scrubber in the inspector.
  const videoInfoByName = useMemo(() => {
    const m = {};
    for (const s of slots) if (!s.empty && s.img && s.img.isVideo) {
      m[s.id] = { url: s.img.videoUrl, duration: s.img.videoDuration || 0 };
    }
    return m;
  }, [slots]);
  const imageEls = useMemo(() => {
    const m = {};
    for (const s of slots) if (!s.empty && s.img) m[s.id] = s.img;
    return m;
  }, [slots]);
  const mediaStats = useMemo(() => {
    let images = 0;
    let videos = 0;
    for (const s of slots) {
      if (!s.empty && s.img) {
        if (s.img.isVideo || (s.file && isVideoFile(s.file))) {
          videos++;
        } else {
          images++;
        }
      }
    }
    const total = images + videos;
    return {
      total,
      images,
      videos,
      summary: total === 0
        ? "No media imported"
        : `${total} media (${images} photos, ${videos} videos)`,
      badge: `${total} media (${images}🖼️ ${videos}🎬)`,
    };
  }, [slots]);
  const imageCount = mediaStats.total;

  // Staged thumbnails for the pre-build import tray, ordered by timestamp
  // (files with no parseable timestamp sort last and are flagged).
  const tray = useMemo(
    () => slots
      .filter((s) => !s.empty && s.img)
      .map((s) => ({
        id: s.id,
        url: s.img.url,
        name: s.img.fileName || (s.file && s.file.name) || "",
        seconds: s.seconds,
        isVideo: Boolean(s.img.isVideo || (s.file && isVideoFile(s.file))),
      }))
      .sort((a, b) => (a.seconds == null ? Infinity : a.seconds) - (b.seconds == null ? Infinity : b.seconds)),
    [slots]
  );

  const sample = useMemo(() => {
    const imaged = slots
      .filter((s) => !s.empty && s.img && s.seconds != null)
      .sort((a, b) => a.seconds - b.seconds);
    const el = imaged[0] && imaged[0].img;
    return el ? { width: el.naturalWidth, height: el.naturalHeight } : null;
  }, [slots]);

  const dims = useMemo(() => resolveDimensions(aspect, sample), [aspect, sample]);
  // The resolution actually exported: capped to 720p when the faster option is on.
  const renderDims = useMemo(
    () => (renderQuality === "720p" ? capTo720(dims) : dims),
    [renderQuality, dims]
  );

  // On mobile (touch), default to the lighter settings — ~2x faster, far less
  // CPU/RAM load (which also helps avoid Termux connection drops). Runs once.
  useEffect(() => {
    try {
      if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
        setRenderQuality("720p");
        setFps(24);
      }
    } catch { /* ignore */ }
  }, []);
  const { clips, warnings } = useMemo(
    () => buildTimeline(items, audioDuration),
    [items, audioDuration]
  );

  // A new voiceover resets any prior trim to the full length.
  useEffect(() => { setTrimEnd(audioDuration); }, [audioDuration]);

  const exportDuration = trimEnd > 0 ? Math.min(trimEnd, audioDuration) : audioDuration;

  const ready = audioFile && clips.length > 0;
  const showEditor = built && ready;

  // --- Projects: client-side persistence (IndexedDB) ------------------------
  // On launch, ask for durable storage and load the saved projects list.
  useEffect(() => {
    (async () => {
      try {
        await requestPersist();
        setProjects(await listProjects());
        setStorage(await storageEstimate());
      } catch (_) {}
    })();
  }, []);

  const resetAllState = useCallback(() => {
    // Touch devices default to lighter 720p / 24fps (less CPU/RAM) for new projects.
    let coarse = false;
    try { coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches); } catch (_) {}
    setAudioFile(null); setAudioUrl(null); setAudioDuration(0); setPeaks([]);
    setAspect("16:9"); setFps(coarse ? 24 : 30); setRenderQuality(coarse ? "720p" : "full");
    setTransitionDuration(DEFAULT_TRANSITION_DURATION); setFadeIn(0.5); setFadeOut(0.6);
    setMotionByName({}); setMotionAmount(0.08); setTrimByName({}); setVolumeByName({}); setFitByName({});
    setEffectsByName({}); setEffectIntensityByName({});
    setTrimEnd(0);
    setCaptionRaw(null); setCaptionName(null); setCaptionsOn(false); setCaptionStyle("classic");
    setCaptionSize("md"); setCaptionLineHeight(null); setCaptionFontScale(null);
    setError(null); setOutUrl(null); setProgress(0);
    idRef.current = 0;
    resetDoc({ slots: [], transitionsByName: {} });
    setBuilt(false);
  }, [resetDoc]);

  const newProject = useCallback(() => {
    resetAllState();
    setCurrentProject({ id: newId(), name: "Untitled project", createdAt: Date.now() });
    setView("editor");
  }, [resetAllState]);

  // A small JPEG thumbnail from the first image, stored with the project.
  const makeThumb = useCallback(() => {
    const s = slots.find((x) => !x.empty && x.img);
    const img = s && s.img;
    if (!img) return null;
    try {
      const iw = img.naturalWidth || img.videoWidth || 320;
      const ih = img.naturalHeight || img.videoHeight || 180;
      const W = 320, H = Math.max(1, Math.round((W * ih) / iw));
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      c.getContext("2d").drawImage(img, 0, 0, W, H);
      return c.toDataURL("image/jpeg", 0.7);
    } catch (_) { return (img.url && String(img.url).startsWith("data:")) ? img.url : null; }
  }, [slots]);

  // Serialize the edit state (no media bytes) for the projects store.
  const buildProjectData = useCallback(() => ({
    v: 1,
    settings: { aspect, fps, renderQuality, transitionDuration, fadeIn, fadeOut, motionAmount, trimEnd,
                transitionSfx, transitionSfxVol, transitionSfxType, transitionSfxMode },
    maps: { motionByName, trimByName, volumeByName, fitByName, effectsByName, effectIntensityByName },
    captions: { captionRaw, captionName, captionsOn, captionStyle, captionSize, captionLineHeight, captionFontScale },
    transitionsByName,
    slots: slots.map((s) => ({
      id: s.id, seconds: s.seconds, empty: !!s.empty,
      fileName: s.file ? s.file.name : (s.img && s.img.fileName) || null,
      isVideo: !!(s.img && s.img.isVideo),
    })),
    audioName: audioFile ? audioFile.name : null,
    idCounter: idRef.current,
    built,
  }), [aspect, fps, renderQuality, transitionDuration, fadeIn, fadeOut, motionAmount, trimEnd,
      transitionSfx, transitionSfxVol, transitionSfxType, transitionSfxMode,
      motionByName, trimByName, volumeByName, fitByName, effectsByName, effectIntensityByName,
      captionRaw, captionName, captionsOn, captionStyle, captionSize, captionLineHeight, captionFontScale,
      transitionsByName, slots, audioFile, built]);

  const saveCurrent = useCallback(async () => {
    const proj = currentProject;
    if (!proj || loadingProject) return; // never save a half-loaded project
    try {
      const rec = {
        id: proj.id, name: proj.name, createdAt: proj.createdAt || Date.now(),
        thumb: makeThumb(), durationSec: exportDuration, clipCount: clips.length,
        data: buildProjectData(),
      };
      await saveProject(rec);
      const wanted = new Map();
      if (audioFile) wanted.set("audio", audioFile);
      for (const s of slots) if (!s.empty && s.file) wanted.set(s.id, s.file);
      await syncMedia(proj.id, wanted);
      try { setStorage(await storageEstimate()); } catch (_) {}
    } catch (_) { /* storage full or unavailable — keep editing */ }
  }, [currentProject, loadingProject, makeThumb, exportDuration, clips.length, buildProjectData, audioFile, slots]);
  saveRef.current = saveCurrent;

  // Debounced autosave whenever the composition changes.
  useEffect(() => {
    if (view !== "editor" || !currentProject || loadingProject) return;
    const t = setTimeout(() => { if (saveRef.current) saveRef.current(); }, 1200);
    return () => clearTimeout(t);
  }, [view, currentProject, loadingProject, slots, transitionsByName, aspect, fps, renderQuality, transitionDuration,
      fadeIn, fadeOut, motionByName, motionAmount, effectsByName, effectIntensityByName, trimByName, volumeByName, fitByName, trimEnd,
      transitionSfx, transitionSfxVol, transitionSfxType, transitionSfxMode,
      captionRaw, captionName, captionsOn, captionStyle, captionSize, captionLineHeight, captionFontScale,
      audioFile, built]);

  const openProject = useCallback(async (id) => {
    const rec = await getProject(id);
    if (!rec) return;
    const d = rec.data || {};
    // Open the editor shell right away with a loader; media loads in the background.
    // (loadingProject guards autosave so this cleared state is never saved back.)
    resetAllState();
    setCurrentProject({ id: rec.id, name: rec.name, createdAt: rec.createdAt });
    setLoadingProject(true);
    setView("editor");
    try {
      // Decode the audio and ALL slot media in parallel — 100+ images loading
      // one-by-one is what made opening slow.
      const audioP = (async () => {
        if (!d.audioName) return null;
        const blob = await getMedia(id, "audio");
        if (!blob) return null;
        const file = new File([blob], d.audioName, { type: blob.type || "audio/mpeg" });
        let dur = 0; try { dur = await getAudioDuration(file); } catch (_) {}
        return { file, dur };
      })();
      const slotsP = mapLimit(d.slots || [], 12, async (sm) => {
        if (sm.empty) return { id: sm.id, seconds: sm.seconds, file: null, img: null, empty: true };
        const blob = await getMedia(id, sm.id);
        if (!blob) return { id: sm.id, seconds: sm.seconds, file: null, img: null, empty: true };
        const file = new File([blob], sm.fileName || sm.id, { type: blob.type || (sm.isVideo ? "video/mp4" : "image/png") });
        const img = sm.isVideo ? await loadVideoEl(file) : await loadImageEl(file);
        return { id: sm.id, seconds: sm.seconds, file, img, empty: false };
      });
      const [audio, newSlots] = await Promise.all([audioP, slotsP]);
      // Commit the loaded project.
      if (audio) {
        setAudioFile(audio.file); setAudioUrl(URL.createObjectURL(audio.file));
        setAudioDuration(audio.dur);
        getWaveformPeaks(audio.file).then(setPeaks).catch(() => {});
      }
      resetDoc({ slots: newSlots, transitionsByName: d.transitionsByName || {} });
      const st = d.settings || {};
      setAspect(st.aspect ?? "16:9"); setFps(st.fps ?? 30); setRenderQuality(st.renderQuality ?? "full");
      setTransitionDuration(st.transitionDuration ?? DEFAULT_TRANSITION_DURATION);
      setFadeIn(st.fadeIn ?? 0.5); setFadeOut(st.fadeOut ?? 0.6);
      setMotionAmount(st.motionAmount ?? 0.08); setTrimEnd(st.trimEnd ?? 0);
      setTransitionSfx(st.transitionSfx ?? true);
      setTransitionSfxVol(st.transitionSfxVol ?? 0.5);
      setTransitionSfxType(st.transitionSfxType ?? "whoosh");
      setTransitionSfxMode(st.transitionSfxMode ?? "smart");
      const mp = d.maps || {};
      setMotionByName(mp.motionByName || {}); setTrimByName(mp.trimByName || {});
      setVolumeByName(mp.volumeByName || {}); setFitByName(mp.fitByName || {});
      setEffectsByName(mp.effectsByName || {}); setEffectIntensityByName(mp.effectIntensityByName || {});
      const cp = d.captions || {};
      setCaptionRaw(cp.captionRaw ?? null); setCaptionName(cp.captionName ?? null);
      setCaptionsOn(!!cp.captionsOn); setCaptionStyle(cp.captionStyle ?? "classic");
      setCaptionSize(cp.captionSize ?? "md"); setCaptionLineHeight(cp.captionLineHeight ?? null);
      setCaptionFontScale(cp.captionFontScale ?? null);
      idRef.current = d.idCounter || newSlots.length;
      setBuilt(!!d.built);
    } finally { setLoadingProject(false); }
  }, [resetDoc, resetAllState]);

  // navigator.storage.estimate() lags behind an IndexedDB delete/write, so re-poll
  // a few times to catch the freed/added space without needing a manual refresh.
  const refreshStorage = useCallback(() => {
    const tick = async () => { try { setStorage(await storageEstimate()); } catch (_) {} };
    tick();
    setTimeout(tick, 500);
    setTimeout(tick, 1500);
    setTimeout(tick, 3000);
  }, []);

  const [savingBack, setSavingBack] = useState(false);
  const backToProjects = useCallback(async () => {
    setSavingBack(true);
    try { if (saveRef.current) await saveRef.current(); } catch (_) {}
    setSavingBack(false);
    setProjects(await listProjects());
    refreshStorage();
    setView("list");
  }, [refreshStorage]);

  const onRenameProject = useCallback(async (id, name) => {
    await renameProject(id, name);
    setCurrentProject((p) => (p && p.id === id ? { ...p, name } : p));
    setProjects(await listProjects());
  }, []);
  const onDeleteProject = useCallback(async (id) => {
    await deleteProject(id);
    setProjects(await listProjects());
    refreshStorage();
  }, [refreshStorage]);
  const renameCurrent = useCallback(async () => {
    if (!currentProject) return;
    const name = await showPrompt("Rename project", {
      title: "Rename project", defaultValue: currentProject.name || "Untitled project", okText: "Rename",
    });
    if (name && name.trim()) onRenameProject(currentProject.id, name.trim());
  }, [currentProject, onRenameProject]);

  const cancelRef = useRef(false);
  const onCancel = useCallback(() => {
    cancelRef.current = true;
    cancelRender();
    setBusy(false);
    setProgress(0);
  }, []);
  const wcCancelRef = useRef(false);
  const onWebCodecsCancel = useCallback(() => { wcCancelRef.current = true; }, []);

  const onRender = useCallback(async () => {
    cancelRef.current = false;
    setBusy(true); setError(null); setOutUrl(null); setProgress(0);
    try {
      const exportClips = trimClips(clips, exportDuration);
      const transitions = exportClips.map((c) => transitionsByName[c.name] || "cut");
      const motions = exportClips.map((c) => motionByName[c.name] || "none");
      const effects = exportClips.map((c) => effectsByName[c.name] || "none");
      const effectIntensities = exportClips.map((c) => effectIntensityByName[c.name] != null ? effectIntensityByName[c.name] : 70);
      // Per-clip video params (parallel to exportClips). Images get 0/1/none.
      // Default: "fit" (Auto Speed-to-Fit so full video fills its narration slot).
      const modeOf = (c) => {
        const info = videoInfoByName[c.name];
        if (!info) return "fit";
        return fitByName[c.name] || "fit";
      };
      const trims = exportClips.map((c) =>
        (videoInfoByName[c.name] && modeOf(c) === "trim") ? (trimByName[c.name] || 0) : 0);
      const speeds = exportClips.map((c) => {
        const info = videoInfoByName[c.name];
        if (!info) return 1;
        const dur = info.duration || 0, slot = c.duration || 0;
        return (modeOf(c) === "fit" && slot > 0 && dur > 0 && Math.abs(dur - slot) > 0.05) ? +(dur / slot).toFixed(4) : 1;
      });
      const volumes = exportClips.map((c) =>
        Object.prototype.hasOwnProperty.call(videosByName, c.name)
          ? (volumeByName[c.name] == null ? 0 : volumeByName[c.name]) : 0);
      const captions = captionsOn && captionCues.length ? captionCues : null;
      const blob = await renderVideo({
        clips: exportClips, imagesByName, videosByName, audioFile,
        width: renderDims.width, height: renderDims.height, fps,
        transitions, transitionDuration, motions, motionAmount, trims, volumes, speeds, fadeIn, fadeOut,
        effects, effectIntensities,
        captions, captionStyle, captionSize, captionLineHeight, captionFontScale,
        onProgress: setProgress,
      });
      setOutUrl(URL.createObjectURL(blob));
    } catch (e) {
      if (!cancelRef.current) setError(e.message || String(e));
    } finally {
      if (!cancelRef.current) setBusy(false);
    }
  }, [clips, exportDuration, imagesByName, videosByName, audioFile, renderDims, fps, transitionsByName, transitionDuration,
      motionByName, motionAmount, effectsByName, effectIntensityByName, trimByName, volumeByName, fitByName, videoInfoByName, fadeIn, fadeOut,
      captionsOn, captionCues, captionStyle, captionSize, captionLineHeight, captionFontScale]);

  // --- SPIKE: WebCodecs GPU render (video-only, no audio). Proves the pipeline. ---
  const [wcBusy, setWcBusy] = useState(false);
  const [wcProgress, setWcProgress] = useState(0);
  const [wcPhase, setWcPhase] = useState("Rendering");
  const [doneMsg, setDoneMsg] = useState(null);       // transient "render complete" toast
  const doneTimerRef = useRef(0);
  const flashDone = useCallback((msg) => {
    setDoneMsg(msg);
    clearTimeout(doneTimerRef.current);
    doneTimerRef.current = setTimeout(() => setDoneMsg(null), 6000);
  }, []);
  const [wcOk, setWcOk] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(false); // ffmpeg backend reachable?
  const [wcEnabled, setWcEnabled] = useState(true); // WebCodecs on by default (desktop)
  const [wcProfile, setWcProfile] = useState(null); // resolved render profile (mp4)
  const [renderChecked, setRenderChecked] = useState(false); // capability probes done
  useEffect(() => {
    let alive = true;
    (async () => {
      const [wc, srv] = await Promise.all([
        webCodecsCanRender().catch(() => false),
        probeBackend().catch(() => false),
      ]);
      if (!alive) return;
      setWcOk(wc); setServerAvailable(srv); setRenderChecked(true);
    })();
    return () => { alive = false; };
  }, []);
  // No way to export in this browser: no H.264 WebCodecs and no render backend.
  const cantRender = renderChecked && !wcOk && !serverAvailable;
  // Resolve the output profile up front (recomputed when size/fps change) so the
  // Save dialog and filename use the right extension without an await after click.
  useEffect(() => {
    let alive = true;
    if (!wcOk) { setWcProfile(null); return; }
    pickRenderProfile(renderDims.width, renderDims.height, fps, 8_000_000)
      .then((p) => { if (alive) setWcProfile(p); }).catch(() => { if (alive) setWcProfile(null); });
    return () => { alive = false; };
  }, [wcOk, renderDims.width, renderDims.height, fps]);
  const onWebCodecsTest = useCallback(async () => {
    wcCancelRef.current = false;
    const logs = []; // diagnostics — shown in the failure dialog
    const profile = wcProfile;
    if (!profile) {
      showAlert("This browser can't encode video. Use Chrome, Edge, or Safari 16.4+.", { title: "Fast render unavailable" });
      return;
    }
    const fileName = `${((currentProject && currentProject.name) || "autoeditor").replace(/[^\w.-]+/g, "_") || "autoeditor"}.mp4`;
    // The renderer muxes into a chunked buffer (no single-ArrayBuffer size limit),
    // so large videos download normally — no save dialog / File System API needed.
    const writable = null;
    setWcBusy(true); setWcProgress(0); setWcPhase("Rendering");
    // Play inaudible audio for the duration so a backgrounded tab keeps rendering
    // at full speed (started here, inside the click gesture, so it's allowed).
    const stopKeepAwake = startKeepAwake();
    try {
      const exportClips = trimClips(clips, exportDuration);
      const transitions = exportClips.map((c) => transitionsByName[c.name] || "cut");
      const motions = exportClips.map((c) => motionByName[c.name] || "none");
      // Per-clip video params (parallel to exportClips), same rule as the ffmpeg
      // path: Default is "fit" (Auto Speed-to-Fit).
      const modeOf = (c) => {
        const info = videoInfoByName[c.name];
        if (!info) return "fit";
        return fitByName[c.name] || "fit";
      };
      const trims = exportClips.map((c) =>
        (videoInfoByName[c.name] && modeOf(c) === "trim") ? (trimByName[c.name] || 0) : 0);
      const speeds = exportClips.map((c) => {
        const info = videoInfoByName[c.name];
        if (!info) return 1;
        const dur = info.duration || 0, slot = c.duration || 0;
        return (modeOf(c) === "fit" && slot > 0 && dur > 0 && Math.abs(dur - slot) > 0.05) ? +(dur / slot).toFixed(4) : 1;
      });
      const volumes = exportClips.map((c) =>
        Object.prototype.hasOwnProperty.call(videosByName, c.name)
          ? (volumeByName[c.name] == null ? 0 : volumeByName[c.name]) : 0);
      // Request the full 8 Mbps. The renderer decides the effective rate: a streamed
      // (to-disk) output keeps it, while an in-memory output is capped to a memory-safe
      // rate for long videos — it makes that call because only it knows whether streaming
      // actually engaged (see renderWebCodecs).
      const bitrate = 8_000_000;
      let watermarkImg = null;
      if (watermarkFile) {
        try { watermarkImg = await createImageBitmap(watermarkFile); } catch (_) { watermarkImg = null; }
      }
      const blob = await renderWebCodecs(
        {
          clips: exportClips, width: renderDims.width, height: renderDims.height, fps, bitrate, profile,
          transitions, transitionDuration, motions, motionAmount, audioFile,
          bgmFile, bgmVolume, bgmDucking,
          transitionSfx, transitionSfxVol, transitionSfxType, transitionSfxMode, effectsByName, effectIntensityByName,
          watermarkImg, watermarkPos, watermarkOpacity, watermarkScale,
          watermarkText, watermarkIsCircle, watermarkShadow, watermarkMargin, watermarkFadeIn, watermarkTextColor, watermarkTextBg,
          videosByName, postersByName: imageEls, trims, speeds, volumes,
          cues: captionsOn && captionCues.length ? captionCues : null,
          captionStyle, captionSize, captionLineHeight, captionFontScale, captionPos, captionFont,
        },
        imagesByName,
        (frac, phase) => { setWcProgress(frac); if (phase) setWcPhase(phase); },
        () => wcCancelRef.current,
        logs,
        writable,
      );
      // Audio can be dropped without failing the whole render (e.g. an unsupported
      // codec/rate) — the video still saves. Surface that clearly so a silent, soundless
      // file isn't a surprise.
      const audioIssue = logs.find((l) => /audio failed|produced no audio/i.test(l));
      if (blob) { // in-memory result → download; a streamed render is already on disk
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fileName; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        flashDone(audioIssue ? `Downloaded “${fileName}” — no audio` : `Downloaded “${fileName}”`);
      } else { // streamed straight to the file the user chose — no browser download
        flashDone(audioIssue ? `Saved “${fileName}” — no audio` : `Saved to “${fileName}”`);
      }
      if (audioIssue) {
        showAlert("Your video was created, but the audio couldn’t be added, so the file has no sound.",
          { title: "Video saved without audio", details: `${audioIssue}\n\nThis usually means an unusual audio format. Try re-exporting the voiceover as a standard 48 kHz WAV or MP3 and render again.` });
      }
    } catch (e) {
      if (writable) { try { await writable.abort(); } catch (_) {} } // discard partial file
      if (!(e && e.cancelled)) {
        const details = [
          `Error: ${e && e.message ? e.message : String(e)}`,
          "",
          "— render log —",
          ...logs,
          "",
          "— environment —",
          `resolution: ${renderDims.width}x${renderDims.height} @ ${fps}fps`,
          `userAgent: ${typeof navigator !== "undefined" ? navigator.userAgent : "?"}`,
          e && e.stack ? `\nstack:\n${e.stack}` : "",
        ].join("\n");
        // WebKit's (Safari / any iOS browser) video encoder gives up on long encodes
        // with "Encoding task did not complete" (then "not configured"). It's a browser
        // limit — Chromium handles it — so point the user there instead of a generic error.
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        const isMacSafari = /Macintosh/.test(ua) && / Version\/.*Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg/.test(ua);
        const msg = (e && e.message ? e.message : "").toLowerCase();
        const encoderGaveUp = msg.includes("not configured") || msg.includes("did not complete") || logs.some((l) => /did not complete/i.test(l));
        fetch("/api/log-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "webcodecs_render_error",
            error: e && e.message ? e.message : String(e),
            details,
            resolution: `${renderDims.width}x${renderDims.height}`,
            fps,
          }),
        }).catch(() => {});

        if (isIOS && encoderGaveUp) {
          // Every browser on iPhone/iPad is WebKit, so "use Chrome on iPhone" wouldn't help.
          showAlert("This video is too long for an iPhone or iPad to finish encoding — every browser on iOS shares the same limit. Please render on a computer (Chrome or Edge) or an Android phone, or export a shorter / lower-resolution video.",
            { title: "Render long videos on a computer", details });
        } else if (isMacSafari && encoderGaveUp) {
          showAlert("Safari couldn’t finish this render — its video encoder gives up on long videos. Please render in Google Chrome or Microsoft Edge on this Mac (or export a shorter / lower-resolution video).",
            { title: "Use Chrome or Edge for long renders", details });
        } else {
          showAlert("The Fast render failed. Copy the details below if you want to report it.",
            { title: "Fast render failed", details });
        }
      }
    } finally {
      stopKeepAwake();
      setWcBusy(false);
      setWcProgress(0);
      setWcPhase("Rendering");
    }
  }, [clips, exportDuration, transitionsByName, motionByName, imagesByName, renderDims, fps, transitionDuration, motionAmount, audioFile,
      videosByName, videoInfoByName, fitByName, trimByName, volumeByName, currentProject, flashDone, wcProfile,
      captionsOn, captionCues, captionStyle, captionSize, captionLineHeight, captionFontScale]);

  // Browser can't export video (no H.264 WebCodecs, no render backend) — block the
  // whole app; there's no point letting them create projects they can't render.
  if (cantRender) {
    return (
      <main className="unsupported">
        <div className="unsupported__card">
          <img className="unsupported__logo" src="/logo.svg" width="52" height="52" alt="" />
          <h1 className="unsupported__h">Open in Chrome, Edge, or Safari</h1>
          <p className="unsupported__p">
            <span className="unsupported__brand">MK AutoEditor</span> exports video using your
            browser’s built-in video encoder — which this browser doesn’t have.
          </p>
          <p className="unsupported__p">
            Please open this site in <b>Google Chrome</b>, <b>Microsoft Edge</b>, or <b>Safari 16.4+</b>
            {" "}to create and export your videos. (Firefox isn’t supported.)
          </p>
        </div>
      </main>
    );
  }

  if (view === "list") {
    return (
      <ErrorBoundary>
        <DialogHost />
        <ProjectsHome
          projects={projects}
          onNew={newProject}
          onOpen={openProject}
          onRename={onRenameProject}
          onDelete={onDeleteProject}
          storage={storage}
          onOpenSupport={() => openSupport()}
        />
        <SupportModal
          isOpen={supportState.open}
          onClose={() => setSupportState({ open: false, error: null, topic: null })}
          initialError={supportState.error}
          initialTopic={supportState.topic}
          projectMeta={null}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <DialogHost />
    <main className="app">
      {doneMsg && (
        <div className="donetoast" role="status" aria-live="polite" onClick={() => setDoneMsg(null)}>
          <span className="donetoast__ok" aria-hidden="true">✓</span>
          <span>Render complete — {doneMsg}</span>
        </div>
      )}
      {savingBack && (
        <div className="importing" role="status" aria-live="polite">
          <span className="importing__spin" aria-hidden="true" />
          Saving project…
        </div>
      )}
      <header className="nav">
        <div className="nav__brand">
          <img className="brand__logo" src="/logo.svg" alt="MK AutoEditor" width="28" height="28" />
          <span className="brand__name"><span className="brand__pre">MK</span> AutoEditor</span>
          <span className="brand__tag">image + video · voiceover sync</span>
        </div>
        <div className="nav__actions">
          <button
            type="button"
            className="nav__support-btn"
            onClick={() => openSupport()}
            title="Get Help & Developer Support"
          >
            <span className="nav__support-icon">💬</span>
            <span className="nav__support-text">Support &amp; Help</span>
          </button>
        </div>
      </header>

      <div className={`projbar${showEditor ? "" : " projbar--onboard"}`}>
        <div className="projbar__id">
          <button className="brand__back" onClick={backToProjects} title="Back to all projects">
            <span className="brand__back-arrow">←</span>
            <span className="brand__back-text">Projects</span>
          </button>
          <button className="brand__proj-badge" onClick={renameCurrent} title="Click to rename project">
            <span className="brand__proj-icon">🎬</span>
            <span className="brand__proj-name">{currentProject ? (currentProject.name || "Untitled project") : "AutoEditor"}</span>
            <span className="brand__proj-edit">✎</span>
          </button>
        </div>
        <div className="bar__io">
          <Dropzone
            compact accept="audio/*" onFiles={onAudio} icon="♪"
            title="Import voiceover" filled={!!audioFile}
            filledLabel={audioFile ? audioFile.name : ""}
          />
          <Dropzone
            compact multiple accept="image/*,video/*" onFiles={addImages} icon="▦"
            title="Add media" filled={mediaStats.total > 0}
            filledLabel={mediaStats.total ? `${mediaStats.total} media (${mediaStats.images}🖼️ ${mediaStats.videos}🎬)` : ""}
          />
        </div>
      </div>

      {resume && (
        <div className={`resume${resume.url ? " resume--done" : resume.error ? " resume--bad" : ""}`}>
          {resume.busy && (
            <span className="resume__msg">
              <span className="resume__spin" aria-hidden="true" />
              A render is still running… {Math.round(resume.progress * 100)}%
            </span>
          )}
          {resume.url && (
            <span className="resume__msg">
              Your video finished rendering.
              <a className="resume__dl" href={resume.url} download="autoeditor.mp4">Download</a>
            </span>
          )}
          {resume.error && <span className="resume__msg">Last render failed: {resume.error}</span>}
          {!resume.busy && (
            <button className="resume__x" onClick={() => setResume(null)} aria-label="Dismiss">✕</button>
          )}
        </div>
      )}

      {importing && (
        <div className="importing" role="status" aria-live="polite">
          <span className="importing__spin" aria-hidden="true" />
          Loading media… {importing.done} / {importing.total}
        </div>
      )}

      <div className="content">
      {loadingProject ? (
        <div className="projload">
          <span className="projload__spin" aria-hidden="true" />
          <span className="projload__txt">Loading project…</span>
        </div>
      ) : !showEditor ? (
        <section className="onboard">
          <h1 className="onboard__h">Sync your images to a voiceover, automatically.</h1>
          <p className="onboard__p">
            Name each image or video clip with the second it appears — <code>0-03.png</code> or
            <code>0-03.mp4</code> cuts in at 0:03 — then import them with your voiceover. Video clips
            can be trimmed, zoomed, and their sound mixed under the narration. Review everything below,
            then build the timeline. Everything runs on your device. Nothing is uploaded.
          </p>

          <div className="onboard__zones">
            <Dropzone
              accept="audio/*" onFiles={onAudio} icon="♪"
              title="Voiceover audio"
              hint="One MP3 or WAV — sets the total length"
              filled={!!audioFile}
              filledLabel={audioFile ? audioFile.name : ""}
            />
            <Dropzone
              multiple accept="image/*,video/*" onFiles={addImages} icon="▦"
              title={tray.length ? "Add more media" : "Storyboard images & video"}
              hint="Images or video clips, named by timestamp (0-00, 0-06…). Drop files or whole folders — even several at once."
              filled={false}
            />
          </div>

          {tray.length > 0 && (
            <div className="tray">
              <div className="tray__head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="tray__count">{mediaStats.total} Media Items Imported</span>
                  <span className="tray__pill" style={{ background: "rgba(59, 130, 246, 0.18)", color: "#60a5fa", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                    🖼️ {mediaStats.images} Photo{mediaStats.images !== 1 ? "s" : ""}
                  </span>
                  <span className="tray__pill" style={{ background: "rgba(168, 85, 247, 0.18)", color: "#c084fc", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                    🎬 {mediaStats.videos} Video{mediaStats.videos !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="tray__sub">ordered by timestamp — hover to remove</span>
              </div>
              <div className="tray__grid">
                {tray.map((t) => (
                  <div key={t.id} className={`thumb${t.seconds == null ? " thumb--notime" : ""}`} title={`${t.name} (${t.isVideo ? "Video" : "Photo"})`}>
                    <img src={t.url} alt="" />
                    {t.isVideo && (
                      <span style={{ position: "absolute", top: 4, left: 4, background: "rgba(147, 51, 234, 0.88)", color: "#fff", padding: "1px 5px", borderRadius: 4, fontSize: 9, fontWeight: 750 }}>
                        🎬 Video
                      </span>
                    )}
                    <span className="thumb__time">{t.seconds != null ? fmtTime(t.seconds) : "no time"}</span>
                    <button className="thumb__x" title="Remove this clip" onClick={() => discardImage(t.id)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {imageCount > 0 && warnings.length > 0 && (
            <div className="notes">{warnings.map((w, i) => <div className="note" key={i}>{w}</div>)}</div>
          )}
          {error && (
            <div className="note note--bad note--with-action">
              <span>{error}</span>
              <button
                type="button"
                className="note__support-btn"
                onClick={() => openSupport({ error, topic: "general_help" })}
              >
                💬 Get Support
              </button>
            </div>
          )}

          <div className="build-row">
            <button
              className="render build"
              disabled={!audioFile || tray.length === 0 || clips.length === 0}
              onClick={() => setBuilt(true)}
            >
              Build timeline →
            </button>
            <span className="build-hint">
              {tray.length === 0
                ? "Import your storyboard images to begin."
                : !audioFile
                  ? "Add a voiceover to build the timeline."
                  : `${mediaStats.total} media (${mediaStats.images} photos, ${mediaStats.videos} videos) · ready to build`}
            </span>
          </div>
        </section>
      ) : (
        <Editor
          clips={clips} imageEls={imageEls} audioUrl={audioUrl} mediaStats={mediaStats}
          onAddImages={addImages} onAudioFile={onAudioFile}
          duration={audioDuration} peaks={peaks} dims={dims}
          aspect={aspect} setAspect={setAspect} fps={fps} setFps={setFps}
          renderQuality={renderQuality} setRenderQuality={setRenderQuality} renderDims={renderDims}
          onWebCodecsTest={onWebCodecsTest} onWebCodecsCancel={onWebCodecsCancel}
          wcBusy={wcBusy} wcProgress={wcProgress} wcPhase={wcPhase} wcAvailable={wcOk} serverAvailable={serverAvailable}
          wcEnabled={wcEnabled} setWcEnabled={setWcEnabled}
          onRender={onRender} onCancel={onCancel} busy={busy} progress={progress}
          outUrl={outUrl} error={error} warnings={warnings}
          replaceImage={replaceImage} removeImage={removeImage} fillGap={fillGap}
          resizeBoundary={resizeBoundary}
          transitionsByName={transitionsByName} transitionDuration={transitionDuration}
          setTransition={setTransition} applyTransitionAll={applyTransitionAll}
          applyTransitionMix={applyTransitionMix}
          setTransitionDuration={setTransitionDuration}
          fadeIn={fadeIn} setFadeIn={setFadeIn}
          fadeOut={fadeOut} setFadeOut={setFadeOut}
          motionByName={motionByName} setMotion={setMotion}
          applyMotionAll={applyMotionAll} applyMotionAlternate={applyMotionAlternate}
          motionAmount={motionAmount} setMotionAmount={setMotionAmount}
          effectsByName={effectsByName} setEffect={setEffect}
          applyEffectAll={applyEffectAll}
          effectIntensityByName={effectIntensityByName} setEffectIntensity={setEffectIntensity}
          videoInfoByName={videoInfoByName}
          trimByName={trimByName} setTrim={setTrim}
          volumeByName={volumeByName} setVolume={setVolume}
          fitByName={fitByName} setFit={setFit}
          trimEnd={exportDuration} setTrimEnd={setTrimEnd} exportDuration={exportDuration}
          undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
          captionCues={captionCues} captionsOn={captionsOn} setCaptionsOn={setCaptionsOn}
          captionStyle={captionStyle} setCaptionStyle={setCaptionStyle}
          captionSize={captionSize} setCaptionSize={setCaptionSize}
          captionLineHeight={captionLineHeight} setCaptionLineHeight={setCaptionLineHeight}
          captionFontScale={captionFontScale} setCaptionFontScale={setCaptionFontScale}
          captionName={captionName} captionError={captionError} onCaptionFile={onCaptionFile}
          captionPos={captionPos} setCaptionPos={setCaptionPos}
          captionFont={captionFont} setCaptionFont={setCaptionFont}
          bgmFile={bgmFile} setBgmFile={setBgmFile}
          bgmVolume={bgmVolume} setBgmVolume={setBgmVolume}
          bgmDucking={bgmDucking} setBgmDucking={setBgmDucking}
          transitionSfx={transitionSfx} setTransitionSfx={setTransitionSfx}
          transitionSfxVol={transitionSfxVol} setTransitionSfxVol={setTransitionSfxVol}
          transitionSfxType={transitionSfxType} setTransitionSfxType={setTransitionSfxType}
          transitionSfxMode={transitionSfxMode} setTransitionSfxMode={setTransitionSfxMode}
          setCaptionCues={setEditedCues}
          watermarkFile={watermarkFile} setWatermarkFile={setWatermarkFile}
          watermarkPos={watermarkPos} setWatermarkPos={setWatermarkPos}
          watermarkOpacity={watermarkOpacity} setWatermarkOpacity={setWatermarkOpacity}
          watermarkScale={watermarkScale} setWatermarkScale={setWatermarkScale}
          watermarkText={watermarkText} setWatermarkText={setWatermarkText}
          watermarkIsCircle={watermarkIsCircle} setWatermarkIsCircle={setWatermarkIsCircle}
          watermarkShadow={watermarkShadow} setWatermarkShadow={setWatermarkShadow}
          watermarkMargin={watermarkMargin} setWatermarkMargin={setWatermarkMargin}
          watermarkFadeIn={watermarkFadeIn} setWatermarkFadeIn={setWatermarkFadeIn}
          watermarkTextColor={watermarkTextColor} setWatermarkTextColor={setWatermarkTextColor}
          watermarkTextBg={watermarkTextBg} setWatermarkTextBg={setWatermarkTextBg}
          onOpenSupport={openSupport}
        />
      )}
      </div>

      <SupportModal
        isOpen={supportState.open}
        onClose={() => setSupportState({ open: false, error: null, topic: null })}
        initialError={supportState.error}
        initialTopic={supportState.topic}
        projectMeta={{
          name: currentProject ? (currentProject.name || "Untitled") : "AutoEditor",
          clipCount: clips ? clips.length : 0,
          duration: audioDuration ? `${Math.round(audioDuration)}s` : null,
        }}
      />
    </main>
    </ErrorBoundary>
  );
}
