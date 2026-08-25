const { createCanvas, loadImage, GlobalFonts, registerFont } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const logger = require('../../utils/logger');

function registerCustomFont(fontPath, family) {
  try {
    if (fs.existsSync(fontPath)) {
      registerFont(fontPath, { family });
      logger.info(`Police chargée : ${family} (${path.basename(fontPath)})`);
      return true;
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
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (ctx.measureText(truncated + '…').width > maxWidth && truncated.length > 1) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
}

function applyRoundedRect(ctx, x, y, width, height, radius) {
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

async function generateWelcomeBanner(member, welcomeConfig) {
  try {
    const { banner, avatar, text, font } = welcomeConfig;

    registerCustomFont(font.path, font.family);

    const canvas = createCanvas(banner.width, banner.height);
    const ctx = canvas.getContext('2d');

    if (banner.backgroundImage && fs.existsSync(banner.backgroundImage)) {
      try {
        const bgImage = await loadImage(banner.backgroundImage);
        const imgRatio = bgImage.width / bgImage.height;
        const canvasRatio = banner.width / banner.height;
        let sx = 0, sy = 0, sw = bgImage.width, sh = bgImage.height;

        if (imgRatio > canvasRatio) {
          sw = bgImage.height * canvasRatio;
          sx = (bgImage.width - sw) / 2;
        } else {
          sh = bgImage.width / canvasRatio;
          sy = (bgImage.height - sh) / 2;
        }

        ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, banner.width, banner.height);
      } catch (imgError) {
        logger.warn('Impossible de charger l\'image de fond, utilisation de la couleur :', imgError.message);
        ctx.fillStyle = banner.backgroundColor;
        ctx.fillRect(0, 0, banner.width, banner.height);
      }
    } else {
      ctx.fillStyle = banner.backgroundColor;
      ctx.fillRect(0, 0, banner.width, banner.height);
    }

    if (banner.overlayOpacity > 0) {
      ctx.fillStyle = banner.overlayColor;
      ctx.globalAlpha = banner.overlayOpacity;
      ctx.fillRect(0, 0, banner.width, banner.height);
      ctx.globalAlpha = 1;
    }

    const avatarSize = avatar.size;
    const avatarX = avatar.x;
    const avatarY = avatar.y;
    const borderSize = avatar.borderWidth;

    try {
      const avatarUrl = member.user.displayAvatarURL({
        extension: 'png',
        size: 256
      });
      const avatarImage = await loadImage(avatarUrl);

      ctx.save();
      applyRoundedRect(
        ctx,
        avatarX - borderSize,
        avatarY - borderSize,
        avatarSize + borderSize * 2,
        avatarSize + borderSize * 2,
        (avatarSize + borderSize * 2) / 2
      );
      ctx.fillStyle = avatar.borderColor;
      ctx.fill();
      ctx.restore();

      ctx.save();
      applyRoundedRect(
        ctx,
        avatarX,
        avatarY,
        avatarSize,
        avatarSize,
        avatarSize / 2
      );
      ctx.clip();
      ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } catch (avatarError) {
      logger.warn('Impossible de charger l\'avatar du membre :', avatarError.message);
      ctx.save();
      applyRoundedRect(
        ctx,
        avatarX,
        avatarY,
        avatarSize,
        avatarSize,
        avatarSize / 2
      );
      ctx.fillStyle = avatar.backgroundColor;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${avatarSize / 3}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initial = member.user.username.charAt(0).toUpperCase();
      ctx.fillText(initial, avatarX + avatarSize / 2, avatarY + avatarSize / 2);
      ctx.restore();
    }

    const titleConfig = text.title;
    ctx.font = titleConfig.font;
    ctx.fillStyle = titleConfig.color;
    ctx.textAlign = titleConfig.align || 'center';
    ctx.textBaseline = 'middle';
    const titleContent = typeof titleConfig.content === 'function'
      ? titleConfig.content(member)
      : titleConfig.content;
    ctx.fillText(titleContent, titleConfig.x, titleConfig.y);

    const usernameConfig = text.username;
    ctx.font = usernameConfig.font;
    ctx.fillStyle = usernameConfig.color;
    ctx.textAlign = usernameConfig.align || 'center';
    ctx.textBaseline = 'middle';
    let username = member.user.displayName || member.user.username;
    if (usernameConfig.maxLength && username.length > usernameConfig.maxLength) {
      username = truncateText(ctx, username, banner.width - 80);
    }
    ctx.fillText(username, usernameConfig.x, usernameConfig.y);

    if (text.subtitle) {
      const subtitleConfig = text.subtitle;
      ctx.font = subtitleConfig.font;
      ctx.fillStyle = subtitleConfig.color;
      ctx.textAlign = subtitleConfig.align || 'center';
      ctx.textBaseline = 'middle';
      const subtitleContent = typeof subtitleConfig.content === 'function'
        ? subtitleConfig.content(member)
        : subtitleConfig.content;
      ctx.fillText(subtitleContent, subtitleConfig.x, subtitleConfig.y);
    }

    return canvas.toBuffer('image/png');
  } catch (error) {
    logger.error('Erreur lors de la génération de la bannière de bienvenue :', error);
    throw error;
  }
}

module.exports = {
  generateWelcomeBanner
};
