export default {
  command: ['denuncias'],
  description: 'Consulta denuncias',

  exec: async ({ sock, from, msg }) => {
    await sock.sendMessage(from, {
      text: `━━━━━━━━━━━━━━━━━━
🚨 CONSULTA DE ÁRBOL GENEALÓGICO 
━━━━━━━━━━━━━━━━━━
💎 Servicio exclusivo para usuarios Premium.
━━━━━━━━━━━━━━━━━━
🧑‍💻 Soporte Técnico
━━━━━━━━━━━━━━━━━━`
    }, { quoted: msg })
  }
}
