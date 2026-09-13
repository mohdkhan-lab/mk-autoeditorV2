"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Timeline from "./Timeline";
import {
  TRANSITION_LIST, transitionOf,
  MIN_TRANSITION_DURATION, MAX_TRANSITION_DURATION,
} from "../lib/transitions";
import {
  CAPTION_STYLE_LIST, CAPTION_SIZES, captionAt, captionCueAt, drawCaption, captionFontPx, captionLineHeightDefault, POPULAR_FONTS,
} from "../lib/captions";
import { EFFECTS, getPreDrawTransform, applyCanvasPostEffect } from "../lib/effects";
import { playWhoosh, playSfx, TRANSITION_SFX_LIST, getSmartSfxForClip } from "../lib/sfx";
import { getBgmDuckedGain, extractVoiceSegments } from "../lib/bgm";
import { drawWatermark } from "../lib/watermark";

function tc(t) {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const d = Math.floor((t * 10) % 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${d}`;
}

function fmtCueTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${ms}`;
}

function clock(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Editor({
  clips, imageEls, audioUrl, duration, peaks, dims,
  aspect, setAspect, fps, setFps,
  renderQuality = "full", setRenderQuality, renderDims,
  onRender, onCancel, busy, progress, outUrl, error, warnings,
  onWebCodecsTest, onWebCodecsCancel, wcBusy, wcProgress, wcPhase, wcAvailable, serverAvailable, wcEnabled, setWcEnabled,
  replaceImage, removeImage, fillGap, resizeBoundary,
  transitionsByName, transitionDuration, setTransition, applyTransitionAll, applyTransitionMix, setTransitionDuration,
  fadeIn, setFadeIn, fadeOut, setFadeOut,
  motionByName, setMotion, applyMotionAll, applyMotionAlternate, motionAmount, setMotionAmount,
  effectsByName = {}, setEffect, applyEffectAll, effectIntensityByName = {}, setEffectIntensity,
  videoInfoByName = {}, trimByName = {}, setTrim, volumeByName = {}, setVolume,
  fitByName = {}, setFit,
  trimEnd, setTrimEnd, exportDuration,
  undo, redo, canUndo, canRedo,
  captionCues, captionsOn, setCaptionsOn, captionStyle, setCaptionStyle,
  captionSize, setCaptionSize, captionLineHeight, setCaptionLineHeight,
  captionFontScale, setCaptionFontScale,
  captionName, captionError, onCaptionFile,
  captionPos = "bottom", setCaptionPos, captionFont = "default", setCaptionFont, setCaptionCues,
  bgmFile, setBgmFile, bgmVolume = 0.25, setBgmVolume, bgmDucking = true, setBgmDucking,
  transitionSfx = true, setTransitionSfx, transitionSfxVol = 0.3, setTransitionSfxVol,
  transitionSfxType = "whoosh", setTransitionSfxType,
  transitionSfxMode = "smart", setTransitionSfxMode,
  watermarkFile, setWatermarkFile, watermarkPos = "bottom-right", setWatermarkPos,
  watermarkOpacity = 0.85, setWatermarkOpacity, watermarkScale = 0.15, setWatermarkScale,
  watermarkText = "", setWatermarkText,
  watermarkIsCircle = false, setWatermarkIsCircle,
  watermarkShadow = true, setWatermarkShadow,
  watermarkMargin = 24, setWatermarkMargin,
  watermarkFadeIn = false, setWatermarkFadeIn,
  watermarkTextColor = "#ffffff", setWatermarkTextColor,
  watermarkTextBg = true, setWatermarkTextBg,
}) {
  const canvasRef = useRef(null);
  const viewerFrameRef = useRef(null);
  const audioRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditingCaptions, setIsEditingCaptions] = useState(false);

  const toggleFullscreen = useCallback(() => {
    const el = viewerFrameRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleFullscreen]);
  const bgmAudioRef = useRef(null);
  const rafRef = useRef(0);
  const fileInputRef = useRef(null);
  const capInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const bgmInputRef = useRef(null);
  const watermarkInputRef = useRef(null);
  const audioCtxRef = useRef(null);
  const lastWhooshCutRef = useRef(-1);
  const watermarkImgRef = useRef(null);
  const pending = useRef(null); // gap-fill target name
  const trimEndRef = useRef(exportDuration);
  const vidRefs = useRef({});     // clip name -> offscreen <video> for live preview
  const drawRef = useRef(null);   // latest draw fn (so video 'seeked' can redraw)
  const timeRef = useRef(0);      // latest playhead time
  const playingRef = useRef(false); // latest playing boolean
  const modalVideoRef = useRef(null); // the trim scrubber <video> in the inspector
  useEffect(() => { trimEndRef.current = exportDuration; }, [exportDuration]);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  const [elapsed, setElapsed] = useState(0); // seconds spent in the current render
  const [selectedCut, setSelectedCut] = useState(null); // selected clip name (drives transition)
  const [currentType, setCurrentType] = useState("fade");
  const [inspect, setInspect] = useState(null);   // slot name open in the inspector
  const [dismissedWarn, setDismissedWarn] = useState(() => new Set()); // hidden warning texts
  // On touch devices, accept="image/*"/"video/*" makes Android open Google Photos,
  // which renames files and breaks the timestamp. Dropping accept opens the Files
  // picker instead (keeps 0-04.mp4). onPick* still filter by type, so nothing bad
  // gets through. Same trick as Dropzone.
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    try { setCoarse(window.matchMedia && window.matchMedia("(pointer: coarse)").matches); } catch { /* ignore */ }
  }, []);
  const [pendFile, setPendFile] = useState(null);  // chosen replacement, not yet applied
  const [pendUrl, setPendUrl] = useState(null);
  const [sidebarEffect, setSidebarEffect] = useState("shake");
  const [sidebarIntensity, setSidebarIntensity] = useState(70);
  const [sidebarTab, setSidebarTab] = useState("effects"); // "effects" | "transitions" | "motion" | "captions" | "export" | "all"
  const [effFilter, setEffFilter] = useState("all"); // "all" | "popular" | "cinematic" | "motion" | "mood"
  const [mixMode, setMixMode] = useState(false); // Transitions panel in random-mix mode
  const [mixPicks, setMixPicks] = useState(() => new Set()); // ephemeral: chosen transitions for the random mix
  const toggleMix = useCallback((id) => {
    setMixPicks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const tabsRef = useRef(null);
  const [tabsGrid, setTabsGrid] = useState(false);
  const isDraggingTabsRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollStartRef = useRef(0);

  const onTabsPointerDown = useCallback((e) => {
    isDraggingTabsRef.current = true;
    dragStartXRef.current = e.clientX;
    scrollStartRef.current = tabsRef.current ? tabsRef.current.scrollLeft : 0;
  }, []);

  const onTabsPointerMove = useCallback((e) => {
    if (!isDraggingTabsRef.current || !tabsRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    tabsRef.current.scrollLeft = scrollStartRef.current - dx;
  }, []);

  const onTabsPointerUp = useCallback(() => {
    isDraggingTabsRef.current = false;
  }, []);

  const scrollTabs = useCallback((delta) => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: delta, behavior: "smooth" });
    }
  }, []);

  const onTabsWheel = useCallback((e) => {
    if (!tabsRef.current) return;
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      tabsRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  // Gap "+" → pick a file to fill an empty slot / lead-in.
  const askAdd = useCallback((name) => {
    pending.current = name;
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  const onPickFile = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    if (file && pending.current && fillGap) fillGap(pending.current, file);
    e.target.value = "";
    pending.current = null;
  }, [fillGap]);

  // Clip inspector: click a clip → preview → optionally pick a replacement,
  // preview it, then Apply (or Remove the image).
  const clearPend = useCallback(() => {
    setPendUrl((u) => { if (u) URL.revokeObjectURL(u); return null; });
    setPendFile(null);
  }, []);
  const openInspect = useCallback((name) => { clearPend(); setInspect(name); }, [clearPend]);
  const closeInspect = useCallback(() => { clearPend(); setInspect(null); }, [clearPend]);
  const onPickReplacement = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file || !(file.type.startsWith("image/") || file.type.startsWith("video/"))) return;
    setPendFile(file);
    setPendUrl((u) => { if (u) URL.revokeObjectURL(u); return URL.createObjectURL(file); });
  }, []);
  const applyReplacement = useCallback(() => {
    if (inspect && pendFile && replaceImage) replaceImage(inspect, pendFile);
    closeInspect();
  }, [inspect, pendFile, replaceImage, closeInspect]);
  const removeInspected = useCallback(() => {
    if (inspect && removeImage) removeImage(inspect);
    closeInspect();
  }, [inspect, removeImage, closeInspect]);

  useEffect(() => {
    if (!inspect) return;
    const onEsc = (e) => { if (e.key === "Escape") closeInspect(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [inspect, closeInspect]);

  const onPickCaption = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    if (file && onCaptionFile) onCaptionFile(file);
    e.target.value = "";
  }, [onCaptionFile]);

  // Keep offscreen <video> only for the CURRENT previewing clips (not all 100 clips at once!)
  // This keeps the GPU decoder pool completely clear and prevents browser crashes.
  useEffect(() => {
    if (busy || wcBusy) {
      for (const v of Object.values(vidRefs.current)) {
        if (v) { try { v.pause(); v.removeAttribute("src"); v.load(); } catch (_) {} }
      }
      vidRefs.current = {};
      return;
    }
    const map = vidRefs.current;
    let activeName = null, nextName = null;
    if (clips && clips.length) {
      const idx = clips.findIndex((c) => time >= c.start && time < c.start + c.duration);
      if (idx !== -1) {
        activeName = clips[idx].name;
        if (idx + 1 < clips.length) nextName = clips[idx + 1].name;
      }
    }
    const needed = new Set([activeName, nextName].filter(Boolean));

    for (const name of needed) {
      const info = videoInfoByName[name];
      if (!map[name] && info && info.url) {
        const v = document.createElement("video");
        v.src = info.url; v.muted = true; v.playsInline = true; v.preload = "auto";
        const redraw = () => {
          if (!playingRef.current && drawRef.current) {
            drawRef.current(timeRef.current);
          }
        };
        v.addEventListener("seeked", redraw);
        v.addEventListener("loadeddata", redraw);
        map[name] = v;
      }
    }
    for (const name of Object.keys(map)) {
      if (!needed.has(name) || !videoInfoByName[name]) {
        try {
          map[name].pause();
          map[name].removeAttribute("src");
          map[name].load();
        } catch { /* ignore */ }
        delete map[name];
      }
    }
  }, [videoInfoByName, clips, time, busy, wcBusy]);

  // Where in the source video to show for a clip at playhead t: the trim in-point
  // plus elapsed × speed (fast-forward). Mirrors the render math in page.js.
  const videoParams = useCallback((name, slotDur) => {
    const info = videoInfoByName[name];
    if (!info) return null;
    const dur = info.duration || 0;
    // Default: auto speed-to-fit so video fills the slot exactly
    const mode = fitByName[name] || "fit";
    if (mode === "fit" && slotDur > 0 && dur > 0 && Math.abs(dur - slotDur) > 0.05) return { trimStart: 0, speed: dur / slotDur };
    return { trimStart: trimByName[name] || 0, speed: 1 };
  }, [videoInfoByName, fitByName, trimByName]);

  const bgmUrl = useMemo(() => {
    return bgmFile ? URL.createObjectURL(bgmFile) : null;
  }, [bgmFile]);
  useEffect(() => {
    return () => { if (bgmUrl) URL.revokeObjectURL(bgmUrl); };
  }, [bgmUrl]);

  const watermarkUrl = useMemo(() => {
    return watermarkFile ? URL.createObjectURL(watermarkFile) : null;
  }, [watermarkFile]);
  useEffect(() => {
    return () => { if (watermarkUrl) URL.revokeObjectURL(watermarkUrl); };
  }, [watermarkUrl]);

  useEffect(() => {
    if (!watermarkUrl) {
      watermarkImgRef.current = null;
      if (drawRef.current) drawRef.current(timeRef.current);
      return;
    }
    const img = new Image();
    img.onload = () => {
      watermarkImgRef.current = img;
      if (drawRef.current) drawRef.current(timeRef.current);
    };
    img.src = watermarkUrl;
  }, [watermarkUrl]);

  const voiceSegments = useMemo(() => {
    return extractVoiceSegments(clips, exportDuration);
  }, [clips, exportDuration]);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const draw = useCallback((t) => {
    try {
      if (busy || wcBusy) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    const activeVideos = new Set(); // clip names whose video is active this frame

    // Per-clip Ken Burns zoom at time tt (gaps never zoom). Progress is clamped so
    // an outgoing image keeps its end-of-clip zoom through the transition.
    const scaleAt = (ci, tt) => {
      const c = clips[ci];
      if (!c || c.gap) return 1;
      const m = (motionByName && motionByName[c.name]) || "none";
      if (m === "none") return 1;
      const lp = Math.min(1, Math.max(0, (tt - c.start) / c.duration));
      return m === "zoomout" ? 1 + motionAmount * (1 - lp) : 1 + motionAmount * lp;
    };

    // Start/keep a clip's offscreen <video> playing in sync with the playhead.
    // Uses smooth PLL clock micro-nudging so the video NEVER stalls or seek-stutters.
    const primeVideo = (c, tt, wantDraw) => {
      if (busy || wcBusy) return null;
      const vinfo = videoInfoByName[c.name];
      if (!vinfo) return null;
      const v = vidRefs.current[c.name];
      const pr = videoParams(c.name, c.duration);
      if (!v || !pr) return null;
      const srcTime = Math.min(vinfo.duration || 0, Math.max(0, pr.trimStart + (tt - c.start) * pr.speed));
      const clipVol = volumeByName[c.name] == null ? 0 : volumeByName[c.name];
      v.volume = Math.min(1, Math.max(0, clipVol));
      v.muted = clipVol <= 0;

      const drift = v.currentTime - srcTime;
      const absDrift = Math.abs(drift);

      if (v.paused) {
        // Just started or unpaused: align to srcTime and play
        if (absDrift > 0.05) {
          try { v.currentTime = srcTime; } catch { /* ignore */ }
        }
        v.playbackRate = Math.min(16, Math.max(0.0625, pr.speed));
        v.play().catch(() => {});
      } else if (absDrift > 0.35) {
        // Major discontinuity (playhead scrubbed/jumped) — seek without piling up
        if (!v.seeking) {
          try { v.currentTime = srcTime; } catch { /* ignore */ }
        }
      } else {
        // Micro-drift PLL correction: gently nudge playbackRate without any seek stall!
        let rate = pr.speed;
        if (drift < -0.04) {
          rate = pr.speed * 1.06; // lagging slightly behind -> 6% boost
        } else if (drift > 0.04) {
          rate = pr.speed * 0.94; // leading slightly ahead -> 6% brake
        }
        v.playbackRate = Math.min(16, Math.max(0.0625, rate));
      }

      activeVideos.add(c.name);
      return (wantDraw && v.readyState >= 2) ? v : null;
    };

    if (clips.length) {
      let idx = clips.findIndex((c) => t >= c.start && t < c.start + c.duration);
      if (idx === -1) idx = clips.length - 1;
      const clip = clips[idx];
      const type = idx > 0 ? (transitionsByName[clip.name] || "cut") : "cut";
      const tdur = type === "cut" ? 0 : Math.min(transitionDuration, clip.duration);

      if (idx > 0 && tdur > 0 && t < clip.start + tdur) {
        // Inside a transition: blend both clips (live video or still poster)
        const p = Math.min(1, Math.max(0, (t - clip.start) / tdur));
        let fromDrawable = imageEls[clips[idx - 1].name] || null;
        if (playing) {
          const fromV = primeVideo(clips[idx - 1], t, true);
          if (fromV) fromDrawable = fromV;
        }
        let toDrawable = imageEls[clip.name] || null;
        if (playing) {
          const toV = primeVideo(clip, t, true);
          if (toV) toDrawable = toV;
        }
        transitionOf(type).canvas(
          ctx, fromDrawable, toDrawable, p, W, H,
          scaleAt(idx - 1, t), scaleAt(idx, t)
        );
        ctx.globalAlpha = 1;
      } else {
        // While PLAYING, draw live video frames smoothly
        let drawable = imageEls[clip.name];
        if (playing) {
          const vEl = primeVideo(clip, t, true);
          if (vEl) drawable = vEl;
        }
        const dw = (drawable && (drawable.videoWidth || drawable.naturalWidth)) || 0;
        const dh = (drawable && (drawable.videoHeight || drawable.naturalHeight)) || 0;
        if (drawable && dw && dh) {
          const effId = effectsByName && effectsByName[clip.name];
          const effInt = (effectIntensityByName && effectIntensityByName[clip.name]) != null
            ? effectIntensityByName[clip.name]
            : (EFFECTS[effId] ? EFFECTS[effId].defaultIntensity : 100);
          const clipElapsed = t - clip.start;
          const preT = getPreDrawTransform(effId, effInt, clipElapsed, clip.duration, W, H);
          const effScale = preT ? preT.scale : 1;
          const dx = preT ? preT.dx : 0;
          const dy = preT ? preT.dy : 0;

          const scale = Math.min(W / dw, H / dh) * scaleAt(idx, t) * effScale;
          const w = dw * scale, h = dh * scale;
          ctx.drawImage(drawable, (W - w) / 2 + dx, (H - h) / 2 + dy, w, h);

          if (effId && effId !== "none") {
            try {
              applyCanvasPostEffect(ctx, effId, effInt, clipElapsed, clip.duration, W, H);
            } catch (err) {
              console.warn("Canvas effect failed:", effId, err);
            }
          }
        }
      }
    }

    // Only the clips active this frame play; pause every other clip's video.
    for (const [nm, v] of Object.entries(vidRefs.current)) {
      if (!activeVideos.has(nm) && !v.paused) { try { v.pause(); } catch { /* ignore */ } }
    }

    // Captions burn in before the fades, so the fade dims them too.
    if (captionsOn && captionCues && captionCues.length) {
      const cue = captionCueAt ? captionCueAt(captionCues, t) : null;
      const txt = cue ? cue.text : captionAt(captionCues, t);
      if (txt) drawCaption(ctx, txt, W, H, captionStyle, captionFontPx(H, captionSize, captionFontScale), captionLineHeight, cue, t, captionPos, captionFont);
    }

    // Watermark / channel logo overlay (burned in under fades)
    if ((watermarkImgRef.current && watermarkImgRef.current.complete) || (watermarkText && watermarkText.trim())) {
      drawWatermark(ctx, watermarkImgRef.current, W, H, {
        pos: watermarkPos,
        opacity: watermarkOpacity,
        scale: watermarkScale,
        isCircle: watermarkIsCircle,
        shadow: watermarkShadow,
        margin: watermarkMargin,
        text: watermarkText,
        textColor: watermarkTextColor,
        textBg: watermarkTextBg,
        fadeIn: watermarkFadeIn,
        time: t,
      });
    }

    // Scene fades (opening / ending).
    if (fadeIn > 0 && t < fadeIn) {
      ctx.globalAlpha = Math.max(0, 1 - t / fadeIn);
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
    const outStart = exportDuration - fadeOut;
    if (fadeOut > 0 && t > outStart) {
      ctx.globalAlpha = Math.min(1, (t - outStart) / fadeOut);
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
    } catch (drawErr) {
      console.error("Canvas draw error:", drawErr);
    }
  }, [clips, imageEls, transitionsByName, transitionDuration, motionByName, motionAmount,
      effectsByName, effectIntensityByName,
      fadeIn, fadeOut, duration, exportDuration, playing, videoInfoByName, videoParams, volumeByName,
      captionsOn, captionCues, captionStyle, captionSize, captionLineHeight, captionFontScale, captionPos, captionFont,
      watermarkPos, watermarkOpacity, watermarkScale,
      watermarkText, watermarkIsCircle, watermarkShadow, watermarkMargin, watermarkFadeIn, watermarkTextColor, watermarkTextBg,
      busy, wcBusy]);

  useEffect(() => { drawRef.current = draw; }, [draw]);
  useEffect(() => { timeRef.current = time; }, [time]);
  useEffect(() => { if (!playing) draw(time); }, [time, draw, playing]);
  useEffect(() => { setTime(0); }, [audioUrl]);

  // Elapsed render timer and render isolation
  useEffect(() => {
    if (!busy && !wcBusy) { setElapsed(0); return; }
    // As soon as export begins, STOP and FREE all preview playback and video decoders!
    if (audioRef.current && !audioRef.current.paused) {
      try { audioRef.current.pause(); } catch (_) {}
    }
    if (bgmAudioRef.current && !bgmAudioRef.current.paused) {
      try { bgmAudioRef.current.pause(); } catch (_) {}
    }
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    playingRef.current = false;
    for (const v of Object.values(vidRefs.current)) {
      if (v) {
        try {
          v.pause();
          v.removeAttribute("src");
          v.load();
        } catch (_) {}
      }
    }
    vidRefs.current = {};

    const start = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 250);
    return () => clearInterval(id);
  }, [busy, wcBusy]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const loop = () => {
      const end = trimEndRef.current;
      if (end > 0 && a.currentTime >= end) {
        a.pause();
        a.currentTime = end;
        timeRef.current = end;
        setTime(end);
        if (drawRef.current) drawRef.current(end);
        return;
      }
      const ct = a.currentTime;
      timeRef.current = ct;

      // Live BGM auto-ducking & loop sync
      const bgm = bgmAudioRef.current;
      if (bgm && bgmUrl) {
        const duckedVol = getBgmDuckedGain(ct, voiceSegments, bgmDucking, bgmVolume);
        bgm.volume = Math.max(0, Math.min(1, duckedVol));
        if (bgm.duration && Math.abs(bgm.currentTime - (ct % bgm.duration)) > 0.35) {
          try { bgm.currentTime = ct % bgm.duration; } catch (_) {}
        }
      }

      // Live Transition SFX trigger (Smart Impact & Action Aware)
      if (transitionSfx && clips && clips.length > 1) {
        for (let i = 1; i < clips.length; i++) {
          const cutTime = clips[i].start;
          const diff = ct - cutTime;
          if (diff >= 0 && diff < 0.12) {
            if (lastWhooshCutRef.current !== i) {
              lastWhooshCutRef.current = i;
              const clipName = clips[i].name;
              const eff = (effectsByName && effectsByName[clipName]) || "none";
              const tr = (transitionsByName && transitionsByName[clipName]) || "cut";
              const soundId = getSmartSfxForClip(eff, tr, transitionSfxMode || "smart", transitionSfxType || "whoosh");
              if (soundId) {
                const actx = getAudioCtx();
                if (actx) playSfx(actx, soundId, transitionSfxVol);
              }
            }
            break;
          }
        }
      }

      if (drawRef.current) drawRef.current(ct);
      setTime(ct);
      rafRef.current = requestAnimationFrame(loop);
    };
    const onPlay = () => {
      setPlaying(true);
      playingRef.current = true;
      const bgm = bgmAudioRef.current;
      if (bgm && bgmUrl) {
        try {
          if (bgm.duration) bgm.currentTime = a.currentTime % bgm.duration;
          bgm.play().catch(() => {});
        } catch (_) {}
      }
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    const onStop = () => {
      setPlaying(false);
      playingRef.current = false;
      const bgm = bgmAudioRef.current;
      if (bgm) { try { bgm.pause(); } catch (_) {} }
      lastWhooshCutRef.current = -1;
      cancelAnimationFrame(rafRef.current);
      setTime(a.currentTime);
      timeRef.current = a.currentTime;
      for (const v of Object.values(vidRefs.current)) {
        if (v && !v.paused) { try { v.pause(); } catch { /* ignore */ } }
      }
      if (drawRef.current) drawRef.current(a.currentTime);
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onStop);
    a.addEventListener("ended", onStop);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onStop);
      a.removeEventListener("ended", onStop);
      cancelAnimationFrame(rafRef.current);
    };
  }, [audioUrl, bgmUrl, voiceSegments, bgmDucking, bgmVolume, transitionSfx, transitionSfxVol, transitionSfxType, transitionSfxMode, effectsByName, transitionsByName, clips, getAudioCtx]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      a.pause();
    }
  }, []);

  // Coalesce rapid scrub seeks: while a seek is still settling (slow for WAV),
  // remember the latest target and apply it on 'seeked', so the drag's release
  // position always wins instead of being dropped mid-seek.
  const pendingSeekRef = useRef(null);
  const seek = useCallback((t) => {
    const a = audioRef.current;
    if (!a) return;
    const c = Math.min(Math.max(t, 0), duration || t || 0);
    setTime(c);
    const bgm = bgmAudioRef.current;
    if (bgm && bgmUrl) {
      try {
        if (bgm.duration) bgm.currentTime = c % bgm.duration;
      } catch (_) {}
    }
    lastWhooshCutRef.current = -1;
    if (a.seeking) pendingSeekRef.current = c;
    else { pendingSeekRef.current = null; try { a.currentTime = c; } catch (_) {} }
  }, [duration, bgmUrl]);
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onSeeked = () => {
      const p = pendingSeekRef.current;
      if (p != null) { pendingSeekRef.current = null; if (Math.abs(a.currentTime - p) > 0.02) { try { a.currentTime = p; } catch (_) {} } }
    };
    a.addEventListener("seeked", onSeeked);
    return () => a.removeEventListener("seeked", onSeeked);
  }, [audioUrl]);

  // Scrubbing a *playing* WAV backward doesn't take — the seek fights live
  // playback and the release position is lost (MP3 settles fast enough to hide
  // this). So pause on grab, let the drag seek freely, then resume from the
  // release point once the pointer is up.
  const scrubResumeRef = useRef(false);
  const onScrubStart = useCallback(() => {
    const a = audioRef.current;
    scrubResumeRef.current = !!(a && !a.paused);
    if (a && !a.paused) { try { a.pause(); } catch (_) {} }
  }, []);
  const onScrubEnd = useCallback(() => {
    const a = audioRef.current;
    if (a && scrubResumeRef.current) { scrubResumeRef.current = false; a.play().catch(() => {}); }
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      else if (e.code === "ArrowRight") { e.preventDefault(); seek(time + (e.shiftKey ? 5 : 1)); }
      else if (e.code === "ArrowLeft") { e.preventDefault(); seek(time - (e.shiftKey ? 5 : 1)); }
      else if (e.key === "Home") { e.preventDefault(); seek(0); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, seek, time]);

  const active = clips.find((c) => time >= c.start && time < c.start + c.duration) || clips[clips.length - 1];
  const badClips = useMemo(
    () => new Set(clips.filter((c) => c.duration <= 0.0001).map((c) => c.name)),
    [clips]
  );
  const imageClips = useMemo(() => clips.filter((c) => !c.gap), [clips]);
  const imageCount = imageClips.length;
  const gapCount = clips.length - imageCount;
  const activeIndex = active && !active.gap ? imageClips.indexOf(active) + 1 : 0;

  const selectClip = useCallback((name) => {
    setSelectedCut(name);
    setCurrentType(transitionsByName[name] || "cut");
  }, [transitionsByName]);

  const pickType = useCallback((type) => {
    setCurrentType(type);
    if (selectedCut) setTransition(selectedCut, type);
  }, [selectedCut, setTransition]);

  const targetCut = selectedCut || (active && !active.gap ? active.name : null);
  const targetClip = targetCut && clips.find((c) => c.name === targetCut);
  const selectedClip = targetClip;
  const selectedIndex = targetClip ? clips.indexOf(targetClip) : -1;
  const selectedImageNum = targetClip && !targetClip.gap ? imageClips.indexOf(targetClip) + 1 : 0;

  const activeSidebarEffId = (targetCut && effectsByName && effectsByName[targetCut]) || sidebarEffect;
  const activeSidebarEffInt = (targetCut && effectIntensityByName && effectIntensityByName[targetCut] != null)
    ? effectIntensityByName[targetCut]
    : (EFFECTS[activeSidebarEffId] ? EFFECTS[activeSidebarEffId].defaultIntensity : sidebarIntensity);

  const onPickSidebarEffect = useCallback((effId) => {
    setSidebarEffect(effId);
    const defInt = (EFFECTS[effId] && EFFECTS[effId].defaultIntensity) || 75;
    setSidebarIntensity(defInt);
    const tgt = selectedCut || (active && !active.gap ? active.name : null);
    if (tgt) {
      if (setEffect) setEffect(tgt, effId);
      if (setEffectIntensity) setEffectIntensity(tgt, defInt);
    }
  }, [selectedCut, active, setEffect, setEffectIntensity]);

  const onSidebarIntensityChange = useCallback((val) => {
    setSidebarIntensity(val);
    const tgt = selectedCut || (active && !active.gap ? active.name : null);
    if (tgt && setEffectIntensity) {
      setEffectIntensity(tgt, val);
    }
    if (drawRef.current) drawRef.current(timeRef.current);
  }, [selectedCut, active, setEffectIntensity]);

  const onApplyEffectAllClips = useCallback(() => {
    const tgt = selectedCut || (active && !active.gap ? active.name : null);
    const curEff = (tgt && effectsByName && effectsByName[tgt]) || sidebarEffect;
    const curInt = (tgt && effectIntensityByName && effectIntensityByName[tgt] != null)
      ? effectIntensityByName[tgt]
      : sidebarIntensity;
    if (applyEffectAll) applyEffectAll(curEff, curInt);
    if (drawRef.current) drawRef.current(timeRef.current);
  }, [selectedCut, active, effectsByName, effectIntensityByName, sidebarEffect, sidebarIntensity, applyEffectAll]);

  const onRandomMixEffects = useCallback(() => {
    const nonNone = Object.keys(EFFECTS).filter((k) => k !== "none");
    if (!nonNone.length) return;
    clips.forEach((c) => {
      if (c.gap) return;
      const picked = nonNone[Math.floor(Math.random() * nonNone.length)];
      const defInt = (EFFECTS[picked] && EFFECTS[picked].defaultIntensity) || 70;
      if (setEffect) setEffect(c.name, picked);
      if (setEffectIntensity) setEffectIntensity(c.name, defInt);
    });
  }, [clips, setEffect, setEffectIntensity]);

  const onClearAllEffects = useCallback(() => {
    if (applyEffectAll) applyEffectAll("none", 100);
    setSidebarEffect("none");
  }, [applyEffectAll]);

  return (
    <section className="editor">
      <div className="main">
        <div className="viewer">
          <div className="viewer__frame" ref={viewerFrameRef}>
            <canvas ref={canvasRef} width={dims.width} height={dims.height} className="viewer__canvas" />
            <button
              type="button"
              className="viewer__fs-corner"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen (F / Esc)" : "Fullscreen Cinema Preview (F)"}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? "✕" : "⛶"}
            </button>
          </div>

          {/* Player Controls Bar — positioned below canvas so it never obstructs subtitles */}
          <div className="hud-dock hud-dock--docked">
            <div className="hud-time">
              <span>{tc(time)}</span>
              <span className="hud-time__sep">/</span>
              <span className="hud-time__total">{tc(exportDuration)}</span>
            </div>
            <div className="hud-controls">
              <button
                type="button"
                className="hud-step"
                onClick={() => seek(Math.max(0, time - 1))}
                title="Step back 1s (Left Arrow)"
                aria-label="Step back"
              >⏮</button>
              <button
                type="button"
                className={`hud-play ${playing ? "is-playing" : ""}`}
                onClick={toggle}
                aria-label={playing ? "Pause" : "Play"}
                title={playing ? "Pause (Space)" : "Play (Space)"}
              >
                {playing ? "❚❚" : "►"}
              </button>
              <button
                type="button"
                className="hud-step"
                onClick={() => seek(Math.min(exportDuration, time + 1))}
                title="Step forward 1s (Right Arrow)"
                aria-label="Step forward"
              >⏭</button>
            </div>
            <div className="hud-extra">
              <button
                type="button"
                className="hud-step"
                onClick={undo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >↺</button>
              <button
                type="button"
                className="hud-step"
                onClick={redo}
                disabled={!canRedo}
                title="Redo (Ctrl+Shift+Z)"
                aria-label="Redo"
              >↻</button>
              <button
                type="button"
                className={`hud-step ${isFullscreen ? "is-active" : ""}`}
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen (F / Esc)" : "Fullscreen Cinema Preview (F)"}
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? "🗗" : "⛶"}
              </button>
              {active && (
                <span className="hud-badge" title={active.name}>
                  {active.gap ? "Empty" : `Clip ${activeIndex}/${imageCount}`}
                </span>
              )}
            </div>
          </div>

          <audio ref={audioRef} src={audioUrl} hidden />
          <audio ref={bgmAudioRef} src={bgmUrl || undefined} loop hidden />
        </div>

        {(() => {
          const shown = warnings.filter((w) => !dismissedWarn.has(w));
          if (!shown.length) return null;
          return (
            <div className="notes notes--compact">
              {shown.map((w, i) => (
                <div className="note note--dismissable" key={i}>
                  <span>{w}</span>
                  <button className="note__x" onClick={() => setDismissedWarn((p) => new Set([...p, w]))}>✕</button>
                </div>
              ))}
              <button className="notes__clear" onClick={() => setDismissedWarn((p) => new Set([...p, ...shown]))}>Clear warnings</button>
            </div>
          );
        })()}

        <Timeline
          clips={clips}
          imageEls={imageEls}
          duration={duration}
          time={time}
          peaks={peaks}
          activeName={active && active.name}
          badClips={badClips}
          transitionsByName={transitionsByName}
          motionByName={motionByName}
          selectedName={selectedCut}
          onSelect={selectClip}
          onSeek={seek}
          onScrubStart={onScrubStart}
          onScrubEnd={onScrubEnd}
          onOpen={openInspect}
          onAdd={askAdd}
          onResizeBoundary={resizeBoundary}
          trimEnd={trimEnd}
          onTrimChange={setTrimEnd}
          videoInfoByName={videoInfoByName}
          fitByName={fitByName}
          effectsByName={effectsByName}
          bgmName={bgmFile ? bgmFile.name : null}
          bgmVolume={bgmVolume}
          bgmDucking={bgmDucking}
          onAddBgm={() => bgmInputRef.current && bgmInputRef.current.click()}
          onRemoveBgm={() => setBgmFile && setBgmFile(null)}
        />
      </div>

      <aside className="side">
        <div className="side__tabs-dock">
          <div className="side__tabs-grid">
            <button
              type="button"
              className={`sidetab ${sidebarTab === "effects" ? "is-active" : ""}`}
              onClick={() => setSidebarTab("effects")}
              title="Visual Effects"
            >
              <span className="sidetab__icon">✨</span>
              <span className="sidetab__text">Effects</span>
            </button>
            <button
              type="button"
              className={`sidetab ${sidebarTab === "transitions" ? "is-active" : ""}`}
              onClick={() => setSidebarTab("transitions")}
              title="Transitions"
            >
              <span className="sidetab__icon">🔀</span>
              <span className="sidetab__text">Transitions</span>
            </button>
            <button
              type="button"
              className={`sidetab ${sidebarTab === "motion" ? "is-active" : ""}`}
              onClick={() => setSidebarTab("motion")}
              title="Motion & Zoom"
            >
              <span className="sidetab__icon">⤢</span>
              <span className="sidetab__text">Motion</span>
            </button>
            <button
              type="button"
              className={`sidetab ${sidebarTab === "captions" ? "is-active" : ""}`}
              onClick={() => setSidebarTab("captions")}
              title="Captions & Subtitles"
            >
              <span className="sidetab__icon">💬</span>
              <span className="sidetab__text">Captions</span>
            </button>
            <button
              type="button"
              className={`sidetab ${sidebarTab === "audio" ? "is-active" : ""}`}
              onClick={() => setSidebarTab("audio")}
              title="Audio & Sound Effects"
            >
              <span className="sidetab__icon">🎵</span>
              <span className="sidetab__text">Audio</span>
            </button>
            <button
              type="button"
              className={`sidetab ${sidebarTab === "watermark" ? "is-active" : ""}`}
              onClick={() => setSidebarTab("watermark")}
              title="Brand Logo & Watermark"
            >
              <span className="sidetab__icon">🏷️</span>
              <span className="sidetab__text">Brand</span>
            </button>
            <button
              type="button"
              className={`sidetab ${sidebarTab === "export" ? "is-active" : ""}`}
              onClick={() => setSidebarTab("export")}
              title="Export & Render"
            >
              <span className="sidetab__icon">🚀</span>
              <span className="sidetab__text">Export</span>
            </button>
            <button
              type="button"
              className={`sidetab ${sidebarTab === "all" ? "is-active" : ""}`}
              onClick={() => setSidebarTab("all")}
              title="Show All Panels"
            >
              <span className="sidetab__icon">📑</span>
              <span className="sidetab__text">All</span>
            </button>
          </div>
        </div>

        {(sidebarTab === "export" || sidebarTab === "all") && (
          <div className="panel export">
            <div className="effects__titlerow" style={{ marginBottom: 10 }}>
              <span className="panel__h">Export</span>
              <span className="effects__target-pill">MP4 · H.264</span>
            </div>

            {/* 1-Tap Platform Preset Cards */}
            <div className="mini-h">1-Tap Platform Presets</div>
            <div className="export-preset-grid">
              <button
                type="button"
                className={`export-preset-card ${aspect === "9:16" && fps === 30 && renderQuality === "full" ? "is-active" : ""}`}
                onClick={() => {
                  setAspect("9:16");
                  setFps(30);
                  if (setRenderQuality) setRenderQuality("full");
                }}
              >
                <div className="export-preset-card__top">
                  <span className="export-preset-card__icon">📱</span>
                  <span className="export-preset-card__tag">9:16 VERTICAL</span>
                </div>
                <div className="export-preset-card__title">Shorts / Reels</div>
                <div className="export-preset-card__desc">1080×1920 · 30fps · Full HD</div>
              </button>

              <button
                type="button"
                className={`export-preset-card ${aspect === "16:9" && fps === 30 && renderQuality === "full" ? "is-active" : ""}`}
                onClick={() => {
                  setAspect("16:9");
                  setFps(30);
                  if (setRenderQuality) setRenderQuality("full");
                }}
              >
                <div className="export-preset-card__top">
                  <span className="export-preset-card__icon">🎬</span>
                  <span className="export-preset-card__tag">16:9 WIDE</span>
                </div>
                <div className="export-preset-card__title">YouTube Cinema</div>
                <div className="export-preset-card__desc">1920×1080 · 30fps · Standard</div>
              </button>

              <button
                type="button"
                className={`export-preset-card ${renderQuality === "720p" ? "is-active" : ""}`}
                onClick={() => {
                  if (setRenderQuality) setRenderQuality("720p");
                  setFps(24);
                }}
              >
                <div className="export-preset-card__top">
                  <span className="export-preset-card__icon">⚡</span>
                  <span className="export-preset-card__tag">DRAFT 720p</span>
                </div>
                <div className="export-preset-card__title">Fast Preview</div>
                <div className="export-preset-card__desc">3× Faster Export · 24fps</div>
              </button>
            </div>

            <div className="mini-h" style={{ marginTop: 12 }}>Fine-tune Settings</div>
            <div className="ctrl-row">
              <label className="ctrl">
                <span className="ctrl__label">Aspect</span>
                <span className="selectwrap">
                  <select value={aspect} onChange={(e) => setAspect(e.target.value)}>
                    <option value="16:9">16:9 — 1920×1080</option>
                    <option value="9:16">9:16 — 1080×1920</option>
                    <option value="auto">Auto — match</option>
                  </select>
                </span>
              </label>
              <label className="ctrl">
                <span className="ctrl__label">FPS</span>
                <span className="selectwrap">
                  <select value={fps} onChange={(e) => setFps(+e.target.value)}>
                    <option value={24}>24 fps</option>
                    <option value={30}>30 fps</option>
                  </select>
                </span>
              </label>
              <label className="ctrl">
                <span className="ctrl__label">Quality</span>
                <span className="selectwrap">
                  <select value={renderQuality} onChange={(e) => setRenderQuality && setRenderQuality(e.target.value)}>
                    <option value="full">Full — {dims.width}×{dims.height}</option>
                    <option value="720p">720p — faster</option>
                  </select>
                </span>
              </label>
            </div>

            <dl className="specs">
              <div className="spec"><dt>Resolution</dt><dd>{(renderDims || dims).width}×{(renderDims || dims).height}{renderQuality === "720p" ? " · faster" : ""}</dd></div>
              <div className="spec"><dt>Images / Cuts</dt><dd>{imageCount} clips</dd></div>
              <div className="spec spec--length">
                <dt>Runtime</dt>
                <dd>
                  {tc(exportDuration)}
                  {exportDuration < duration && (
                    <span className="spec__trim">trimmed from {tc(duration)}</span>
                  )}
                </dd>
              </div>
            </dl>

            {gapCount > 0 && (
              <div className="note note--gap">
                {gapCount} empty {gapCount === 1 ? "gap" : "gaps"} render black — fill with the <b>+</b>.
              </div>
            )}

            {!(busy || wcBusy) ? (
              (wcAvailable || serverAvailable) ? (
                <div style={{ marginTop: 12 }}>
                  <button
                    className="render"
                    onClick={wcAvailable ? onWebCodecsTest : onRender}
                  >
                    🚀 Render &amp; Export MP4
                  </button>
                  <div style={{ fontSize: "11px", color: "#10b981", textAlign: "center", marginTop: "5px", fontWeight: "600", letterSpacing: "0.02em" }}>
                    ● v2.1 WebCodecs Engine (Anti-Freeze Active)
                  </div>
                </div>
              ) : (
                <div className="note">Rendering needs Chrome, Edge, or Safari 16.4+ (WebCodecs) in this browser.</div>
              )
            ) : (
              <>
                <button className="render render--busy" disabled>
                  {wcBusy ? (wcPhase || `Rendering… ${Math.round(wcProgress * 100)}%`) : `Rendering… ${Math.round(progress * 100)}%`}
                </button>
                <div className="progress"><i style={{ width: `${Math.round((wcBusy ? wcProgress : progress) * 100)}%` }} /></div>
                <div className="render-meta">
                  <span>{clock(elapsed)} elapsed</span>
                  {(wcBusy ? wcProgress : progress) > 0.03 && <span>~{clock(elapsed * (1 - (wcBusy ? wcProgress : progress)) / (wcBusy ? wcProgress : progress))} left</span>}
                </div>
                <button className="cancel" onClick={wcBusy ? onWebCodecsCancel : onCancel}>Cancel</button>
              </>
            )}
            {outUrl && (
              <a className="download" href={outUrl} download="story.mp4" style={{ marginTop: 10 }}>
                ↓ Download Final Video (MP4)
              </a>
            )}
            {error && <div className="note note--bad">{error}</div>}
          </div>
        )}

        {(sidebarTab === "effects" || sidebarTab === "all") && (
          <div className="panel effects">
            <div className="effects__head">
              <div className="effects__titlerow">
                <span className="panel__h">Visual Effects</span>
                <span className="effects__target-pill">
                  {targetClip && !targetClip.gap
                    ? `Clip ${selectedImageNum || (selectedIndex + 1)}`
                    : "All Clips"}
                </span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="eff-filter-bar">
              {[
                { id: "all", label: "All", icon: "✨" },
                { id: "popular", label: "Hot", icon: "🔥" },
                { id: "cinematic", label: "Cinema", icon: "🎬" },
                { id: "motion", label: "Motion", icon: "⚡" },
                { id: "mood", label: "Mood", icon: "🌆" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`eff-filter-chip ${effFilter === cat.id ? "is-active" : ""}`}
                  onClick={() => setEffFilter(cat.id)}
                >
                  <span className="eff-filter-chip__icon">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* 2-Column Visual Cards Grid */}
            <div className="effects__grid">
              {Object.values(EFFECTS)
                .filter((eff) => {
                  if (effFilter === "all") return true;
                  if (effFilter === "popular") return ["particles", "glitch", "cinema", "flash", "shake"].includes(eff.id);
                  if (effFilter === "cinematic") return ["cinema", "grain", "vignette", "lensflare", "vintage"].includes(eff.id);
                  if (effFilter === "motion") return ["shake", "flash", "glitch", "pulse", "lightning"].includes(eff.id);
                  if (effFilter === "mood") return ["particles", "sunset", "neon", "noir", "vhs"].includes(eff.id);
                  return true;
                })
                .map((eff) => {
                  const on = activeSidebarEffId === eff.id;
                  const isGold = eff.id === "particles";
                  return (
                    <button
                      key={eff.id}
                      type="button"
                      className={`effcard ${on ? "is-on" : ""} ${isGold ? "effcard--gold" : ""}`}
                      onClick={() => onPickSidebarEffect(eff.id)}
                      title={eff.description}
                    >
                      <div className="effcard__top">
                        <span className="effcard__avatar">{eff.icon}</span>
                        {on ? (
                          <span className="effcard__active-dot">● ON</span>
                        ) : isGold ? (
                          <span className="effcard__tag effcard__tag--gold">POPULAR</span>
                        ) : (
                          <span className="effcard__tag">{eff.category}</span>
                        )}
                      </div>
                      <div className="effcard__body">
                        <span className="effcard__name">{eff.name}</span>
                        <span className="effcard__desc">{eff.description}</span>
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Intensity Card */}
            {activeSidebarEffId !== "none" && (
              <div className="eff-slider-card">
                <div className="eff-slider-card__head">
                  <span className="eff-slider-card__title">Effect Intensity</span>
                  <span className="eff-slider-card__badge">{activeSidebarEffInt}%</span>
                </div>
                <div className="eff-slider-card__track">
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={activeSidebarEffInt}
                    onChange={(e) => onSidebarIntensityChange(+e.target.value)}
                    className="eff-slider-input"
                  />
                </div>
              </div>
            )}

            {/* Studio Action Buttons */}
            <div className="effects__actions">
              <button
                type="button"
                className="effects__btn-all"
                onClick={onApplyEffectAllClips}
                title="Apply this effect to all clips in the project"
              >
                <span>⚡ Apply “{EFFECTS[activeSidebarEffId] ? EFFECTS[activeSidebarEffId].name : activeSidebarEffId}” to All Clips</span>
              </button>
              <div className="effects__actions-sub">
                <button
                  type="button"
                  className="effects__btn-sub"
                  onClick={onRandomMixEffects}
                  title="Randomly apply different CapCut effects across clips"
                >
                  🎲 Random Mix
                </button>
                <button
                  type="button"
                  className="effects__btn-sub effects__btn-sub--clear"
                  onClick={onClearAllEffects}
                  title="Remove visual effects from all clips"
                >
                  ✕ Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {(sidebarTab === "transitions" || sidebarTab === "all") && (
          <div className="panel transitions">
            <div className="transitions__head">
              <div className="transitions__titlerow">
                <span className="panel__h">Transitions</span>
                <button
                  type="button"
                  className={`cap-switch ${mixMode ? "is-on" : ""}`}
                  onClick={() => setMixMode((v) => !v)}
                  aria-pressed={mixMode}
                  title="Randomly apply a set of transitions across all cuts"
                >
                  <span className="cap-switch__box" />
                  Random mix
                </button>
              </div>
              <span className="transitions__target">
                {selectedIndex > 0 && selectedClip
                  ? `Into image ${selectedImageNum || "—"} · ${tc(selectedClip.start)}`
                  : selectedIndex === 0
                    ? "First image — no incoming transition"
                    : "Tap a ◇ cut above on timeline to set transition"}
              </span>
            </div>

            {/* 2-Column Visual Motion Cards Grid */}
            <div className="transitions__grid">
              {TRANSITION_LIST.map((tr) => {
                const on = mixMode ? mixPicks.has(tr.id) : currentType === tr.id;
                const meta = {
                  cut: { tag: "INSTANT", desc: "Hard cut without blend" },
                  fade: { tag: "SMOOTH", desc: "Cinema crossfade dissolve" },
                  fadeblack: { tag: "CINEMA", desc: "Dip to black scene transition" },
                  glitchcut: { tag: "VIRAL", desc: "Cyberpunk RGB chromatic slice" },
                  spinzoom: { tag: "DYNAMIC", desc: "Rotating zoom & push impact" },
                  whippan: { tag: "ACTION", desc: "High-speed directional whip" },
                  circleopen: { tag: "RETRO", desc: "Circular iris reveal" },
                  slideleft: { tag: "MOTION", desc: "Smooth lateral slide left" },
                  slideright: { tag: "MOTION", desc: "Smooth lateral slide right" },
                  wipeleft: { tag: "CLEAN", desc: "Directional wipe left" },
                  wiperight: { tag: "CLEAN", desc: "Directional wipe right" },
                }[tr.id] || { tag: "BLEND", desc: "Scene transition" };

                return (
                  <button
                    key={tr.id}
                    type="button"
                    className={`trcard ${on ? "is-on" : ""}`}
                    onClick={() => (mixMode ? toggleMix(tr.id) : pickType(tr.id))}
                  >
                    <div className="trcard__top">
                      <span className="trcard__icon">{tr.icon}</span>
                      {on ? (
                        <span className="trcard__active-badge">● ACTIVE</span>
                      ) : (
                        <span className="trcard__tag">{meta.tag}</span>
                      )}
                    </div>
                    <div className="trcard__body">
                      <span className="trcard__title">{tr.label}</span>
                      <span className="trcard__desc">{meta.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Transition Speed Presets + Fine-tune */}
            <div className="tr-speed-bar">
              <span className="mini-h" style={{ margin: 0 }}>Duration:</span>
              <div className="tr-speed-chips">
                {[
                  { sec: 0.2, label: "0.2s Fast" },
                  { sec: 0.4, label: "0.4s Cinema" },
                  { sec: 0.8, label: "0.8s Slow" },
                ].map((s) => (
                  <button
                    key={s.sec}
                    type="button"
                    className={`tr-speed-chip ${Math.abs(transitionDuration - s.sec) < 0.05 ? "is-active" : ""}`}
                    onClick={() => setTransitionDuration(s.sec)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="trdur" style={{ marginTop: 6 }}>
              <span>Fine-tune</span>
              <input
                type="range" min={MIN_TRANSITION_DURATION} max={MAX_TRANSITION_DURATION} step={0.05}
                value={transitionDuration}
                onChange={(e) => setTransitionDuration(+e.target.value)}
              />
              <span className="trdur__val">{transitionDuration.toFixed(2)}s</span>
            </label>

            {!mixMode ? (
              <button
                type="button" className="effects__btn-all" style={{ marginTop: 10 }}
                onClick={() => applyTransitionAll(currentType, clips.map((c) => c.name))}
              >
                <span>⚡ Apply “{transitionOf(currentType).label}” to All Cuts</span>
              </button>
            ) : (
              <div className="trmix-foot">
                <span className="trmix-count">
                  {mixPicks.size ? `Picked ${mixPicks.size} styles` : "None picked"}
                </span>
                <button
                  type="button" className="trall trmix-apply"
                  disabled={mixPicks.size === 0}
                  onClick={() => applyTransitionMix([...mixPicks], clips.map((c) => c.name))}
                >
                  Apply Random Mix to Video
                </button>
              </div>
            )}

            <div className="mini-h" style={{ marginTop: 14 }}>Auto Transition SFX</div>
            <div className="cap-bar">
              <button
                type="button"
                className={`cap-switch ${transitionSfx ? "is-on" : ""}`}
                onClick={() => setTransitionSfx && setTransitionSfx(!transitionSfx)}
                aria-pressed={transitionSfx}
              >
                <span className="cap-switch__box" />
                {transitionSfx ? "On" : "Off"}
              </button>
              <span className="cap-meta">
                🎵 Popular sound effects on scene transitions
              </span>
            </div>
            {transitionSfx && (
              <>
                <div className="mini-h" style={{ marginTop: 10 }}>Trigger Mode</div>
                <div className="seg">
                  {[
                    ["smart", "🧠 Smart Impact (Only Effects)"],
                    ["all", "🔀 All Cuts"],
                  ].map(([mId, mLbl]) => (
                    <button
                      key={mId}
                      type="button"
                      className={(transitionSfxMode || "smart") === mId ? "is-on" : ""}
                      onClick={() => setTransitionSfxMode && setTransitionSfxMode(mId)}
                    >
                      {mLbl}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "var(--muted)", margin: "4px 0 8px" }}>
                  {(transitionSfxMode || "smart") === "smart"
                    ? "Normal image cuts remain silent. Plays impactful SFX on Action Effects (Shake/Pulse/Glitch) & Transitions."
                    : "Plays selected sound on every scene cut."}
                </p>

                <div className="mini-h" style={{ marginTop: 10 }}>Sound Style</div>
                <div className="sfx-chips">
                  {TRANSITION_SFX_LIST.map((sfx) => (
                    <button
                      key={sfx.id}
                      type="button"
                      className={`sfxchip ${transitionSfxType === sfx.id ? "is-on" : ""}`}
                      onClick={() => {
                        if (setTransitionSfxType) setTransitionSfxType(sfx.id);
                        const actx = getAudioCtx();
                        if (actx) playSfx(actx, sfx.id, transitionSfxVol);
                      }}
                      title={`${sfx.label} (${sfx.desc})`}
                    >
                      <span className="sfxchip__icon">{sfx.icon}</span>
                      <span className="sfxchip__label">{sfx.label}</span>
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <button
                    type="button"
                    className="cap-replace"
                    style={{ margin: 0, padding: "4px 10px", fontSize: 11.5 }}
                    onClick={() => {
                      const actx = getAudioCtx();
                      if (actx) playSfx(actx, transitionSfxType || "whoosh", transitionSfxVol);
                    }}
                  >
                    ▶ Test Sound
                  </button>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    {(TRANSITION_SFX_LIST.find((s) => s.id === transitionSfxType) || {}).desc || ""}
                  </span>
                </div>

                <label className="trdur" style={{ marginTop: 8 }}>
                  <span>SFX Volume</span>
                  <input
                    type="range" min={0.05} max={1} step={0.05}
                    value={transitionSfxVol}
                    onChange={(e) => setTransitionSfxVol && setTransitionSfxVol(+e.target.value)}
                  />
                  <span className="trdur__val">{Math.round(transitionSfxVol * 100)}%</span>
                </label>
              </>
            )}
          </div>
        )}

        {(sidebarTab === "motion" || sidebarTab === "all") && (
          <div className="panel motion-panel">
            <div className="effects__titlerow" style={{ marginBottom: 10 }}>
              <span className="panel__h">Motion &amp; Zoom</span>
              <span className="effects__target-pill">Dynamic Camera</span>
            </div>

            <div className="mini-h">Camera Direction (Apply to All Clips)</div>
            <div className="motion-grid">
              {[
                { id: "zoomin", name: "Push In", icon: "🔍", tag: "FOCUS", desc: "Smooth camera push in", action: () => applyMotionAll("zoomin", imageClips.map((c) => c.name)) },
                { id: "zoomout", name: "Pull Out", icon: "🔭", tag: "REVEAL", desc: "Expansive camera pull back", action: () => applyMotionAll("zoomout", imageClips.map((c) => c.name)) },
                { id: "alternate", name: "Alternate", icon: "🔀", tag: "CINEMA", desc: "Alternates in & out", action: () => applyMotionAlternate(imageClips.map((c) => c.name)) },
                { id: "none", name: "Static", icon: "⏸", tag: "LOCKED", desc: "Fixed frame without motion", action: () => applyMotionAll("none", imageClips.map((c) => c.name)) },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="motion-card"
                  onClick={m.action}
                >
                  <div className="motion-card__top">
                    <span className="motion-card__icon">{m.icon}</span>
                    <span className="motion-card__tag">{m.tag}</span>
                  </div>
                  <div className="motion-card__title">{m.name}</div>
                  <div className="motion-card__desc">{m.desc}</div>
                </button>
              ))}
            </div>

            {/* Zoom Depth Card */}
            <div className="eff-slider-card" style={{ marginTop: 12 }}>
              <div className="eff-slider-card__head">
                <span className="eff-slider-card__title">Zoom Depth</span>
                <span className="eff-slider-card__badge">{Math.round(motionAmount * 100)}%</span>
              </div>
              <div className="tr-speed-chips" style={{ marginBottom: 8 }}>
                {[
                  { pct: 0.05, label: "5% Subtle" },
                  { pct: 0.10, label: "10% Cinema" },
                  { pct: 0.18, label: "18% Dramatic" },
                ].map((p) => (
                  <button
                    key={p.pct}
                    type="button"
                    className={`tr-speed-chip ${Math.abs(motionAmount - p.pct) < 0.02 ? "is-active" : ""}`}
                    onClick={() => setMotionAmount(p.pct)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                type="range" min={0.02} max={0.2} step={0.01}
                value={motionAmount}
                onChange={(e) => setMotionAmount(+e.target.value)}
                className="eff-slider-input"
              />
            </div>

            {/* Scene Fades Dual Cards */}
            <div className="mini-h" style={{ marginTop: 14 }}>Scene Fades (Video &amp; Audio Dissolve)</div>
            <div className="fades-grid">
              <div className="fade-card">
                <div className="fade-card__head">
                  <span className="fade-card__title">Intro Fade-In</span>
                  <span className="fade-card__badge">{fadeIn > 0 ? `${fadeIn.toFixed(1)}s` : "Off"}</span>
                </div>
                <div className="tr-speed-chips" style={{ marginBottom: 6 }}>
                  {[0, 0.5, 1.0].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      className={`tr-speed-chip ${Math.abs(fadeIn - sec) < 0.1 ? "is-active" : ""}`}
                      onClick={() => setFadeIn(sec)}
                    >
                      {sec === 0 ? "Off" : `${sec}s`}
                    </button>
                  ))}
                </div>
                <input
                  type="range" min={0} max={2} step={0.1}
                  value={fadeIn} onChange={(e) => setFadeIn(+e.target.value)}
                  className="eff-slider-input"
                />
              </div>

              <div className="fade-card">
                <div className="fade-card__head">
                  <span className="fade-card__title">Outro Fade-Out</span>
                  <span className="fade-card__badge">{fadeOut > 0 ? `${fadeOut.toFixed(1)}s` : "Off"}</span>
                </div>
                <div className="tr-speed-chips" style={{ marginBottom: 6 }}>
                  {[0, 0.5, 1.0].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      className={`tr-speed-chip ${Math.abs(fadeOut - sec) < 0.1 ? "is-active" : ""}`}
                      onClick={() => setFadeOut(sec)}
                    >
                      {sec === 0 ? "Off" : `${sec}s`}
                    </button>
                  ))}
                </div>
                <input
                  type="range" min={0} max={2} step={0.1}
                  value={fadeOut} onChange={(e) => setFadeOut(+e.target.value)}
                  className="eff-slider-input"
                />
              </div>
            </div>
          </div>
        )}

        {(sidebarTab === "captions" || sidebarTab === "all") && (
          <div className="panel captions">
            <div className="effects__titlerow" style={{ marginBottom: 10 }}>
              <span className="panel__h">Captions</span>
              <span className="effects__target-pill">Burn-in Sync</span>
            </div>
            {!(captionCues && captionCues.length) ? (
              <div className="cap-empty">
                <button type="button" className="cap-upload" onClick={() => capInputRef.current && capInputRef.current.click()}>
                  <span className="cap-upload__i">⤒</span> Upload timestamped script
                </button>
                <p className="cap-hint">
                  An <code>.srt</code>, <code>.vtt</code>, or timestamped <code>.txt</code> — inline
                  markers like <code>(0:03)</code>, NoteGPT ranges, or <code>[0:03]</code> lines all
                  work. Captions sync to the audio and burn into the MP4.
                </p>
                {captionError && <div className="note note--bad">{captionError}</div>}
              </div>
            ) : (
              <>
                <div className="cap-bar">
                  <button
                    type="button"
                    className={`cap-switch ${captionsOn ? "is-on" : ""}`}
                    onClick={() => setCaptionsOn(!captionsOn)}
                    aria-pressed={captionsOn}
                  >
                    <span className="cap-switch__box" />
                    {captionsOn ? "On" : "Off"}
                  </button>
                  <span className="cap-meta">
                    <span className="cap-meta__name">{captionName || "captions"}</span>
                    {captionCues.length} lines ·{" "}
                    <button type="button" className="cap-replace" onClick={() => capInputRef.current && capInputRef.current.click()}>replace</button> ·{" "}
                    <button
                      type="button"
                      className="cap-replace"
                      style={{ color: "#fbbf24", fontWeight: 700 }}
                      onClick={() => setIsEditingCaptions((v) => !v)}
                    >
                      {isEditingCaptions ? "✕ close editor" : "✏️ edit lines"}
                    </button>
                  </span>
                </div>

                {isEditingCaptions && (
                  <div className="cap-editor">
                    <div className="cap-editor__header">
                      <span className="mini-h" style={{ margin: 0, color: "#fbbf24" }}>Subtitle Line Editor ({captionCues.length} lines)</span>
                      <button type="button" className="cap-replace" onClick={() => setIsEditingCaptions(false)}>Done</button>
                    </div>
                    <div className="cap-editor__list">
                      {captionCues.map((cue, idx) => (
                        <div key={idx} className="cap-editor__row">
                          <span className="cap-editor__time">{fmtCueTime(cue.start)} - {fmtCueTime(cue.end)}</span>
                          <input
                            type="text"
                            className="cap-editor__input"
                            value={cue.text}
                            onChange={(e) => {
                              const newText = e.target.value;
                              if (setCaptionCues) {
                                setCaptionCues((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], text: newText };
                                  return next;
                                });
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="cap-body" aria-disabled={!captionsOn}>
                  <div className="mini-h">Subtitle Style (Viral Preset Gallery)</div>
                  <div className="cap-style-grid">
                    {CAPTION_STYLE_LIST.map((st) => {
                      const on = captionStyle === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          className={`cap-style-card ${on ? "is-active" : ""}`}
                          onClick={() => setCaptionStyle(st.id)}
                        >
                          <div className="cap-style-card__preview">
                            {st.id === "mrbeast" && <span style={{ color: "#ffea00", textShadow: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000", fontWeight: 900, fontSize: "11px", letterSpacing: "0.05em" }}>MRBEAST</span>}
                            {st.id === "hormozi" && <span style={{ color: "#ccff00", textShadow: "1px 1px 0 #000", fontWeight: 900, fontSize: "11px" }}>HORMOZI</span>}
                            {st.id === "vox" && <span style={{ background: "#000", color: "#ffea00", padding: "1px 5px", borderRadius: 3, fontWeight: 800, fontSize: "10px" }}>VOX TAG</span>}
                            {st.id === "karaoke" && <span style={{ color: "#fbbf24", textShadow: "0 0 8px rgba(251,191,36,0.9)", fontWeight: 800, fontSize: "11px" }}>KARAOKE</span>}
                            {st.id === "cyberpunk" && <span style={{ color: "#00f2fe", textShadow: "0 0 8px #00f2fe", fontWeight: 800, fontSize: "11px" }}>CYBER</span>}
                            {st.id === "neon" && <span style={{ color: "#22c55e", textShadow: "0 0 8px #22c55e", fontWeight: 800, fontSize: "11px" }}>NEON</span>}
                            {st.id === "netflix" && <span style={{ background: "rgba(15,18,24,0.85)", color: "#fff", padding: "1px 5px", borderRadius: 3, fontWeight: 600, fontSize: "10px" }}>CINEMA</span>}
                            {st.id === "gadzhi" && <span style={{ color: "#f59e0b", fontStyle: "italic", fontWeight: 800, fontSize: "11px" }}>LUXURY</span>}
                            {st.id === "abdaal" && <span style={{ background: "rgba(15,23,42,0.85)", color: "#38bdf8", padding: "1px 5px", borderRadius: 3, fontWeight: 600, fontSize: "10px" }}>ABDAAL</span>}
                            {st.id === "comic" && <span style={{ color: "#ff2d55", textShadow: "1px 1px 0 #000", fontWeight: 900, fontSize: "11px" }}>COMIC!</span>}
                            {st.id === "yellow" && <span style={{ color: "#ffea00", textShadow: "1px 1px 0 #000", fontWeight: 700, fontSize: "11px" }}>YELLOW</span>}
                            {st.id === "boxed" && <span style={{ background: "rgba(0,0,0,0.7)", color: "#fff", padding: "1px 4px", borderRadius: 3, fontSize: "10px" }}>BOXED</span>}
                            {st.id === "fire" && <span style={{ color: "#ff3b30", textShadow: "0 0 8px #ff3b30", fontWeight: 800, fontSize: "11px" }}>FIRE</span>}
                            {st.id === "classic" && <span style={{ color: "#fff", textShadow: "1px 1px 0 #000", fontWeight: 700, fontSize: "11px" }}>CLASSIC</span>}
                          </div>
                          <span className="cap-style-card__name">{st.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mini-h" style={{ marginTop: 12 }}>Font Family (Viral Creator Fonts)</div>
                  <select
                    className="font-picker-select"
                    value={captionFont}
                    onChange={(e) => {
                      if (setCaptionFont) setCaptionFont(e.target.value);
                      if (drawRef.current) drawRef.current(timeRef.current);
                    }}
                  >
                    {POPULAR_FONTS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label} — [{f.creator}]
                      </option>
                    ))}
                  </select>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span className="font-preview-chip">
                      ✨ Font: {POPULAR_FONTS.find((f) => f.id === captionFont)?.label || "Default"}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-dim)" }}>🇮🇳 Hindi Auto Support</span>
                  </div>

                  <div className="mini-h" style={{ marginTop: 12 }}>Vertical Position</div>
                  <div className="seg">
                    {[
                      ["bottom", "Bottom"],
                      ["lower", "Lower ⅓"],
                      ["middle", "Middle"],
                      ["top", "Top"],
                    ].map(([pId, pLbl]) => (
                      <button
                        key={pId}
                        type="button"
                        className={captionPos === pId ? "is-on" : ""}
                        onClick={() => setCaptionPos && setCaptionPos(pId)}
                      >
                        {pLbl}
                      </button>
                    ))}
                  </div>

                  <div className="mini-h" style={{ marginTop: 12 }}>Size</div>
                  <div className="seg">
                    {[["sm", "Small"], ["md", "Medium"], ["lg", "Large"]].map(([id, lbl]) => (
                      <button
                        key={id}
                        type="button"
                        className={captionFontScale == null && captionSize === id ? "is-on" : ""}
                        onClick={() => { setCaptionSize(id); setCaptionFontScale && setCaptionFontScale(null); }}
                      >{lbl}</button>
                    ))}
                  </div>

                  <div className="mini-h" style={{ marginTop: 12 }}>Font size (fine-tune)</div>
                  <label className="trdur">
                    <input
                      type="range" min={0.03} max={0.10} step={0.002}
                      value={captionFontScale != null ? captionFontScale : (CAPTION_SIZES[captionSize] || CAPTION_SIZES.md)}
                      onChange={(e) => setCaptionFontScale && setCaptionFontScale(+e.target.value)}
                    />
                    <span className="trdur__val">
                      {Math.round((captionFontScale != null ? captionFontScale : (CAPTION_SIZES[captionSize] || CAPTION_SIZES.md)) * 1000) / 10}%
                    </span>
                  </label>
                  {captionFontScale != null && (
                    <button type="button" className="cap-replace" onClick={() => setCaptionFontScale && setCaptionFontScale(null)}>
                      reset to preset
                    </button>
                  )}

                  <div className="mini-h" style={{ marginTop: 12 }}>Line spacing (2-line captions)</div>
                  <label className="trdur">
                    <input
                      type="range" min={1.0} max={2.2} step={0.05}
                      value={captionLineHeight != null ? captionLineHeight : captionLineHeightDefault(captionStyle)}
                      onChange={(e) => setCaptionLineHeight && setCaptionLineHeight(+e.target.value)}
                    />
                    <span className="trdur__val">
                      {(captionLineHeight != null ? captionLineHeight : captionLineHeightDefault(captionStyle)).toFixed(2)}×
                    </span>
                  </label>
                  {captionLineHeight != null && (
                    <button type="button" className="cap-replace" onClick={() => setCaptionLineHeight && setCaptionLineHeight(null)}>
                      reset to default
                    </button>
                  )}
                </div>
                {captionError && <div className="note note--bad">{captionError}</div>}
              </>
            )}
          </div>
        )}

        {(sidebarTab === "audio" || sidebarTab === "all") && (
          <div className="panel audio-panel">
            <div className="effects__titlerow" style={{ marginBottom: 10 }}>
              <span className="panel__h">Audio &amp; Music</span>
              <span className="effects__target-pill">A2 Stereo 44.1k</span>
            </div>

            {/* Studio Equalizer Spectrum Visualizer */}
            <div className="audio-eq-card">
              <div className="audio-eq-head">
                <span className="audio-eq-title">Master Audio Spectrum</span>
                <span className="audio-eq-badge">{bgmFile ? "TRACK ACTIVE" : "VOICEOVER SYNC"}</span>
              </div>
              <div className="audio-eq-bars">
                {[12, 28, 45, 68, 85, 92, 70, 54, 82, 95, 64, 40, 22, 14].map((h, i) => (
                  <div
                    key={i}
                    className="audio-eq-bar"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${(i * 0.08).toFixed(2)}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {!bgmFile ? (
              <div className="cap-empty" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="cap-upload"
                  onClick={() => bgmInputRef.current && bgmInputRef.current.click()}
                >
                  <span className="cap-upload__i">🎵</span> Upload Background Music
                </button>
                <p className="cap-hint">
                  Add an MP3 or WAV to play softly behind your voiceover. When auto-ducking is turned on, the music drops automatically during narration.
                </p>
              </div>
            ) : (
              <>
                <div className="cap-bar" style={{ marginTop: 12 }}>
                  <span className="cap-meta" style={{ flex: 1 }}>
                    <strong style={{ color: "#fff", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {bgmFile.name}
                    </strong>
                    <span>A2 Stereo · Background Score</span>
                  </span>
                  <button
                    type="button"
                    className="cap-replace"
                    onClick={() => bgmInputRef.current && bgmInputRef.current.click()}
                    style={{ marginRight: 8 }}
                  >
                    replace
                  </button>
                  <button
                    type="button"
                    className="cap-replace"
                    style={{ color: "#ef4444" }}
                    onClick={() => setBgmFile && setBgmFile(null)}
                  >
                    remove
                  </button>
                </div>

                <div className="mini-h" style={{ marginTop: 14 }}>Music Volume Level</div>
                <label className="trdur">
                  <input
                    type="range" min={0.05} max={1} step={0.05}
                    value={bgmVolume}
                    onChange={(e) => setBgmVolume && setBgmVolume(+e.target.value)}
                  />
                  <span className="trdur__val">{Math.round(bgmVolume * 100)}%</span>
                </label>

                <div className="mini-h" style={{ marginTop: 14 }}>Intelligent Auto-Ducking</div>
                <div className="ducking-presets-grid">
                  <button
                    type="button"
                    className={`ducking-card ${bgmDucking ? "is-active" : ""}`}
                    onClick={() => setBgmDucking && setBgmDucking(true)}
                  >
                    <div className="ducking-card__top">
                      <span>🎙️</span>
                      <span className="ducking-card__tag">RECOMMENDED</span>
                    </div>
                    <div className="ducking-card__title">Voiceover Priority</div>
                    <div className="ducking-card__desc">Drops 85% during speech</div>
                  </button>

                  <button
                    type="button"
                    className={`ducking-card ${!bgmDucking ? "is-active" : ""}`}
                    onClick={() => setBgmDucking && setBgmDucking(false)}
                  >
                    <div className="ducking-card__top">
                      <span>🔊</span>
                      <span className="ducking-card__tag">FULL</span>
                    </div>
                    <div className="ducking-card__title">Constant Volume</div>
                    <div className="ducking-card__desc">Music plays steady throughout</div>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {(sidebarTab === "watermark" || sidebarTab === "all") && (
          <div className="panel watermark-panel">
            <div className="effects__titlerow" style={{ marginBottom: 10 }}>
              <span className="panel__h">Brand &amp; Logo</span>
              <span className="effects__target-pill">Copyright Protection</span>
            </div>
            <div className="mini-h">Overlay logo, creator handle (@name), and watermark protection.</div>

            {/* 1. Logo Image Section */}
            <div className="mini-h" style={{ marginTop: 12 }}>Logo Asset</div>
            {!watermarkFile ? (
              <div className="cap-empty" style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className="cap-upload"
                  onClick={() => watermarkInputRef.current && watermarkInputRef.current.click()}
                >
                  <span className="cap-upload__i">🏷️</span> Upload Logo Image
                </button>
                <p className="cap-hint">
                  Upload a transparent PNG or JPG logo. You can also use a pure Text Handle below without an image.
                </p>
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>
                <div className="cap-bar">
                  <span className="cap-meta" style={{ flex: 1 }}>
                    <strong style={{ color: "#fff", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {watermarkFile.name}
                    </strong>
                    <span>Logo Graphic</span>
                  </span>
                  <button
                    type="button"
                    className="cap-replace"
                    onClick={() => watermarkInputRef.current && watermarkInputRef.current.click()}
                    style={{ marginRight: 8 }}
                  >
                    replace
                  </button>
                  <button
                    type="button"
                    className="cap-replace"
                    style={{ color: "#ef4444" }}
                    onClick={() => {
                      if (setWatermarkFile) setWatermarkFile(null);
                      if (drawRef.current) drawRef.current(timeRef.current);
                    }}
                  >
                    remove
                  </button>
                </div>

                {/* Circle Avatar Crop Toggle */}
                <button
                  type="button"
                  className={`wm-toggle-btn ${watermarkIsCircle ? "is-active" : ""}`}
                  onClick={() => {
                    if (setWatermarkIsCircle) setWatermarkIsCircle(!watermarkIsCircle);
                    if (drawRef.current) drawRef.current(timeRef.current);
                  }}
                >
                  <span>⭕ Circle Avatar Crop &amp; Border</span>
                  <span className="wm-toggle-badge">{watermarkIsCircle ? "ON" : "OFF"}</span>
                </button>
              </div>
            )}

            {/* 2. Text Handle (@channel) Section */}
            <div className="mini-h" style={{ marginTop: 14 }}>Text Handle (@channel / Creator)</div>
            <input
              type="text"
              className="wm-input"
              placeholder="e.g. @MohdKhanEdits or MyChannel"
              value={watermarkText}
              onChange={(e) => {
                if (setWatermarkText) setWatermarkText(e.target.value);
                if (drawRef.current) drawRef.current(timeRef.current);
              }}
            />

            {watermarkText.trim() && (
              <>
                <button
                  type="button"
                  className={`wm-toggle-btn ${watermarkTextBg ? "is-active" : ""}`}
                  onClick={() => {
                    if (setWatermarkTextBg) setWatermarkTextBg(!watermarkTextBg);
                    if (drawRef.current) drawRef.current(timeRef.current);
                  }}
                >
                  <span>🏷️ Glass Badge Pill Background</span>
                  <span className="wm-toggle-badge">{watermarkTextBg ? "ON" : "OFF"}</span>
                </button>

                <div className="wm-color-row">
                  <span style={{ fontSize: 11, color: "var(--text-dim)", marginRight: 4 }}>Color:</span>
                  {[
                    { hex: "#ffffff", name: "White" },
                    { hex: "#fbbf24", name: "Gold" },
                    { hex: "#00f2fe", name: "Cyan" },
                    { hex: "#22c55e", name: "Neon Green" },
                    { hex: "#ff3b30", name: "Fire Red" },
                  ].map((c) => (
                    <div
                      key={c.hex}
                      className={`wm-color-dot ${watermarkTextColor === c.hex ? "is-active" : ""}`}
                      style={{ background: c.hex }}
                      title={c.name}
                      onClick={() => {
                        if (setWatermarkTextColor) setWatermarkTextColor(c.hex);
                        if (drawRef.current) drawRef.current(timeRef.current);
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {/* 3. Protection & Animation */}
            <div className="mini-h" style={{ marginTop: 14 }}>Effects &amp; Protection</div>
            <button
              type="button"
              className={`wm-toggle-btn ${watermarkShadow ? "is-active" : ""}`}
              onClick={() => {
                if (setWatermarkShadow) setWatermarkShadow(!watermarkShadow);
                if (drawRef.current) drawRef.current(timeRef.current);
              }}
            >
              <span>✨ Drop Shadow Protection (Legible on Bright BG)</span>
              <span className="wm-toggle-badge">{watermarkShadow ? "ON" : "OFF"}</span>
            </button>

            <button
              type="button"
              className={`wm-toggle-btn ${watermarkFadeIn ? "is-active" : ""}`}
              onClick={() => {
                if (setWatermarkFadeIn) setWatermarkFadeIn(!watermarkFadeIn);
                if (drawRef.current) drawRef.current(timeRef.current);
              }}
            >
              <span>🎬 Smooth 0.8s Intro Fade-In Reveal</span>
              <span className="wm-toggle-badge">{watermarkFadeIn ? "ON" : "OFF"}</span>
            </button>

            {/* 4. Interactive 9-Point Visual Monitor Screen */}
            <div className="mini-h" style={{ marginTop: 14 }}>Screen Placement (Interactive Monitor)</div>
            <div className="pos-monitor-box">
              <div className="pos-monitor-screen">
                <div className="pos-monitor-row">
                  <button
                    type="button"
                    className={`pos-node ${watermarkPos === "top-left" ? "is-active" : ""}`}
                    onClick={() => { if (setWatermarkPos) setWatermarkPos("top-left"); if (drawRef.current) drawRef.current(timeRef.current); }}
                    title="Top Left"
                  >
                    <span>↖</span>
                  </button>
                  <button
                    type="button"
                    className={`pos-node ${watermarkPos === "top-center" ? "is-active" : ""}`}
                    onClick={() => { if (setWatermarkPos) setWatermarkPos("top-center"); if (drawRef.current) drawRef.current(timeRef.current); }}
                    title="Top Center"
                  >
                    <span>↑</span>
                  </button>
                  <button
                    type="button"
                    className={`pos-node ${watermarkPos === "top-right" ? "is-active" : ""}`}
                    onClick={() => { if (setWatermarkPos) setWatermarkPos("top-right"); if (drawRef.current) drawRef.current(timeRef.current); }}
                    title="Top Right"
                  >
                    <span>↗</span>
                  </button>
                </div>
                <div className="pos-monitor-row pos-monitor-row--mid">
                  <button
                    type="button"
                    className={`pos-node pos-node--center ${watermarkPos === "center" ? "is-active" : ""}`}
                    onClick={() => { if (setWatermarkPos) setWatermarkPos("center"); if (drawRef.current) drawRef.current(timeRef.current); }}
                    title="Center Copyright"
                  >
                    <span>⏺ Center</span>
                  </button>
                </div>
                <div className="pos-monitor-row">
                  <button
                    type="button"
                    className={`pos-node ${watermarkPos === "bottom-left" ? "is-active" : ""}`}
                    onClick={() => { if (setWatermarkPos) setWatermarkPos("bottom-left"); if (drawRef.current) drawRef.current(timeRef.current); }}
                    title="Bottom Left"
                  >
                    <span>↙</span>
                  </button>
                  <button
                    type="button"
                    className={`pos-node ${watermarkPos === "bottom-center" ? "is-active" : ""}`}
                    onClick={() => { if (setWatermarkPos) setWatermarkPos("bottom-center"); if (drawRef.current) drawRef.current(timeRef.current); }}
                    title="Bottom Center"
                  >
                    <span>↓</span>
                  </button>
                  <button
                    type="button"
                    className={`pos-node ${watermarkPos === "bottom-right" ? "is-active" : ""}`}
                    onClick={() => { if (setWatermarkPos) setWatermarkPos("bottom-right"); if (drawRef.current) drawRef.current(timeRef.current); }}
                    title="Bottom Right"
                  >
                    <span>↘</span>
                  </button>
                </div>
              </div>
              <div className="pos-monitor-caption">
                Target: <strong>{watermarkPos.replace("-", " ").toUpperCase()}</strong>
              </div>
            </div>

            {/* 5. Margin & Size Sliders */}
            <div className="mini-h" style={{ marginTop: 14 }}>Margin from Screen Edge</div>
            <label className="trdur">
              <input
                type="range" min={8} max={70} step={2}
                value={watermarkMargin}
                onChange={(e) => {
                  if (setWatermarkMargin) setWatermarkMargin(+e.target.value);
                  if (drawRef.current) drawRef.current(timeRef.current);
                }}
              />
              <span className="trdur__val">{watermarkMargin}px</span>
            </label>

            <div className="mini-h" style={{ marginTop: 12 }}>Opacity</div>
            <label className="trdur">
              <input
                type="range" min={0.1} max={1} step={0.05}
                value={watermarkOpacity}
                onChange={(e) => {
                  if (setWatermarkOpacity) setWatermarkOpacity(+e.target.value);
                  if (drawRef.current) drawRef.current(timeRef.current);
                }}
              />
              <span className="trdur__val">{Math.round(watermarkOpacity * 100)}%</span>
            </label>

            <div className="mini-h" style={{ marginTop: 12 }}>Scale Size</div>
            <label className="trdur">
              <input
                type="range" min={0.05} max={0.4} step={0.01}
                value={watermarkScale}
                onChange={(e) => {
                  if (setWatermarkScale) setWatermarkScale(+e.target.value);
                  if (drawRef.current) drawRef.current(timeRef.current);
                }}
              />
              <span className="trdur__val">{Math.round(watermarkScale * 100)}%</span>
            </label>
          </div>
        )}

      </aside>

      <input
        ref={fileInputRef} type="file" accept={coarse ? undefined : "image/*,video/*"} hidden
        onChange={onPickFile}
      />
      <input
        ref={replaceInputRef} type="file" accept={coarse ? undefined : "image/*,video/*"} hidden
        onChange={onPickReplacement}
      />
      <input
        ref={capInputRef} type="file" accept=".srt,.vtt,.txt,text/plain" hidden
        onChange={onPickCaption}
      />
      <input
        ref={bgmInputRef} type="file" accept="audio/*" hidden
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          if (file && setBgmFile) setBgmFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={watermarkInputRef} type="file" accept="image/*" hidden
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          if (file && setWatermarkFile) setWatermarkFile(file);
          e.target.value = "";
        }}
      />

      {inspect && (() => {
        const insClip = clips.find((c) => c.name === inspect);
        const el = imageEls[inspect];
        const num = insClip ? imageClips.indexOf(insClip) + 1 : 0;
        const curUrl = pendUrl || (el && el.url);
        const pendIsVid = !!(pendFile && pendFile.type && pendFile.type.startsWith("video/"));
        const isVid = !!(el && el.isVideo) && !pendUrl;
        const vinfo = videoInfoByName[inspect] || {};
        const vol = volumeByName[inspect] == null ? 0 : volumeByName[inspect];
        const inPt = trimByName[inspect] || 0;
        const kind = isVid ? "Video" : "Image";
        const slotDur = (insClip && insClip.duration) || 0;
        const vdur = vinfo.duration || 0;
        const longer = !!(vdur && insClip && vdur > slotDur + 0.05);
        const shorter = !!(vdur && insClip && vdur < slotDur - 0.05);
        const diff = longer || shorter;
        // Default: Auto Speed-to-Fit so video duration matches slot perfectly
        const fitMode = fitByName[inspect] || "fit";
        const speed = (slotDur > 0 && vdur > 0) ? (vdur / slotDur) : 1;
        return (
          <div className="modal" role="dialog" aria-modal="true" onClick={closeInspect}>
            <div className="modal__card" onClick={(e) => e.stopPropagation()}>
              <div className="modal__head">
                <span className="modal__title">
                  {num ? `${kind} ${num} of ${imageCount}` : kind}
                  {insClip && <span className="modal__at"> · {tc(insClip.start)}</span>}
                </span>
                <button className="modal__x" onClick={closeInspect} aria-label="Close">✕</button>
              </div>

              <div className="modal__stage">
                {pendUrl ? (
                  // A chosen-but-not-applied replacement: a video needs a <video>,
                  // not an <img> (an <img> with a video URL just shows black).
                  pendIsVid
                    ? <video src={pendUrl} className="modal__stagevid" controls muted playsInline preload="metadata" />
                    : <img src={pendUrl} alt="" />
                ) : isVid && vinfo.url ? (
                  <video
                    ref={modalVideoRef} src={vinfo.url} className="modal__stagevid"
                    controls muted playsInline preload="metadata"
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      try { v.currentTime = inPt; } catch { /* ignore */ }
                      v.playbackRate = (diff && fitMode === "fit") ? Math.min(16, Math.max(0.0625, speed)) : 1;
                    }}
                  />
                ) : (curUrl && <img src={curUrl} alt="" />)}
                {pendUrl && <span className="modal__flag">New — not applied yet</span>}
              </div>
              <div className="modal__file">
                {pendFile ? pendFile.name : (el && el.fileName) || ""}
              </div>

              {insClip && !insClip.gap && (
                <>
                <div className="modal__motion">
                  <span className="modal__motion-label">Motion (Ken Burns zoom)</span>
                  <div className="seg">
                    {[["none", "None"], ["zoomin", "Zoom in"], ["zoomout", "Zoom out"]].map(([id, lbl]) => (
                      <button
                        key={id}
                        type="button"
                        className={((motionByName && motionByName[inspect]) || "none") === id ? "is-on" : ""}
                        onClick={() => setMotion && setMotion(inspect, id)}
                      >{lbl}</button>
                    ))}
                  </div>
                </div>

                <div className="modal__effects">
                  <div className="modal__effect-header">
                    <span className="modal__motion-label">Visual Effect (CapCut-style)</span>
                    {((effectsByName && effectsByName[inspect]) || "none") !== "none" && (
                      <span className="modal__effect-intensity-val">
                        {(effectIntensityByName && effectIntensityByName[inspect]) != null
                          ? effectIntensityByName[inspect]
                          : (EFFECTS[effectsByName[inspect]] ? EFFECTS[effectsByName[inspect]].defaultIntensity : 100)}%
                      </span>
                    )}
                  </div>
                  <div className="effect-grid">
                    {Object.values(EFFECTS).map((eff) => {
                      const curEff = (effectsByName && effectsByName[inspect]) || "none";
                      return (
                        <button
                          key={eff.id}
                          type="button"
                          className={`effect-card ${curEff === eff.id ? "is-on" : ""}`}
                          onClick={() => {
                            if (setEffect) setEffect(inspect, eff.id);
                            if (setEffectIntensity && (!effectIntensityByName || effectIntensityByName[inspect] == null)) {
                              const def = (EFFECTS[eff.id] && EFFECTS[eff.id].defaultIntensity) || 75;
                              setEffectIntensity(inspect, def);
                            }
                          }}
                          title={eff.description}
                        >
                          <span className="effect-card__icon">{eff.icon}</span>
                          <span className="effect-card__name">{eff.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {((effectsByName && effectsByName[inspect]) || "none") !== "none" && (
                    <div className="modal__effect-slider-row">
                      <span className="modal__effect-slider-label">Intensity</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={
                          (effectIntensityByName && effectIntensityByName[inspect] != null)
                            ? effectIntensityByName[inspect]
                            : (EFFECTS[effectsByName && effectsByName[inspect]] ? EFFECTS[effectsByName[inspect]].defaultIntensity : 75)
                        }
                        onChange={(e) => {
                          const val = +e.target.value;
                          if (setEffectIntensity) setEffectIntensity(inspect, val);
                          if (drawRef.current) drawRef.current(timeRef.current);
                        }}
                        className="effect-slider"
                      />
                      <button
                        type="button"
                        className="effect-apply-all-btn"
                        onClick={() => {
                          const curEff = (effectsByName && effectsByName[inspect]) || "none";
                          const curInt = (effectIntensityByName && effectIntensityByName[inspect] != null)
                            ? effectIntensityByName[inspect]
                            : (EFFECTS[curEff] ? EFFECTS[curEff].defaultIntensity : 75);
                          if (applyEffectAll) applyEffectAll(curEff, curInt);
                          if (drawRef.current) drawRef.current(timeRef.current);
                        }}
                        title="Apply this effect and intensity to all clips in the project"
                      >
                        Apply to All
                      </button>
                    </div>
                  )}
                </div>
                </>
              )}

              {insClip && !insClip.gap && isVid && (
                <div className="modal__vid">
                  {diff && (
                    <div className="modal__fit">
                      <span className="modal__motion-label">
                        {longer ? "Clip is longer than its slot" : "Clip is shorter than its slot"} · {vinfo.duration.toFixed(1)}s clip, {insClip.duration.toFixed(1)}s slot
                      </span>
                      <div className="seg">
                        <button
                          type="button" className={fitMode === "fit" ? "is-on" : ""}
                          onClick={() => setFit && setFit(inspect, "fit")}
                        >Fit to slot</button>
                        <button
                          type="button" className={fitMode === "trim" ? "is-on" : ""}
                          onClick={() => setFit && setFit(inspect, "trim")}
                        >Trim (1×)</button>
                      </div>
                      {fitMode === "fit"
                        ? <span className="modal__hint">{longer
                            ? `Whole clip fast-forwarded at ${speed.toFixed(1)}× to fit the slot.`
                            : `Whole clip slowed to ${speed.toFixed(2)}× to fill the slot.`}</span>
                        : <span className="modal__hint">Plays at 1× — set a start point below;{longer ? " the rest is cut off." : " the last frame then holds to fill the slot."}</span>}
                    </div>
                  )}
                  {(!diff || fitMode === "trim") && (() => {
                    const dur = vinfo.duration || 0;
                    const remain = Math.max(0, dur - inPt);        // footage left from the start point
                    const playLen = Math.min(insClip.duration, remain); // real-time footage shown
                    const holdFor = Math.max(0, insClip.duration - remain); // seconds the last frame holds
                    return (
                      <div className="modal__trim">
                        <span className="modal__motion-label">Trim — drag the handle to set where the clip starts</span>
                        {/* Video-editor style trim bar: the fill shows the part that plays;
                            dragging the handle scrubs the preview above and sets the start. */}
                        <div className="trimbar">
                          <div
                            className="trimbar__fill"
                            style={{ left: `${dur ? (inPt / dur) * 100 : 0}%`, width: `${dur ? (playLen / dur) * 100 : 0}%` }}
                          />
                          <input
                            className="trimbar__range"
                            type="range" min={0} max={Math.max(0.1, dur)} step={0.05}
                            value={Math.min(inPt, Math.max(0.1, dur))}
                            onChange={(e) => {
                              const val = +e.target.value;
                              if (setTrim) setTrim(inspect, val);
                              if (modalVideoRef.current) { try { modalVideoRef.current.currentTime = val; } catch { /* ignore */ } }
                            }}
                          />
                        </div>
                        <span className="modal__hint">
                          Starts at {inPt.toFixed(1)}s of {dur.toFixed(1)}s · plays {playLen.toFixed(1)}s in a {insClip.duration.toFixed(1)}s slot
                        </span>
                        {holdFor > 0.05 && (
                          <span className="modal__hint modal__hint--warn">
                            Only {remain.toFixed(1)}s of footage left — the last frame holds for {holdFor.toFixed(1)}s to fill the slot.
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <div className="modal__vol">
                    <span className="modal__motion-label">Clip audio volume</span>
                    <div className="seg" style={{ marginBottom: 8 }}>
                      <button type="button" className={vol === 0 ? "is-on" : ""} onClick={() => setVolume && setVolume(inspect, 0)}>🔇 Mute</button>
                      <button type="button" className={Math.abs(vol - 0.2) < 0.05 ? "is-on" : ""} onClick={() => setVolume && setVolume(inspect, 0.2)}>🔉 20% Duck</button>
                      <button type="button" className={vol === 1 ? "is-on" : ""} onClick={() => setVolume && setVolume(inspect, 1)}>🔊 100%</button>
                    </div>
                    <div className="modal__slider">
                      <input
                        type="range" min={0} max={1} step={0.05} value={vol}
                        onChange={(e) => setVolume && setVolume(inspect, +e.target.value)}
                      />
                      <span className="trdur__val">{Math.round(vol * 100)}%</span>
                    </div>
                    <span className="modal__hint">Plays under the voiceover. 0% (Muted) keeps voiceover clean.</span>
                  </div>
                </div>
              )}

              {!pendUrl ? (
                <div className="modal__actions">
                  <button className="mbtn mbtn--primary" onClick={() => replaceInputRef.current && replaceInputRef.current.click()}>
                    Replace {isVid ? "video" : "image"}
                  </button>
                  <button className="mbtn mbtn--danger" onClick={removeInspected}>Remove from timeline</button>
                </div>
              ) : (
                <div className="modal__actions">
                  <button className="mbtn mbtn--primary" onClick={applyReplacement}>Apply replacement</button>
                  <button className="mbtn" onClick={() => replaceInputRef.current && replaceInputRef.current.click()}>Choose different</button>
                  <button className="mbtn mbtn--ghost" onClick={clearPend}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </section>
  );
}
