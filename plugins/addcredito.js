import fs from 'fs';
import { botConfig } from '../config.js';

export default {
  command: ['addcredito', 'setcredito'],
  description: 'Admin: agrega o quita créditos a un usuario',
  exec: async ({ sock, from, msg, args, sender }) => {
    // Solo administradores pueden usar este comando
    if (!botConfig.admins.includes(sender)) {
      return sock.sendMessage(from, {
        text: `❌ No tienes permiso para usar este comando.\n\n🔍 Tu ID detectado por el bot es:\n${sender}\n\n📋 IDs autorizados actualmente:\n${botConfig.admins.join('\n')}`
      }, { quoted: msg });
    }

    // Uso: .addcredito 51999999999@s.whatsapp.net 5
    if (args.length < 2) {
      return sock.sendMessage(from, { text: 'Uso correcto: .addcredito numero@s.whatsapp.net cantidad\n\nEjemplo: .addcredito 51987654321@s.whatsapp.net 5' }, { quoted: msg });
    }

    const [numeroObjetivo, cantidadStr] = args;
    const cantidad = parseInt(cantidadStr, 10);

    if (isNaN(cantidad)) {
      return sock.sendMessage(from, { text: '❌ La cantidad debe ser un número.' }, { quoted: msg });
    }

    let users = JSON.parse(fs.existsSync('./users.json') ? fs.readFileSync('./users.json', 'utf-8') : '{}');

    if (!users[numeroObjetivo]) {
      return sock.sendMessage(from, { text: '❌ Ese usuario no está registrado.' }, { quoted: msg });
    }

    users[numeroObjetivo].creditos += cantidad;
    if (users[numeroObjetivo].creditos < 0) users[numeroObjetivo].creditos = 0;

    fs.writeFileSync('./users.json', JSON.stringify(users, null, 2));

    sock.sendMessage(from, {
      text: `✅ Créditos actualizados.\n👤 Usuario: ${users[numeroObjetivo].nombre}\n💰 Créditos actuales: ${users[numeroObjetivo].creditos}`
    }, { quoted: msg });
  }
}
