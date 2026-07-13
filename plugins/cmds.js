import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { botConfig } from '../config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
  command: ['cmds', 'consultas'],
  description: 'Muestra las consultas disponibles (DNI, SOAT, placa, árbol genealógico, teléfonos y más)',
  exec: async ({ sock, from, msg }) => {

    const texto = `╔════════════════════╗
║ 🤖 ${botConfig.botName}
║ 🇵🇪 CONSULTAS PERÚ
╚════════════════════╝

╭──── 🔎 CONSULTAS ────╮
│ 🌳 ${botConfig.prefix}ag 💰10
│ ➜ Consulta el árbol genealógico y relaciones familiares por DNI
│
│ 🚨 ${botConfig.prefix}denuncias 💰20
│ ➜ Consulta denuncias de personas
│
│ 🏠 ${botConfig.prefix}dir 💰6
│ ➜ Consulta el historial de direcciones de una persona por su DNI
│
│ 🪪 ${botConfig.prefix}dni 💰1
│ ➜ Consulta datos detallados de una persona por su DNI (Perú)
│
│ 🟡 ${botConfig.prefix}dniamarillo 💰5
│ ➜ Consulta DNI Amarillo
│
│ 🔵 ${botConfig.prefix}dniazul 💰5
│ ➜ Consulta DNI Azul
│
│ ⚖️ ${botConfig.prefix}fiscalia 💰15
│ ➜ Consulta información en Fiscalía
│
│ 👤 ${botConfig.prefix}nm 💰2
│ ➜ Busca personas por nombres y apellidos
│
│ 🚗 ${botConfig.prefix}placa 💰5
│ ➜ Consulta información de un vehículo por su número de placa
│
│ 📂 ${botConfig.prefix}rfm 💰20
│ ➜ Consulta información RFM
│
│ 🛡️ ${botConfig.prefix}soat 💰10
│ ➜ Consulta el estado y vigencia del SOAT de un vehículo por su placa
│
│ 💼 ${botConfig.prefix}sueldo 💰10
│ ➜ Consulta el historial de sueldos y empleos de una persona por su DNI
│
│ 📱 ${botConfig.prefix}telp 💰5
│ ➜ Consulta información de un número telefónico
│
│ 📲 ${botConfig.prefix}telpx 💰10
│ ➜ Consulta avanzada de un número telefónico
│
│ 👁️ ${botConfig.prefix}vv 🆓
│ ➜ Descarga fotos y videos enviados para ver una sola vez
╰──────────────────────╯

╭───────────────────╮
│ 🔰 ${botConfig.botName} VIP
│ ⚡ Sistema activo
╰───────────────────╯`

    const esURL = /^https?:\/\//i.test(botConfig.cmdsImage)

    if (esURL) {
      await sock.sendMessage(
        from,
        {
          image: { url: botConfig.cmdsImage },
          caption: texto
        },
        { quoted: msg }
      )
    } else {
      const imagePath = path.join(__dirname, '..', botConfig.cmdsImage)

      if (fs.existsSync(imagePath)) {
        await sock.sendMessage(
          from,
          {
            image: fs.readFileSync(imagePath),
            caption: texto
          },
          { quoted: msg }
        )
      } else {
        await sock.sendMessage(
          from,
          { text: texto },
          { quoted: msg }
        )
      }
    }
  }
}
