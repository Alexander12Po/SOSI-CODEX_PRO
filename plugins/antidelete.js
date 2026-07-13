import { botConfig } from '../config.js'

// --- Cache en memoria de mensajes recientes ---
// Clave: `${remoteJid}_${messageId}`  ->  { texto, tipo, senderId, senderName, chatId, timestamp }
const cache = new Map()

const MAX_ENTRADAS = 1500          // límite de mensajes guardados en memoria
const TIEMPO_VIDA_MS = 24 * 60 * 60 * 1000 // 24 horas

// Limpieza periódica para no acumular memoria indefinidamente
setInterval(() => {
  const ahora = Date.now()
  for (const [key, val] of cache.entries()) {
    if (ahora - val.timestamp > TIEMPO_VIDA_MS) cache.delete(key)
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

/**
 * Guarda una copia del mensaje en cache, para poder recuperarlo si luego se elimina.
 * Debe llamarse con TODOS los mensajes entrantes (antes de filtrar por prefijo de comando).
 */
export function cachearMensaje(msg) {
  try {
    if (!msg?.message || !msg.key?.id) return
    if (msg.message.protocolMessage) return // no cachear los propios mensajes de "eliminar"

    const extraido = extraerTexto(msg.message)
    if (!extraido) return // tipo de mensaje no soportado (ubicación, contacto, etc.)

    const chatId = msg.key.remoteJid
    const senderId = msg.key.participantAlt || msg.key.participant || msg.key.remoteJid
    const senderName = msg.pushName || senderId?.split('@')[0]

    const key = `${chatId}_${msg.key.id}`
    cache.set(key, {
      texto: extraido.texto,
      tipo: extraido.tipo,
      senderId,
      senderName,
      chatId,
      timestamp: Date.now()
    })

    // Evitar crecimiento infinito: si se pasa del límite, borra el más antiguo
    if (cache.size > MAX_ENTRADAS) {
      const primeraClave = cache.keys().next().value
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
    const eliminadoPorNombre = msg.pushName || eliminadoPorId?.split('@')[0]

    const esMismaPersona = eliminadoPorId?.split('@')[0].split(':')[0] === original.senderId?.split('@')[0].split(':')[0]

    const textoAviso = `🗑️〔 *${botConfig.botName} - Anti-Delete* 〕🗑️
━━━━━━━━━━━━━━━━━━━━

⚠️ *Mensaje eliminado detectado*

👤 *Enviado por:* @${original.senderId.split('@')[0]}
🧹 *Eliminado por:* ${esMismaPersona ? 'el mismo remitente' : '@' + eliminadoPorId.split('@')[0]}
📦 *Tipo:* ${original.tipo}

💬 *Contenido:*
${original.texto}

━━━━━━━━━━━━━━━━━━━━`

    const mentions = [original.senderId]
    if (!esMismaPersona) mentions.push(eliminadoPorId)

    await sock.sendMessage(chatId, { text: textoAviso, mentions })

    // Ya se usó, lo quitamos del cache
    cache.delete(key)
  } catch (err) {
    console.error('Error en manejarMensajeEliminado (antidelete):', err.message)
  }
}
