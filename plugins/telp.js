export default {
  command: ['telp'],
  description: 'Consulta Teléfono',

  exec: async ({ sock, from, msg }) => {
    await sock.sendMessage(from, {
      text: `━━━━━━━━━━━━━━━━━━
📋 CONSULTA DE TELÉFONO
━━━━━━━━━━━━━━━━━━
💎 Servicio exclusivo para usuarios Premium.
━━━━━━━━━━━━━━━━━━
🧑‍💻 Soporte Técnico
━━━━━━━━━━━━━━━━━━`
    }, { quoted: msg })
  }
}
