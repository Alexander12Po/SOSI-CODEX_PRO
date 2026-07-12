import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { botConfig } from './config.js';
import { obtenerCosto } from './costos.js';
import { connectDB } from './database.js';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsPath = path.join(__dirname, 'plugins');

function normalizarJid(jid) {
  const numero = jid.split('@')[0].split(':')[0];
  return numero + '@s.whatsapp.net';
}

await connectDB();

const comandosLibres = ['registrar', 'menu', 'help', 'credito', 'perfil', 'comprar', 'addcredito', 'setcredito', 'listausuarios', 'usuarios', 'verusuario'];

export const plugins = new Map();

async function loadPlugins() {
  const files = fs.readdirSync(pluginsPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const module = await import(`./plugins/${file}`);
      const plugin = module.default;
      if (!plugin || typeof plugin.exec !== 'function') continue;

      let comandos = plugin.command;
      if (typeof comandos === 'string') comandos = [comandos];
      if (!Array.isArray(comandos)) continue;

      for (const cmd of comandos) {
        plugins.set(String(cmd).toLowerCase(), plugin);
      }
    } catch (err) {
      console.log(`⚠️ Error cargando "${file}":`, err.message);
    }
  }
}

export function getUniquePlugins() {
  const seen = new Set();
  const result = [];
  for (const plugin of plugins.values()) {
    if (!seen.has(plugin)) {
      seen.add(plugin);
      result.push(plugin);
    }
  }
  return result;
}

await loadPlugins();

export async function handler(sock, m) {
  const msg = m.messages[0];
  if (!msg?.message) return;

  const from = msg.key.remoteJid;
  const type = Object.keys(msg.message)[0];
  const body =
    type === 'conversation' ? msg.message.conversation :
    type === 'extendedTextMessage' ? msg.message.extendedTextMessage.text :
    type === 'imageMessage' ? (msg.message.imageMessage.caption || '') :
    '';

  if (!body || !body.startsWith(botConfig.prefix)) return;

  const args = body.slice(botConfig.prefix.length).trim().split(/ +/);
  const cmdName = args.shift().toLowerCase();
  const plugin = plugins.get(cmdName);
  if (!plugin) return;

  const senderRaw = msg.key.participantAlt || msg.key.participant || msg.key.remoteJidAlt || msg.key.remoteJid;
  const sender = normalizarJid(senderRaw);

  const costo = obtenerCosto(cmdName, typeof plugin.cost === 'number' ? plugin.cost : 2);
  const usuarioActual = await User.findOne({ numero: sender });

  if (!comandosLibres.includes(cmdName) && costo > 0) {
    if (!usuarioActual) {
      return await sock.sendMessage(from, { text: '❌ No estás registrado. Usa `.registrar nombre|contraseña` para comenzar.' }, { quoted: msg });
    }

    if (usuarioActual.creditos < costo) {
      return await sock.sendMessage(from, {
        text: `⚠️ ¡Tus créditos se han agotado!\n\nYa no cuentas con créditos suficientes para realizar más consultas.\n\n💳 Recarga tus créditos escribiendo al +51 924 894 999.\n\n📋 Para ver el catálogo de paquetes y precios, utiliza el comando:\n\n.comprar\n\n¡Recarga y continúa disfrutando del servicio! 🚀`
      }, { quoted: msg });
    }
  } else if (!comandosLibres.includes(cmdName) && costo === 0) {
    if (!usuarioActual) {
      return await sock.sendMessage(from, { text: '❌ No estás registrado. Usa `.registrar nombre|contraseña` para comenzar.' }, { quoted: msg });
    }
  }

  try {
    await sock.sendMessage(from, { react: { text: '📩', key: msg.key } });
    
    const resultado = await plugin.exec({ sock, msg, from, args, sender, body });

    if (resultado === false) return;

    if (!comandosLibres.includes(cmdName) && costo > 0) {
      // Descontar saldo real de forma precisa
      const usuarioActualizado = await User.findOneAndUpdate(
        { numero: sender },
        { $inc: { creditos: -costo } },
        { new: true }
      );

      const usuarioTag = `@${sender.split('@')[0]}`;
      
      // Diseño del bloque final exacto solicitado por el usuario
      const bloquePremium = `\n\n╔════════════════════════════╗
║        💎 MI CUENTA        ║
╠════════════════════════════╣
║ 👤 Usuario  : ${usuarioTag}${' '.repeat(Math.max(0, 11 - usuarioTag.length))}║
║ 💰 Créditos : ${usuarioActualizado.creditos}${' '.repeat(Math.max(0, 14 - String(usuarioActualizado.creditos).length))}║
║ 🏆 Plan     : PREMIUM      ║
╚════════════════════════════╝

╭────────────────────────────╮
│ ⚡ Powered by SOSI CODEX ★ │
│ 🔒 Sistema de Consultas VIP│
│ © 2026 • Todos los derechos│
╰────────────────────────────╯`;

      if (resultado.image) {
        resultado.caption += bloquePremium;
        await sock.sendMessage(from, { image: resultado.image, caption: resultado.caption, mentions: [sender] }, { quoted: msg });
      } else if (resultado.text) {
        resultado.text += bloquePremium;
        await sock.sendMessage(from, { text: resultado.text, mentions: [sender] }, { quoted: msg });
      }
    } else {
      if (resultado.image) {
        await sock.sendMessage(from, { image: resultado.image, caption: resultado.caption }, { quoted: msg });
      } else if (resultado.text) {
        await sock.sendMessage(from, { text: resultado.text }, { quoted: msg });
      }
    }
  } catch (err) {
    console.error(`Error ejecutando "${cmdName}":`, err);
    await sock.sendMessage(from, { text: '❌ Ocurrió un error al ejecutar el comando.' }, { quoted: msg });
  }
}
