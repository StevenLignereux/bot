const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const logger = require('../../utils/logger');

let fontRegistered = false;

function registerCustomFont(fontPath, family) {
  if (fontRegistered) return true;
  try {
    if (fs.existsSync(fontPath)) {
      try {
        if (typeof GlobalFonts.registerFromPath === 'function') {
          GlobalFonts.registerFromPath(fontPath, family);
          logger.info(`Police chargée (GlobalFonts) : ${family} (${path.basename(fontPath)})`);
          fontRegistered = true;
          return true;
        }
      } catch (gfErr) {
        logger.debug('GlobalFonts.registerFromPath indisponible, tentative alternative :', gfErr.message);
      }
      try {
        if (typeof GlobalFonts.register === 'function') {
          const buffer = fs.readFileSync(fontPath);
          GlobalFonts.register(buffer, family);
          logger.info(`Police chargée (GlobalFonts buffer) : ${family} (${path.basename(fontPath)})`);
          fontRegistered = true;
          return true;
        }
      } catch (gfErr2) {
        logger.debug('GlobalFonts.register indisponible :', gfErr2.message);
      }
      logger.warn(`Aucune méthode d'enregistrement de police n'a fonctionné pour ${family}`);
      return false;
    } else {
      logger.warn(`Fichier de police introuvable : ${fontPath}`);
      return false;
    }
  } catch (error) {
    logger.error(`Erreur lors du chargement de la police ${family} :`, error);
    return false;
  }
}

function truncateText(ctx, text, maxWidth) {
  try {
    if (!ctx.measureText) return text;
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (ctx.measureText(truncated + '…').width > maxWidth && truncated.length > 1) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '…';
  } catch {
    return text;
  }
}

function applyRoundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function applyCirclePath(ctx, cx, cy, radius) {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2, false);
  ctx.closePath();
}

function fallbackFont(originalFont) {
  if (!originalFont) return 'sans-serif';
  return originalFont.replace(/"[^"]*"|'[^']*'/g, '').trim() + ', sans-serif';
}

function drawTextBackdrop(ctx, backdrop) {
  if (!backdrop || backdrop.enabled === false) return;
  const {
    x, y, width, height, cornerRadius = 0,
    fillColor = 'rgba(0,0,0,0.35)',
    strokeEnabled = false, strokeColor, strokeWidth = 0,
    shadowEnabled = false, shadowColor, shadowBlur = 0, shadowOffsetX = 0, shadowOffsetY = 0
  } = backdrop;

  ctx.save();
  if (shadowEnabled && shadowColor && shadowBlur > 0) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
  }
  applyRoundedRectPath(ctx, x, y, width, height, cornerRadius);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.restore();

  if (strokeEnabled && strokeWidth > 0 && strokeColor) {
    ctx.save();
    applyRoundedRectPath(ctx, x, y, width, height, cornerRadius);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
    ctx.restore();
  }
}

function pick(defaults, specific, key) {
  if (specific && specific[key] !== undefined) return specific[key];
  if (defaults && defaults[key] !== undefined) return defaults[key];
  return undefined;
}

function drawEnhancedText(ctx, textConfig, textDefaults, canvasWidth, canvasHeight, member, truncateMaxWidth) {
  if (!textConfig) return;
  const resolvedContent = typeof textConfig.content === 'function'
    ? textConfig.content(member)
    : textConfig.content;
  if (!resolvedContent) return;

  const shadowColor = pick(textDefaults, textConfig, 'shadowColor');
  const shadowBlur = pick(textDefaults, textConfig, 'shadowBlur') || 0;
  const shadowOffsetX = pick(textDefaults, textConfig, 'shadowOffsetX') || 0;
  const shadowOffsetY = pick(textDefaults, textConfig, 'shadowOffsetY') || 0;
  const strokeColor = pick(textDefaults, textConfig, 'strokeColor');
  const strokeWidth = pick(textDefaults, textConfig, 'strokeWidth') || 0;
  const lineJoin = pick(textDefaults, textConfig, 'lineJoin') || 'miter';

  ctx.save();
  ctx.font = textConfig.font || fallbackFont(textConfig.font);
  ctx.fillStyle = textConfig.color || '#ffffff';
  ctx.textAlign = textConfig.align || 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = lineJoin;

  const positionX = textConfig.x !== undefined ? textConfig.x : canvasWidth / 2;
  const positionY = textConfig.y !== undefined ? textConfig.y : canvasHeight / 2;

  let displayText = resolvedContent;
  if (textConfig.maxLength && displayText.length > textConfig.maxLength) {
    displayText = truncateText(ctx, displayText, truncateMaxWidth || canvasWidth * 0.6);
  } else if (truncateMaxWidth) {
    displayText = truncateText(ctx, displayText, truncateMaxWidth);
  }

  let hasShadow = false;
  if (shadowColor && shadowBlur + Math.abs(shadowOffsetX) + Math.abs(shadowOffsetY) > 0) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
    hasShadow = true;
  }

  if (strokeColor && strokeWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(displayText, positionX, positionY);
  }

  if (hasShadow) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  ctx.fillText(displayText, positionX, positionY);
  ctx.restore();
}

