import axios from 'axios'

export default {
  command: ['dni'],
  description: 'Consulta datos de una persona por su DNI (Perú)',
  exec: async ({ sock, from, msg, args }) => {
    const dni = args[0]

    // Validación de DNI (8 dígitos)
    if (!dni || !/^\d{8}$/.test(dni)) {
      return sock.sendMessage(
        from,
        { text: '❌ Debes ingresar un DNI válido de 8 dígitos.\n\nEjemplo: *.dni 12345678*' },
        { quoted: msg }
      )
    }

    // Tu token directo
    const token = 'jmdCRmBLZ13ITSmUGCWcBnDcTuOddttU7d0UbL8S7HJNelk8loSpnVkUyFJO'

    try {
      await sock.sendMessage(from, { text: '🔎 Consultando DNI en la base de datos...' }, { quoted: msg })

      // Petición a la nueva API con los headers corregidos
      const { data: response } = await axios.get(`https://api-codart.cgrt.org/api/v1/consultas/fd/dni/${dni}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      // Verificar si la consulta fue exitosa
      if (!response.success || !response.data) {
        return sock.sendMessage(
          from,
          { text: '❌ No se encontraron resultados para ese DNI.' },
          { quoted: msg }
        )
      }

      const userData = response.data

      // Construcción del mensaje con los nuevos datos disponibles
      const text = `┌─❐ *CONSULTA DNI* ❐
│
│ 🆔 *DNI:* ${userData.dni.numero}
│ 👤 *Nombres:* ${userData.nombres}
│ 👥 *Apellidos:* ${userData.apellidos}
│ ⚧️ *Género:* ${userData.genero}
│ 🎂 *Nacimiento:* ${userData.nacimiento.fecha} (${userData.nacimiento.edad})
│ 💍 *Estado Civil:* ${userData.informacion_general.estado_civil}
│ 🎓 *Educación:* ${userData.informacion_general.nivel_educativo}
│ 📍 *Dirección:* ${userData.domicilio.direccion}
│ 🗺️ *Distrito:* ${userData.domicilio.distrito}, ${userData.domicilio.provincia}
│
└────────────`

      // Verificar si la API devolvió la imagen en Base64
      if (userData.images && userData.images.length > 0 && userData.images[0].data_uri) {
        // Extraer solo la parte base64 de la URI ("data:image/jpeg;base64,...")
        const base64Data = userData.images[0].data_uri.split(',')[1]
        const imageBuffer = Buffer.from(base64Data, 'base64')

        // Enviar imagen con el texto como descripción (caption)
        await sock.sendMessage(from, { image: imageBuffer, caption: text }, { quoted: msg })
      } else {
        // Si no hay imagen, solo enviar el texto
        await sock.sendMessage(from, { text }, { quoted: msg })
      }

    } catch (err) {
      console.error('Error consultando DNI:', err?.response?.data || err.message)
      await sock.sendMessage(
        from,
        { text: '❌ Ocurrió un error al consultar. Verifica el número de DNI o si el servicio está disponible.' },
        { quoted: msg }
      )
    }
  }
}
