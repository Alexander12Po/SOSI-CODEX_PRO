import { downloadMediaMessage } from '@whiskeysockets/baileys'
// Importamos la función de conversión (ajusta la ruta '../lib/sticker.js' si es diferente en tu bot)
import { webpToImage } from '../lib/sticker.js' 

export default {
  command: ['ver', 'toimg'],
  description: 'Convierte un sticker a imagen',
  exec: async ({ sock, from, msg }) => {
    // Buscar si el usuario está respondiendo a otro mensaje (el sticker)
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    // Verificar que haya respondido a un mensaje y que sea un sticker
    if (!quoted || !quoted.stickerMessage) {
      return sock.sendMessage(
        from, 
        { text: "❌ *Error:* Por favor, responde a un sticker con el comando *.ver* o *.toimg*" }, 
        { quoted: msg }
      );
    }

    try {
      await sock.sendMessage(from, { text: "⏳ *Convirtiendo sticker a imagen...*" }, { quoted: msg });
      
      // Reconstruimos el objeto del mensaje citado para que Baileys lo pueda descargar
      const targetMessage = {
        message: quoted,
        key: {
          remoteJid: from,
          id: msg.message.extendedTextMessage.contextInfo.stanzaId
        }
      };

      // Descargamos el buffer del sticker
      const buffer = await downloadMediaMessage(targetMessage, "buffer", {});
      
      // Lo convertimos a imagen
      const png = await webpToImage(buffer);
      
      // Enviamos la imagen resultante
      return sock.sendMessage(
        from, 
        { 
          image: png, 
          caption: "✅ *Conversión exitosa:* Sticker convertido a imagen." 
        }, 
        { quoted: msg }
      );

    } catch (err) {
      console.error("Error convirtiendo sticker en ver.js:", err);
      return sock.sendMessage(
        from, 
        { text: "❌ *Error:* No se pudo convertir el sticker a imagen. Asegúrate de que el sticker no sea animado (los animados a veces fallan)." }, 
        { quoted: msg }
      );
    }
  }
}
