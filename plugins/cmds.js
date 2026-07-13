import { botConfig } from '../config.js'

export default {
  command: ['cmds', 'consultas'],
  description: 'Muestra el listado completo de comandos de Consultas y sus precios',
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
│ ➜ Consulta denuncias
│
│ 🏠 ${botConfig.prefix}dir 💰6
│ ➜ Consulta el historial de direcciones de una persona por su DNI
│
│ 🪪 ${botConfig.prefix}dni 💰1
│ ➜ Consulta datos detallados de una persona por su DNI (Perú)
│
│ ✧ ${botConfig.prefix}dniamarillo 💰5
│ ➜ Consulta DNI Amarillo
│
│ ✧ ${botConfig.prefix}dniazul 💰5
│ ➜ Consulta DNI Azul
│
│ ⚖️ ${botConfig.prefix}fiscalia 💰15
│ ➜ Consulta Fiscalía
│
│ 👤 ${botConfig.prefix}nm 💰2
│ ➜ Busca personas por Nombres y Apellidos
│
│ 🚗 ${botConfig.prefix}placa 💰5
│ ➜ Consulta información de un vehículo por su número de placa
│
│ 📂 ${botConfig.prefix}rfm 💰20
│ ➜ Consulta RFM
│
│ 🛡️ ${botConfig.prefix}soat 💰10
│ ➜ Consulta el estado y vigencia del SOAT de un vehículo por su placa
│
│ 💼 ${botConfig.prefix}sueldo 💰10
│ ➜ Consulta el historial de sueldos y empleos de una persona por su DNI
│
│ 📱 ${botConfig.prefix}telp 💰5
│ ➜ Consulta Teléfono
│
│ 👁️ ${botConfig.prefix}vv 🆓
│ ➜ Descarga fotos y videos enviados para ver una sola vez
│
╰──────────────────────╯

╭───────────────────╮
│ 🔰 ${botConfig.botName} VIP
│ ⚡ Sistema activo
╰───────────────────╯`

    await sock.sendMessage(from, { text: texto }, { quoted: msg })
  }
}
