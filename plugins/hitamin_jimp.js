import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Jimp } from 'jimp';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

export default {
  command: ['hitamin', 'negro'],
  cost: 1,
  async exec({ sock, msg, from }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMessage = quoted?.imageMessage || msg.message?.imageMessage;

    if (!imageMessage) {
      await sock.sendMessage(from, {
        text: '📸 Responde a una imagen con *.hitamin* para aplicar el filtro.'
      }, { quoted: msg });
      return false;
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } }).catch(() => {});

    const inputPath = path.join(tmpDir, `hitamin_in_${Date.now()}.jpg`);
    const outputPath = path.join(tmpDir, `hitamin_out_${Date.now()}.jpg`);

    try {
      const stream = await downloadContentFromMessage(imageMessage, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      fs.writeFileSync(inputPath, buffer);

      const imagen = await Jimp.read(inputPath);

      // Baja brillo, sube contraste y aplica tinte oscuro/marrón sobre toda la imagen
      imagen
        .brightness(-0.45)
        .contrast(0.1)
        .color([
          { apply: 'mix', params: ['#5A3C28', 35] } // mezcla 35% con un marrón oscuro
        ]);

      await imagen.writeAsync(outputPath);

      await sock.sendMessage(from, {
        image: fs.readFileSync(outputPath),
        caption: 'done bosku ✅'
      }, { quoted: msg });

      return true;
    } catch (err) {
      console.error('Error en hitamin:', err.message);
      await sock.sendMessage(from, { text: '❌ No se pudo procesar la imagen.' }, { quoted: msg });
      return false;
    } finally {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  }
};
