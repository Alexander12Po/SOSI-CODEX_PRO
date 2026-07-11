import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { botConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsPath = path.join(__dirname, 'plugins');

function normalizarJid(jid) {
  return jid.split(':')[0] + '@s.whatsapp.net';
}

// --- Helpers para Usuarios ---
const getUsers = () => {
  if (!fs.existsSync('./users.json')) return {};
  return JSON.parse(fs.readFileSync('./users.json', 'utf-8'));
};

const saveUsers = (data) => {
  fs.writeFileSync('./users.json', JSON.stringify(data, null, 2));
};
// -----------------------------

// Comandos que NUNCA cobran ni requieren registro
const comandosLibres = ['registrar', 'menu', 'help', 'credito', 'perfil'];

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

  const senderRaw = msg.key.participant || msg.key.remoteJid;
  const sender = normalizarJid(senderRaw);
  const users = getUsers();

  // --- LÓGICA DE REGISTRO Y CRÉDITOS ---
  if (!comandosLibres.includes(cmdName)) {
    if (!users[sender]) {
      return await sock.sendMessage(from, { text: '❌ No estás registrado. Usa `.registrar nombre|contraseña` para comenzar.' }, { quoted: msg });
    }

    // Costo del comando: si el plugin define "cost", se usa; si no, por defecto 2
    const costo = typeof plugin.cost === 'number' ? plugin.cost : 2;

    if (users[sender].creditos < costo) {
      return await sock.sendMessage(from, { text: `⚠️ No tienes créditos suficientes. Esta consulta cuesta *${costo}* crédito(s) y solo tienes *${users[sender].creditos}*.` }, { quoted: msg });
    }

    users[sender].creditos -= costo;
    saveUsers(users);

    // Aviso opcional al usuario de cuánto se le descontó
    await sock.sendMessage(from, { text: `💳 Se descontaron *${costo}* crédito(s). Créditos restantes: *${users[sender].creditos}*` });
  }
  // -------------------------------------

  try {
    await sock.sendMessage(from, { react: { text: '📩', key: msg.key } });
    await plugin.exec({ sock, msg, from, args, sender, body });
  } catch (err) {
    console.error(`Error ejecutando "${cmdName}":`, err);
    await sock.sendMessage(from, { text: '❌ Ocurrió un error al ejecutar el comando.' }, { quoted: msg });
  }
}
