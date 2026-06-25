import { useEffect, useRef, useCallback } from 'react';

const POSTER_W = 1080;
const POSTER_H = 1350;

// ── Helpers ──────────────────────────────────────────────────────────────────

function drawGrid(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(66,133,244,0.08)';
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.restore();
}

function drawSparkle(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  // 4-pointed star via bezier
  const r = size;
  ctx.moveTo(cx, cy - r);
  ctx.bezierCurveTo(cx + r * 0.15, cy - r * 0.15, cx + r * 0.15, cy - r * 0.15, cx + r, cy);
  ctx.bezierCurveTo(cx + r * 0.15, cy + r * 0.15, cx + r * 0.15, cy + r * 0.15, cx, cy + r);
  ctx.bezierCurveTo(cx - r * 0.15, cy + r * 0.15, cx - r * 0.15, cy + r * 0.15, cx - r, cy);
  ctx.bezierCurveTo(cx - r * 0.15, cy - r * 0.15, cx - r * 0.15, cy - r * 0.15, cx, cy - r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, yy);
      line = words[n] + ' ';
      yy += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, yy);
  return yy;
}

// ── Photo border helper ─────────────────────────────────────────────────────

function drawPhotoBorder(ctx, config, photoCX, photoCY, photoW, photoH, photoShape) {
  if (!config?.photoBorderEnabled) return;
  const bw = config.photoBorderWidth ?? 8;
  const bType = config.photoBorderType || 'solid';

  ctx.save();
  ctx.lineWidth = bw;
  ctx.setLineDash([]);  // always solid stroke (no dash)

  if (bType === 'gradient') {
    const g = ctx.createLinearGradient(
      photoCX - photoW / 2, photoCY - photoH / 2,
      photoCX + photoW / 2, photoCY + photoH / 2
    );
    g.addColorStop(0, config.photoBorderGradientStart || '#4285F4');
    g.addColorStop(1, config.photoBorderGradientEnd   || '#34A853');
    ctx.strokeStyle = g;
  } else {
    ctx.strokeStyle = config.photoBorderColor || '#4285F4';
  }

  ctx.beginPath();
  if (photoShape === 'circle') {
    ctx.ellipse(photoCX, photoCY, photoW / 2, photoH / 2, 0, 0, Math.PI * 2);
  } else {
    const radius = Math.round(Math.min(photoW, photoH) * 0.05);
    roundRect(ctx, photoCX - photoW / 2, photoCY - photoH / 2, photoW, photoH, radius);
  }
  ctx.stroke();
  ctx.restore();
}

// ── Photo background fill helper ────────────────────────────────────────────

function drawPhotoBackground(ctx, config, photoCX, photoCY, photoW, photoH, photoShape) {
  if (!config?.photoBackgroundEnabled) return;
  const bType = config.photoBackgroundType || 'solid';
  const radius = Math.round(Math.min(photoW, photoH) * 0.05);

  ctx.save();

  if (bType === 'gradient') {
    const g = ctx.createLinearGradient(
      photoCX - photoW / 2, photoCY - photoH / 2,
      photoCX + photoW / 2, photoCY + photoH / 2
    );
    g.addColorStop(0, config.photoBackgroundGradientStart || '#4285F4');
    g.addColorStop(1, config.photoBackgroundGradientEnd   || '#34A853');
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = config.photoBackgroundColor || '#E8F0FE';
  }

  ctx.beginPath();
  if (photoShape === 'circle') {
    ctx.ellipse(photoCX, photoCY, photoW / 2, photoH / 2, 0, 0, Math.PI * 2);
  } else {
    roundRect(ctx, photoCX - photoW / 2, photoCY - photoH / 2, photoW, photoH, radius);
  }
  ctx.fill();
  ctx.restore();
}

// ── Main draw function ────────────────────────────────────────────────────────

