export async function handler(m, { conn }) {
  const texto = `
━━━━━━━━━━━━━━━━━━
📋 CONSULTA DE CERTIFICADO DE ESTUDIÓS 
━━━━━━━━━━━━━━━━━━
💎 Servicio exclusivo para usuarios Premium.
━━━━━━━━━━━━━━━━━━
🧑‍💻 Soporte Técnico
━━━━━━━━━━━━━━━━━━
`.trim()

  await conn.reply(m.chat, texto, m)
}

handler.help = ['telp']
handler.tags = ['premium']
handler.command = /^telp$/i

export default handler
