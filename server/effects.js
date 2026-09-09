// FFmpeg video filter equivalent for visual effects. Mirrors lib/effects.js.

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
