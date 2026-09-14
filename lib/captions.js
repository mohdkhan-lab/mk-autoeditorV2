// Captions: parse an uploaded timestamped transcript into short caption cues,
// draw them on the preview canvas, and build the ffmpeg drawtext chain that
// burns them into the render. Preview and render share the same font + styles
// so what you see is what you get.

// ---- style presets (shared by preview canvas + ffmpeg drawtext) ----
// `fill`/`stroke`/`box` drive the canvas preview; `dt(bw)` returns the
// drawtext colour/box options for the burn-in.
export const CAPTION_STYLES = {
  capcut_pill: {
    id: "capcut_pill", label: "💊 CapCut Word Capsule",
    fill: "#ffffff", stroke: "#000000", box: null,
    highlightFill: "#ffd400", highlightStroke: null,
    pill: true, pillBg: "rgba(10, 12, 18, 0.94)", pillBorder: "rgba(255, 212, 0, 0.5)",
    glow: "rgba(255, 212, 0, 0.8)",
    uppercase: true,
    anim: "pill",
    dt: (bw) => `fontcolor=white:box=1:boxcolor=black@0.9:boxborderw=8`,
  },
  capcut_bounce: {
    id: "capcut_bounce", label: "⚡ CapCut Word Bounce",
    fill: "#ffffff", stroke: "#000000", box: null,
    highlightFill: "#00ff66", highlightStroke: "#000000",
    glow: "rgba(0, 255, 102, 0.9)",
    shadow: "rgba(0,0,0,0.95)", shadowBlur: 8, shadowOffset: 4,
    anim: "bounce",
    uppercase: true,
    dt: (bw) => `fontcolor=0x00FF66:borderw=${bw}:bordercolor=black@0.95`,
  },
  capcut_highlight: {
    id: "capcut_highlight", label: "🖍️ CapCut Highlighter Strip",
    fill: "#ffffff", stroke: "#000000", box: null,
    highlightFill: "#000000", highlightStroke: null,
    highlighter: true, highlighterColor: "#ffe600",
    glow: null,
    uppercase: false,
    anim: "highlighter",
    dt: (bw) => `fontcolor=0xFFE600:borderw=${bw}:bordercolor=black@0.9`,
  },
  capcut_karaoke: {
    id: "capcut_karaoke", label: "🎤 CapCut Smooth Karaoke",
    fill: "rgba(255, 255, 255, 0.72)", stroke: "#000000", box: null,
    highlightFill: "#ffe600", highlightStroke: "#000000",
    glow: "rgba(255, 230, 0, 0.95)",
    dimInactive: true,
    uppercase: true,
    anim: "karaoke",
    dt: (bw) => `fontcolor=0xFFE600:borderw=${bw}:bordercolor=black@0.95`,
  },
  capcut_3d: {
    id: "capcut_3d", label: "🧊 CapCut 3D Extrusion",
    fill: "#ffffff", stroke: "#000000", box: null,
    highlightFill: "#ff2d55", highlightStroke: "#000000",
    extrusion: true, extrusionColor: "#1a0005",
    glow: "rgba(255, 45, 85, 0.85)",
    uppercase: true,
    anim: "pop",
    dt: (bw) => `fontcolor=0xFF2D55:borderw=${bw}:bordercolor=black@0.95:shadowcolor=black@0.95:shadowx=6:shadowy=6`,
  },
  capcut_glow: {
    id: "capcut_glow", label: "✨ CapCut Neon Bloom",
    fill: "#e0f2fe", stroke: "#0284c7", box: null,
    highlightFill: "#38bdf8", highlightStroke: "#0369a1",
    glow: "rgba(56, 189, 248, 0.98)",
    shadow: "rgba(2, 132, 199, 0.85)", shadowBlur: 12, shadowOffset: 0,
    anim: "glow",
    dt: (bw) => `fontcolor=0x38BDF8:borderw=${bw}:bordercolor=0x0284C7@0.95`,
  },
  capcut_luxury: {
    id: "capcut_luxury", label: "👑 CapCut Golden Luxe",
    fill: "#fef3c7", stroke: "#451a03", box: null,
    highlightFill: "#f59e0b", highlightStroke: "#78350f",
    glow: "rgba(245, 158, 11, 0.9)",
    shadow: "rgba(0,0,0,0.8)", shadowBlur: 6, shadowOffset: 3,
    anim: "fade",
    dt: (bw) => `fontcolor=0xF59E0B:borderw=${bw}:bordercolor=0x451A03@0.9`,
  },
  classic: {
    id: "classic", label: "Classic outline",
    fill: "#ffffff", stroke: "#000000", box: null,
    highlightFill: "#ffd400", highlightStroke: "#000000",
    glow: "rgba(255, 212, 0, 0.75)",
    dt: (bw) => `fontcolor=white:borderw=${bw}:bordercolor=black@0.9`,
  },
  boxed: {
    id: "boxed", label: "Boxed",
    fill: "#ffffff", stroke: null, box: "rgba(0,0,0,0.65)",
    highlightFill: "#fbbf24", highlightStroke: null,
    glow: "rgba(251, 191, 36, 0.8)",
    dt: (bw, fs) => `fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=${Math.max(3, Math.round(fs * 0.16))}`,
  },
  yellow: {
    id: "yellow", label: "Yellow classic",
    fill: "#ffffff", stroke: "#000000", box: null,
    highlightFill: "#ffea00", highlightStroke: "#000000",
    glow: "rgba(255, 234, 0, 0.85)",
    dt: (bw) => `fontcolor=0xFFD400:borderw=${bw}:bordercolor=black@0.9`,
  },
  karaoke: {
    id: "karaoke", label: "⚡ Karaoke Pop (Gold)",
    fill: "#ffffff", stroke: "#000000", box: null,
    highlightFill: "#fbbf24", highlightStroke: "#000000",
    glow: "rgba(251, 191, 36, 0.9)",
    dt: (bw) => `fontcolor=0xFFD400:borderw=${bw}:bordercolor=black@0.9`,
  },
  neon: {
    id: "neon", label: "🟢 Neon Pop (Green)",
    fill: "#ffffff", stroke: "#000000", box: null,
    highlightFill: "#22c55e", highlightStroke: "#000000",
    glow: "rgba(34, 197, 94, 0.9)",
    dt: (bw) => `fontcolor=0x22C55E:borderw=${bw}:bordercolor=black@0.9`,
  },
  mrbeast: {
    id: "mrbeast", label: "🔥 MrBeast Bold",
    fill: "#ffffff", stroke: "#000000", box: null,
    highlightFill: "#ffea00", highlightStroke: "#000000",
    shadow: "rgba(0,0,0,0.95)", shadowBlur: 8, shadowOffset: 4,
    glow: "rgba(255, 234, 0, 0.9)",
    dt: (bw) => `fontcolor=0xFFEA00:borderw=${bw}:bordercolor=black@0.95:shadowcolor=black@0.9:shadowx=4:shadowy=4`,
  },
  fire: {
    id: "fire", label: "🔴 Fire Alert",
    fill: "#fff2e0", stroke: "#000000", box: null,
    highlightFill: "#ff3b30", highlightStroke: "#000000",
    glow: "rgba(255, 59, 48, 0.95)",
    dt: (bw) => `fontcolor=0xFF3B30:borderw=${bw}:bordercolor=black@0.95`,
  },
  cyberpunk: {
    id: "cyberpunk", label: "🔵 Cyberpunk Cyan",
    fill: "#e0f7fa", stroke: "#000000", box: null,
    highlightFill: "#00f2fe", highlightStroke: "#000000",
    glow: "rgba(0, 242, 254, 0.95)",
    dt: (bw) => `fontcolor=0x00F2FE:borderw=${bw}:bordercolor=black@0.95`,
  },
  netflix: {
    id: "netflix", label: "🎬 Netflix Cinema",
    fill: "rgba(235, 238, 245, 0.72)", stroke: null, box: "rgba(15, 18, 24, 0.8)",
    highlightFill: "#ffffff", highlightStroke: null,
    glow: "rgba(255, 255, 255, 0.85)",
    dt: (bw, fs) => `fontcolor=white:box=1:boxcolor=0x0F1218@0.78:boxborderw=${Math.max(4, Math.round(fs * 0.2))}`,
  },
  hormozi: {
    id: "hormozi", label: "⚡ Alex Hormozi (Lime Pop)",
    fill: "#ffffff", stroke: "#000000", box: null,
    highlightFill: "#ccff00", highlightStroke: "#000000",
    glow: "rgba(204, 255, 0, 0.95)",
    shadow: "rgba(0,0,0,0.95)", shadowBlur: 10, shadowOffset: 5,
    dt: (bw) => `fontcolor=0xCCFF00:borderw=${bw}:bordercolor=black@0.95:shadowcolor=black@0.95:shadowx=5:shadowy=5`,
  },
  abdaal: {
    id: "abdaal", label: "🎙️ Ali Abdaal (Minimal Glass)",
    fill: "#f8fafc", stroke: null, box: "rgba(15, 23, 42, 0.75)",
    highlightFill: "#38bdf8", highlightStroke: null,
    glow: "rgba(56, 189, 248, 0.85)",
    dt: (bw, fs) => `fontcolor=0x38BDF8:box=1:boxcolor=0x0F172A@0.75:boxborderw=${Math.max(4, Math.round(fs * 0.18))}`,
  },
  gadzhi: {
    id: "gadzhi", label: "📜 Iman Gadzhi (Luxury Gold)",
    fill: "#f8fafc", stroke: "#1a1408", box: null,
    highlightFill: "#f59e0b", highlightStroke: "#000000",
    glow: "rgba(245, 158, 11, 0.95)",
    shadow: "rgba(0,0,0,0.85)", shadowBlur: 6, shadowOffset: 3,
    dt: (bw) => `fontcolor=0xF59E0B:borderw=${bw}:bordercolor=0x1A1408@0.9`,
  },
  vox: {
    id: "vox", label: "🔥 Vox / Explainer Tag",
    fill: "#ffffff", stroke: "#000000", box: "rgba(0,0,0,0.82)",
    highlightFill: "#ffea00", highlightStroke: "#000000",
    glow: "rgba(255, 234, 0, 0.9)",
    dt: (bw, fs) => `fontcolor=0xFFEA00:box=1:boxcolor=black@0.82:boxborderw=${Math.max(4, Math.round(fs * 0.18))}`,
  },
  comic: {
    id: "comic", label: "💥 Comic Pop / Gaming",
    fill: "#ffffff", stroke: "#000000", box: null,
    highlightFill: "#ff2d55", highlightStroke: "#000000",
    glow: "rgba(255, 45, 85, 0.95)",
    shadow: "rgba(0,0,0,0.9)", shadowBlur: 8, shadowOffset: 4,
    dt: (bw) => `fontcolor=0xFF2D55:borderw=${bw}:bordercolor=black@0.95:shadowcolor=black@0.9:shadowx=4:shadowy=4`,
  },
  ovogold: {
    id: "ovogold", label: "🦉 OVO Luxury (Slate & Gold)",
    fill: "#f8fafc", stroke: null, box: "rgba(15, 17, 23, 0.88)",
    highlightFill: "#fbbf24", highlightStroke: null,
    glow: "rgba(251, 191, 36, 0.95)",
    dt: (bw, fs) => `fontcolor=0xFBBF24:box=1:boxcolor=0x0F1117@0.88:boxborderw=${Math.max(4, Math.round(fs * 0.2))}`,
  },
  terminal: {
    id: "terminal", label: "📟 Hacker Terminal [Green]",
    fill: "#22c55e", stroke: "#000000", box: "rgba(0, 20, 5, 0.85)",
    highlightFill: "#00ff66", highlightStroke: "#003311",
    glow: "rgba(0, 255, 102, 0.9)",
    dt: (bw, fs) => `fontcolor=0x00FF66:box=1:boxcolor=0x001405@0.85:boxborderw=${Math.max(3, Math.round(fs * 0.16))}`,
  },
};
export const CAPTION_STYLE_LIST = Object.keys(CAPTION_STYLES).map((id) => CAPTION_STYLES[id]);

