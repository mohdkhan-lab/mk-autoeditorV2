// Procedural SFX engine: generates cinematic transition sound effects
// using pure mathematics and Web Audio filtering — zero external assets, 100% offline,
// instantaneous generation.

export const TRANSITION_SFX_LIST = [
  { id: "whoosh", label: "Fast Whoosh", icon: "💨", desc: "Classic crisp air swoosh" },
  { id: "impact", label: "Deep Impact", icon: "⚡", desc: "Heavy cinematic bass whoosh" },
  { id: "shutter", label: "Camera Snap", icon: "📸", desc: "Crisp shutter snap & click" },
  { id: "glitch", label: "Cyber Glitch", icon: "📼", desc: "Digital static stutter zap" },
  { id: "pop", label: "Modern Pop", icon: "🫧", desc: "Clean organic vlog bubble pop" },
  { id: "whip", label: "Whip Swish", icon: "🌪️", desc: "Ultra-fast whip air flick" },
];

function createNoiseGenerator(seed = 123456789) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 4294967296) * 2 - 1;
  };
}

/**
 * 1. Classic Fast Whoosh (duration ~0.34s)
 */
export function generateWhooshPcm(sampleRate = 48000, duration = 0.34) {
  const totalSamples = Math.floor(sampleRate * duration);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  const rand = createNoiseGenerator(123456789);

  let s1L = 0, s2L = 0, s1R = 0, s2R = 0;
  const q = 3.2;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;
    const sweep = Math.sin(t * Math.PI);
    const freq = 280 + Math.pow(sweep, 1.8) * 2800;
    const env = Math.pow(Math.sin(t * Math.PI), 1.5);
    const f = Math.min(0.45, (2 * Math.PI * freq) / sampleRate);

    const inL = rand();
    const inR = rand();

    const hpL = inL - s1L * q - s2L;
    const bpL = hpL * f + s1L;
    s1L = bpL;
    s2L = bpL * f + s2L;

    const hpR = inR - s1R * (q * 0.95) - s2R;
    const bpR = hpR * (f * 1.05) + s1R;
    s1R = bpR;
    s2R = bpR * (f * 1.05) + s2R;

    left[i] = Math.max(-1, Math.min(1, bpL * env * 1.8));
    right[i] = Math.max(-1, Math.min(1, bpR * env * 1.8));
  }
  return [left, right];
}

/**
 * 2. Deep Impact Whoosh (duration ~0.48s): Sub-bass drop + heavy whoosh
 */
export function generateImpactPcm(sampleRate = 48000, duration = 0.48) {
  const totalSamples = Math.floor(sampleRate * duration);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  const rand = createNoiseGenerator(987654321);

  let s1 = 0, s2 = 0;
  let phase = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;

    // Sub-bass pitch drops from 140Hz down to 38Hz
    const bassFreq = 38 + Math.exp(-t * 6) * 102;
    phase += (2 * Math.PI * bassFreq) / sampleRate;
    const bassEnv = Math.exp(-t * 4.5);
    const sub = Math.sin(phase) * bassEnv * 0.75;

    // Resonant low-mid air sweep
    const sweep = Math.sin(t * Math.PI);
    const whooshFreq = 160 + Math.pow(sweep, 1.5) * 1600;
    const whooshEnv = Math.pow(Math.sin(t * Math.PI), 2.0);
    const f = Math.min(0.42, (2 * Math.PI * whooshFreq) / sampleRate);

    const n = rand();
    const hp = n - s1 * 2.8 - s2;
    const bp = hp * f + s1;
    s1 = bp;
    s2 = bp * f + s2;
    const air = bp * whooshEnv * 1.4;

    const mixed = sub + air;
    left[i] = Math.max(-1, Math.min(1, mixed));
    right[i] = Math.max(-1, Math.min(1, mixed * 0.96));
  }
  return [left, right];
}

/**
 * 3. Camera Snap / Shutter Click (duration ~0.24s)
 */
export function generateShutterPcm(sampleRate = 48000, duration = 0.24) {
  const totalSamples = Math.floor(sampleRate * duration);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  const rand = createNoiseGenerator(554433221);

  const tSecondClick = Math.floor(sampleRate * 0.058);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // First shutter snap at t = 0
    if (i < sampleRate * 0.04) {
      const p = i / (sampleRate * 0.04);
      const env = Math.exp(-p * 12);
      sample += (rand() * 0.85 + Math.sin(2 * Math.PI * 2800 * t) * 0.4) * env;
    }

    // Second mechanical catch at 58ms
    if (i >= tSecondClick && i < tSecondClick + sampleRate * 0.08) {
      const p = (i - tSecondClick) / (sampleRate * 0.08);
      const env = Math.exp(-p * 9);
      sample += (rand() * 0.7 + Math.sin(2 * Math.PI * 1900 * t) * 0.3) * env;
    }

    left[i] = Math.max(-1, Math.min(1, sample * 1.3));
    right[i] = Math.max(-1, Math.min(1, sample * 1.25));
  }
  return [left, right];
}

