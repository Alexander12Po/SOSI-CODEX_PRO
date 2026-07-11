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
