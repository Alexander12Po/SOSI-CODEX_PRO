export default {
  command: ['ping'],
  description: 'Verifica la velocidad de respuesta del bot',
  exec: async ({ sock, from, msg }) => {
    const start = Date.now()
    await sock.sendMessage(from, { text: '🏓 Calculando...' }, { quoted: msg })
    const end = Date.now()
    await sock.sendMessage(from, { text: `🏓 *Pong!*\n⏱️ Velocidad: ${end - start}ms` }, { quoted: msg })
  }
}
