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

      // Convierte RGB a HSL para poder filtrar por tono de piel
      function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        return [h * 360, s * 100, l * 100];
      }

      const tinte = { r: 90, g: 60, b: 40 };
      const mezcla = 0.55; // más fuerte porque solo afecta la piel

      imagen.scan(0, 0, imagen.bitmap.width, imagen.bitmap.height, function (x, y, idx) {
        const buf = this.bitmap.data;
        const r = buf[idx + 0];
        const g = buf[idx + 1];
        const b = buf[idx + 2];

        const [h, s, l] = rgbToHsl(r, g, b);

        // Rango típico de tonos de piel anime: matiz cálido (naranja/melocotón),
        // saturación media-baja, luminosidad media-alta.
        // Ajusta estos rangos si detecta de más o de menos.
        const esPiel = h >= 5 && h <= 45 && s >= 10 && s <= 60 && l >= 45 && l <= 95;

        if (esPiel) {
          buf[idx + 0] = r * (1 - mezcla) + tinte.r * mezcla;
          buf[idx + 1] = g * (1 - mezcla) + tinte.g * mezcla;
          buf[idx + 2] = b * (1 - mezcla) + tinte.b * mezcla;
        }
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