// ---- 1-Click CapCut Viral Caption Templates ----
export const CAPTION_TEMPLATE_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "viral", label: "🔥 Viral" },
  { id: "glow", label: "✨ Glow" },
  { id: "box", label: "💊 Badges" },
  { id: "cinema", label: "🎬 Minimal" },
];

export const CAPTION_TEMPLATES = [
  {
    id: "hormozi_viral",
    name: "Alex Hormozi Viral",
    shortLabel: "Hormozi Pop",
    category: "viral",
    subtitle: "High retention, bold lime pop, reels/shorts #1",
    tag: "POPULAR",
    badgeColor: "#ccff00",
    styleId: "hormozi",
    fontId: "montserrat",
    accentColor: "#ccff00",
    position: "lower",
    size: "lg",
    uppercase: true,
    anim: "pop",
    previewText: "MAKE $1M/MONTH",
    previewAa: {
      text: "Aa",
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 900,
      color: "#ccff00",
      textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 3px 6px rgba(0,0,0,0.8)",
    },
    previewStyle: { background: "#000", color: "#ccff00", fontWeight: 900, textShadow: "1px 1px 0 #000" }
  },
  {
    id: "capcut_pill_badge",
    name: "CapCut Word Capsule",
    shortLabel: "Word Pill",
    category: "box",
    subtitle: "Active word in a floating dark rounded pill",
    tag: "TRENDING",
    badgeColor: "#ffd400",
    styleId: "capcut_pill",
    fontId: "outfit",
    accentColor: "#ffd400",
    position: "lower",
    size: "md",
    uppercase: true,
    anim: "pill",
    previewText: "ROUNDED PILL",
    previewAa: {
      text: "Aa",
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 800,
      color: "#ffd400",
      background: "rgba(10,12,18,0.95)",
      border: "1px solid rgba(255,212,0,0.6)",
      borderRadius: "6px",
      padding: "1px 6px",
    },
    previewStyle: { background: "rgba(10,12,18,0.92)", color: "#ffd400", border: "1px solid rgba(255,212,0,0.5)", borderRadius: "12px", padding: "1px 8px", fontWeight: 800 }
  },
  {
    id: "capcut_bounce_green",
    name: "CapCut Dynamic Bounce",
    shortLabel: "Neon Bounce",
    category: "viral",
    subtitle: "Electric green active word with vertical sine bounce",
    tag: "BOUNCE",
    badgeColor: "#00ff66",
    styleId: "capcut_bounce",
    fontId: "montserrat",
    accentColor: "#00ff66",
    position: "lower",
    size: "lg",
    uppercase: true,
    anim: "bounce",
    previewText: "BOUNCE POP!",
    previewAa: {
      text: "Aa",
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 900,
      color: "#00ff66",
      textShadow: "0 0 10px rgba(0,255,102,0.85), 0 2px 4px #000",
    },
    previewStyle: { color: "#00ff66", textShadow: "0 0 10px rgba(0,255,102,0.9)", fontWeight: 900 }
  },
  {
    id: "karaoke_gold",
    name: "Golden Karaoke Sync",
    shortLabel: "Karaoke Gold",
    category: "viral",
    subtitle: "Words fill with radiant gold as spoken",
    tag: "SYNC",
    badgeColor: "#fbbf24",
    styleId: "capcut_karaoke",
    fontId: "bebas",
    accentColor: "#ffe600",
    position: "lower",
    size: "lg",
    uppercase: true,
    anim: "karaoke",
    previewText: "KARAOKE SYNC",
    previewAa: {
      text: "Aa",
      fontFamily: '"Bebas Neue", sans-serif',
      fontWeight: 800,
      color: "#ffe600",
      textShadow: "0 0 8px rgba(255,230,0,0.9)",
      letterSpacing: "1px",
    },
    previewStyle: { color: "#ffe600", textShadow: "0 0 10px rgba(255,230,0,0.9)", fontWeight: 800 }
  },
  {
    id: "neon_cyber_pulse",
    name: "Cyberpunk Neon Glow",
    shortLabel: "Cyber Cyan",
    category: "glow",
    subtitle: "Electric cyan bloom for tech, gaming & crypto",
    tag: "GLOW",
    badgeColor: "#00f2fe",
    styleId: "cyberpunk",
    fontId: "russo",
    accentColor: "#00f2fe",
    position: "lower",
    size: "md",
    uppercase: true,
    anim: "glow",
    previewText: "CYBER GLOW",
    previewAa: {
      text: "Aa",
      fontFamily: '"Russo One", sans-serif',
      fontWeight: 800,
      color: "#00f2fe",
      textShadow: "0 0 12px #00f2fe, 0 0 20px rgba(0,242,254,0.6)",
    },
    previewStyle: { color: "#00f2fe", textShadow: "0 0 12px #00f2fe", fontWeight: 800 }
  },
  {
    id: "mrbeast_hype",
    name: "MrBeast Attention Grabber",
    shortLabel: "MrBeast Bold",
    category: "viral",
    subtitle: "Heavy black stroke, huge punchy yellow text",
    tag: "HYPE",
    badgeColor: "#ffea00",
    styleId: "mrbeast",
    fontId: "impact",
    accentColor: "#ffea00",
    position: "middle",
    size: "lg",
    uppercase: true,
    anim: "pop",
    previewText: "I GAVE AWAY $10,000",
    previewAa: {
      text: "Aa",
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontWeight: 900,
      color: "#ffea00",
      textShadow: "2px 2px 0 #000, -2px -2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000",
    },
    previewStyle: { color: "#ffea00", textShadow: "1.5px 1.5px 0 #000, -1.5px -1.5px 0 #000", fontWeight: 900 }
  },
  {
    id: "comic_3d_punch",
    name: "3D Comic Block Extrusion",
    shortLabel: "3D Comic",
    category: "box",
    subtitle: "Action gaming style with 3D drop depth",
    tag: "3D POP",
    badgeColor: "#ff2d55",
    styleId: "capcut_3d",
    fontId: "bangers",
    accentColor: "#ff2d55",
    position: "middle",
    size: "lg",
    uppercase: true,
    anim: "pop",
    previewText: "LEVEL UP!",
    previewAa: {
      text: "Aa",
      fontFamily: '"Bangers", cursive',
      fontWeight: 900,
      color: "#ff2d55",
      textShadow: "2px 2px 0 #5b0617, 4px 4px 0 #000",
      letterSpacing: "1px",
    },
    previewStyle: { color: "#ff2d55", textShadow: "2px 2px 0 #1a0005, 4px 4px 0 #000", fontWeight: 900 }
  },
  {
    id: "highlighter_marker",
    name: "CapCut Marker Highlighter",
    shortLabel: "Highlighter",
    category: "box",
    subtitle: "Neon marker pen strip behind active spoken words",
    tag: "MARKER",
    badgeColor: "#ffe600",
    styleId: "capcut_highlight",
    fontId: "montserrat",
    accentColor: "#ffe600",
    position: "lower",
    size: "md",
    uppercase: false,
    anim: "highlighter",
    previewText: "HIGHLIGHT TEXT",
    previewAa: {
      text: "Aa",
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 800,
      color: "#000",
      background: "#ffe600",
      padding: "1px 6px",
      borderRadius: "3px",
      boxShadow: "0 2px 8px rgba(255,230,0,0.4)",
    },
    previewStyle: { background: "#ffe600", color: "#000", padding: "1px 6px", borderRadius: "3px", fontWeight: 800 }
  },
  {
    id: "abdaal_aesthetic",
    name: "Ali Abdaal Productivity",
    shortLabel: "Ali Abdaal",
    category: "cinema",
    subtitle: "Aesthetic frosted glass badge with calm sky blue",
    tag: "MINIMAL",
    badgeColor: "#38bdf8",
    styleId: "abdaal",
    fontId: "poppins",
    accentColor: "#38bdf8",
    position: "lower",
    size: "sm",
    uppercase: false,
    anim: "pop",
    previewText: "Focus & Flow",
    previewAa: {
      text: "Aa",
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 700,
      color: "#38bdf8",
      background: "rgba(15,23,42,0.85)",
      padding: "2px 7px",
      borderRadius: "5px",
      border: "1px solid rgba(56,189,248,0.25)",
    },
    previewStyle: { background: "rgba(15,23,42,0.85)", color: "#38bdf8", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }
  },
  {
    id: "gadzhi_luxury_doc",
    name: "Iman Gadzhi Luxury Serif",
    shortLabel: "Gold Luxury",
    category: "glow",
    subtitle: "High-status golden serif for documentary storytelling",
    tag: "LUXURY",
    badgeColor: "#f59e0b",
    styleId: "gadzhi",
    fontId: "cinzel",
    accentColor: "#f59e0b",
    position: "lower",
    size: "md",
    uppercase: false,
    anim: "pop",
    previewText: "The Art of Power",
    previewAa: {
      text: "Aa",
      fontFamily: '"Cinzel", serif',
      fontWeight: 700,
      color: "#f59e0b",
      fontStyle: "italic",
      textShadow: "0 2px 8px rgba(245,158,11,0.5)",
    },
    previewStyle: { color: "#f59e0b", fontStyle: "italic", fontWeight: 700 }
  },
  {
    id: "capcut_neon_bloom",
    name: "CapCut Neon Bloom",
    shortLabel: "Neon Bloom",
    category: "glow",
    subtitle: "Vivid blue light aura with multi-layer shadow",
    tag: "BLOOM",
    badgeColor: "#38bdf8",
    styleId: "capcut_glow",
    fontId: "outfit",
    accentColor: "#38bdf8",
    position: "lower",
    size: "md",
    uppercase: true,
    anim: "glow",
    previewText: "NEON BLOOM",
    previewAa: {
      text: "Aa",
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 800,
      color: "#38bdf8",
      textShadow: "0 0 10px #38bdf8, 0 0 18px rgba(56,189,248,0.5)",
    },
    previewStyle: { color: "#38bdf8", textShadow: "0 0 10px #38bdf8", fontWeight: 800 }
  },
  {
    id: "netflix_cinema",
    name: "Netflix Documentary",
    shortLabel: "Cinematic",
    category: "cinema",
    subtitle: "Distraction-free cinematic subtitle bar",
    tag: "SUBTITLE",
    badgeColor: "#94a3b8",
    styleId: "netflix",
    fontId: "poppins",
    accentColor: "#ffffff",
    position: "bottom",
    size: "sm",
    uppercase: false,
    anim: "none",
    previewText: "Underneath the surface.",
    previewAa: {
      text: "Aa",
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 600,
      color: "#ffffff",
      background: "rgba(15,18,24,0.85)",
      padding: "2px 7px",
      borderRadius: "4px",
    },
    previewStyle: { background: "rgba(15,18,24,0.85)", color: "#fff", padding: "2px 6px", borderRadius: "4px", fontWeight: 500 }
  },
];

