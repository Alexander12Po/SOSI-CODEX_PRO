import fs from 'fs';

export default {
  command: ['credito', 'perfil'],
  description: 'Muestra tu perfil y créditos disponibles',
  exec: async ({ sock, from, msg, sender }) => {
    const users = JSON.parse(fs.existsSync('./users.json') ? fs.readFileSync('./users.json', 'utf-8') : '{}');
    const user = users[sender];

    if (!user) {
      return sock.sendMessage(from, { text: '❌ No estás registrado. Usa `.registrar nombre|contraseña`.' }, { quoted: msg });
    }

    const perfil = `╔═════👤 *PERFIL* 👤═════
║ 👤 Nombre: ${user.nombre}
║ 💰 Créditos: ${user.creditos}
║ 📅 Registro: ${user.fecha}
╚══════════════════════╝`;

    sock.sendMessage(from, { text: perfil }, { quoted: msg });
  }
}
