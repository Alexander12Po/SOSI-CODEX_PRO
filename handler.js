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
    
    // Ejecutamos el plugin
    const resultado = await plugin.exec({ sock, msg, from, args, sender, body });

    // Si hubo error y el plugin retornó false, detenemos sin cobrar.
    if (resultado === false) return;

    // Solo cobramos y agregamos créditos si es un comando de pago y el plugin devolvió un mensaje válido
    if (resultado && typeof resultado === 'object' && (resultado.text || resultado.image)) {
      
      let creditosActualizados = usuarioActual ? usuarioActual.creditos : 0;
      let infoCreditos = '';

      if (!comandosLibres.includes(cmdName) && costo > 0) {
        // Cobro en la base de datos
        const usuarioActualizado = await User.findOneAndUpdate(
          { numero: sender },
          { $inc: { creditos: -costo } },
          { new: true }
        );
        creditosActualizados = usuarioActualizado.creditos;
        
        // Formato final de los créditos
        const usuarioTag = `@${sender.split('@')[0]}`;
        infoCreditos = `\n\n─── *SOSI CODEX* ★ ───\n💳 *CRÉDITOS:* ${creditosActualizados}\n👤 *USUARIO:* ${usuarioTag}`;
      }

      // Concatenamos y enviamos el mensaje final
      if (resultado.image) {
        const captionFinal = (resultado.caption || '') + infoCreditos;
        await sock.sendMessage(from, { image: resultado.image, caption: captionFinal, mentions: [sender] }, { quoted: msg });
      } else if (resultado.text) {
        const textFinal = resultado.text + infoCreditos;
        await sock.sendMessage(from, { text: textFinal, mentions: [sender] }, { quoted: msg });
      }
    }
    // Si 'resultado' es undefined (como pasa con .registrar o .credito), simplemente termina con éxito sin colapsar.

  } catch (err) {
    console.error(`Error ejecutando "${cmdName}":`, err);
    await sock.sendMessage(from, { text: '❌ Ocurrió un error al ejecutar el comando.' }, { quoted: msg });
  }
}
