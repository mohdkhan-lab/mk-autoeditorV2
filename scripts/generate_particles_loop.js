const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const W = 1920, H = 1080, FPS = 30, SEC = 8;
const totalFrames = FPS * SEC;

console.log(`Generating ${totalFrames} frames of seamless 1080p floating particles...`);

// 65 particles with integer loop cycles so t=0 matches t=SEC exactly
const particles = [];
const rand = (min, max) => min + Math.random() * (max - min);

for (let i = 0; i < 70; i++) {
  // Speed is chosen such that vertical travel over SEC is exactly k * H
  // e.g. k = 1 means it wraps once, k = 2 wraps twice
  const k = Math.floor(rand(1, 3.5));
  const speed = (k * H) / SEC; // pixels per second
  const swayCycles = Math.floor(rand(1, 4)); // integer sways over SEC
  const twinkleCycles = Math.floor(rand(2, 6)); // integer twinkles over SEC

  particles.push({
    x0: rand(0, W),
    y0: rand(0, H),
    r: rand(3.5, 14), // small to large bokeh
    speed,
    swayAmp: rand(15, 45),
    swayFreq: (swayCycles * 2 * Math.PI) / SEC,
    phase: rand(0, Math.PI * 2),
    baseAlpha: rand(0.5, 0.95),
    twinkleFreq: (twinkleCycles * 2 * Math.PI) / SEC,
    rColor: 255,
    gColor: Math.floor(rand(225, 250)),
    bColor: Math.floor(rand(160, 220)),
  });
}

const outDirServer = path.resolve(__dirname, '../server/assets');
const outDirPublic = path.resolve(__dirname, '../public/assets');
if (!fs.existsSync(outDirServer)) fs.mkdirSync(outDirServer, { recursive: true });
if (!fs.existsSync(outDirPublic)) fs.mkdirSync(outDirPublic, { recursive: true });

const targetFile = path.join(outDirServer, 'particles.mp4');

const ffmpeg = spawn('ffmpeg', [
  '-y',
  '-f', 'rawvideo',
  '-pix_fmt', 'rgb24',
  '-s', `${W}x${H}`,
  '-r', `${FPS}`,
  '-i', '-',
  '-c:v', 'libx264',
  '-preset', 'veryfast',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  targetFile
]);

ffmpeg.stderr.on('data', (d) => {
  // Silent progress
});

ffmpeg.on('close', (code) => {
  if (code === 0) {
    // Copy to public/assets as well
    fs.copyFileSync(targetFile, path.join(outDirPublic, 'particles.mp4'));
    console.log('Successfully created seamless loopable particles.mp4 in server/assets and public/assets!');
  } else {
    console.error('FFmpeg exited with code', code);
  }
});

const frameBuf = Buffer.alloc(W * H * 3);

for (let f = 0; f < totalFrames; f++) {
  const t = f / FPS;
  frameBuf.fill(0); // clear to black

  for (const p of particles) {
    // Float upwards seamlessly
    let y = (p.y0 - t * p.speed) % H;
    if (y < 0) y += H;

    // Harmonic sway
    let x = (p.x0 + Math.sin(t * p.swayFreq + p.phase) * p.swayAmp) % W;
    if (x < 0) x += W;

    // Twinkle modulation
    const twinkle = 0.7 + 0.3 * Math.sin(t * p.twinkleFreq + p.phase);
    const alpha = p.baseAlpha * twinkle;

    const rBound = p.r * 1.6;
    const x0 = Math.max(0, Math.floor(x - rBound));
    const x1 = Math.min(W - 1, Math.ceil(x + rBound));
    const y0 = Math.max(0, Math.floor(y - rBound));
    const y1 = Math.min(H - 1, Math.ceil(y + rBound));

    const sigma2 = 2 * (p.r * 0.45) * (p.r * 0.45);

    for (let py = y0; py <= y1; py++) {
      const dy = py - y;
      const dy2 = dy * dy;
      const rowIdx = py * W * 3;
      for (let px = x0; px <= x1; px++) {
        const dx = px - x;
        const d2 = dx * dx + dy2;
        if (d2 <= rBound * rBound) {
          const falloff = Math.exp(-d2 / sigma2) * alpha;
          const idx = rowIdx + px * 3;
          frameBuf[idx] = Math.min(255, frameBuf[idx] + Math.round(p.rColor * falloff));
          frameBuf[idx + 1] = Math.min(255, frameBuf[idx + 1] + Math.round(p.gColor * falloff));
          frameBuf[idx + 2] = Math.min(255, frameBuf[idx + 2] + Math.round(p.bColor * falloff));
        }
      }
    }
  }

  ffmpeg.stdin.write(frameBuf);
}

ffmpeg.stdin.end();