/**
 * 4. Cyber Glitch / Static Stutter (duration ~0.28s)
 */
export function generateGlitchPcm(sampleRate = 48000, duration = 0.28) {
  const totalSamples = Math.floor(sampleRate * duration);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  const rand = createNoiseGenerator(112233445);

  let phase = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;
    // 3 rapid burst segments (stutter)
    const burst = Math.floor(t * 7) % 2 === 0 ? 1 : 0.15;
    const toneFreq = 420 + Math.floor(t * 5) * 310;
    phase += (2 * Math.PI * toneFreq) / sampleRate;

    const noise = rand();
    const square = Math.sign(Math.sin(phase));
    const sample = (noise * 0.65 + square * 0.35) * burst * (1 - t * 0.8);

    left[i] = Math.max(-1, Math.min(1, sample * 1.2));
    right[i] = Math.max(-1, Math.min(1, (noise * 0.5 + square * 0.4) * burst * (1 - t * 0.8) * 1.2));
  }
  return [left, right];
}

/**
 * 5. Modern Bubble Pop (duration ~0.16s)
 */
export function generatePopPcm(sampleRate = 48000, duration = 0.16) {
  const totalSamples = Math.floor(sampleRate * duration);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  let phase = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;
    // Rapid pitch drop 920Hz down to 180Hz
    const freq = 180 + Math.exp(-t * 9) * 740;
    phase += (2 * Math.PI * freq) / sampleRate;

    // Crisp pop envelope
    const env = Math.exp(-t * 11) * Math.sin(Math.min(1, t * 25) * Math.PI * 0.5);
    const sample = Math.sin(phase) * env;

    left[i] = Math.max(-1, Math.min(1, sample * 1.5));
    right[i] = Math.max(-1, Math.min(1, sample * 1.5));
  }
  return [left, right];
}

/**
 * 6. Whip Swish (duration ~0.22s): Ultra-fast whip air flick
 */
export function generateWhipPcm(sampleRate = 48000, duration = 0.22) {
  const totalSamples = Math.floor(sampleRate * duration);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  const rand = createNoiseGenerator(778899001);

  let s1 = 0, s2 = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;
    // Fast rise and steep fall
    const env = t < 0.25 ? Math.pow(t / 0.25, 2) : Math.pow(1 - (t - 0.25) / 0.75, 2.5);
    const freq = 600 + Math.pow(t, 2) * 3600;
    const f = Math.min(0.46, (2 * Math.PI * freq) / sampleRate);

    const n = rand();
    const hp = n - s1 * 2.5 - s2;
    const bp = hp * f + s1;
    s1 = bp;
    s2 = bp * f + s2;

    const sample = bp * env * 2.1;
    left[i] = Math.max(-1, Math.min(1, sample));
    right[i] = Math.max(-1, Math.min(1, sample * 0.94));
  }
  return [left, right];
}

/**
 * Master dispatcher for any SFX type
 */
export function generateSfxPcm(type = "whoosh", sampleRate = 48000) {
  switch (type) {
    case "impact":
      return generateImpactPcm(sampleRate);
    case "shutter":
      return generateShutterPcm(sampleRate);
    case "glitch":
      return generateGlitchPcm(sampleRate);
    case "pop":
      return generatePopPcm(sampleRate);
    case "whip":
      return generateWhipPcm(sampleRate);
    case "whoosh":
    default:
      return generateWhooshPcm(sampleRate);
  }
}

// Cached singleton PCM buffer map
const cache = new Map();

export function getCachedSfx(type = "whoosh", sampleRate = 48000) {
  const key = `${type}_${sampleRate}`;
  if (!cache.has(key)) {
    cache.set(key, generateSfxPcm(type, sampleRate));
  }
  return cache.get(key);
}

// Backward-compat helper
export function getCachedWhoosh(sampleRate = 48000) {
  return getCachedSfx("whoosh", sampleRate);
}

/**
 * Play live sound effect in browser using Web Audio context.
 * @param {AudioContext} ctx
 * @param {string} type "whoosh" | "impact" | "shutter" | "glitch" | "pop" | "whip"
 * @param {number} volume 0 to 1
 */
export function playSfx(ctx, type = "whoosh", volume = 0.5) {
  if (!ctx || ctx.state === "closed" || volume <= 0.01) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  try {
    const pcm = getCachedSfx(type, ctx.sampleRate);
    const buf = ctx.createBuffer(2, pcm[0].length, ctx.sampleRate);
    buf.copyToChannel(pcm[0], 0);
    buf.copyToChannel(pcm[1], 1);

    const source = ctx.createBufferSource();
    source.buffer = buf;

    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
  } catch (_) {
    // Ignore audio context errors
  }
}

// Backward-compat helper
export function playWhoosh(ctx, volume = 0.5) {
  playSfx(ctx, "whoosh", volume);
}
