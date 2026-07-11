import { downloadMediaMessage } from '@whiskeysockets/baileys'

export default {
  command: ['vv', 'viewonce'],
  description: 'Descarga fotos y videos enviados para ver una sola vez',
  exec: async ({ sock, from, msg }) => {
    // Buscar si el usuario está respondiendo a otro mensaje
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      return sock.sendMessage(
        from, 
        { text: '❌ *Error:* Por favor, responde a una foto o video de "una sola vez" con el comando *.vv*' }, 
        { quoted: msg }
      );
    }

    // Los mensajes de "una sola vez" en WhatsApp vienen envueltos en formatos especiales
    // Verificamos si es V1, V2 o V2Extension
    const viewOnceMsg = quoted.viewOnceMessage?.message || 
                        quoted.viewOnceMessageV2?.message || 
                        quoted.viewOnceMessageV2Extension?.message;

    if (!viewOnceMsg) {
      return sock.sendMessage(
        from, 
        { text: '❌ *Error:* El mensaje al que respondiste no es de "una sola vez".' }, 
        { quoted: msg }
      );
    }

    // Identificar si lo que hay dentro es imagen o video
    const isImage = !!viewOnceMsg.imageMessage;
    const isVideo = !!viewOnceMsg.videoMessage;

    if (!isImage && !isVideo) {
      return sock.sendMessage(
        from, 
        { text: '❌ *Error:* Solo puedo desbloquear fotos o videos.' }, 
        { quoted: msg }
      );
    }

    try {
      await sock.sendMessage(from, { text: '⏳ *Desbloqueando archivo...*' }, { quoted: msg });
      
      // Reconstruimos el mensaje para que Baileys sepa qué descargar
      const targetMessage = {
        message: viewOnceMsg,
        key: {
          remoteJid: from,
          id: msg.message.extendedTextMessage.contextInfo.stanzaId
        }
      };

      // Descargamos el archivo (buffer)
      const buffer = await downloadMediaMessage(targetMessage, "buffer", {});
      
      // Enviamos el archivo de vuelta como multimedia normal
      if (isImage) {
        return sock.sendMessage(
          from, 
          { image: buffer, caption: '🔓 *Foto desbloqueada con éxito*' }, 
          { quoted: msg }
        );
      } else if (isVideo) {
        return sock.sendMessage(
          from, 
          { video: buffer, caption: '🔓 *Video desbloqueado con éxito*' }, 
          { quoted: msg }
        );
      }

    } catch (err) {
      console.error("Error en comando vv.js:", err);
      return sock.sendMessage(
        from, 
        { text: "❌ *Error:* No se pudo descargar el archivo de una sola vez." }, 
        { quoted: msg }
      );
    }
  }
}
