import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

export default {
  command: 'hitamin',
  cost: 1,
  async exec({ sock, msg, from }) {
    // Busca la imagen citada (la persona responde a una foto con .hitamin)
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

      // Aplica tinte oscuro/marrón sobre toda la imagen
      await sharp(inputPath)
        .modulate({ brightness: 0.55, saturation: 1.1 })
        .tint({ r: 90, g: 60, b: 40 })
        .toFile(outputPath);

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
