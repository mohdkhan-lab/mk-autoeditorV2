// CapCut-style visual effects definitions for preview (Canvas) and export (FFmpeg).

export const EFFECTS = {
  none: {
    id: "none",
    name: "None",
    category: "Basic",
    icon: "⊘",
    description: "No effect applied",
    defaultIntensity: 100,
  },
  shake: {
    id: "shake",
    name: "Camera Shake",
    category: "Motion",
    icon: "📳",
    description: "Handheld camera rumble and vibration",
    defaultIntensity: 70,
  },
  flash: {
    id: "flash",
    name: "White Flash",
    category: "Motion",
    icon: "⚡",
    description: "Bright white opening flash transition",
    defaultIntensity: 90,
  },
  glitch: {
    id: "glitch",
    name: "RGB Glitch",
    category: "Motion",
    icon: "👾",
    description: "Chromatic aberration and horizontal slice jitter",
    defaultIntensity: 65,
  },
  pulse: {
    id: "pulse",
    name: "Zoom Pulse",
    category: "Motion",
    icon: "💓",
    description: "Rhythmic breathing beat zoom pulse",
    defaultIntensity: 60,
  },
  grain: {
    id: "grain",
    name: "Film Grain",
    category: "Cinematic",
    icon: "🎞️",
    description: "Organic moving 35mm cinematic film noise",
    defaultIntensity: 75,
  },
  vignette: {
    id: "vignette",
    name: "Vignette",
    category: "Cinematic",
    icon: "🎯",
    description: "Dark moody vignette focusing on the center",
    defaultIntensity: 80,
  },
  vintage: {
    id: "vintage",
    name: "Vintage 90s",
    category: "Cinematic",
    icon: "📼",
    description: "Warm retro 90s film look with heightened contrast",
    defaultIntensity: 70,
  },
  noir: {
    id: "noir",
    name: "B&W Noir",
    category: "Styles",
    icon: "🖤",
    description: "High-contrast dramatic black and white monochrome",
    defaultIntensity: 100,
  },
  neon: {
    id: "neon",
    name: "Cyber Neon",
    category: "Styles",
    icon: "🌆",
    description: "Vibrant cyberpunk magenta-cyan color tint",
    defaultIntensity: 75,
  },
  sunset: {
    id: "sunset",
    name: "Warm Sunset",
    category: "Styles",
    icon: "🌅",
    description: "Golden hour warm amber sunlight wash",
    defaultIntensity: 70,
  },
  particles: {
    id: "particles",
    name: "Golden Dust",
    category: "Atmosphere",
    icon: "✨",
    description: "Cinematic floating golden bokeh dust particles like MK Finance",
    defaultIntensity: 75,
  },
};

// Cached noise pattern canvas for ultra-fast film grain rendering
let noisePatternCanvas = null;
function getNoisePattern(ctx) {
  if (noisePatternCanvas) return noisePatternCanvas;
  if (typeof document === "undefined") return null;
  const sz = 128;
  const c = document.createElement("canvas");
  c.width = sz; c.height = sz;
  const cx = c.getContext("2d");
  const idata = cx.createImageData(sz, sz);
  const buf = new Uint32Array(idata.data.buffer);
  for (let i = 0; i < buf.length; i++) {
    const v = (Math.random() * 255) | 0;
    buf[i] = (v << 24) | (v << 16) | (v << 8) | 255;
  }
  cx.putImageData(idata, 0, 0);
  noisePatternCanvas = c;
  return c;
}

// Transform matrix applied BEFORE the clip is drawn on canvas (for shake, zoom pulse)
export function getPreDrawTransform(effectId, intensity = 100, clipTime = 0, clipDuration = 1, W = 1920, H = 1080) {
  if (!effectId || effectId === "none") return null;
  const factor = Math.max(0, Math.min(100, intensity)) / 100;

  if (effectId === "shake") {
    const mag = 14 * factor;
    const t = clipTime;
    const dx = (Math.sin(t * 38) * 0.65 + Math.cos(t * 62) * 0.35) * mag;
    const dy = (Math.cos(t * 44) * 0.65 + Math.sin(t * 57) * 0.35) * mag;
    return { dx, dy, scale: 1.04 }; // scale slightly so edges don't show black during shake
  }

  if (effectId === "pulse") {
    const pScale = 1 + (Math.sin(clipTime * Math.PI * 4) * 0.045) * factor;
    return { dx: 0, dy: 0, scale: Math.max(1, pScale) };
  }

  return null;
}

// 70 deterministic particle seeds for procedural floating golden dust simulation
const PARTICLE_SEEDS = Array.from({ length: 70 }, (_, i) => {
  const s1 = Math.sin(i * 12.9898 + 78.233);
  const s2 = Math.cos(i * 37.719 + 11.23);
  const s3 = Math.sin(i * 93.91 + 43.12);
  const s4 = Math.cos(i * 17.31 + 5.17);
  const r1 = s1 - Math.floor(s1);
  const r2 = s2 - Math.floor(s2);
  const r3 = s3 - Math.floor(s3);
  const r4 = s4 - Math.floor(s4);

  return {
    x0: r1,
    y0: r2,
    r: 3 + r3 * 11,
    speed: 0.07 + r4 * 0.12,
    swayAmp: 0.015 + r1 * 0.025,
    swayFreq: 0.8 + r2 * 1.6,
    phase: r3 * Math.PI * 2,
    twinkleFreq: 1.5 + r4 * 2.5,
    alpha: 0.45 + r1 * 0.5,
  };
});

