// Render-side caption helpers, copied verbatim from lib/captions.js so the
// burned-in text matches the frontend preview exactly. Only the render-side
// pieces are here — transcript parsing and canvas drawing stay in the frontend.

// ---- style presets (shared by preview canvas + ffmpeg drawtext) ----
export const CAPTION_STYLES = {
  capcut_pill: {
    id: "capcut_pill", label: "💊 CapCut Word Capsule",
    fill: "#ffffff", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=white:box=1:boxcolor=black@0.9:boxborderw=8`,
  },
  capcut_bounce: {
    id: "capcut_bounce", label: "⚡ CapCut Word Bounce",
    fill: "#ffffff", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=0x00FF66:borderw=${bw}:bordercolor=black@0.95`,
  },
  capcut_highlight: {
    id: "capcut_highlight", label: "🖍️ CapCut Highlighter Strip",
    fill: "#ffffff", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=0xFFE600:borderw=${bw}:bordercolor=black@0.9`,
  },
  capcut_karaoke: {
    id: "capcut_karaoke", label: "🎤 CapCut Smooth Karaoke",
    fill: "#ffffff", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=0xFFE600:borderw=${bw}:bordercolor=black@0.95`,
  },
  capcut_3d: {
    id: "capcut_3d", label: "🧊 CapCut 3D Extrusion",
    fill: "#ffffff", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=0xFF2D55:borderw=${bw}:bordercolor=black@0.95:shadowcolor=black@0.95:shadowx=6:shadowy=6`,
  },
  capcut_glow: {
    id: "capcut_glow", label: "✨ CapCut Neon Bloom",
    fill: "#e0f2fe", stroke: "#0284c7", box: null,
    dt: (bw) => `fontcolor=0x38BDF8:borderw=${bw}:bordercolor=0x0284C7@0.95`,
  },
  capcut_luxury: {
    id: "capcut_luxury", label: "👑 CapCut Golden Luxe",
    fill: "#fef3c7", stroke: "#451a03", box: null,
    dt: (bw) => `fontcolor=0xF59E0B:borderw=${bw}:bordercolor=0x451A03@0.9`,
  },
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
    dt: (bw) => `fontcolor=0xFFD400:borderw=${bw}:bordercolor=black@0.9`,
  },
  neon: {
    id: "neon", label: "🟢 Neon Pop (Green)",
    fill: "#ffffff", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=0x22C55E:borderw=${bw}:bordercolor=black@0.9`,
  },
  mrbeast: {
    id: "mrbeast", label: "🔥 MrBeast Bold",
    fill: "#ffffff", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=0xFFEA00:borderw=${bw}:bordercolor=black@0.95:shadowcolor=black@0.9:shadowx=4:shadowy=4`,
  },
  fire: {
    id: "fire", label: "🔴 Fire Alert",
    fill: "#fff2e0", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=0xFF3B30:borderw=${bw}:bordercolor=black@0.95`,
  },
  cyberpunk: {
    id: "cyberpunk", label: "🔵 Cyberpunk Cyan",
    fill: "#e0f7fa", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=0x00F2FE:borderw=${bw}:bordercolor=black@0.95`,
  },
  netflix: {
    id: "netflix", label: "🎬 Netflix Cinema",
    fill: "rgba(235, 238, 245, 0.72)", stroke: null, box: "rgba(15, 18, 24, 0.8)",
    dt: (bw, fs) => `fontcolor=white:box=1:boxcolor=0x0F1218@0.78:boxborderw=${Math.max(4, Math.round(fs * 0.2))}`,
  },
  hormozi: {
    id: "hormozi", label: "⚡ Alex Hormozi (Lime Pop)",
    fill: "#ffffff", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=0xCCFF00:borderw=${bw}:bordercolor=black@0.95:shadowcolor=black@0.95:shadowx=5:shadowy=5`,
  },
  abdaal: {
    id: "abdaal", label: "🎙️ Ali Abdaal (Minimal Glass)",
    fill: "#f8fafc", stroke: null, box: "rgba(15, 23, 42, 0.75)",
    dt: (bw, fs) => `fontcolor=0x38BDF8:box=1:boxcolor=0x0F172A@0.75:boxborderw=${Math.max(4, Math.round(fs * 0.18))}`,
  },
  gadzhi: {
    id: "gadzhi", label: "📜 Iman Gadzhi (Luxury Gold)",
    fill: "#f8fafc", stroke: "#1a1408", box: null,
    dt: (bw) => `fontcolor=0xF59E0B:borderw=${bw}:bordercolor=0x1A1408@0.9`,
  },
  vox: {
    id: "vox", label: "🔥 Vox / Explainer Tag",
    fill: "#ffffff", stroke: "#000000", box: "rgba(0,0,0,0.82)",
    dt: (bw, fs) => `fontcolor=0xFFEA00:box=1:boxcolor=black@0.82:boxborderw=${Math.max(4, Math.round(fs * 0.18))}`,
  },
  comic: {
    id: "comic", label: "💥 Comic Pop / Gaming",
    fill: "#ffffff", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=0xFF2D55:borderw=${bw}:bordercolor=black@0.95:shadowcolor=black@0.9:shadowx=4:shadowy=4`,
  },
  ovogold: {
    id: "ovogold", label: "🦉 OVO Luxury (Slate & Gold)",
    fill: "#f8fafc", stroke: null, box: "rgba(15, 17, 23, 0.88)",
    dt: (bw, fs) => `fontcolor=0xFBBF24:box=1:boxcolor=0x0F1117@0.88:boxborderw=${Math.max(4, Math.round(fs * 0.2))}`,
  },
  terminal: {
    id: "terminal", label: "📟 Hacker Terminal [Green]",
    fill: "#22c55e", stroke: "#000000", box: "rgba(0, 20, 5, 0.85)",
    dt: (bw, fs) => `fontcolor=0x00FF66:box=1:boxcolor=0x001405@0.85:boxborderw=${Math.max(3, Math.round(fs * 0.16))}`,
  },
};

export const CAPTION_SIZES = { sm: 0.042, md: 0.052, lg: 0.064 };
export const CAPTION_FONT = "caption.ttf";          // path in the ffmpeg FS
export const captionCueFile = (i) => `cap${i}.txt`;  // per-cue textfile in the FS

export function captionFontPx(height, sizeId, customScale) {
  const frac = customScale > 0 ? customScale : (CAPTION_SIZES[sizeId] || CAPTION_SIZES.md);
  return Math.round(height * frac);
}

const MARGIN_FACTOR = 0.07;

// Width-aware caption wrapping (must match lib/captions.js so preview == render).
// Reflows a caption into balanced lines that each fit the frame WIDTH, so 9:16
// portrait doesn't overflow. Resolution-independent (W and fontPx scale together).
function captionMaxChars(W, fontPx) {
  return Math.max(8, Math.floor((W * 0.90) / (fontPx * 0.58)));
}
function wrapToWidth(text, maxChars) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];
  // Greedy fill: every line stays within maxChars, so nothing overflows.
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

// Boxed captions need a bit more line spacing so their per-line boxes keep a gap.
const lineHeightFactor = (st) => (st && st.box ? 1.5 : 1.16);

// Vertical slot (top y) for line i of an n-line caption, bottom-anchored.
const lineTop = (H, fontPx, n, i, lhf = 1.16) =>
  Math.round(H - H * MARGIN_FACTOR - (n - i) * fontPx * lhf);

// ---- render: one centered drawtext per LINE (so each line is centered) ----
// Returns the filter chain plus the per-line textfiles to write into the FS.
export function buildCaptionBurn(cues, styleId, width, height, sizeId, lineHeight, fontScale, prefix = "") {
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
      const name = prefix + captionCueFile(li++);
      files.push({ name, text: sanitizeCueText(lines[i]) });
      const y = lineTop(height, fs, n, i, lhf);
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
