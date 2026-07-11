export default {
  command: ['placa'],
  description: 'Consulta Placa',

  exec: async ({ sock, from, msg }) => {
    await sock.sendMessage(from, {
      text: `━━━━━━━━━━━━━━━━━━
🚗 CONSULTA DE PLACA
━━━━━━━━━━━━━━━━━━
💎 Servicio exclusivo para usuarios Premium.
━━━━━━━━━━━━━━━━━━
🧑‍💻 Soporte Técnico
━━━━━━━━━━━━━━━━━━`
    }, { quoted: msg })
  }
}
