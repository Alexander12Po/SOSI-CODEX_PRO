import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { botConfig } from '../config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- Helpers para configuración de grupos ---
const getConfigGrupos = () => {
  if (!fs.existsSync('./gruposBienvenida.json')) return {}
  return JSON.parse(fs.readFileSync('./gruposBienvenida.json', 'utf-8'))
}

const saveConfigGrupos = (data) => {
  fs.writeFileSync('./gruposBienvenida.json', JSON.stringify(data, null, 2))
}
// ---------------------------------------------

export default {
  command: ['bienvenida'],
  description: 'Activa/desactiva la bienvenida automática en el grupo: .bienvenida on / .bienvenida off',
  exec: async ({ sock, from, msg, args, sender }) => {
    // Solo funciona dentro de un grupo
    if (!from.endsWith('@g.us')) {
      await sock.sendMessage(from, { text: '❌ Este comando solo funciona dentro de un grupo.' }, { quoted: msg })
      return false
    }

    // Verificar que quien ejecuta sea admin del grupo
    const metadata = await sock.groupMetadata(from)

    const numeroSender = sender.split('@')[0].split(':')[0]

    const participante = metadata.participants.find(p => {
      const numeroId = p.id?.split('@')[0].split(':')[0]
      const numeroLid = p.lid?.split('@')[0].split(':')[0]
      return numeroId === numeroSender || numeroLid === numeroSender
    })

    const esAdminGrupo = participante && (participante.admin === 'admin' || participante.admin === 'superadmin')

    if (!esAdminGrupo) {
      await sock.sendMessage(from, { text: '❌ Solo un administrador del grupo puede activar o desactivar la bienvenida.' }, { quoted: msg })
      return false
    }

    const opcion = args[0]?.toLowerCase()

    if (opcion !== 'on' && opcion !== 'off') {
      await sock.sendMessage(from, { text: `⚙️ Uso correcto:\n${botConfig.prefix}bienvenida on\n${botConfig.prefix}bienvenida off` }, { quoted: msg })
      return false
    }

    const config = getConfigGrupos()
    config[from] = opcion === 'on'
    saveConfigGrupos(config)

    await sock.sendMessage(from, {
      text: opcion === 'on'
        ? '✅ Bienvenida *activada* para este grupo.'
        : '🚫 Bienvenida *desactivada* para este grupo.'
    }, { quoted: msg })
  }
}

// --- Función del evento, exportada para usarse en el archivo principal ---
export async function handleGroupParticipantsUpdate(sock, update) {
  const { id, participants, action } = update

  console.log('📥 Evento group-participants.update recibido:', JSON.stringify({ id, action, participants }))

  if (action !== 'add') {
    console.log('⏭️ Ignorado: action no es "add", es:', action)
    return
  }

  // Verificar si la bienvenida está activada para este grupo
  const config = getConfigGrupos()
  console.log('📄 Config actual de gruposBienvenida.json:', JSON.stringify(config))
  console.log('🔑 ¿Coincide el id del grupo?', id, '->', config[id])

  if (!config[id]) {
    console.log('⏭️ Ignorado: la bienvenida no está activada para este id de grupo.')
    return // Si no está activada (true), no hace nada
  }

  for (const raw of participants) {
    try {
      // A veces 'participants' no trae strings puros, sino objetos { id, phoneNumber, lid, ... }
      // dependiendo de la versión de Baileys. El campo 'id' puede venir en formato @lid
      // (identificador de privacidad), que NO sirve para onWhatsApp/profilePictureUrl.
      // Priorizamos 'phoneNumber', que es el JID real utilizable.
      const participant = typeof raw === 'string'
        ? raw
        : (raw?.phoneNumber || raw?.id || raw?.jid || raw?.lid || null)

      console.log('👤 Procesando participante ->', JSON.stringify(raw), '=> usando:', participant)

      if (!participant || typeof participant !== 'string') {
        console.error('Error en bienvenida: participante con formato inesperado ->', JSON.stringify(raw))
        continue
      }

      const userInfo = await sock.onWhatsApp(participant)
      console.log('📇 Resultado de onWhatsApp para', participant, '->', JSON.stringify(userInfo))
      if (!userInfo || userInfo.length === 0) {
        console.log('⏭️ Ignorado: onWhatsApp no devolvió info para este participante.')
        continue
      }

      let fotoPerfil
      try {
        fotoPerfil = await sock.profilePictureUrl(participant, 'image')
      } catch (err) {
        fotoPerfil = null
      }

      const nombreUsuario = userInfo[0].name || participant.split('@')[0]
      const ahora = new Date()
      const fecha = ahora.toLocaleDateString('es-PE')
      const hora = ahora.toLocaleTimeString('es-PE')

      const mensajeBienvenida = `🐾 〔 *${botConfig.botName}* 〕🐾
   _Bot inteligente de consultas_
━━━━━━━━━━━━━━━━━━━━

🎉 ¡Bienvenido/a, *${nombreUsuario}*!

┌─ 📋 *DATOS DE INGRESO*
│ 👤 Nombre    : ${nombreUsuario}
│ 📅 Fecha     : ${fecha}
│ 🕐 Hora      : ${hora}
└────────────────

🔍 Aquí puedes acceder a consultas de:
   DNI, familiares, direcciones, sueldos,
   vehículos, SOAT y mucho más.

📝 Para comenzar, regístrate con:
   ${botConfig.prefix}registrar nombre|contraseña

📜 Luego usa *${botConfig.prefix}menu* para
   ver todos los comandos disponibles.

━━━━━━━━━━━━━━━━━━━━
🐾 *${botConfig.botName}* © ${new Date().getFullYear()}`

      if (fotoPerfil) {
        await sock.sendMessage(id, {
          image: { url: fotoPerfil },
          caption: mensajeBienvenida
        })
      } else {
        await sock.sendMessage(id, { text: mensajeBienvenida })
      }

    } catch (err) {
      console.error('Error en bienvenida:', err.message)
    }
  }
}
