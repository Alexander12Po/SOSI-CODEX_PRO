import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { botConfig } from './config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pluginsPath = path.join(__dirname, 'plugins')

export const plugins = new Map()

async function loadPlugins() {
  const files = fs.readdirSync(pluginsPath).filter(f => f.endsWith('.js'))
  for (const file of files) {
    const module = await import(`./plugins/${file}`)
    const plugin = module.default
    if (plugin?.command) {
      for (const cmd of plugin.command) {
        plugins.set(cmd, plugin)
      }
    }
  }
  console.log(`🔌 ${plugins.size} comandos cargados: ${[...plugins.keys()].join(', ')}`)
}

await loadPlugins()

// Devuelve solo un plugin por comando "principal" (evita duplicados por alias, ej: menu/help)
export function getUniquePlugins() {
  return [...new Set(plugins.values())]
}

export async function handler(sock, m) {
  const msg = m.messages[0]
  if (!msg?.message) return

  const from = msg.key.remoteJid
  const type = Object.keys(msg.message)[0]

  const body =
    type === 'conversation' ? msg.message.conversation :
    type === 'extendedTextMessage' ? msg.message.extendedTextMessage.text :
    type === 'imageMessage' ? (msg.message.imageMessage.caption || '') :
    type === 'videoMessage' ? (msg.message.videoMessage.caption || '') :
    ''

  if (!body || !body.startsWith(botConfig.prefix)) return

  const args = body.slice(botConfig.prefix.length).trim().split(/ +/)
  const cmdName = args.shift().toLowerCase()

  const plugin = plugins.get(cmdName)
  if (!plugin) return

  const sender = msg.key.participant || msg.key.remoteJid

  // 📩 Reacciona al mensaje original con el emoji de confirmación
  try {
    await sock.sendMessage(from, { react: { text: '📩', key: msg.key } })
  } catch (err) {
    // Si falla la reacción no detenemos la ejecución del comando
    console.error('No se pudo reaccionar al mensaje:', err)
  }

  try {
    await plugin.exec({ sock, msg, from, args, sender, body })
  } catch (err) {
    console.error(`Error ejecutando comando "${cmdName}":`, err)
    await sock.sendMessage(from, { text: '❌ Ocurrió un error al ejecutar el comando.' }, { quoted: msg })
  }
}
