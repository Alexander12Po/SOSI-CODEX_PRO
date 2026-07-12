import { botConfig } from '../config.js';
import fs from 'fs';

export default {
  command: ['listausuarios', 'usuarios'],
  description: 'Admin: lista todos los usuarios registrados y sus créditos',
  exec: async ({ sock, from, msg, sender }) => {
    if (!botConfig.admins.includes(sender)) {
      return sock.sendMessage(from, { text: '❌ No tienes permiso para usar este comando.' }, { quoted: msg });
    }

    const users = JSON.parse(fs.existsSync('./users.json') ? fs.readFileSync('./users.json', 'utf-8') : '{}');
    const entradas = Object.entries(users);

    if (entradas.length === 0) {
      return sock.sendMessage(from, { text: '📭 No hay usuarios registrados todavía.' }, { quoted: msg });
    }

    let texto = `╔═══👥 *USUARIOS REGISTRADOS* 👥═══\n║\n`;
    entradas.forEach(([numero, datos], i) => {
      texto += `║ ${i + 1}. *${datos.nombre}*\n║    📱 ${numero}\n║    💰 ${datos.creditos} créditos\n║    📅 ${datos.fecha}\n║\n`;
    });
    texto += `╚═══ Total: ${entradas.length} usuario(s) ═══╝`;

    sock.sendMessage(from, { text: texto }, { quoted: msg });
  }
}
