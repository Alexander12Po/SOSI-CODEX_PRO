import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { botConfig } from './config.js';
import { obtenerCosto } from './costos.js';
import { connectDB } from './database.js';
import User from './models/User.js';
import { preguntarIA } from './groq.js';

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

  if (!body) return;

  if (!body.startsWith(botConfig.prefix)) {
    const respuestaIA = await preguntarIA(body);
    if (respuestaIA) {
      await sock.sendMessage(from, { text: respuestaIA }, { quoted: msg });
    }
    return;
  }

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
  // .lean() evita que Mongoose hidrate un documento completo innecesariamente (más rápido en lecturas)
  const usuarioActual = await User.findOne({ numero: sender }).lean();

  if (!comandosLibres.includes(cmdName) && costo > 0) {
    if (!usuarioActual) {
      return await sock.sendMessage(from, { text: '❌ No estás registrado. Usa `.registrar nombre|contraseña` para comenzar.' }, { quoted: msg });
    }

    if (usuarioActual.creditos < costo) {
      return await sock.sendMessage(fro
