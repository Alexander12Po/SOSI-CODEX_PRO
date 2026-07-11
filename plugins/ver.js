  toimg: async (ctx) => {
    const target = getQuotedOrDirectMessage(ctx);
    const type = Object.keys(target.message || {})[0];

    // Verificar que sea un sticker
    if (type !== "stickerMessage") {
      return ctx.reply("❌ *Error:* Por favor, responde a un sticker con el comando *.toimg*");
    }

    try {
      ctx.reply("⏳ *Convirtiendo sticker a imagen...*");
      
      const buffer = await downloadMediaMessage(target, "buffer", {});
      const png = await webpToImage(buffer);
      
      return ctx.sock.sendMessage(
        ctx.msg.key.remoteJid,
        { 
          image: png, 
          caption: "✅ *Conversión exitosa:* Sticker convertido a imagen." 
        },
        { quoted: ctx.msg }
      );
    } catch (err) {
      console.error("[toimg] failed:", err);
      return ctx.reply("❌ *Error:* No se pudo convertir el sticker a imagen.");
    }
  },
    
