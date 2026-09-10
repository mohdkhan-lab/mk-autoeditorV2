// Captions: parse an uploaded timestamped transcript into short caption cues,
// draw them on the preview canvas, and build the ffmpeg drawtext chain that
// burns them into the render. Preview and render share the same font + styles
// so what you see is what you get.

// ---- style presets (shared by preview canvas + ffmpeg drawtext) ----
// `fill`/`stroke`/`box` drive the canvas preview; `dt(bw)` returns the
// drawtext colour/box options for the burn-in.
export const CAPTION_STYLES = {
  classic: {
    id: "classic", label: "Classic outline",
    fill: "#ffffff", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=white:borderw=${bw}:bordercolor=black@0.9`,
  },
  boxed: {
    id: "boxed", label: "Boxed",
    fill: "#ffffff", stroke: null, box: "rgba(0,0,0,0.6)",
    dt: (bw, fs) => `fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=${Math.max(3, Math.round(fs * 0.16))}`,
  },
  yellow: {
    id: "yellow", label: "Yellow classic",
    fill: "#ffd400", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=0xFFD400:borderw=${bw}:bordercolor=black@0.9`,
  },
  karaoke: {
    id: "karaoke", label: "⚡ Karaoke Pop (Gold)",
    fill: "#ffffff", stroke: "#000000", box: null,
    highlightFill: "#fbbf24",
    highlightStroke: "#000000",
    glow: "rgba(251, 191, 36, 0.7)",
    dt: (bw) => `fontcolor=0xFFD400:borderw=${bw}:bordercolor=black@0.9`,
  },
  neon: {
    id: "neon", label: "🟢 Neon Pop (Green)",
    fill: "#ffffff", stroke: "#000000", box: null,
    highlightFill: "#22c55e",
    highlightStroke: "#000000",
    glow: "rgba(34, 197, 94, 0.7)",
    dt: (bw) => `fontcolor=0x22C55E:borderw=${bw}:bordercolor=black@0.9`,
  },
};
export const CAPTION_STYLE_LIST = Object.keys(CAPTION_STYLES).map((id) => CAPTION_STYLES[id]);

export const CAPTION_SIZES = { sm: 0.042, md: 0.052, lg: 0.064 };
export const CAPTION_FONT = "caption.ttf";          // path in the ffmpeg FS
export const captionCueFile = (i) => `cap${i}.txt`;  // per-cue textfile in the FS

export function captionFontPx(height, sizeId, customScale) {
  const frac = customScale > 0 ? customScale : (CAPTION_SIZES[sizeId] || CAPTION_SIZES.md);
  return Math.round(height * frac);
}

const MAX_LINE = 42;       // chars before wrapping to a second line
const MAX_CUE_CHARS = 84;  // chars before starting a new caption cue
const MARGIN_FACTOR = 0.07;

// ---- timestamp helpers ----
function hms(str) {
  const m = String(str).match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?/);
  if (!m) return null;
  const h = +(m[1] || 0), mi = +m[2], se = +m[3];
  const ms = m[4] ? +m[4].padEnd(3, "0") : 0;
  return h * 3600 + mi * 60 + se + ms / 1000;
}

