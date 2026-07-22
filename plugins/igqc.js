/*NEW PLUGIN TYPE ESM*
*▢ NAME : IGQC CHAT CARD GENERATOR*
*▢ TYPE : ESM*
*▢ NOTE : Genera una tarjeta de chat estilo IG (texto + imagen + reacciones)*
*/

import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FONTS = [
  { family: 'InterRegular', url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2', localName: 'Inter-Regular.ttf' }
];
const BG_URL = "https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/Image/igqc.png";
const CANVAS_SIZE = { width: 878, height: 1791 };

const ASSETS_DIR = join(__dirname, '..', 'assets', 'igqc');
const FONTS_DIR = join(ASSETS_DIR, 'fonts');
const OUTPUT_DIR = join(__dirname, '..', 'tmp');

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Fetch failed ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function prepareAssets() {
  await mkdir(FONTS_DIR, { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const font of FONTS) {
    const fontLocal = join(FONTS_DIR, font.localName);
    if (!existsSync(fontLocal)) await writeFile(fontLocal, await download(font.url));
    GlobalFonts.registerFromPath(fontLocal, font.family);
  }
  const bgLocal = join(ASSETS_DIR, 'igqc.png');
  if (!existsSync(bgLocal)) await writeFile(bgLocal, await download(BG_URL));
  return bgLocal;
}

function wrapText(ctx, text, maxWidth, fontSize) {
  ctx.font = `${fontSize}px InterRegular`;
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word.includes('\n')) {
      const parts = word.split('\n');
      for (let j = 0; j < parts.length; j++) {
        const test = cur + (cur ? " " : "") + parts[j];
        if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = parts[j]; }
        else { cur = test; }
        if (j < parts.length - 1) { lines.push(cur); cur = ""; }
      }
      continue;
    }
    const test = cur + (cur ? " " : "") + word;
    if (ctx.measureText(test).width > maxWidth && i > 0) { lines.push(cur); cur = word; }
    else { cur = test; }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function renderIgqc({ text, imgBuffer, timeStr }) {
  const bgLocal = await prepareAssets();
  const canvas = createCanvas(CANVAS_SIZE.width, CANVAS_SIZE.height);
  const ctx = canvas.getContext('2d');

  const bgImg = await loadImage(bgLocal);
  ctx.drawImage(bgImg, 0, 0, CANVAS_SIZE.width, CANVAS_SIZE.height);

  const menuBoxTop = 985;
  ctx.fillStyle = "#a1a4a9";
  ctx.font = "20px InterRegular";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(timeStr, 72, menuBoxTop + 35);

  const maxWidthLimit = 530, maxImgWidthLimit = 420, minBubbleWidth = 280;
  const paddingX = 30, paddingY = 22, fixedX = 38;
  const bubbleBottom = menuBoxTop - 20;
  const emCardH = 104, minEmCardY = 60;

  const hasTxt = !!text;
  const hasImg = !!imgBuffer;
  let imgObj = null;
  if (hasImg) imgObj = await loadImage(imgBuffer);

  let chatFontSize = 30;
  const minFontSize = 12;
  let imageScale = 1.0;
  let chatLines = [], lineHeight = 0, textBubbleH = 0, imgDrawW = 0, imgDrawH = 0;
  let textBubbleTop = 0, imgBubbleTop = 0, emCardY = 0, topmostY = 0;

  while (chatFontSize >= minFontSize) {
    if (hasImg && hasTxt) {
      ctx.font = `${chatFontSize}px InterRegular`;
      chatLines = wrapText(ctx, text, maxWidthLimit, chatFontSize);
      lineHeight = chatFontSize + 14;
      textBubbleH = ((chatLines.length - 1) * lineHeight) + chatFontSize + (paddingY * 2);
      textBubbleTop = bubbleBottom - textBubbleH;

      const imgAspect = imgObj.width / imgObj.height;
      let baseImgW = Math.min(Math.max(imgObj.width, minBubbleWidth), maxImgWidthLimit);
      imgDrawW = Math.round(baseImgW * imageScale);
      imgDrawH = Math.round(imgDrawW / imgAspect);

      imgBubbleTop = textBubbleTop - imgDrawH - 12;
      topmostY = imgBubbleTop;
    } else if (hasImg) {
      const imgAspect = imgObj.width / imgObj.height;
      let baseImgW = Math.min(Math.max(imgObj.width, minBubbleWidth), maxImgWidthLimit);
      imgDrawW = Math.round(baseImgW * imageScale);
      imgDrawH = Math.round(imgDrawW / imgAspect);
      imgBubbleTop = bubbleBottom - imgDrawH;
      topmostY = imgBubbleTop;
    } else {
      ctx.font = `${chatFontSize}px InterRegular`;
      chatLines = wrapText(ctx, text || " ", maxWidthLimit, chatFontSize);
      lineHeight = chatFontSize + 14;
      textBubbleH = ((chatLines.length - 1) * lineHeight) + chatFontSize + (paddingY * 2);
      textBubbleTop = bubbleBottom - textBubbleH;
      topmostY = textBubbleTop;
    }

    emCardY = topmostY - emCardH - 20;
    if (emCardY >= minEmCardY) break;
    if (hasTxt) chatFontSize -= 1;
    else if (hasImg) { imageScale -= 0.05; if (imageScale < 0.3) break; }
    else break;
  }

  if (hasImg) {
    const currentImgTop = hasTxt ? imgBubbleTop : topmostY;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(fixedX, currentImgTop, imgDrawW, imgDrawH, [24]);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(imgObj, fixedX, currentImgTop, imgDrawW, imgDrawH);
    ctx.restore();
  }

  if (hasTxt) {
    const currentTextTop = hasImg ? textBubbleTop : topmostY;
    const currentTextHeight = textBubbleH;

    ctx.font = `${chatFontSize}px InterRegular`;
    let longestW = 0;
    chatLines.forEach(l => { const w = ctx.measureText(l.trim()).width; if (w > longestW) longestW = w; });
    let bubbleW = Math.max(longestW + (paddingX * 2), 180);

    const rad = 25;
    ctx.fillStyle = "#262628";
    ctx.beginPath();
    ctx.moveTo(fixedX + 8, currentTextTop);
    ctx.lineTo(fixedX + bubbleW - rad, currentTextTop);
    ctx.quadraticCurveTo(fixedX + bubbleW, currentTextTop, fixedX + bubbleW, currentTextTop + rad);
    ctx.lineTo(fixedX + bubbleW, currentTextTop + currentTextHeight - rad);
    ctx.quadraticCurveTo(fixedX + bubbleW, currentTextTop + currentTextHeight, fixedX + bubbleW - rad, currentTextHeight + currentTextTop);
    ctx.lineTo(fixedX + rad, currentTextTop + currentTextHeight);
    ctx.quadraticCurveTo(fixedX, currentTextTop + currentTextHeight, fixedX, currentTextTop + currentTextHeight - rad);
    ctx.lineTo(fixedX, currentTextTop + 8);
    ctx.quadraticCurveTo(fixedX, currentTextTop, fixedX + 8, currentTextTop);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(fixedX + 4, currentTextTop + 20);
    ctx.quadraticCurveTo(fixedX - 10, currentTextTop + 4, fixedX - 16, currentTextTop);
    ctx.quadraticCurveTo(fixedX - 2, currentTextTop, fixedX + 14, currentTextTop + 2);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.fillStyle = "#eff0f4";
    ctx.font = `${chatFontSize}px InterRegular`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let i = 0; i < chatLines.length; i++) {
      const lineY = currentTextTop + paddingY + (i * lineHeight) + (chatFontSize / 2);
      ctx.fillText(chatLines[i].trim(), fixedX + paddingX, lineY);
    }
    ctx.restore();
  }

  const emojis = ["❤️", "😂", "😮", "😢", "😡", "👍"];
  const emojiSize = 44, emCardW = 600, emCardX = fixedX - 6;

  ctx.fillStyle = "#222328";
  ctx.beginPath();
  ctx.roundRect(emCardX, emCardY, emCardW, emCardH, [emCardH / 2]);
  ctx.fill();

  const startX = emCardX + 52, spacingX = 80;
  const emojiCY = emCardY + (emCardH / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${emojiSize}px InterRegular`;
  for (let i = 0; i < Math.min(emojis.length, 6); i++) {
    ctx.fillText(emojis[i], startX + (i * spacingX), emojiCY);
  }

  ctx.fillStyle = "#8e8e93";
  ctx.font = "42px InterRegular";
  ctx.fillText("+", startX + (6 * spacingX) - 2, emCardY + (emCardH / 2) - 2);

  return canvas.encode('png');
}

const plugin = {
  command: ['igqc'],
  cost: 2,

  async exec({ sock, msg, from, args }) {
    const msgText = args.join(' ');
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = contextInfo?.quotedMessage;
    const quotedImg = quotedMsg?.imageMessage;

    if (!msgText && !quotedImg) {
      await sock.sendMessage(from, {
        text: "Manda un texto o responde (quote) a una imagen.\n\n*Ejemplo:* .igqc Hola mundo 🌹"
      }, { quoted: msg });
      return false;
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

    try {
      let imgBuffer = null;
      if (quotedImg) {
        const stream = await downloadContentFromMessage(quotedImg, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        imgBuffer = Buffer.concat(chunks);
      }

      const now = new Date();
      const timeStr = now.toLocaleDateString('es-PE', { weekday: 'short' }).toUpperCase() + ' ' +
        now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');

      const png = await renderIgqc({ text: msgText, imgBuffer, timeStr });

      await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
      await sock.sendMessage(from, { image: png, caption: "" }, { quoted: msg });
    } catch (error) {
      console.error("IGQC Plugin Error:", error);
      await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
      await sock.sendMessage(from, { text: "Error generando la tarjeta." }, { quoted: msg });
      return false;
    }
  }
};

export default plugin;
