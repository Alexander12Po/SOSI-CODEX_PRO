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

function limpiarNombre(nombre) {
  if (!nombre) return 'Usuario'
  const primeraPalabra = nombre.trim().split(/\s+/)[0]
  return primeraPalabra.length > 0 ? primeraPalabra : 'Usuario'
}

export default {
  command: ['menu', 'help'],
  description: 'Muestra el menú de comandos',
  exec: async ({ sock, from, msg }) => {
    const { getUniquePlugins } = await import('../handler.js')
    const nombre = limpiarNombre(msg.pushName)
    const uptime = formatUptime(Date.now() - startTime)
    const version = botConfig.version || '1.0.0'
    const commandList = getUniquePlugins()

    const listaComandos = commandList
      .map(p => `✧ *${botConfig.prefix}${p.command[0]}*\n   ${p.description}`)
      .join('\n')

    const caption = `🐾 〔 *${botConfig.botName}* 〕🐾
   _Bot inteligente de consultas_
━━━━━━━━━━━━━━━━━━━━

👋 ¡Hola, *${nombre}*!

┌─ 📊 *ESTADO*
│ ⚙️ Versión   : ${version}
│ 🔧 Prefijo   : [ ${botConfig.prefix} ]
│ ⏱️ Activo    : ${uptime}
│ 📦 Comandos  : ${commandList.length}
└────────────────

┌─ 📜 *COMANDOS DISPONIBLES*
${listaComandos.split('\n').map(l => `│ ${l}`).join('\n')}
└────────────────

━━━━━━━━━━━━━━━━━━━━
🐾 *${botConfig.botName}* © ${new Date().getFullYear()} — Todos los derechos reservados`

    const esURL = /^https?:\/\//i.test(botConfig.menuImage)

    if (esURL) {
      await sock.sendMessage(
        from,
        { image: { url: botConfig.menuImage }, caption },
        { quoted: msg }
      )
    } else {
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
}
