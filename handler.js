import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { botConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsPath = path.join(__dirname, 'plugins');

// --- Helpers para Usuarios ---
const getUsers = () => {
  if (!fs.existsSync('./users.json')) return {};
  return JSON.parse(fs.readFileSync('./users.json', 'utf-8'));
};

const saveUsers = (data) => {
  fs.writeFileSync('./users.json', JSON.stringify(data, null, 2));
};
// -----------------------------

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

  // --- LÓGICA DE REGISTRO Y CRÉDITOS ---
  const sender = msg.key.participant || msg.key.remoteJid; // ID del usuario
  const users = getUsers();

  // 1. Si NO es el comando 'registrar', validamos:
  if (cmdName !== 'registrar') {
    // ¿Está registrado?
    if (!users[sender]) {
      return await sock.sendMessage(from, { text: '❌ No estás registrado. Usa `.registrar nombre|contraseña` para comenzar.' }, { quoted: msg });
    }
    
    // ¿Tiene suficientes créditos? (2 créditos por consulta)
    if (users[sender].creditos < 2) {
      return await sock.sendMessage(from, { text: '⚠️ No tienes créditos suficientes. (Necesitas 2 créditos).' }, { quoted: msg });
    }

    // Restamos créditos y guardamos
    users[sender].creditos -= 2;
    saveUsers(users);
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
