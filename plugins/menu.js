import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { botConfig } from '../config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const startTime = Date.now()

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default {
  command: ['menu', 'help'],
  description: 'Muestra el menú de comandos',
  exec: async ({ sock, from, msg }) => {
    const { getUniquePlugins } = await import('../handler.js')
    const pushName = msg.pushName || 'Usuario'
    const uptime = formatUptime(Date.now() - startTime)
    const commandList = getUniquePlugins()

    const listaComandos = commandList
      .map(p => `› *${botConfig.prefix}${p.command[0]}* — ${p.description}`)
      .join('\n')

    const caption = `🐱 *${botConfig.botName}* — v${botConfig.version}

🤖 *SOSI-CODEX* | Bot inteligente de consultas. Obtén información de forma rápida y organizada mediante herramientas automatizadas. Diseñado para ofrecer respuestas precisas y una experiencia eficiente.

────────────────────

📌 *ESTADO*
› Prefijo: *[ ${botConfig.prefix} ]*
› Activo: *${uptime}*
› Comandos disponibles: *${commandList.length}*

────────────────────

📜 *LISTA DE COMANDOS*

${listaComandos}

────────────────────

👤 Solicitado por: *${pushName}*
🧠 Creado por: *${botConfig.botName}*
© ${new Date().getFullYear()} — Todos los derechos reservados`

    const imagePath = path.join(__dirname, '..', botConfig.menuImage)

    if (fs.existsSync(imagePath)) {
      await sock.sendMessage(
        from,
        { image: fs.readFileSync(imagePath), caption },
        { quoted: msg }
      )
    } else {
      await sock.sendMessage(from, { text: caption }, { quoted: msg })
    }
  }
}
