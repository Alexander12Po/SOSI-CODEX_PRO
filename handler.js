import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { botConfig } from './config.js';
import { obtenerCosto } from './costos.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsPath = path.join(__dirname, 'plugins');

function normalizarJid(jid) {
  const numero = jid.split('@')[0].split(':')[0];
  return numero + '@s.whatsapp.net';
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

  const senderRaw = msg.key.participant || msg.key.remoteJid;
  const sender = normalizarJid(senderRaw);
  const users = getUsers();

  // Costo real del comando (viene de costos.js; si no está registrado ahí, usa 2 por defecto)
  const costo = obtenerCosto(cmdName, typeof plugin.cost === 'number' ? plugin.cost : 2);

  // --- VERIFICAR REGISTRO Y CRÉDITOS (sin cobrar todavía) ---
  if (!comandosLibres.includes(cmdName) && costo > 0) {
    if (!users[sender]) {
      return await sock.sendMessage(from, { text: '❌ No estás registrado. Usa `.registrar nombre|contraseña` para comenzar.' }, { quoted: msg });
    }

    if (users[sender].creditos < costo) {
      return await sock.sendMessage(from, {
        text: `⚠️ ¡Tus créditos se han agotado!

Ya no cuentas con créditos suficientes para realizar más consultas.

💳 Recarga tus créditos escribiendo al +51 924 894 999.

📋 Para ver el catálogo de paquetes y precios, utiliza el comando:

.comprar

¡Recarga y continúa disfrutando del servicio! 🚀`
      }, { quoted: msg });
    }
  } else if (!comandosLibres.includes(cmdName) && costo === 0) {
    // Comando gratis (ej: vv) pero sigue requiriendo registro
    if (!users[sender]) {
      return await sock.sendMessage(from, { text: '❌ No estás registrado. Usa `.registrar nombre|contraseña` para comenzar.' }, { quoted: msg });
    }
  }
  // -------------------------------------

  try {
    await sock.sendMessage(from, { react: { text: '📩', key: msg.key } });
    const resultado = await plugin.exec({ sock, msg, from, args, sender, body });

    // Solo cobrar si el plugin no devolvió explícitamente "false" (consulta fallida)
    const consultaExitosa = resultado !== false;

    if (!comandosLibres.includes(cmdName) && costo > 0 && consultaExitosa) {
      const usersActualizados = getUsers();
      usersActualizados[sender].creditos -= costo;
      saveUsers(usersActualizados);
      await sock.sendMessage(from, { text: `💳 Se descontaron *${costo}* crédito(s). Créditos restantes: *${usersActualizados[sender].creditos}*` });
    }
  } catch (err) {
    console.error(`Error ejecutando "${cmdName}":`, err);
    await sock.sendMessage(from, { text: '❌ Ocurrió un error al ejecutar el comando.' }, { quoted: msg });
  }
    }
