// Multi-Track Background Music (BGM) with Auto-Ducking:
// Computes volume ducking curves and looped audio mixing slices.

/**
 * Compute the instantaneous BGM volume at time `t`, applying smooth ducking
 * whenever the voiceover narration is active.
 *
 * @param {number} t - current playback or render time in seconds
 * @param {Array<{start: number, end: number}>} voiceSegments - active speech/audio intervals
 * @param {boolean} duckingEnabled - whether auto-ducking is turned on (default true)
 * @param {number} baseVolume - user configured BGM volume (0.0 to 1.0, e.g. 0.3)
 * @param {number} duckMultiplier - multiplier during speech (default 0.25 = 25% of base volume)
 * @returns {number} effective gain (0.0 to 1.0)
 */
export function getBgmDuckedGain(t, voiceSegments = [], duckingEnabled = true, baseVolume = 0.3, duckMultiplier = 0.25) {
  if (baseVolume <= 0) return 0;
  if (!duckingEnabled || !voiceSegments || !voiceSegments.length) return baseVolume;

  const duckVol = baseVolume * duckMultiplier;
  const attack = 0.25;  // 250ms smooth fade down into speech
  const release = 0.5;  // 500ms smooth fade up out of speech

  let minGain = baseVolume;

  for (let i = 0; i < voiceSegments.length; i++) {
    const seg = voiceSegments[i];
    const s = seg.start;
    const e = seg.end;

    // Inside speech
    if (t >= s && t <= e) {
      return duckVol;
    }

    // Approaching speech (fade down / attack)
    if (t >= s - attack && t < s) {
      const frac = (s - t) / attack; // 1 at (s - attack), 0 at s
      const g = duckVol + (baseVolume - duckVol) * frac;
      if (g < minGain) minGain = g;
    }

    // Leaving speech (fade up / release)
    if (t > e && t <= e + release) {
      const frac = (t - e) / release; // 0 at e, 1 at (e + release)
      const g = duckVol + (baseVolume - duckVol) * frac;
      if (g < minGain) minGain = g;
    }
  }

  return minGain;
}

/**
 * Given a set of caption cues or speech cuts, extract active speech intervals.
 */
export function extractVoiceSegments(cues = [], defaultSpan = 0) {
  if (cues && cues.length) {
    return cues.map((c) => ({
      start: Math.max(0, c.start),
      end: Math.max(c.start + 0.2, c.end || c.start + 1.0),
    }));
  }
  // Fallback: If no cues provided but audio duration exists, treat entire duration as speech
  if (defaultSpan > 0) {
    return [{ start: 0, end: defaultSpan }];
  }
  return [];
}
