/**
 * Media commands: sticker creation and conversion.
 */
"use strict";

const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { imageToWebpSticker, videoToWebpSticker, webpToImage } = require("../../lib/sticker");

function getQuotedOrDirectMessage(ctx) {
  const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted) {
    return {
      message: quoted,
      key: {
        ...ctx.msg.key,
        id: ctx.msg.message.extendedTextMessage.contextInfo.stanzaId,
      },
    };
  }
  return ctx.msg;
}

const commands = {
  sticker: async (ctx) => {
    const target = getQuotedOrDirectMessage(ctx);
    const type = Object.keys(target.message || {})[0];

    if (!["imageMessage", "videoMessage"].includes(type)) {
      return ctx.reply("⚠️ Send or reply to an image/short video with *.sticker*");
    }

    try {
      const buffer = await downloadMediaMessage(target, "buffer", {});
      const webp =
        type === "imageMessage"
          ? await imageToWebpSticker(buffer)
          : await videoToWebpSticker(buffer);

      return ctx.sock.sendMessage(
        ctx.msg.key.remoteJid,
        { sticker: webp },
        { quoted: ctx.msg }
      );
    } catch (err) {
      console.error("[sticker] failed:", err);
      return ctx.reply("⚠️ Failed to create sticker.");
    }
  },

  toimg: async (ctx) => {
    const target = getQuotedOrDirectMessage(ctx);
    const type = Object.keys(target.message || {})[0];

    if (type !== "stickerMessage") {
      return ctx.reply("⚠️ Reply to a sticker with *.toimg*");
    }

    try {
      const buffer = await downloadMediaMessage(target, "buffer", {});
      const png = await webpToImage(buffer);
      return ctx.sock.sendMessage(
        ctx.msg.key.remoteJid,
        { image: png, caption: "✅ Converted to image" },
        { quoted: ctx.msg }
      );
    } catch (err) {
      console.error("[toimg] failed:", err);
      return ctx.reply("⚠️ Failed to convert sticker.");
    }
  },
};

module.exports = { commands };
