import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { botConfig } from '../config.js'
const { getUniquePlugins } = await import('../handler.js')

// Si usas @whiskeysockets/baileys, necesitas importar esto para los botones V2
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

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
    const pushName = msg.pushName || 'Usuario'
    const uptime = formatUptime(Date.now() - startTime)
    const commandList = getUniquePlugins()

    // Formato de lista con el símbolo 彡 como en la imagen
    const listaComandos = commandList
      .map(p => `彡 ${botConfig.prefix}${p.command[0]} : ${p.description}`)
      .join('\n')

    // El diseño de texto usando backticks (`) para los fondos grises
    const caption = `-- 💸 *Bot Menu*
────────────────────────

\`ESTADO   :  ACTIVO\`
────────────────────────

彡 Name : ${pushName}
彡 Prefix : *${botConfig.prefix}*
彡 Uptime : ${uptime}
彡 Total CMD : ${commandList.length}
彡 Main : Whatsapp

*Comandos:*
${listaComandos}

────────────────────────
| \`CREATED by: ${botConfig.botName}\``

    const imagePath = path.join(__dirname, '..', botConfig.menuImage)

    // Preparamos la imagen si existe
    let mediaMessage = null;
    if (fs.existsSync(imagePath)) {
      const image = fs.readFileSync(imagePath)
      // Subimos la imagen a los servidores de WA para usarla en el mensaje interactivo
      const upload = await sock.prepareWAMessageMedia({ image: image }, { upload: sock.waUploadToServer })
      mediaMessage = upload.imageMessage
    }

    // Estructura del Mensaje Interactivo (Botón V2)
    const interactiveMessage = {
      body: proto.Message.InteractiveMessage.Body.create({ text: caption }),
      footer: proto.Message.InteractiveMessage.Footer.create({ text: ' ' }), // Puedes poner texto aquí si lo deseas
      header: proto.Message.InteractiveMessage.Header.create({
        title: '',
        subtitle: '',
        hasMediaAttachment: !!mediaMessage,
        imageMessage: mediaMessage // Adjuntamos la imagen al header
      }),
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
        buttons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '↩ CONTACTAR CREADOR', // El texto de tu botón
              id: `${botConfig.prefix}creador` // El comando que ejecutará al hacer clic
            })
          }
        ]
      })
    }

    // Generamos el mensaje con el botón
    const msgData = generateWAMessageFromContent(from, {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.create(interactiveMessage)
        }
      }
    }, { quoted: msg })

    // Enviamos el mensaje
    await sock.relayMessage(from, msgData.message, { messageId: msgData.key.id })
  }
}
