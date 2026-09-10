// Watermark / Channel Logo Overlay:
// Computes pixel coordinates and draws watermark image onto preview and export canvases.

/**
 * Calculate the rendering bounds { x, y, width, height } for a watermark.
 *
 * @param {number} W - frame width
 * @param {number} H - frame height
 * @param {number} imgW - source image natural width
 * @param {number} imgH - source image natural height
 * @param {string} pos - "top-right" | "top-left" | "bottom-right" | "bottom-left"
 * @param {number} scale - fraction of frame width (e.g. 0.12 for 12%)
 * @param {number} margin - margin from corner in pixels (default 24)
 */
export function getWatermarkBounds(W, H, imgW, imgH, pos = "top-right", scale = 0.12, margin = 24) {
  if (!W || !H || !imgW || !imgH) return null;

  const targetW = Math.max(16, Math.round(W * Math.min(0.4, Math.max(0.04, scale))));
  const targetH = Math.round(targetW * (imgH / imgW));

  // Scale margin proportionally with frame width, minimum 8px
  const m = Math.max(8, Math.round((margin * W) / 1080));

  let x = W - targetW - m;
  let y = m;

  switch (pos) {
    case "top-left":
      x = m;
      y = m;
      break;
    case "bottom-left":
      x = m;
      y = H - targetH - m;
      break;
    case "bottom-right":
      x = W - targetW - m;
      y = H - targetH - m;
      break;
    case "top-right":
    default:
      x = W - targetW - m;
      y = m;
      break;
  }

  return { x, y, width: targetW, height: targetH };
}

/**
 * Draw watermark logo onto a 2D canvas context.
 */
export function drawWatermark(ctx, img, W, H, pos = "top-right", opacity = 0.8, scale = 0.12) {
  if (!ctx || !img) return;
  const iw = img.naturalWidth || img.videoWidth || img.width;
  const ih = img.naturalHeight || img.videoHeight || img.height;
  if (!iw || !ih) return;

  const bounds = getWatermarkBounds(W, H, iw, ih, pos, scale);
  if (!bounds) return;

  ctx.save();
  ctx.globalAlpha = Math.max(0.05, Math.min(1.0, opacity));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, bounds.x, bounds.y, bounds.width, bounds.height);
  ctx.restore();
}
