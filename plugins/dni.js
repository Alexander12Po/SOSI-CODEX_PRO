import axios from 'axios'

export default {
  command: ['dni'],
  description: 'Consulta datos de una persona por su DNI (Perú)',
  exec: async ({ sock, from, msg, args }) => {
    const dni = args[0]

    if (!dni || !/^\d{8}$/.test(dni)) {
      return sock.sendMessage(
        from,
        { text: '❌ Debes ingresar un DNI válido de 8 dígitos.\n\nEjemplo: *.dni 12345678*' },
        { quoted: msg }
      )
    }

    const token = process.env.DNI_API_TOKEN
    if (!token) {
      return sock.sendMessage(
        from,
        { text: '⚠️ No se configuró el token de la API.\nAgrega *DNI_API_TOKEN* en tu archivo `.env`.' },
        { quoted: msg }
      )
    }

    try {
      await sock.sendMessage(from, { text: '🔎 Consultando DNI...' }, { quoted: msg })

      const { data } = await axios.get('https://api.apis.net.pe/v2/reniec/dni', {
        params: { numero: dni },
        headers: { Authorization: `Bearer ${token}` }
      })

      const text = `┌─❐ *CONSULTA DNI* ❐
│
│ 🆔 DNI: ${data.numeroDocumento}
│ 👤 Nombres: ${data.nombres}
│ 👨‍👦 Ap. Paterno: ${data.apellidoPaterno}
│ 👩‍👦 Ap. Materno: ${data.apellidoMaterno}
│
└────────────`

      await sock.sendMessage(from, { text }, { quoted: msg })
    } catch (err) {
      console.error('Error consultando DNI:', err?.response?.data || err.message)
      await sock.sendMessage(
        from,
        { text: '❌ No se pudo obtener información. Verifica el número de DNI o que tu token siga siendo válido.' },
        { quoted: msg }
      )
    }
  }
}
