import axios from 'axios'

export default {
  command: ['nm', 'mn'],
  description: 'Busca personas por Nombres y Apellidos',
  exec: async ({ sock, from, msg, args }) => {
    
    // En tu bot, los textos vienen en un array llamado "args". 
    // Los unimos para tener todo el string y poder separarlo luego por el palito "|".
    const text = args.join(' ')

    // Verificar si el usuario ingresó texto
    if (!text) {
      return sock.sendMessage(
        from,
        { text: '❌ *Uso incorrecto.*\nPor favor, ingresa los nombres y apellidos separados por "|".\n\n*Ejemplo:*\n.nm Alexander Paul|Huaman|Ramos' },
        { quoted: msg }
      )
    }

    // Separar los argumentos usando "|"
    let [n1, ap1, ap2] = text.split('|')

    // Validar que se hayan proporcionado los tres parámetros
    if (!n1 || !ap1 || !ap2) {
      return sock.sendMessage(
        from,
        { text: '⚠️ *Formato incompleto.*\nAsegúrate de incluir Nombre, Apellido Paterno y Apellido Materno separados por el carácter "|".\n\n*Ejemplo:*\n.nm Alexander Paul|Huaman|Ramos' },
        { quoted: msg }
      )
    }

    // Tu token directo
    const token = 'jmdCRmBLZ13ITSmUGCWcBnDcTuOddttU7d0UbL8S7HJNelk8loSpnVkUyFJO'
    const url = `https://api-codart.cgrt.org/api/v1/consultas/fd/nm?n1=${encodeURIComponent(n1.trim())}&ap1=${encodeURIComponent(ap1.trim())}&ap2=${encodeURIComponent(ap2.trim())}`

    try {
      await sock.sendMessage(from, { text: '⏳ Consultando a la base de datos...' }, { quoted: msg })

      // Petición a la API usando la misma lógica que tu archivo DNI
      const { data: response } = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      // Verificar si la consulta fue exitosa
      if (!response.success || !response.data || !response.data.resultados) {
        return sock.sendMessage(
          from,
          { text: '❌ Error en la API o no se encontraron resultados.' },
          { quoted: msg }
        )
      }

      // Extraer los datos
      let cantidad = response.data.cantidad_resultados
      let resultados = response.data.resultados

      if (cantidad === 0 || resultados.length === 0) {
        return sock.sendMessage(
          from,
          { text: `ℹ️ No se encontró ninguna persona con esos datos: ${n1.trim()} ${ap1.trim()} ${ap2.trim()}` },
          { quoted: msg }
        )
      }

      // Construir el mensaje de respuesta
      let mensaje = `✅ *RESULTADOS ENCONTRADOS (${cantidad})*\n\n`

      resultados.forEach((resultado, index) => {
        mensaje += `👤 *Persona ${index + 1}*\n`
        mensaje += `*DNI:* ${resultado.dni}\n`
        mensaje += `*Nombres:* ${resultado.nombres}\n`
        mensaje += `*Apellidos:* ${resultado.apellidos}\n`
        mensaje += `*Edad:* ${resultado.edad} años\n`
        mensaje += `─────────────────\n`
      })

      // Enviar el resultado final usando sock.sendMessage (formato del framework)
      await sock.sendMessage(from, { text: mensaje.trim() }, { quoted: msg })

    } catch (err) {
      console.error('Error en el comando nm:', err?.response?.data || err.message)
      await sock.sendMessage(
        from,
        { text: '❌ Ocurrió un error inesperado al realizar la consulta.' },
        { quoted: msg }
      )
    }
  }
}
