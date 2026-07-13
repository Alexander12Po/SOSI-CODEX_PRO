import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { botConfig } from '../config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- Cache en memoria de mensajes recientes ---
// Clave: `${remoteJid}_${messageId}`  ->  { texto, tipo, senderId, senderName, chatId, timestamp, audioPath?, mimetype?, ptt? }
const cache = new Map()

const MAX_ENTRADAS = 1500                  // límite de mensajes guardados en memoria
const TIEMPO_VIDA_MS = 24 * 60 * 60 * 1000 // 24 horas

// Carpeta temporal donde se guardan los audios descargados
const TMP_DIR = path.join(__dirname, '..', 'tmp_antidelete')
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

function borrarArchivoSiExiste(filePath) {
  if (!filePath) return
  fs.unlink(filePath, () => {}) // silencioso, si no existe no importa
}

// Limpieza periódica para no acumular memoria/disco indefinidamente
setInterval(() => {
  const ahora = Date.now()
  for (const [key, val] of cache.entries()) {
    if (ahora - val.timestamp > TIEMPO_VIDA_MS) {
      borrarArchivoSiExiste(val.audioPath)
      cache.delete(key)
    }
  }
}, 10 * 60 * 1000) // cada 10 minutos

function extraerTexto(message) {
  if (!message) return null

  if (message.conversation) return { texto: message.conversation, tipo: 'texto' }
  if (message.extendedTextMessage?.text) return { texto: message.extendedTextMessage.text, tipo: 'texto' }
  if (message.imageMessage) return { texto: message.imageMessage.caption || '(imagen sin texto)', tipo: 'imagen' }
  if (message.videoMessage) return { texto: message.videoMessage.caption || '(video sin texto)', tipo: 'video' }
  if (message.documentMessage) return { texto: message.documentMessage.fileName || '(documento)', tipo: 'documento' }
  if (message.audioMessage) return { texto: message.audioMessage.ptt ? '(nota de voz)' : '(audio)', tipo: 'audio' }
  if (message.stickerMessage) return { texto: '(sticker)', tipo: 'sticker' }

  return null
}

async function descargarAudio(audioMessage, messageId) {
  try {
    const stream = await downloadContentFromMessage(audioMessage, 'audio')
    let buffer = Buffer.from([])
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }

    const extension = audioMessage.mimetype?.includes('ogg') ? 'ogg' : 'mp3'
    const filePath = path.join(TMP_DIR, `${messageId}.${extension}`)
    fs.writeFileSync(filePath, buffer)

    return filePath
  } catch (err) {
    console.error('Error descargando audio (antidelete):', err.message)
    return null
  }
}

/**
 * Guarda una copia del mensaje en cache, para poder recuperarlo si luego se elimina.
 * Debe llamarse con TODOS los mensajes entrantes (antes de filtrar por prefijo de comando).
 */
export async function cachearMensaje(msg) {
  try {
    if (!msg?.message || !msg.key?.id) return
    if (msg.message.protocolMessage) return // no cachear los propios mensajes de "eliminar"

    const extraido = extraerTexto(msg.message)
    if (!extraido) return // tipo de mensaje no soportado (ubicación, contacto, etc.)

    const chatId = msg.key.remoteJid
    const senderId = msg.key.participantAlt || msg.key.participant || msg.key.remoteJid
    const senderName = msg.pushName || senderId?.split('@')[0]

    const key = `${chatId}_${msg.key.id}`

    const entrada = {
      texto: extraido.texto,
      tipo: extraido.tipo,
      senderId,
      senderName,
      chatId,
      timestamp: Date.now()
    }

    // Si es audio/nota de voz, descargamos el archivo real para poder reenviarlo
    if (extraido.tipo === 'audio') {
      const audioMessage = msg.message.audioMessage
      const filePath = await descargarAudio(audioMessage, msg.key.id)
      if (filePath) {
        entrada.audioPath = filePath
        entrada.mimetype = audioMessage.mimetype
        entrada.ptt = audioMessage.ptt || false
      }
    }

    cache.set(key, entrada)

    // Evitar crecimiento infinito: si se pasa del límite, borra el más antiguo
    if (cache.size > MAX_ENTRADAS) {
      const primeraClave = cache.keys().next().value
      const primeraEntrada = cache.get(primeraClave)
      borrarArchivoSiExiste(primeraEntrada?.audioPath)
      cache.delete(primeraClave)
    }
  } catch (err) {
    console.error('Error cacheando mensaje (antidelete):', err.message)
  }
}

/**
 * Debe llamarse cuando se detecta un mensaje de tipo protocolMessage con type REVOKE.
 * Busca el mensaje original en cache y lo reenvía al chat.
 */
export async function manejarMensajeEliminado(sock, msg) {
  try {
    const protocolMsg = msg.message?.protocolMessage
    if (!protocolMsg?.key?.id) return

    const chatId = msg.key.remoteJid
    const key = `${chatId}_${protocolMsg.key.id}`
    const original = cache.get(key)

    if (!original) {
      // No teníamos copia guardada (mensaje muy viejo, o del propio bot), no hacemos nada
      return
    }

    const eliminadoPorId = msg.key.participantAlt || msg.key.participant || msg.key.remoteJid
    const esMismaPersona = eliminadoPorId?.split('@')[0].split(':')[0] === original.senderId?.split('@')[0].split(':')[0]

    const textoAviso = `🗑️〔 *${botConfig.botName} - CODEX-VIP* 〕🗑️
━━━━━━━━━━━━━━━━━━━━

⚠️ *Mensaje eliminado detectado*

👤 *Enviado por:* @${original.senderId.split('@')[0]}
🧹 *Eliminado por:* ${esMismaPersona ? 'el mismo remitente' : '@' + eliminadoPorId.split('@')[0]}
📦 *Tipo:* ${original.tipo}${original.tipo !== 'audio' ? `\n\n💬 *Contenido:*\n${original.texto}` : ''}

━━━━━━━━━━━━━━━━━━━━`

    const mentions = [original.senderId]
    if (!esMismaPersona) mentions.push(eliminadoPorId)

    await sock.sendMessage(chatId, { text: textoAviso, mentions })

    // Si era audio y lo tenemos descargado, lo reenviamos también
    if (original.tipo === 'audio' && original.audioPath && fs.existsSync(original.audioPath)) {
      const buffer = fs.readFileSync(original.audioPath)
      await sock.sendMessage(chatId, {
        audio: buffer,
        mimetype: original.mimetype || 'audio/ogg; codecs=opus',
        ptt: original.ptt
      })
    }

    // Ya se usó: limpiamos cache y archivo temporal
    borrarArchivoSiExiste(original.audioPath)
    cache.delete(key)
  } catch (err) {
    console.error('Error en manejarMensajeEliminado (antidelete):', err.message)
  }
      }