// Canvas post-draw effect: drawn on top of the clip inside the 60fps render loop
export function applyCanvasPostEffect(ctx, effectId, intensity = 100, clipTime = 0, clipDuration = 1, W = 1920, H = 1080) {
  if (!effectId || effectId === "none" || !ctx) return;
  const factor = Math.max(0, Math.min(100, +intensity || 0)) / 100;
  const cTime = (typeof clipTime === "number" && isFinite(clipTime)) ? Math.max(0, clipTime) : 0;
  const width = Math.max(1, (typeof W === "number" && isFinite(W) && W > 0) ? W : (ctx.canvas && ctx.canvas.width ? ctx.canvas.width : 1920));
  const height = Math.max(1, (typeof H === "number" && isFinite(H) && H > 0) ? H : (ctx.canvas && ctx.canvas.height ? ctx.canvas.height : 1080));

  try {
    switch (effectId) {
      case "flash": {
        const flashDuration = 0.35;
        if (cTime < flashDuration) {
          const alpha = Math.max(0, 1 - cTime / flashDuration) * factor * 0.95;
          ctx.save();
          try {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
            ctx.fillRect(0, 0, width, height);
          } finally {
            ctx.restore();
          }
        }
        break;
      }

      case "glitch": {
        const isGlitchFrame = Math.sin(cTime * 22) > 0.45;
        if (isGlitchFrame && width > 0 && height > 0) {
          ctx.save();
          try {
            const sliceCount = 3 + Math.floor(factor * 3);
            const maxOffset = 18 * factor;
            for (let s = 0; s < sliceCount; s++) {
              const sy = (height / sliceCount) * s + (Math.sin(cTime * 50 + s) * 15);
              const sh = (height / sliceCount) * 0.6;
              const sx = (Math.sin(cTime * 90 + s * 13) * maxOffset);
              try {
                ctx.drawImage(ctx.canvas, 0, sy, width, sh, sx, sy, width, sh);
              } catch (_) { /* ignore if canvas cross-origin */ }
            }
            ctx.fillStyle = `rgba(0, 240, 255, ${(0.08 * factor).toFixed(3)})`;
            ctx.fillRect(0, 0, width, height);
          } finally {
            ctx.restore();
          }
        }
        break;
      }

      case "vignette": {
        const radius = Math.max(width, height) * 0.72;
        ctx.save();
        try {
          const grad = ctx.createRadialGradient(width / 2, height / 2, radius * 0.35, width / 2, height / 2, radius);
          grad.addColorStop(0, "rgba(0, 0, 0, 0)");
          grad.addColorStop(1, `rgba(0, 0, 0, ${(0.82 * factor).toFixed(3)})`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        } finally {
          ctx.restore();
        }
        break;
      }

      case "grain": {
        const pCanvas = getNoisePattern(ctx);
        if (pCanvas) {
          ctx.save();
          try {
            ctx.globalAlpha = Math.max(0.04, 0.14 * factor);
            ctx.globalCompositeOperation = "screen";
            const ox = (Math.random() * 128) | 0;
            const oy = (Math.random() * 128) | 0;
            const ptrn = ctx.createPattern(pCanvas, "repeat");
            if (ptrn) {
              ctx.translate(ox, oy);
              ctx.fillStyle = ptrn;
              ctx.fillRect(-ox, -oy, width + 128, height + 128);
            }
          } finally {
            ctx.restore();
          }
        }
        break;
      }

      case "vintage": {
        ctx.save();
        try {
          ctx.globalAlpha = 0.28 * factor;
          ctx.globalCompositeOperation = "multiply";
          ctx.fillStyle = "#ffeedd";
          ctx.fillRect(0, 0, width, height);
          ctx.globalAlpha = 0.15 * factor;
          ctx.globalCompositeOperation = "overlay";
          ctx.fillStyle = "#8a6d3b";
          ctx.fillRect(0, 0, width, height);
        } finally {
          ctx.restore();
        }
        break;
      }

      case "noir": {
        ctx.save();
        try {
          ctx.globalAlpha = factor;
          ctx.globalCompositeOperation = "color";
          ctx.fillStyle = "#777777";
          ctx.fillRect(0, 0, width, height);
        } finally {
          ctx.restore();
        }
        break;
      }

      case "neon": {
        ctx.save();
        try {
          ctx.globalAlpha = 0.22 * factor;
          ctx.globalCompositeOperation = "color-dodge";
          ctx.fillStyle = "#ff007f";
          ctx.fillRect(0, 0, width, height);
          ctx.globalAlpha = 0.18 * factor;
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = "#00f0ff";
          ctx.fillRect(0, 0, width, height);
        } finally {
          ctx.restore();
        }
        break;
      }

      case "sunset": {
        ctx.save();
        try {
          ctx.globalAlpha = 0.24 * factor;
          ctx.globalCompositeOperation = "soft-light";
          ctx.fillStyle = "#ff7a00";
          ctx.fillRect(0, 0, width, height);
        } finally {
          ctx.restore();
        }
        break;
      }

      case "particles": {
        ctx.save();
        try {
          ctx.globalCompositeOperation = "screen";
          const elapsed = cTime;
          const H = Math.max(1, height);
          const W = Math.max(1, width);

          // Subtle warm golden ambient wash proportional to intensity
          if (factor > 0.2) {
            ctx.fillStyle = `rgba(255, 185, 60, ${(0.045 * factor).toFixed(3)})`;
            ctx.fillRect(0, 0, W, H);
          }

          // Intensity dynamically controls particle count (14 to 70 particles)
          const activeCount = Math.max(12, Math.round(PARTICLE_SEEDS.length * (0.2 + 0.8 * factor)));

          for (let i = 0; i < activeCount; i++) {
            const p = PARTICLE_SEEDS[i];
            let y = (p.y0 * H - elapsed * p.speed * H) % H;
            if (y < 0) y += H;
            let x = (p.x0 * W + Math.sin(elapsed * p.swayFreq + p.phase) * p.swayAmp * W) % W;
            if (x < 0) x += W;

            const twinkle = 0.7 + 0.3 * Math.sin(elapsed * p.twinkleFreq + p.phase);
            // Intensity controls opacity
            const alpha = Math.max(0, Math.min(1, p.alpha * (0.35 + 0.85 * factor) * twinkle));
            if (alpha <= 0.01 || !isFinite(alpha)) continue;

            // Intensity controls particle radius and bokeh bloom
            const radius = Math.max(1, p.r * (0.45 + 0.85 * factor));
            if (!isFinite(x) || !isFinite(y) || !isFinite(radius)) continue;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
            grad.addColorStop(0, `rgba(255, 250, 215, ${alpha.toFixed(3)})`);
            grad.addColorStop(0.35, `rgba(255, 220, 130, ${(alpha * 0.75).toFixed(3)})`);
            grad.addColorStop(1, "rgba(255, 180, 50, 0)");

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        } finally {
          ctx.restore();
        }
        break;
      }
    }
  } catch (err) {
    console.warn("Canvas post-effect exception caught safely:", effectId, err);
  }
}

// FFmpeg video filter equivalent for burning the effect into final MP4 exports
export function getFfmpegEffectFilter(effectId, intensity = 100, clipDuration = 1, fps = 30) {
  if (!effectId || effectId === "none") return "";
  const factor = Math.max(0, Math.min(100, intensity)) / 100;

  switch (effectId) {
    case "shake": {
      const mag = Math.round(16 * factor);
      const m2 = mag * 2;
      return `crop=w='iw-${m2}':h='ih-${m2}':x='${mag}+sin(t*38)*${mag}':y='${mag}+cos(t*46)*${mag}',scale=iw+${m2}:ih+${m2}`;
    }

    case "flash": {
      const dur = 0.35.toFixed(3);
      return `fade=t=in:st=0:d=${dur}:color=white`;
    }

    case "glitch": {
      const shift = Math.max(2, Math.round(8 * factor));
      return `rgbashift=rh=-${shift}:bh=${shift}:rv=${Math.round(shift / 2)}:bv=-${Math.round(shift / 2)}`;
    }

    case "pulse": {
      const f = (0.04 * factor).toFixed(3);
      return `zoompan=z='1+sin(on/2)*${f}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${fps}`;
    }

    case "grain": {
      const s = Math.max(5, Math.round(22 * factor));
      return `noise=alls=${s}:allf=t+u`;
    }

    case "vignette": {
      const angle = (Math.PI / (3.2 / factor)).toFixed(3);
      return `vignette=${angle}`;
    }

    case "vintage": {
      return `colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0,eq=contrast=1.12:saturation=1.15`;
    }

    case "noir": {
      return `hue=s=0,eq=contrast=1.35:brightness=-0.03`;
    }

    case "neon": {
      return `colorbalance=rs=0.35:gs=-0.1:bs=0.4:rm=0.25:gm=-0.05:bm=0.3,eq=saturation=1.4:contrast=1.15`;
    }

    case "sunset": {
      return `colorbalance=rs=0.32:gs=0.12:bs=-0.25:rm=0.25:gm=0.08:bm=-0.2,eq=saturation=1.2:contrast=1.05`;
    }

    case "particles": {
      const s = Math.max(8, Math.round(24 * factor));
      return `noise=alls=${s}:allf=t+u,eq=contrast=1.18:saturation=1.25:brightness=0.02,colorbalance=rs=0.18:gs=0.12:bs=-0.15`;
    }

    default:
      return "";
  }
}
