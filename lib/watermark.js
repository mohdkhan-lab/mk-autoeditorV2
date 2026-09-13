// Watermark & Channel Branding Suite
// Computes pixel coordinates and draws watermark image / text handle onto preview and export canvases.

/**
 * Calculate the rendering bounds { x, y, width, height } for a watermark.
 * Supports 7 alignment positions:
 * "top-left" | "top-center" | "top-right" | "center" | "bottom-left" | "bottom-center" | "bottom-right"
 *
 * @param {number} W - frame width
 * @param {number} H - frame height
 * @param {number} contentW - natural width of content (image or text)
 * @param {number} contentH - natural height of content (image or text)
 * @param {string} pos - alignment position
 * @param {number} scale - fraction of frame width (e.g. 0.12 for 12%)
 * @param {number} margin - margin from corner in pixels (default 24)
 */
export function getWatermarkBounds(W, H, contentW, contentH, pos = "top-right", scale = 0.12, margin = 24) {
  if (!W || !H || !contentW || !contentH) return null;

  const targetW = Math.max(16, Math.round(W * Math.min(0.5, Math.max(0.04, scale))));
  const targetH = Math.round(targetW * (contentH / contentW));

  // Scale margin proportionally with frame width, minimum 8px
  const m = Math.max(8, Math.round((margin * W) / 1080));

  let x = W - targetW - m;
  let y = m;

  switch (pos) {
    case "top-left":
      x = m;
      y = m;
      break;
    case "top-center":
      x = Math.round((W - targetW) / 2);
      y = m;
      break;
    case "center":
      x = Math.round((W - targetW) / 2);
      y = Math.round((H - targetH) / 2);
      break;
    case "bottom-left":
      x = m;
      y = H - targetH - m;
      break;
    case "bottom-center":
      x = Math.round((W - targetW) / 2);
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
 * Draw rounded rectangle path
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw watermark logo and/or text handle onto a 2D canvas context.
 * Supports:
 * - Image logo with optional circle crop and border
 * - Text handle (@channel) with optional glass pill badge
 * - Drop shadow protection for high contrast over any background
 * - 7 screen positions
 * - Smooth 0.8s intro fade-in animation
 */
export function drawWatermark(ctx, img, W, H, ...args) {
  if (!ctx) return;

  // Backwards compatibility: check if 5th arg is an options object or positional args
  let opts = {};
  if (typeof args[0] === "object" && args[0] !== null) {
    opts = args[0];
  } else {
    opts = {
      pos: args[0] || "top-right",
      opacity: typeof args[1] === "number" ? args[1] : 0.8,
      scale: typeof args[2] === "number" ? args[2] : 0.12,
      ...(args[3] && typeof args[3] === "object" ? args[3] : {}),
    };
  }

  const {
    pos = "top-right",
    opacity = 0.8,
    scale = 0.12,
    isCircle = false,
    shadow = true,
    margin = 24,
    text = "",
    textColor = "#ffffff",
    textBg = true,
    fadeIn = false,
    time = null,
    rotation = 0,
    badge = "none",
    fontFamily = "Outfit",
  } = opts;

  // Calculate fade-in alpha multiplier
  let effectiveOpacity = Math.max(0.05, Math.min(1.0, opacity));
  if (fadeIn && typeof time === "number") {
    const fadeDuration = 0.8; // 800ms smooth reveal
    const fadeFrac = Math.max(0, Math.min(1, time / fadeDuration));
    effectiveOpacity *= fadeFrac;
    if (effectiveOpacity <= 0.005) return; // invisible during start of fade
  }

  let badgeStr = "";
  if (badge === "verified") badgeStr = "☑️ ";
  else if (badge === "diamond") badgeStr = "💎 ";
  else if (badge === "bolt") badgeStr = "⚡ ";
  else if (badge && typeof badge === "string" && badge !== "none") badgeStr = `${badge} `;

  const hasImg = !!img && !!(img.naturalWidth || img.videoWidth || img.width);
  const rawText = typeof text === "string" ? text.trim() : "";
  const trimmedText = rawText ? `${badgeStr}${rawText}` : "";
  const hasText = trimmedText.length > 0;

  if (!hasImg && !hasText) return;

  ctx.save();
  ctx.globalAlpha = effectiveOpacity;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (rotation && typeof rotation === "number") {
    // If rotation is applied, determine anchor center and rotate
    const approxW = hasImg ? (W * scale) : (W * 0.25);
    const approxH = hasImg ? (W * scale) : (W * 0.06);
    const b = getWatermarkBounds(W, H, approxW, approxH, pos, scale, margin);
    if (b) {
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
  }

  // Case 1: Image only (no text)
  if (hasImg && !hasText) {
    const iw = img.naturalWidth || img.videoWidth || img.width;
    const ih = img.naturalHeight || img.videoHeight || img.height;
    const bounds = getWatermarkBounds(W, H, iw, ih, pos, scale, margin);
    if (!bounds) {
      ctx.restore();
      return;
    }

    if (isCircle) {
      const size = Math.min(bounds.width, bounds.height);
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const r = size / 2;

      // Shadow pass
      if (shadow) {
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
        ctx.shadowBlur = Math.max(4, Math.round(W * 0.008));
        ctx.shadowOffsetY = Math.max(2, Math.round(W * 0.003));
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Clipped image
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.restore();

      // Sleek outer border
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1.5, Math.round(W * 0.0025));
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.stroke();
      ctx.restore();
    } else {
      if (shadow) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
        ctx.shadowBlur = Math.max(4, Math.round(W * 0.008));
        ctx.shadowOffsetY = Math.max(2, Math.round(W * 0.003));
      }
      ctx.drawImage(img, bounds.x, bounds.y, bounds.width, bounds.height);
    }

    ctx.restore();
    return;
  }

  // Case 2: Text only (no image)
  if (!hasImg && hasText) {
    const fontSize = Math.max(14, Math.round(W * 0.024));
    ctx.font = `600 ${fontSize}px "${fontFamily}", "Outfit", "Nirmala UI", "Inter", -apple-system, sans-serif`;
    const textMetrics = ctx.measureText(trimmedText);
    const textWidth = Math.round(textMetrics.width);
    const padX = Math.round(fontSize * 0.7);
    const padY = Math.round(fontSize * 0.4);
    const pillW = textWidth + padX * 2;
    const pillH = fontSize + padY * 2;

    const bounds = getWatermarkBounds(W, H, pillW, pillH, pos, (pillW / W), margin);
    if (!bounds) {
      ctx.restore();
      return;
    }

    const pillX = bounds.x;
    const pillY = bounds.y;

    if (textBg) {
      if (shadow) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = Math.max(4, Math.round(W * 0.008));
        ctx.shadowOffsetY = Math.max(2, Math.round(W * 0.003));
      }
      ctx.fillStyle = "rgba(10, 10, 15, 0.65)";
      const rad = Math.round(pillH / 2);
      drawRoundedRect(ctx, pillX, pillY, pillW, pillH, rad);
      ctx.fill();

      // Border
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.stroke();
    } else if (shadow) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
      ctx.shadowBlur = Math.max(4, Math.round(W * 0.008));
      ctx.shadowOffsetY = Math.max(2, Math.round(W * 0.003));
    }

    // Draw text
    ctx.fillStyle = textColor;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(trimmedText, pillX + pillW / 2, pillY + pillH / 2 + 1);

    ctx.restore();
    return;
  }

  // Case 3: Hybrid (Image + Text Handle)
  const iw = img.naturalWidth || img.videoWidth || img.width;
  const ih = img.naturalHeight || img.videoHeight || img.height;
  const imgBounds = getWatermarkBounds(W, H, iw, ih, pos, scale, margin);
  if (!imgBounds) {
    ctx.restore();
    return;
  }

  // Measure text
  const fontSize = Math.max(12, Math.round(W * 0.018));
  ctx.font = `600 ${fontSize}px "${fontFamily}", "Outfit", "Nirmala UI", "Inter", -apple-system, sans-serif`;
  const textMetrics = ctx.measureText(trimmedText);
  const textWidth = Math.round(textMetrics.width);
  const padX = Math.round(fontSize * 0.6);
  const padY = Math.round(fontSize * 0.35);
  const pillW = textWidth + padX * 2;
  const pillH = fontSize + padY * 2;

  // Render Image
  if (isCircle) {
    const size = Math.min(imgBounds.width, imgBounds.height);
    const cx = imgBounds.x + imgBounds.width / 2;
    const cy = imgBounds.y + imgBounds.height / 2;
    const r = size / 2;

    if (shadow) {
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
      ctx.shadowBlur = Math.max(4, Math.round(W * 0.008));
      ctx.shadowOffsetY = Math.max(2, Math.round(W * 0.003));
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, imgBounds.x, imgBounds.y, imgBounds.width, imgBounds.height);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1.5, Math.round(W * 0.0025));
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.stroke();
    ctx.restore();
  } else {
    if (shadow) {
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
      ctx.shadowBlur = Math.max(4, Math.round(W * 0.008));
      ctx.shadowOffsetY = Math.max(2, Math.round(W * 0.003));
      ctx.drawImage(img, imgBounds.x, imgBounds.y, imgBounds.width, imgBounds.height);
      ctx.restore();
    } else {
      ctx.drawImage(img, imgBounds.x, imgBounds.y, imgBounds.width, imgBounds.height);
    }
  }

  // Render Text Handle directly below or aligned with image
  const gap = Math.max(4, Math.round(W * 0.006));
  const isBottomPos = pos.startsWith("bottom");
  const textY = isBottomPos ? (imgBounds.y - pillH - gap) : (imgBounds.y + imgBounds.height + gap);
  const textX = Math.round(imgBounds.x + (imgBounds.width - pillW) / 2);

  if (textBg) {
    ctx.save();
    if (shadow) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = Math.max(4, Math.round(W * 0.008));
      ctx.shadowOffsetY = Math.max(2, Math.round(W * 0.003));
    }
    ctx.fillStyle = "rgba(10, 10, 15, 0.65)";
    const rad = Math.round(pillH / 2);
    drawRoundedRect(ctx, textX, textY, pillW, pillH, rad);
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.stroke();
    ctx.restore();
  } else if (shadow) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = Math.max(4, Math.round(W * 0.008));
    ctx.shadowOffsetY = Math.max(2, Math.round(W * 0.003));
  }

  ctx.fillStyle = textColor;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(trimmedText, textX + pillW / 2, textY + pillH / 2 + 1);

  ctx.restore();
}
