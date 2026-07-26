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

      // Color marrón oscuro objetivo y porcentaje de mezcla
      const tinte = { r: 90, g: 60, b: 40 };
      const mezcla = 0.35; // 35%

      imagen.scan(0, 0, imagen.bitmap.width, imagen.bitmap.height, function (x, y, idx) {
        const buf = this.bitmap.data;
        // Baja el brillo general (multiplica canales por 0.6)
        const r = buf[idx + 0] * 0.6;
        const g = buf[idx + 1] * 0.6;
        const b = buf[idx + 2] * 0.6;

        // Mezcla hacia el tono marrón oscuro
        buf[idx + 0] = r * (1 - mezcla) + tinte.r * mezcla;
        buf[idx + 1] = g * (1 - mezcla) + tinte.g * mezcla;
        buf[idx + 2] = b * (1 - mezcla) + tinte.b * mezcla;
      });

      await imagen.write(outputPath);

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