async function generateWelcomeBanner(member, welcomeConfig) {
  try {
    const { banner, textBackdrop, avatar, text, font } = welcomeConfig;

    registerCustomFont(font.path, font.family);

    let canvasWidth = banner.defaultWidth || 800;
    let canvasHeight = banner.defaultHeight || 300;

    if (banner.backgroundImage && fs.existsSync(banner.backgroundImage)) {
      try {
        const probeBg = await loadImage(banner.backgroundImage);
        canvasWidth = probeBg.width;
        canvasHeight = probeBg.height;
      } catch (probeError) {
        logger.warn('Impossible de lire les dimensions natives du fond, utilisation des valeurs par défaut :', probeError.message);
      }
    }

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    if (banner.backgroundImage && fs.existsSync(banner.backgroundImage)) {
      try {
        const bgImage = await loadImage(banner.backgroundImage);
        ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
      } catch (imgError) {
        logger.warn('Impossible de charger l\'image de fond, utilisation de la couleur :', imgError.message);
        ctx.fillStyle = banner.backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    } else {
      ctx.fillStyle = banner.backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    if (banner.overlayOpacity > 0) {
      ctx.save();
      ctx.fillStyle = banner.overlayColor;
      ctx.globalAlpha = banner.overlayOpacity;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }

    drawTextBackdrop(ctx, textBackdrop);

    const avatarSize = avatar.size;
    const avatarX = avatar.x;
    const avatarY = avatar.y;
    const borderSize = avatar.borderWidth || 0;
    const avatarCenterX = avatarX + avatarSize / 2;
    const avatarCenterY = avatarY + avatarSize / 2;
    const avatarRadius = avatarSize / 2;

    try {
      const avatarUrl = member.user.displayAvatarURL({
        extension: 'png',
        size: 512,
        forceStatic: true
      });
      const avatarImage = await loadImage(avatarUrl);

      if (borderSize > 0) {
        ctx.save();
        applyCirclePath(ctx, avatarCenterX, avatarCenterY, avatarRadius + borderSize);
        ctx.fillStyle = avatar.borderColor;
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      applyCirclePath(ctx, avatarCenterX, avatarCenterY, avatarRadius);
      ctx.clip();
      ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } catch (avatarError) {
      logger.warn('Impossible de charger l\'avatar du membre :', avatarError.message);
      ctx.save();
      applyCirclePath(ctx, avatarCenterX, avatarCenterY, avatarRadius);
      ctx.fillStyle = avatar.backgroundColor;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      const safeFont = fallbackFont(null);
      ctx.font = `bold ${Math.max(24, Math.floor(avatarSize / 3))}px ${safeFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initial = member.user.username.charAt(0).toUpperCase();
      ctx.fillText(initial, avatarCenterX, avatarCenterY);
      ctx.restore();
    }

    const textDefaults = (text && text.defaults) || {};
    const truncateMaxWidth = (textBackdrop && textBackdrop.enabled && textBackdrop.width)
      ? textBackdrop.width - 80
      : canvasWidth - (avatarX + avatarSize) - 120;

    drawEnhancedText(ctx, text.title, textDefaults, canvasWidth, canvasHeight, member, truncateMaxWidth);

    const usernameClone = text.username ? { ...text.username } : null;
    if (usernameClone && !usernameClone.content) {
      usernameClone.content = member.user.displayName || member.user.username;
    }
    drawEnhancedText(ctx, usernameClone, textDefaults, canvasWidth, canvasHeight, member, truncateMaxWidth);

    drawEnhancedText(ctx, text.subtitle, textDefaults, canvasWidth, canvasHeight, member, truncateMaxWidth);

    return canvas.toBuffer('image/png');
  } catch (error) {
    logger.error('Erreur lors de la génération de la bannière de bienvenue :', error);
    throw error;
  }
}

module.exports = {
  generateWelcomeBanner,
  drawEnhancedText,
  drawTextBackdrop,
  applyRoundedRectPath
};