export const POPULAR_FONTS = [
  { id: "default", label: "Bold Sans (Default)", creator: "Universal Viral", family: '"CaptionFont", "Impact", "Arial Black"' },
  { id: "montserrat", label: "Montserrat Black", creator: "Alex Hormozi & MrBeast", family: '"Montserrat", "Arial Black", "Impact"' },
  { id: "bebas", label: "Bebas Neue (Tall)", creator: "Viral Shorts & Reels", family: '"Bebas Neue", "Impact", sans-serif' },
  { id: "poppins", label: "Poppins Bold", creator: "Ali Abdaal & Tech", family: '"Poppins", "Segoe UI", sans-serif' },
  { id: "anton", label: "Anton Bold", creator: "Punchy Compact Shorts", family: '"Anton", "Impact", sans-serif' },
  { id: "russo", label: "Russo One", creator: "Gaming & Cyber Shorts", family: '"Russo One", "Impact", sans-serif' },
  { id: "theboldfont", label: "The Bold Font", creator: "YouTube Creator Classic", family: '"TheBoldFont", "Montserrat", "Arial Black"' },
  { id: "impact", label: "Impact Heavy", creator: "Classic Meme & Hype", family: '"Impact", "Arial Black", sans-serif' },
  { id: "outfit", label: "Outfit Modern", creator: "Aesthetic Clean", family: '"Outfit", "Inter", sans-serif' },
  { id: "cinzel", label: "Cinzel Luxury", creator: "Iman Gadzhi & Storytelling", family: '"Cinzel", "Georgia", serif' },
  { id: "bangers", label: "Bangers Comic", creator: "Gaming & Anime Shorts", family: '"Bangers", "Impact", cursive' },
];

