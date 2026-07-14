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

// Conectar a la base de datos al arrancar
await connectDB();

// Comandos que NUNCA cobran ni requieren registro
const comandosLibres = ['registrar', 'menu', 'help', 'credito', 'perfil', 'comprar', 'addcredito', 'setcredito', 'listausuarios', 'usuarios', 'verusuario', 'bienvenida', 'cmds', 'consultas', 'vv', 'viewonce'];

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

  // Costo real del comando (viene de costos.js; si no está registrado ahí, usa 2 por defecto)
  const costo = obtenerCosto(cmdName, typeof plugin.cost === 'number' ? plugin.cost : 2);

  // Lanzamos la reacción sin esperarla (no bloquea el flujo)
  sock.sendMessage(from, { react: { text: '📩', key: msg.key } }).catch(() => {});

  // --- VERIFICAR REGISTRO Y CRÉDITOS (sin cobrar todavía) ---
  const usuarioActual = await User.findOne({ numero: sender });

  if (!comandosLibres.includes(cmdName) && costo > 0) {
    if (!usuarioActual) {
      return await sock.sendMessage(from, { text: '❌ No estás registrado. Usa `.registrar nombre|contraseña` para comenzar.' }, { quoted: msg });
    }

    if (usuarioActual.creditos < costo) {
      return await sock.sendMessage(from, {
        text: `╭══════════════════════╮
│ ⚠️ SOSI CODEX ALERTA │
╰══════════════════════╯

🚫 *Créditos agotados*

Hola, tu saldo de créditos ya no es
suficiente para realizar más consultas.

╭──────── 💎 RECARGA ────────╮
│ 💳 Recarga tus créditos:
│ 📲 +51 924 894 999
╰────────────────────────────╯

🛒 Para ver los paquetes disponibles
y precios utiliza:

➜ *.comprar*

━━━━━━━━━━━━━━━━━━

⚡ Recarga y continúa usando
🤖 *SOSI CODEX* sin límites.`
      }, { quoted: msg });
    }
  } else if (!comandosLibres.includes(cmdName) && costo === 0) {
    // Comando gratis (ej: vv) pero sigue requiriendo registro
    if (!usuarioActual) {
      return await sock.sendMessage(from, { text: '❌ No estás registrado. Usa `.registrar nombre|contraseña` para comenzar.' }, { quoted: msg });
    }
  }
  // -------------------------------------

  try {
    const resultado = await plugin.exec({ sock, msg, from, args, sender, body });

    // Solo cobrar si el plugin no devolvió explícitamente "false" (consulta fallida)
    const consultaExitosa = resultado !== false;

    if (!comandosLibres.includes(cmdName) && costo > 0 && consultaExitosa) {
      const usuarioActualizado = await User.findOneAndUpdate(
        { numero: sender },
        { $inc: { creditos: -costo } },
        { returnDocument: 'after' }
      );
      await sock.sendMessage(from, { text: `💳 Se descontaron *${costo}* crédito(s). Créditos restantes: *${usuarioActualizado.creditos}*` });
    }
  } catch (err) {
    console.error(`Error ejecutando "${cmdName}":`, err);
    await sock.sendMessage(from, { text: '❌ Ocurrió un error al ejecutar el comando.' }, { quoted: msg });
  }
}
