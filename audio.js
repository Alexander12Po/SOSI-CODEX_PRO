import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { exec } from 'child_process';
import util from 'util';
import 'dotenv/config';

const execP = util.promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

export async function transcribirAudio(msg) {
  try {
    const stream = await downloadContentFromMessage(msg.message.audioMessage, 'audio');
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    const inputPath = path.join(tmpDir, `in_${Date.now()}.ogg`);
    fs.writeFileSync(inputPath, buffer);

    const fileBuffer = fs.readFileSync(inputPath);
    const blob = new Blob([fileBuffer], { type: 'audio/ogg' });

    const form = new FormData();
    form.append('file', blob, 'audio.ogg');
    form.append('model', 'whisper-large-v3');
    form.append('language', 'es');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: form
    });

    const data = await res.json();
    fs.unlinkSync(inputPath);

    if (!res.ok) {
      console.error('Error transcribiendo:', data);
      return '';
    }

    return data.text || '';
  } catch (err) {
    console.error('Error en transcribirAudio:', err.message);
    return '';
  }
}

export async function generarAudioRespuesta(texto) {
  try {
    const wavPath = path.join(tmpDir, `out_${Date.now()}.wav`);
    const oggPath = wavPath.replace('.wav', '.ogg');
    const textoSeguro = texto.replace(/"/g, '\\"').replace(/\$/g, '\\$');

    const scriptPath = path.join(__dirname, 'tts.py');
    await execP(`python3 "${scriptPath}" "${textoSeguro}" "${wavPath}"`);
    await execP(`ffmpeg -y -i "${wavPath}" -c:a libopus "${oggPath}"`);

    if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
    return oggPath;
  } catch (err) {
    console.error('Error en generarAudioRespuesta:', err.message);
    return null;
  }
}