export const DEVANAGARI_FALLBACK = '"Nirmala UI", "Noto Sans Devanagari", "Mangal", "Kohinoor Devanagari", "Segoe UI", system-ui, -apple-system, sans-serif';

export function getCaptionFontFamily(fontId = "default") {
  const found = POPULAR_FONTS.find((f) => f.id === fontId);
  const primary = found ? found.family : POPULAR_FONTS[0].family;
  return `${primary}, ${DEVANAGARI_FALLBACK}`;
}

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
    if (/[.!?।॥]["')]?$/.test(w) && cur.length >= MAX_CUE_CHARS * 0.5) { chunks.push(cur); cur = ""; }
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
export function drawCaption(ctx, text, W, H, styleId, fontPx, lineHeight, cue = null, t = 0, pos = "bottom", fontId = "default", options = {}) {
  if (!text) return;
  const st = CAPTION_STYLES[styleId] || CAPTION_STYLES.classic;
  const opts = (typeof options === "object" && options !== null) ? options : {};
  const isUpper = opts.uppercase !== undefined ? opts.uppercase : !!st.uppercase;
  const animMode = opts.anim || st.anim || "pop";
  const processedText = isUpper ? text.toUpperCase() : text;

  const lines = wrapToWidth(processedText, captionMaxChars(W, fontPx));
  const n = lines.length;
  const lhf = lineHeight > 0 ? lineHeight : lineHeightFactor(st);

  ctx.save();
  // Dynamic popular font with multi-script Devanagari (Hindi) + Latin (English & Hinglish) robust fallback
  const fontFam = getCaptionFontFamily(fontId);
  ctx.font = `700 ${fontPx}px ${fontFam}`;
  ctx.textBaseline = "alphabetic";

  const isWordByWord = !!(cue && cue.end > cue.start);
  let activeWordGlobal = -1;
  let wordProgress = 0;
  if (isWordByWord) {
    const span = Math.max(0.1, cue.end - cue.start);
    const progress = Math.min(1, Math.max(0, (t - cue.start) / span));
    const allWords = processedText.trim().split(/\s+/).filter(Boolean);
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
      const padX = fontPx * 0.42, padY = fontPx * 0.14;
      const boxTop = base - fontPx * 0.78 - padY;
      const boxH = fontPx * 0.98 + padY * 2;
      const boxX = (W - w) / 2 - padX;
      const boxW = w + padX * 2;
      ctx.fillStyle = st.box;
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(boxX, boxTop, boxW, boxH, Math.min(8, fontPx * 0.2));
        ctx.fill();
      } else {
        ctx.fillRect(boxX, boxTop, boxW, boxH);
      }
    }

    if (!isWordByWord || animMode === "none") {
      ctx.textAlign = "center";
      if (st.shadow) {
        ctx.save();
        ctx.shadowColor = st.shadow;
        ctx.shadowBlur = st.shadowBlur || 8;
        ctx.shadowOffsetX = st.shadowOffset || 4;
        ctx.shadowOffsetY = st.shadowOffset || 4;
        ctx.fillStyle = "#000";
        ctx.fillText(ln, W / 2, base);
        ctx.restore();
      }
      if (st.glow) {
        ctx.save();
        ctx.shadowColor = st.glow;
        ctx.shadowBlur = Math.round(fontPx * 0.45);
        ctx.fillStyle = st.fill;
        ctx.fillText(ln, W / 2, base);
        ctx.restore();
      }
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
          // CapCut Capsule Pill Box behind active word
          if (st.pill || animMode === "pill") {
            const padX = Math.round(fontPx * 0.28);
            const padY = Math.round(fontPx * 0.12);
            const pillX = curX - padX;
            const pillY = base - fontPx * 0.84 - padY;
            const pillW = wWidth + padX * 2;
            const pillH = fontPx * 1.02 + padY * 2;
            const r = Math.min(14, Math.round(pillH * 0.38));
            ctx.save();
            ctx.fillStyle = st.pillBg || "rgba(10, 12, 18, 0.94)";
            ctx.beginPath();
            if (typeof ctx.roundRect === "function") {
              ctx.roundRect(pillX, pillY, pillW, pillH, r);
            } else {
              ctx.fillRect(pillX, pillY, pillW, pillH);
            }
            ctx.fill();
            if (st.pillBorder) {
              ctx.strokeStyle = st.pillBorder;
              ctx.lineWidth = Math.max(1.5, Math.round(fontPx * 0.04));
              ctx.stroke();
            }
            ctx.restore();
          }

          // CapCut Highlighter marker strip behind active word
          if (st.highlighter || animMode === "highlighter") {
            ctx.save();
            ctx.fillStyle = st.highlighterColor || st.highlightFill || "#ffe600";
            ctx.globalAlpha = 0.65;
            const hPadX = fontPx * 0.08;
            ctx.fillRect(curX - hPadX, base - fontPx * 0.42, wWidth + hPadX * 2, fontPx * 0.48);
            ctx.restore();
          }

          // CapCut Word Bounce or Pop
          if (animMode === "bounce" || st.anim === "bounce") {
            const bounceY = Math.sin(Math.min(1, wordProgress) * Math.PI) * (fontPx * 0.16);
            const pop = 1 + Math.sin(Math.min(1, wordProgress) * Math.PI) * 0.12;
            const centerX = curX + wWidth / 2;
            ctx.translate(centerX, base - bounceY);
            ctx.scale(pop, pop);
            ctx.translate(-centerX, -(base - bounceY));
          } else if (animMode === "pop" || animMode === "pill" || st.anim === "pop") {
            const pop = 1 + Math.sin(Math.min(1, wordProgress) * Math.PI) * 0.18;
            const centerX = curX + wWidth / 2;
            ctx.translate(centerX, base);
            ctx.scale(pop, pop);
            ctx.translate(-centerX, -base);
          }

          if (st.glow || animMode === "glow") {
            ctx.shadowColor = st.glow || "rgba(56, 189, 248, 0.95)";
            ctx.shadowBlur = Math.round(fontPx * 0.52);
          }
          if (st.shadow) {
            ctx.shadowColor = st.shadow;
            ctx.shadowBlur = st.shadowBlur || 8;
            ctx.shadowOffsetX = st.shadowOffset || 4;
            ctx.shadowOffsetY = st.shadowOffset || 4;
          }
        } else {
          // Dim inactive words for Karaoke Focus
          if (st.dimInactive || animMode === "karaoke") {
            ctx.globalAlpha = 0.65;
          }
          if (st.shadow) {
            ctx.shadowColor = "rgba(0,0,0,0.7)";
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
          }
        }

        // CapCut 3D Comic Block Extrusion
        if (st.extrusion) {
          const extSteps = Math.max(2, Math.round(fontPx * 0.08));
          ctx.save();
          ctx.fillStyle = st.extrusionColor || "#000000";
          for (let ex = extSteps; ex >= 1; ex--) {
            ctx.fillText(w, curX + ex * 1.5, base + ex * 1.5);
          }
          ctx.restore();
        }

        const strokeColor = isActive
          ? (st.highlightStroke !== undefined ? st.highlightStroke : st.stroke)
          : st.stroke;
        if (strokeColor) {
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.lineWidth = Math.max(2, fontPx / (isActive ? 6 : 7));
          ctx.strokeStyle = strokeColor;
          ctx.strokeText(w, curX, base);
        }

        ctx.fillStyle = isActive ? (opts.accentColor || st.highlightFill || st.fill) : st.fill;
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
