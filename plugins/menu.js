import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { botConfig } from '../config.js'
import { costoPorComando } from '../costos.js'

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

// --- Mapa manual de categorías por comando ---
// Si un comando no aparece aquí, cae en "OTROS" automáticamente.
const categoriaPorComando = {
  // Admin
  addcredito: 'ADMIN',
  setcredito: 'ADMIN',

  // Usuario
  registrar: 'USUARIO',
  credito: 'USUARIO',
  perfil: 'USUARIO',
  comprar: 'USUARIO',

  // General / info del bot
  menu: 'GENERAL',
  help: 'GENERAL',
  info: 'GENERAL',
  ping: 'GENERAL',

  // Consultas
  ag: 'CONSULTAS',
  denuncias: 'CONSULTAS',
  dir: 'CONSULTAS',
  dni: 'CONSULTAS',
  dniamarillo: 'CONSULTAS',
  dniazul: 'CONSULTAS',
  dnielectronico: 'CONSULTAS',
  fiscalia: 'CONSULTAS',
  nm: 'CONSULTAS',
  placa: 'CONSULTAS',
  rfm: 'CONSULTAS',
  soat: 'CONSULTAS',
  sueldo: 'CONSULTAS',
  telp: 'CONSULTAS',
  vv: 'CONSULTAS'
}

// Orden en que se muestran las categorías en el menú
const ordenCategorias = ['ADMIN', 'USUARIO', 'GENERAL', 'CONSULTAS', 'OTROS']

// Emoji por categoría
const emojiCategoria = {
  ADMIN: '🧑‍💻',
  USUARIO: '🕵️',
  GENERAL: 'ℹ️',
  CONSULTAS: '📂',
  OTROS: '📦'
}

export default {
  command: ['menu', 'help'],
  description: 'Muestra el menú de comandos',
  exec: async ({ sock, from, msg, sender }) => {
    // --- Verificar registro antes de mostrar el menú ---
    const users = JSON.parse(fs.existsSync('./users.json') ? fs.readFileSync('./users.json', 'utf-8') : '{}')

    if (!users[sender]) {
      return sock.sendMessage(from, {
        text: `╔═══📝 *REGISTRO REQUERIDO* 📝═══
║
║ Aún no estás registrado.
║
║ 👉 Usa: *${botConfig.prefix}registrar nombre|password*
║
╚══════════════════════╝`
      }, { quoted: msg })
    }
    // ----------------------------------------------------

    const { getUniquePlugins } = await import('../handler.js')
    const nombre = limpiarNombre(msg.pushName)
    const uptime = formatUptime(Date.now() - startTime)
    const version = botConfig.version || '1.0.0'
    const commandList = getUniquePlugins()

    // --- Agrupar comandos por categoría (usando el mapa manual) ---
    const categorias = {}
    for (const p of commandList) {
      const cmdPrincipal = p.command[0]
      const cat = categoriaPorComando[cmdPrincipal] || 'OTROS'
      if (!categorias[cat]) categorias[cat] = []
      categorias[cat].push(p)
    }

    let bloquesCategorias = ''
    for (const cat of ordenCategorias) {
      const plugins = categorias[cat]
      if (!plugins || plugins.length === 0) continue

      const items = plugins
        .map(p => {
          const cmdPrincipal = p.command[0]
          const costo = costoPorComando.hasOwnProperty(cmdPrincipal) ? costoPorComando[cmdPrincipal] : null
          let etiquetaCosto = ''
          if (costo === 0) etiquetaCosto = ' 🆓 Gratis'
          else if (costo !== null) etiquetaCosto = ` 💰 ${costo} crédito${costo === 1 ? '' : 's'}`

          return `│ ✧ *${botConfig.prefix}${cmdPrincipal}*${etiquetaCosto}\n│    ${p.description}`
        })
        .join('\n')

      const emoji = emojiCategoria[cat] || '📂'
      bloquesCategorias += `┌─ ${emoji} *${cat}*\n${items}\n└────────────────\n\n`
    }
    // ----------------------------------------------------------

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

${bloquesCategorias}━━━━━━━━━━━━━━━━━━━━
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
