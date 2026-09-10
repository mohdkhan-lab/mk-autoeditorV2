// Procedural SFX engine: generates cinematic transition sound effects (Whoosh / Swoosh)
// using pure mathematics and Web Audio filtering — zero external assets, 100% offline,
// instantaneous generation.

/**
 * Generate a stereo or mono Whoosh sound effect PCM buffer.
 * @param {number} sampleRate e.g. 48000
 * @param {number} duration seconds, default 0.36
 * @returns {Float32Array[]} [left, right] normalized audio channels
 */
export function generateWhooshPcm(sampleRate = 48000, duration = 0.36) {
  const totalSamples = Math.floor(sampleRate * duration);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  // Use seeded pseudo-random noise so the whoosh is reproducible and punchy
  let seed = 123456789;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 4294967296) * 2 - 1;
  };

  // Resonant 2-pole state variable filter (SVF) for dynamic bandpass sweep
  let s1L = 0, s2L = 0, s1R = 0, s2R = 0;
  const q = 3.2; // Resonance

  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples; // 0 to 1

    // Frequency sweep: starts around 280Hz, sweeps up to 3000Hz at peak, falls back to 400Hz
    const sweep = Math.sin(t * Math.PI);
    const freq = 280 + Math.pow(sweep, 1.8) * 2800;

    // Volume envelope: smooth crescendo and decrescendo
    const env = Math.pow(Math.sin(t * Math.PI), 1.5);

    // Filter coefficients
    const f = Math.min(0.45, (2 * Math.PI * freq) / sampleRate);

    // Noise input
    const inL = rand();
    const inR = rand();

    // SVF bandpass for left channel
    const hpL = inL - s1L * q - s2L;
    const bpL = hpL * f + s1L;
    s1L = bpL;
    s2L = bpL * f + s2L;

    // SVF bandpass for right channel (slightly offset for stereo width)
    const hpR = inR - s1R * (q * 0.95) - s2R;
    const bpR = hpR * (f * 1.05) + s1R;
    s1R = bpR;
    s2R = bpR * (f * 1.05) + s2R;

    left[i] = Math.max(-1, Math.min(1, bpL * env * 1.8));
    right[i] = Math.max(-1, Math.min(1, bpR * env * 1.8));
  }

  return [left, right];
}

// Cached singleton PCM buffer
let cachedWhoosh = null;
let cachedRate = 0;

export function getCachedWhoosh(sampleRate = 48000) {
  if (!cachedWhoosh || cachedRate !== sampleRate) {
    cachedWhoosh = generateWhooshPcm(sampleRate);
    cachedRate = sampleRate;
  }
  return cachedWhoosh;
}

/**
 * Play live Whoosh sound effect in browser using Web Audio context.
 * @param {AudioContext} ctx
 * @param {number} volume 0 to 1
 */
export function playWhoosh(ctx, volume = 0.5) {
  if (!ctx || ctx.state === "closed" || volume <= 0.01) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  try {
    const pcm = getCachedWhoosh(ctx.sampleRate);
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
