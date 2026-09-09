const fs = require('fs');
const { spawnSync } = require('child_process');

const W = 1280, H = 720;
const buf = Buffer.alloc(W * H * 3, 0); // black background

// Generate 60 particles
for (let i = 0; i < 60; i++) {
  const cx = Math.random() * W;
  const cy = Math.random() * H;
  const r = 4 + Math.random() * 12;
  const alpha = 0.6 + Math.random() * 0.4;
  const rColor = 255;
  const gColor = 230 + Math.floor(Math.random() * 25);
  const bColor = 160 + Math.floor(Math.random() * 70);

  const x0 = Math.max(0, Math.floor(cx - r * 1.5));
  const x1 = Math.min(W - 1, Math.ceil(cx + r * 1.5));
  const y0 = Math.max(0, Math.floor(cy - r * 1.5));
  const y1 = Math.min(H - 1, Math.ceil(cy + r * 1.5));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r * 1.5) {
        // Soft gaussian-like falloff
        const falloff = Math.exp(- (d * d) / (2 * (r * 0.5) * (r * 0.5))) * alpha;
        const idx = (y * W + x) * 3;
        buf[idx] = Math.min(255, buf[idx] + Math.round(rColor * falloff));
        buf[idx + 1] = Math.min(255, buf[idx + 1] + Math.round(gColor * falloff));
        buf[idx + 2] = Math.min(255, buf[idx + 2] + Math.round(bColor * falloff));
      }
    }
  }
}

// Convert raw buffer to jpg via ffmpeg
const outPath = 'C:/Users/mohda/.gemini/antigravity-ide/brain/e9514ceb-5b54-4d80-aab1-9910c32fdf52/test_circle_particles.jpg';
spawnSync('ffmpeg', [
  '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`,
  '-i', '-', '-vframes', '1', outPath
], { input: buf });
console.log('Done rendering single frame to', outPath);
