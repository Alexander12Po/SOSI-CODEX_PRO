import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { botConfig } from '../config.js'
const { getUniquePlugins } = await import('../handler.js')

// ✅ CORRECCIÓN: Se importó prepareWAMessageMedia aquí
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from '@whiskeysockets/baileys'

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

    const listaComandos = commandList
      .map(p => `彡 ${botConfig.prefix}${p.command[0]} : ${p.description}`)
      .join('\n')

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

    let mediaMessage = null;
    if (fs.existsSync(imagePath)) {
      const image = fs.readFileSync(imagePath)
      // ✅ CORRECCIÓN: Ahora se llama a la función importada directamente
      const upload = await prepareWAMessageMedia({ image: image }, { upload: sock.waUploadToServer })
      mediaMessage = upload.imageMessage
    }

    const interactiveMessage = {
      body: proto.Message.InteractiveMessage.Body.create({ text: caption }),
      footer: proto.Message.InteractiveMessage.Footer.create({ text: ' ' }),
      header: proto.Message.InteractiveMessage.Header.create({
        title: '',
        subtitle: '',
        hasMediaAttachment: !!mediaMessage,
        imageMessage: mediaMessage 
      }),
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
        buttons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '↩ CONTACTAR CREADOR', 
              id: `${botConfig.prefix}creador` 
            })
          }
        ]
      })
    }

    const msgData = generateWAMessageFromContent(from, {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.create(interactiveMessage)
        }
      }
    }, { quoted: msg })

    await sock.relayMessage(from, msgData.message, { messageId: msgData.key.id })
  }
}