export function drawPoster(ctx, { userImg, templateImg, config, canvasW = POSTER_W, canvasH = POSTER_H }) {
  const w = canvasW;
  const h = canvasH;

  ctx.clearRect(0, 0, w, h);

  const photoCX = config?.photoX !== undefined ? config.photoX : w / 2;
  const photoCY = config?.photoY !== undefined ? config.photoY : 470;
  const photoR = config?.photoRadius !== undefined ? config.photoRadius : 200;
  const photoW = config?.photoWidth !== undefined ? config.photoWidth : (config?.photoRadius !== undefined ? config.photoRadius * 2 : 400);
  const photoH = config?.photoHeight !== undefined ? config.photoHeight : (config?.photoRadius !== undefined ? config.photoRadius * 2 : 400);
  const photoShape = config?.photoShape || 'circle';
  const photoRotation = config?.photoRotation !== undefined ? config.photoRotation : 0;

  if (templateImg) {
    // ═════════════════════════════════════════════════════════════════════════
    // ── CUSTOM TEMPLATE MODE (TEMPLATE + PHOTO ONLY) ─────────────────────────
    // ═════════════════════════════════════════════════════════════════════════
    
    // 1. Draw the uploaded template as the background
    ctx.drawImage(templateImg, 0, 0, w, h);

    // 2. Draw photo background fill (if enabled) then user photo
    drawPhotoBackground(ctx, config, photoCX, photoCY, photoW, photoH, photoShape);

    if (userImg) {
      ctx.save();
      // Set up crop shape path
      ctx.beginPath();
      if (photoShape === 'circle') {
        ctx.ellipse(photoCX, photoCY, photoW / 2, photoH / 2, 0, 0, Math.PI * 2);
      } else {
        const radius = Math.round(Math.min(photoW, photoH) * 0.05);
        roundRect(ctx, photoCX - photoW / 2, photoCY - photoH / 2, photoW, photoH, radius);
      }
      ctx.clip();

      // Translate to photo center and rotate context for photo HMR rotation
      ctx.translate(photoCX, photoCY);
      ctx.rotate((photoRotation * Math.PI) / 180);

      // Draw photo centered
      const iw = userImg.width || userImg.naturalWidth;
      const ih = userImg.height || userImg.naturalHeight;
      const scale = Math.max(photoW / iw, photoH / ih);
      const sw = iw * scale;
      const sh = ih * scale;
      ctx.drawImage(userImg, -sw / 2, -sh / 2, sw, sh);
      ctx.restore();
      // Draw configurable border over photo
      drawPhotoBorder(ctx, config, photoCX, photoCY, photoW, photoH, photoShape);
    } else {
      // Guide marker outline (dashed border) so organizer knows where the photo goes
      // This helper text/guide automatically hides after user uploads a photo
      ctx.save();
      ctx.strokeStyle = 'rgba(66, 133, 244, 0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      if (photoShape === 'circle') {
        ctx.ellipse(photoCX, photoCY, photoW / 2, photoH / 2, 0, 0, Math.PI * 2);
      } else {
        const radius = Math.round(Math.min(photoW, photoH) * 0.05);
        roundRect(ctx, photoCX - photoW / 2, photoCY - photoH / 2, photoW, photoH, radius);
      }
      ctx.stroke();
      ctx.restore();
      
      // Also draw the configurable border and background so organizers can preview them!
      drawPhotoBorder(ctx, config, photoCX, photoCY, photoW, photoH, photoShape);

      ctx.save();
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.fillStyle = '#4285F4';
      ctx.textAlign = 'center';
      ctx.fillText('Photo Overlay Area', photoCX, photoCY - 10);
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText('(Hidden when photo uploaded)', photoCX, photoCY + 15);
      ctx.restore();
    }

    return; // STOP! Exits immediately so no default layout elements are rendered
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ── DEFAULT BLUEPRINT TEMPLATE MODE ──────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════════════

  // 1. Background gradient
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#F0F4FF');
  bg.addColorStop(0.5, '#EEF6FF');
  bg.addColorStop(1, '#E8F5E9');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 2. Blueprint grid
  drawGrid(ctx, w, h);

  // 3. Top accent bar
  const bar = ctx.createLinearGradient(0, 0, w, 0);
  bar.addColorStop(0, '#4285F4');
  bar.addColorStop(1, '#34A853');
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, w, 8);

  // 4. Event branding block (top)
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const bH = 140;
  roundRect(ctx, 40, 28, w - 80, bH, 20);
  ctx.fill();
  ctx.restore();

  // Google "G" wordmark simulation
  ctx.save();
  ctx.font = 'bold 28px Inter, sans-serif';
  ctx.fillStyle = '#4285F4';
  ctx.fillText('G', 75, 85);
  ctx.fillStyle = '#EA4335';
  ctx.fillText('o', 100, 85);
  ctx.fillStyle = '#FBBC04';
  ctx.fillText('o', 122, 85);
  ctx.fillStyle = '#4285F4';
  ctx.fillText('g', 144, 85);
  ctx.fillStyle = '#34A853';
  ctx.fillText('l', 165, 85);
  ctx.fillStyle = '#EA4335';
  ctx.fillText('e', 177, 85);
  ctx.restore();

  // "Explore Gemma 4" heading
  ctx.save();
  ctx.font = 'bold 36px Outfit, sans-serif';
  const titleGrad = ctx.createLinearGradient(80, 0, 500, 0);
  titleGrad.addColorStop(0, '#4285F4');
  titleGrad.addColorStop(1, '#34A853');
  ctx.fillStyle = titleGrad;
  ctx.fillText('Explore Gemma 4', 80, 128);
  ctx.restore();

  // Sparkle accents near title
  drawSparkle(ctx, w - 80, 68, 18, '#4285F4');
  drawSparkle(ctx, w - 110, 110, 10, '#34A853');
  drawSparkle(ctx, w - 60, 120, 6, '#FBBC04');

  // 5. Photo zone
  if (photoShape === 'circle') {
    // ── CIRCLE/ELLIPSE SHAPE ──
    // Photo bg ellipse (decorative ring)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(photoCX, photoCY, photoW / 2 + 18, photoH / 2 + 18, 0, 0, Math.PI * 2);
    const ringGrad = ctx.createLinearGradient(photoCX - photoW / 2, photoCY - photoH / 2, photoCX + photoW / 2, photoCY + photoH / 2);
    ringGrad.addColorStop(0, '#4285F4');
    ringGrad.addColorStop(1, '#34A853');
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 6]);
    ctx.stroke();
    ctx.restore();

    // Inner photo background
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(photoCX, photoCY, photoW / 2 + 4, photoH / 2 + 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(66,133,244,0.06)';
    ctx.fill();
    ctx.restore();

    // User photo (clipped to ellipse) — with optional background fill behind it
    if (userImg) {
      // Draw background behind the photo
      drawPhotoBackground(ctx, config, photoCX, photoCY, photoW, photoH, photoShape);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(photoCX, photoCY, photoW / 2, photoH / 2, 0, 0, Math.PI * 2);
      ctx.clip();

      // Translate context to center for rotation HMR
      ctx.translate(photoCX, photoCY);
      ctx.rotate((photoRotation * Math.PI) / 180);

      // Cover-fit
      const iw = userImg.width || userImg.naturalWidth;
      const ih = userImg.height || userImg.naturalHeight;
      const scale = Math.max(photoW / iw, photoH / ih);
      const sw = iw * scale;
      const sh = ih * scale;
      ctx.drawImage(userImg, -sw / 2, -sh / 2, sw, sh);
      ctx.restore();

      // Photo ring overlay (default blueprint style) — skip if organizer set a custom border
      if (!config?.photoBorderEnabled) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(photoCX, photoCY, photoW / 2, photoH / 2, 0, 0, Math.PI * 2);
        const photoRingGrad = ctx.createLinearGradient(photoCX - photoW / 2, photoCY - photoH / 2, photoCX + photoW / 2, photoCY + photoH / 2);
        photoRingGrad.addColorStop(0, 'rgba(66,133,244,0.6)');
        photoRingGrad.addColorStop(1, 'rgba(52,168,83,0.6)');
        ctx.strokeStyle = photoRingGrad;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();
      }
      // Configurable border
      drawPhotoBorder(ctx, config, photoCX, photoCY, photoW, photoH, photoShape);
    } else {
      // Placeholder person silhouette (ellipse)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(photoCX, photoCY, photoW / 2, photoH / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,210,230,0.5)';
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.ellipse(photoCX, photoCY - (photoH * 0.15), (photoW / 2) * 0.35, (photoH / 2) * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(150,170,200,0.4)';
      ctx.fill();

      // Body
      ctx.beginPath();
      ctx.ellipse(photoCX, photoCY + (photoH * 0.275), (photoW / 2) * 0.55, (photoH / 2) * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(150,170,200,0.4)';
      ctx.fill();

      ctx.font = `500 ${Math.max(14, Math.round(Math.min(photoW, photoH) * 0.055))}px Inter, sans-serif`;
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'center';
      ctx.fillText('Your Photo Here', photoCX, photoCY + (photoH * 0.025));
      ctx.restore();
      
      // Also draw the configurable border and background so organizers can preview them!
      drawPhotoBorder(ctx, config, photoCX, photoCY, photoW, photoH, photoShape);
    }
  } else {
    // ── RECTANGLE/SQUARE SHAPE ──
    const xLeft = photoCX - photoW / 2;
    const yTop = photoCY - photoH / 2;
    const radius = Math.round(Math.min(photoW, photoH) * 0.05); // rounded corners

    // Photo bg square (decorative dashed outline)
    ctx.save();
    ctx.strokeStyle = '#4285F4';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 6]);
    roundRect(ctx, xLeft - 18, yTop - 18, photoW + 36, photoH + 36, radius + 8);
    ctx.stroke();
    ctx.restore();

    // Inner photo background
    ctx.save();
    ctx.fillStyle = 'rgba(66,133,244,0.06)';
    roundRect(ctx, xLeft - 4, yTop - 4, photoW + 8, photoH + 8, radius + 2);
    ctx.fill();
    ctx.restore();

    // User photo (clipped to rounded square) — with optional background fill
    if (userImg) {
      drawPhotoBackground(ctx, config, photoCX, photoCY, photoW, photoH, photoShape);
      ctx.save();
      roundRect(ctx, xLeft, yTop, photoW, photoH, radius);
      ctx.clip();

      // Translate context to center for rotation HMR
      ctx.translate(photoCX, photoCY);
      ctx.rotate((photoRotation * Math.PI) / 180);

      // Cover-fit
      const iw = userImg.width || userImg.naturalWidth;
      const ih = userImg.height || userImg.naturalHeight;
      const scale = Math.max(photoW / iw, photoH / ih);
      const sw = iw * scale;
      const sh = ih * scale;
      ctx.drawImage(userImg, -sw / 2, -sh / 2, sw, sh);
      ctx.restore();

      // Photo square outline overlay (default blueprint style) — skip if custom border is on
      if (!config?.photoBorderEnabled) {
        ctx.save();
        ctx.strokeStyle = '#34A853';
        ctx.lineWidth = 5;
        roundRect(ctx, xLeft, yTop, photoW, photoH, radius);
        ctx.stroke();
        ctx.restore();
      }
      // Configurable border
      drawPhotoBorder(ctx, config, photoCX, photoCY, photoW, photoH, photoShape);
    } else {
      // Placeholder person silhouette (square)
      ctx.save();
      roundRect(ctx, xLeft, yTop, photoW, photoH, radius);
      ctx.fillStyle = 'rgba(200,210,230,0.5)';
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.ellipse(photoCX, photoCY - (photoH * 0.15), (photoW / 2) * 0.35, (photoH / 2) * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(150,170,200,0.4)';
      ctx.fill();

      // Body (clipped inside the frame)
      ctx.save();
      roundRect(ctx, xLeft, yTop, photoW, photoH, radius);
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(photoCX, photoCY + (photoH * 0.275), (photoW / 2) * 0.55, (photoH / 2) * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(150,170,200,0.4)';
      ctx.fill();
      ctx.restore();

      ctx.font = `500 ${Math.max(14, Math.round(Math.min(photoW, photoH) * 0.055))}px Inter, sans-serif`;
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'center';
      ctx.fillText('Your Photo Here', photoCX, photoCY + (photoH * 0.025));
      ctx.restore();
      
      // Also draw the configurable border and background so organizers can preview them!
      drawPhotoBorder(ctx, config, photoCX, photoCY, photoW, photoH, photoShape);
    }
  }

  // Sparkle accents around photo (positioned dynamically relative to photo area)
  drawSparkle(ctx, photoCX - photoW / 2 - 30, photoCY - photoH / 2 + 20, 14, '#4285F4');
  drawSparkle(ctx, photoCX + photoW / 2 + 30, photoCY - photoH / 2 + 20, 10, '#34A853');
  drawSparkle(ctx, photoCX - photoW / 2 - 10, photoCY + photoH / 2 - 10, 8, '#FBBC04');
  drawSparkle(ctx, photoCX + photoW / 2 + 10, photoCY + photoH / 2 - 10, 12, '#EA4335');

  // 6. "I'm participating in" ribbon
  ctx.save();
  ctx.fillStyle = 'rgba(66,133,244,0.1)';
  roundRect(ctx, 40, 770, w - 80, 64, 32);
  ctx.fill();
  ctx.font = '600 22px Inter, sans-serif';
  ctx.fillStyle = '#4285F4';
  ctx.textAlign = 'center';
  ctx.fillText("✦  I'm participating in  ✦", w / 2, 810);
  ctx.restore();

  // 7. Event name block
  ctx.save();
  const evGrad = ctx.createLinearGradient(0, 850, w, 950);
  evGrad.addColorStop(0, '#4285F4');
  evGrad.addColorStop(1, '#34A853');
  ctx.fillStyle = evGrad;
  ctx.textAlign = 'center';
  ctx.font = 'bold 68px Outfit, sans-serif';
  ctx.fillText('Explore', w / 2, 900);
  ctx.font = 'bold 80px Outfit, sans-serif';
  ctx.fillText('Gemma 4', w / 2, 978);
  ctx.restore();

  // 8. Location card
  ctx.save();
  ctx.fillStyle = 'rgba(52,168,83,0.1)';
  roundRect(ctx, 40, 1010, w - 80, 90, 16);
  ctx.fill();
  ctx.fillStyle = '#34A853';
  ctx.font = 'bold 15px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📍  LOCATION', w / 2, 1038);
  ctx.fillStyle = '#1A1A1A';
  ctx.font = '500 17px Inter, sans-serif';
  const locText = config.location || 'KOZHIKODE – IOCOD, Sahya Building, Govt. Cyber Park';
  wrapText(ctx, locText, w / 2, 1065, w - 120, 22);
  ctx.restore();

  // 9. Date & time card
  ctx.save();
  ctx.fillStyle = 'rgba(66,133,244,0.1)';
  roundRect(ctx, 40, 1118, w - 80, 72, 16);
  ctx.fill();
  ctx.fillStyle = '#4285F4';
  ctx.font = 'bold 15px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🗓  DATE & TIME', w / 2, 1143);
  ctx.fillStyle = '#1A1A1A';
  ctx.font = '500 17px Inter, sans-serif';
  ctx.fillText(`${config.date || 'Sunday, June 21, 2026'}  ·  ${config.time || '10:30 AM'}`, w / 2, 1168);
  ctx.restore();

  // 10. Bottom bar with partners
  ctx.save();
  const bottomBar = ctx.createLinearGradient(0, 1200, 0, h);
  bottomBar.addColorStop(0, 'rgba(255,255,255,0.9)');
  bottomBar.addColorStop(1, 'rgba(240,244,255,0.95)');
  ctx.fillStyle = bottomBar;
  roundRect(ctx, 0, 1210, w, h - 1210, 0);
  ctx.fill();

  const partners = config.partners && config.partners.length > 0 ? config.partners : [];
  if (partners.length > 0) {
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'center';
    ctx.fillText('IN PARTNERSHIP WITH', w / 2, 1242);

    const pillY = 1278;
    const pillH = 36;
    let pillX = 56;
    const gap = 12;
    ctx.font = '600 14px Inter, sans-serif';
    partners.slice(0, 6).forEach((p, i) => {
      const partnerName = typeof p === 'string' ? p : p.name;
      const tw = ctx.measureText(partnerName).width;
      const pw = tw + 28;
      const colors = ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#4285F4', '#34A853'];
      ctx.fillStyle = colors[i % colors.length] + '18';
      roundRect(ctx, pillX, pillY - 22, pw, pillH, 18);
      ctx.fill();
      ctx.fillStyle = colors[i % colors.length];
      ctx.textAlign = 'left';
      ctx.fillText(partnerName, pillX + 14, pillY + 6);
      pillX += pw + gap;
      if (pillX > w - 100) { pillX = 56; }
    });
  }
  ctx.restore();

  // 11. Bottom accent bar
  ctx.fillStyle = bar;
  ctx.fillRect(0, h - 8, w, 8);

  // Corner sparkles
  drawSparkle(ctx, 30, 30, 12, '#4285F4');
  drawSparkle(ctx, w - 30, 30, 12, '#34A853');
  drawSparkle(ctx, 30, h - 30, 12, '#EA4335');
  drawSparkle(ctx, w - 30, h - 30, 12, '#FBBC04');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export const POSTER_DIMS = { w: POSTER_W, h: POSTER_H };
