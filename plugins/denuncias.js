export default {
  command: ['denuncias'],
  description: 'Consulta denuncias',

  exec: async ({ sock, from, msg }) => {
    await sock.sendMessage(from, {
      text: `━━━━━━━━━━━━━━━━━━
🚨 CONSULTA DE DENUNCIAS
━━━━━━━━━━━━━━━━━━
💎 Servicio exclusivo para usuarios Premium.
━━━━━━━━━━━━━━━━━━
🧑‍💻 Soporte Técnico
━━━━━━━━━━━━━━━━━━`
    }, { quoted: msg })
  }
}