// SRT / VTT — cues carry explicit start AND end.
function parseArrow(text) {
  const out = [];
  for (const block of text.split(/\n{2,}/)) {
    const lines = block.split("\n").map((l) => l.trim())
      .filter((l) => l && l !== "WEBVTT" && !/^\d+$/.test(l));
    const tl = lines.find((l) => l.includes("-->"));
    if (!tl) continue;
    const ts = tl.match(/(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?/g);
    if (!ts || ts.length < 2) continue;
    const txt = lines.filter((l) => l !== tl).join(" ").trim();
    if (txt) out.push({ start: hms(ts[0]), end: hms(ts[1]), text: txt });
  }
  return out;
}

// NoteGPT-style range blocks: "HH:MM:SS - HH:MM:SS" then a paragraph.
function parseRanges(text) {
  const re = /^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*[-–—]\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*$/;
  const out = [];
  let cur = null;
  for (const ln of text.split("\n")) {
    const m = ln.match(re);
    if (m) {
      if (cur && cur.text.trim()) out.push(cur);
      cur = { start: hms(m[1]), end: hms(m[2]), text: "" };
    } else if (cur) {
      const t = ln.trim();
      if (t) cur.text += (cur.text ? " " : "") + t;
    }
  }
  if (cur && cur.text.trim()) out.push(cur);
  return out;
}

// Inline markers anywhere in the text: "(0:03) text ... (0:20) more".
// Each marker owns the text up to the next marker, across line breaks.
function parseMarkers(text) {
  const re = /[([]\s*((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\s*[)\]]/g;
  const marks = [];
  let m;
  while ((m = re.exec(text))) marks.push({ start: hms(m[1]), from: re.lastIndex, at: m.index });
  const out = [];
  for (let i = 0; i < marks.length; i++) {
    const to = i + 1 < marks.length ? marks[i + 1].at : text.length;
    const txt = text.slice(marks[i].from, to).replace(/\s+/g, " ").trim();
    if (txt) out.push({ start: marks[i].start, end: null, text: txt });
  }
  return out;
}

// Inline: "[0:03] text" or "0:03 text" per line.
function parseInline(text) {
  const re = /^\s*\[?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\]?\s+(.*\S)\s*$/;
  const out = [];
  for (const ln of text.split("\n")) {
    const m = ln.match(re);
    if (m) out.push({ start: hms(m[1]), end: null, text: m[2].trim() });
  }
  return out;
}

// Wrap a caption string onto (at most) two balanced lines.
function wrap(str) {
  if (str.length <= MAX_LINE) return str;
  const words = str.split(" ");
  const half = str.length / 2;
  let a = "", b = "";
  for (const w of words) {
    if (!b && a.length + w.length <= half) a = a ? `${a} ${w}` : w;
    else b = b ? `${b} ${w}` : w;
  }
  return b ? `${a}\n${b}` : a;
}

// Reflow a caption into balanced lines that each fit the frame WIDTH at the given
// font size. Unlike the fixed-char wrap() used at parse time, this is width-aware,
// so 9:16 (portrait) captions don't overflow the sides. It's resolution-
// independent: W and fontPx scale together, so preview (full res) and render
// (e.g. 720p) wrap the same way = WYSIWYG.
export function captionMaxChars(W, fontPx) {
  return Math.max(8, Math.floor((W * 0.90) / (fontPx * 0.58)));
}
export function wrapToWidth(text, maxChars) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];
  // Greedy fill: every line is guaranteed to stay within maxChars (except a lone
  // word longer than a line), so nothing ever overflows the frame width.
  const words = clean.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cur && cand.length > maxChars) { lines.push(cur); cur = w; }
    else cur = cand;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Split one timed segment into caption cues, timed proportionally to length.
function chunkSegment(seg, cues) {
  const words = seg.text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return;
  const chunks = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length > MAX_CUE_CHARS && cur) { chunks.push(cur); cur = w; }
    else cur = cand;
    if (/[.!?]["')]?$/.test(w) && cur.length >= MAX_CUE_CHARS * 0.5) { chunks.push(cur); cur = ""; }
  }
  if (cur) chunks.push(cur);

  const totalChars = chunks.reduce((a, c) => a + c.length, 0) || 1;
  const span = Math.max(0.2, seg.end - seg.start);
  let t = seg.start;
  for (const c of chunks) {
    const d = span * (c.length / totalChars);
    const end = c === chunks[chunks.length - 1] ? seg.end : t + d;
    cues.push({ start: t, end, text: wrap(c) });
    t = end;
  }
}

// Parse raw transcript text into caption cues. `duration` (audio length) is used
// only to close the final segment. Returns { cues, error }.
export function parseTranscript(raw, duration = 0) {
  if (!raw || !raw.trim()) return { cues: [], error: "The file is empty." };
  const text = raw.replace(/\r/g, "");

  let segs = text.includes("-->") ? parseArrow(text) : parseRanges(text);
  if (!segs.length) segs = parseMarkers(text);
  if (!segs.length) segs = parseInline(text);
  segs = segs.filter((s) => s.start != null && s.text);
  if (!segs.length) {
    return { cues: [], error: "No timestamps found — use an SRT/VTT or a timestamped transcript." };
  }

  segs.sort((a, b) => a.start - b.start);
  for (let i = 0; i < segs.length; i++) {
    const nextStart = i + 1 < segs.length
      ? segs[i + 1].start
      : (duration || segs[i].start + segs[i].text.split(/\s+/).length / 2.5);
    let end = segs[i].end != null ? Math.min(segs[i].end, nextStart) : nextStart;
    if (!(end > segs[i].start)) end = Math.max(nextStart, segs[i].start + 0.4);
    segs[i].end = end;
  }

  const cues = [];
  for (const s of segs) chunkSegment(s, cues);
  return { cues, error: cues.length ? null : "Could not build any caption lines." };
}

// Current caption text for time t (empty string if none).
export function captionAt(cues, t) {
  if (!cues) return "";
  for (let i = 0; i < cues.length; i++) {
    if (t >= cues[i].start && t < cues[i].end) return cues[i].text;
  }
  return "";
}

// Current caption cue object for time t (null if none).
export function captionCueAt(cues, t) {
  if (!cues) return null;
  for (let i = 0; i < cues.length; i++) {
    if (t >= cues[i].start && t < cues[i].end) return cues[i];
  }
  return null;
}

// Line-height factor (top-to-top). Boxed captions need extra spacing so the
// per-line background boxes keep a visible gap instead of touching/overlapping.
const lineHeightFactor = (st) => (st && st.box ? 1.5 : 1.16);
// The default line spacing for a style (what the UI slider starts at).
export function captionLineHeightDefault(styleId) {
  return lineHeightFactor(CAPTION_STYLES[styleId] || CAPTION_STYLES.classic);
}

// Vertical slot (top y) for line i of an n-line caption.
// pos = "bottom" | "lower" | "middle" | "top"
export const lineTop = (H, fontPx, n, i, lhf = 1.16, pos = "bottom") => {
  if (pos === "top") {
    return Math.round(H * 0.10 + i * fontPx * lhf);
  }
  if (pos === "middle") {
    const totalH = n * fontPx * lhf;
    return Math.round((H - totalH) / 2 + i * fontPx * lhf);
  }
  if (pos === "lower") {
    // Lower third: lifted away from bottom safe area
    return Math.round(H - H * 0.20 - (n - i) * fontPx * lhf);
  }
  // Default: bottom anchored
  return Math.round(H - H * MARGIN_FACTOR - (n - i) * fontPx * lhf);
};

// ---- preview & render: draw the current caption onto the canvas ----
// Supports standard styles and animated word-by-word Karaoke Pop (Hormozi style)
export function drawCaption(ctx, text, W, H, styleId, fontPx, lineHeight, cue = null, t = 0, pos = "bottom") {
  if (!text) return;
  const st = CAPTION_STYLES[styleId] || CAPTION_STYLES.classic;
  const lines = wrapToWidth(text, captionMaxChars(W, fontPx));
  const n = lines.length;
  const lhf = lineHeight > 0 ? lineHeight : lineHeightFactor(st);

  ctx.save();
  ctx.font = `700 ${fontPx}px "CaptionFont", system-ui, sans-serif`;
  ctx.textBaseline = "alphabetic";

  const isKaraoke = !!(st.highlightFill && cue && cue.end > cue.start);
  let activeWordGlobal = -1;
  let wordProgress = 0;
  if (isKaraoke) {
    const span = Math.max(0.1, cue.end - cue.start);
    const progress = Math.min(1, Math.max(0, (t - cue.start) / span));
    const allWords = text.trim().split(/\s+/).filter(Boolean);
    const totalWords = allWords.length;
    if (totalWords > 0) {
      activeWordGlobal = Math.min(totalWords - 1, Math.floor(progress * totalWords));
      wordProgress = (progress * totalWords) - activeWordGlobal;
    }
  }

  let wordCounter = 0;

  for (let i = 0; i < n; i++) {
    const ln = lines[i];
    const top = lineTop(H, fontPx, n, i, lhf, pos);
    const base = top + fontPx * 0.82;

    if (st.box) {
      const w = ctx.measureText(ln).width;
      const padX = fontPx * 0.38, padY = fontPx * 0.12;
      const boxTop = base - fontPx * 0.78 - padY;
      const boxH = fontPx * 0.98 + padY * 2;
      ctx.fillStyle = st.box;
      ctx.fillRect((W - w) / 2 - padX, boxTop, w + padX * 2, boxH);
    }

    if (!isKaraoke) {
      ctx.textAlign = "center";
      if (st.stroke) {
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.lineWidth = Math.max(2, fontPx / 7);
        ctx.strokeStyle = st.stroke;
        ctx.strokeText(ln, W / 2, base);
      }
      ctx.fillStyle = st.fill;
      ctx.fillText(ln, W / 2, base);
    } else {
      ctx.textAlign = "left";
      const lineWords = ln.trim().split(/\s+/).filter(Boolean);
      const spaceW = ctx.measureText(" ").width;
      const measured = lineWords.map((w) => ctx.measureText(w).width);
      const totalLineW = measured.reduce((a, b) => a + b, 0) + spaceW * Math.max(0, lineWords.length - 1);
      let curX = (W - totalLineW) / 2;

      for (let j = 0; j < lineWords.length; j++) {
        const w = lineWords[j];
        const wWidth = measured[j];
        const isActive = (wordCounter === activeWordGlobal);

        ctx.save();
        if (isActive) {
          const pop = 1 + Math.sin(Math.min(1, wordProgress) * Math.PI) * 0.14;
          const centerX = curX + wWidth / 2;
          ctx.translate(centerX, base);
          ctx.scale(pop, pop);
          ctx.translate(-centerX, -base);

          if (st.glow) {
            ctx.shadowColor = st.glow;
            ctx.shadowBlur = Math.round(fontPx * 0.4);
          }
        }

        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.lineWidth = Math.max(2, fontPx / 6.5);
        ctx.strokeStyle = isActive ? (st.highlightStroke || "#000") : (st.stroke || "#000");
        ctx.strokeText(w, curX, base);

        ctx.fillStyle = isActive ? st.highlightFill : st.fill;
        ctx.fillText(w, curX, base);
        ctx.restore();

        curX += wWidth + spaceW;
        wordCounter++;
      }
    }
  }
  ctx.restore();
}

// ---- render: one centered drawtext per LINE (so each line is centered) ----
// Returns the filter chain plus the per-line textfiles to write into the FS.
export function buildCaptionBurn(cues, styleId, width, height, sizeId, lineHeight, fontScale, pos = "bottom") {
  const st = CAPTION_STYLES[styleId] || CAPTION_STYLES.classic;
  const fs = captionFontPx(height, sizeId, fontScale);
  const bw = Math.max(2, Math.round(fs / 9));
  const lhf = lineHeight > 0 ? lineHeight : lineHeightFactor(st);
  const files = [];
  const filters = [];
  let li = 0;
  for (const c of cues) {
    const lines = wrapToWidth(c.text, captionMaxChars(width, fs));
    const n = lines.length;
    const s = c.start.toFixed(3), e = c.end.toFixed(3);
    for (let i = 0; i < n; i++) {
      const name = captionCueFile(li++);
      files.push({ name, text: sanitizeCueText(lines[i]) });
      const y = lineTop(height, fs, n, i, lhf, pos);
      filters.push(
        `drawtext=fontfile=${CAPTION_FONT}:textfile=${name}:${st.dt(bw, fs)}` +
        `:fontsize=${fs}:x=(w-text_w)/2:y=${y}:enable=between(t\\,${s}\\,${e})`
      );
    }
  }
  return { filter: filters.join(","), files };
}

// drawtext reads textfiles literally; strip chars its expander would choke on.
export function sanitizeCueText(text) {
  return String(text).replace(/\\/g, "").replace(/%/g, "percent");
}
