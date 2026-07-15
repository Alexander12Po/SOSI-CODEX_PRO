import 'dotenv/config'
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  DisconnectReason
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import readline from 'readline'
import qrcode from 'qrcode-terminal'
import NodeCache from 'node-cache'
import { handler } from './handler.js'
import { botConfig } from './config.js'
import { handleGroupParticipantsUpdate } from './plugins/bienvenida.js'
import { cachearMensaje, manejarMensajeEliminado } from './plugins/antidelete.js'

// --- BLINDAJE GLOBAL: evita que errores no capturados tumben el bot ---
process.on('uncaughtException', (err) => {
  console.error('⚠️ Error no capturado (uncaughtException):', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Promesa rechazada no manejada (unhandledRejection):', reason)
})
// -----------------------------------------------------------------------

const question = (text) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  rl.question(text, (answer) => {
    rl.close()
    resolve(answer)
  })
})

// --- CONTROL DE RECONEXIÓN ---
// Evita reconexiones en loop inmediato (que pueden hacer que WhatsApp
// bloquee temporalmente el número) y evita levantar sockets duplicados.
let reconnectAttempts = 0
let isReconnecting = false
const MAX_BACKOFF_MS = 60_000 // tope de 60s entre reintentos

function getBackoffDelay() {
  // Backoff exponencial: 2s, 4s, 8s, 16s... hasta el tope
  const delay = Math.min(2000 * 2 ** reconnectAttempts, MAX_BACKOFF_MS)
  reconnectAttempts++
  return delay
}

function scheduleReconnect(reason) {
  if (isReconnecting) {
    console.log('⏳ Ya hay una reconexión en curso, se ignora esta señal.')
    return
  }
  isReconnecting = true
  const delay = getBackoffDelay()
  console.log(`🔄 Reconectando en ${delay / 1000}s... (motivo: ${reason})`)
  setTimeout(() => {
    isReconnecting = false
    startBot().catch((err) => {
      console.error('❌ Error relanzando el bot:', err)
      // Si incluso relanzar el bot falla, reintentamos igual con backoff
      scheduleReconnect('fallo al relanzar')
    })
  }, delay)
}
// -----------------------------------------------------------------------

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')

  // Usamos fetchLatestWaWebVersion en vez de fetchLatestBaileysVersion:
  // esta última tiene actualmente un bug conocido que devuelve una versión
  // vieja de WhatsApp Web, lo que hace que la vinculación falle (error 428).
  const { version } = await fetchLatestWaWebVersion()

  const usePairing = botConfig.loginMethod === 'pairing'

  const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false })

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    browser: ['SOSI CODEX', 'Chrome', '1.0.0'],
    cachedGroupMetadata: async (jid) => {
      try {
        return groupCache.get(jid)
      } catch (err) {
        console.error('Error leyendo cache de grupo:', err)
        return undefined
      }
    }
  })

  let pairingRequested = false
  let phoneNumber = null

  if (usePairing && !sock.authState.creds.registered) {
    phoneNumber = (await question('Ingresa tu número con código de país (ej: 521234567890): ')).trim()
  }

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    try {
      const { connection, lastDisconnect, qr } = update

      // Método QR
      if (!usePairing && qr) {
        console.log('📲 Escanea este código QR con WhatsApp > Dispositivos vinculados:')
        qrcode.generate(qr, { small: true })
      }

      // Método código de vinculación
      if (usePairing && phoneNumber && !pairingRequested && (connection === 'connecting' || qr)) {
        pairingRequested = true
        try {
          const code = await sock.requestPairingCode(phoneNumber)
          console.log('╭───────────────────────╮')
          console.log(`   🔑 Código: ${code}`)
          console.log('╰───────────────────────╯')
          console.log('Ve a WhatsApp > Dispositivos vinculados > Vincular con número de teléfono, e ingresa el código.')
        } catch (err) {
          console.log('❌ Error generando el código:', err.message || err)
          pairingRequested = false
        }
      }

      if (connection === 'connecting') {
        console.log('🔌 Conectando con WhatsApp...')
      }

      if (connection === 'open') {
        // Conexión exitosa: reseteamos el contador de reintentos
        reconnectAttempts = 0
        isReconnecting = false
        console.log(`✅ ${botConfig.botName} conectado correctamente`)
      }

      if (connection === 'close') {
        const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
        const motivo = lastDisconnect?.error?.message || lastDisconnect?.error || 'desconocido'

        console.log('❌ Conexión cerrada. Código:', statusCode, '| Motivo:', motivo)

        switch (statusCode) {
          case DisconnectReason.loggedOut:
            // Sesión cerrada desde el teléfono: no tiene sentido reintentar,
            // hay que borrar la sesión y volver a vincular manualmente.
            console.log('🚪 Sesión cerrada desde el teléfono. Borra la carpeta "session" y vuelve a vincular.')
            break

          case DisconnectReason.restartRequired:
            // Baileys pide reiniciar (normal justo después de vincular).
            // No necesita backoff largo, reconecta casi de inmediato.
            reconnectAttempts = 0
            scheduleReconnect('reinicio requerido por Baileys')
            break

          case DisconnectReason.connectionReplaced:
            // Se abrió una sesión en otro lugar con las mismas credenciales.
            console.log('⚠️  La sesión fue reemplazada por otra conexión (¿la abriste en 2 lugares?). No se reconecta automáticamente.')
            break

          case DisconnectReason.badSession:
            console.log('⚠️  Sesión corrupta. Borra la carpeta "session" y vuelve a vincular.')
            break

          default:
            // connectionLost, timedOut, rate-limits, caídas de red, etc.
            scheduleReconnect(`código ${statusCode ?? 'sin código'}`)
        }
      }
    } catch (err) {
      // Blindaje: si algo dentro de connection.update explota, no debe
      // tumbar el proceso, solo loguear y seguir vivo.
      console.error('⚠️ Error dentro de connection.update:', err)
    }
  })

  sock.ev.on('messages.upsert', async (m) => {
    try {
      if (m.type !== 'notify') return

      const msg = m.messages[0]
      if (!msg?.message) return

      try {
        if (msg.message.protocolMessage?.type === 0 /* REVOKE */) {
          await manejarMensajeEliminado(sock, msg)
          return
        }

        await cachearMensaje(msg)
        await handler(sock, m)
      } catch (err) {
        console.error('Error en handler:', err)
      }
    } catch (err) {
      // Segunda capa de blindaje por si el error ocurre fuera del try interno
      console.error('⚠️ Error crítico en messages.upsert:', err)
    }
  })

  sock.ev.on('group-participants.update', async (update) => {
    try {
      await handleGroupParticipantsUpdate(sock, update)
    } catch (err) {
      console.error('Error en evento de bienvenida:', err)
    }
  })

  return sock
}

startBot().catch((err) => {
  console.error('❌ Error fatal al iniciar el bot por primera vez:', err)
  scheduleReconnect('fallo en el arranque inicial')
})
