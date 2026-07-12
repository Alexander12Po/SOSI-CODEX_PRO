import axios from 'axios'

export default {
  command: ['dni'],
  description: 'Consulta datos detallados de una persona por su DNI (Perú)',
  exec: async ({ sock, from, msg, args, sender, usuarioActual, costo }) => {
    const dni = args[0]

    // Validación de DNI (8 dígitos)
    if (!dni || !/^\d{8}$/.test(dni)) {
      await sock.sendMessage(
        from,
        { text: '❌ *Error:* Debes ingresar un DNI válido de 8 dígitos.\n\n💡 _Ejemplo: .dni 12345678_' },
        { quoted: msg }
      )
      return false // No cobra crédito
    }

    const token = 'jmdCRmBLZ13ITSmUGCWcBnDcTuOddttU7d0UbL8S7HJNelk8loSpnVkUyFJO'

    try {
      await sock.sendMessage(from, { text: '⚡ *SOSI CODEX* • _Consultando información..._' }, { quoted: msg })

      // Petición a la API
      const { data: response } = await axios.get(`https://api-codart.cgrt.org/api/v1/consultas/fd/dni/${dni}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.success || !response.data) {
        await sock.sendMessage(
          from,
          { text: '❌ *SOSI CODEX* • No se encontraron resultados para el DNI ingresado.' },
          { quoted: msg }
        )
        return false // No cobra crédito
      }

      const userData = response.data
      const usuarioTag = `@${sender.split('@')[0]}`
      
      // Calcular los créditos restantes de forma visual antes de que handler impacte la DB
      const costoActual = typeof costo === 'number' ? costo : 2
      const creditosRestantes = usuarioActual ? (usuarioActual.creditos - costoActual) : 0

      // Plantilla optimizada sin bordes desalineados y con marca de agua limpia
      const text = `┌─❐ *SOSI CODEX* → *DATOS DEL CIUDADANO* ❐
│
│ 🆔 *DNI:* ${userData.dni.completo || dni}
│ 👤 *Nombres:* ${userData.nombres}
│ 👥 *Apellidos:* ${userData.apellidos}
│ ⚧️ *Género:* ${userData.genero}
│
│ 🎂 *Nacimiento:* ${userData.nacimiento.fecha} (${userData.nacimiento.edad.toUpperCase()})
│ 🌍 *Lugar Nac.:* ${userData.nacimiento.distrito}, ${userData.nacimiento.provincia}, ${userData.nacimiento.departamento}
│
│ 👨‍👦 *Padre:* ${userData.informacion_general.padre}
│ 👩‍👦 *Madre:* ${userData.informacion_general.madre}
│ 💍 *Estado Civil:* ${userData.informacion_general.estado_civil}
│ 🎓 *Educación:* ${userData.informacion_general.nivel_educativo}
│
│ 📍 *Dirección:* ${userData.domicilio.direccion}
│ 🗺️ *Residencia:* ${userData.domicilio.distrito}, ${userData.domicilio.provincia}, ${userData.domicilio.departamento}
│ 📌 *Ubigeo (RENIEC):* ${userData.ubigeos.reniec}
│
│ 📏 *Estatura:* ${userData.informacion_general.estatura}
│ ❤️ *Donante Órganos:* ${userData.informacion_general.donante_organos}
│ ⚠️ *Restricciones:* ${userData.informacion_general.restriccion}
│
│ 📅 *F. Inscripción:* ${userData.informacion_general.fecha_inscripcion}
│ 📅 *F. Emisión:* ${userData.informacion_general.fecha_emision}
│ ⏳ *F. Caducidad:* ${userData.informacion_general.fecha_caducidad}
│
└──────────────────────────────

─── *SOSI CODEX* ★ ───
👤 *USUARIO:* ${usuarioTag}
💳 *CRÉDITOS RESTANTES:* ${creditosRestantes}`

      // Verificar si hay foto disponible en Base64
      if (userData.images && userData.images.length > 0 && userData.images[0].data_uri) {
        const base64Data = userData.images[0].data_uri.split(',')[1]
        const imageBuffer = Buffer.from(base64Data, 'base64')

        await sock.sendMessage(
          from, 
          { image: imageBuffer, caption: text, mentions: [sender] }, 
          { quoted: msg }
        )
      } else {
        await sock.sendMessage(
          from, 
          { text: text, mentions: [sender] }, 
          { quoted: msg }
        )
      }

      // 'silent' le dice a handler.js que cobre en DB, pero que no envíe mensajes extra
      return 'silent'

    } catch (err) {
      console.error('Error consultando DNI:', err?.response?.data || err.message)
      await sock.sendMessage(
        from,
        { text: '❌ *SOSI CODEX* • Error interno en el servidor de consultas. Reintenta más tarde.' },
        { quoted: msg }
      )
      return false // No cobra crédito en caso de crash de API
    }
  }
}
