import axios from 'axios'

export default {
  command: ['arg', 'nm', 'buscarnombre', 'buscarname'],
  description: 'Busca personas por sus nombres y apellidos (Perú)',
  exec: async ({ sock, from, msg, args }) => {
    // Unir todos los argumentos
    const query = args.join(' ').trim()

    // Validación: se necesitan al menos 3 palabras (nombre + apellido1 + apellido2)
    if (!query || args.length < 3) {
      return sock.sendMessage(
        from,
        { 
          text: '❌ *Búsqueda por Nombre*\n\nDebes ingresar nombre y dos apellidos.\n\n*Ejemplos:*\n• .nm Alexander Paul Huaman\n• .arg Juan Perez Garcia\n• .buscarnombre Maria Garcia Lopez' 
        },
        { quoted: msg }
      )
    }

    // Tu token directo
    const token = 'jmdCRmBLZ13ITSmUGCWcBnDcTuOddttU7d0UbL8S7HJNelk8loSpnVkUyFJO'

    try {
      await sock.sendMessage(from, { text: ' Buscando en la base de datos...' }, { quoted: msg })

      // Dividir los nombres y apellidos - SOLO tomar las 3 primeras palabras
      // n1 = primera palabra (nombre)
      // ap1 = segunda palabra (primer apellido)
      // ap2 = tercera palabra (segundo apellido)
      const palabras = args.slice(0, 3)
      const n1 = palabras[0] || ''
      const ap1 = palabras[1] || ''
      const ap2 = palabras[2] || ''

      // Validar que solo contengan letras (sin números ni caracteres especiales)
      const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+$/
      
      if (!soloLetras.test(n1)) {
        return sock.sendMessage(
          from,
          { text: '❌ El nombre solo debe contener letras.\n\n*Ejemplo correcto:* .nm Alexander Paul Huaman' },
          { quoted: msg }
        )
      }
      
      if (!soloLetras.test(ap1)) {
        return sock.sendMessage(
          from,
          { text: '❌ El primer apellido solo debe contener letras.\n\n*Ejemplo correcto:* .nm Alexander Paul Huaman' },
          { quoted: msg }
        )
      }
      
      if (!soloLetras.test(ap2)) {
        return sock.sendMessage(
          from,
          { text: '❌ El segundo apellido solo debe contener letras.\n\n*Ejemplo correcto:* .nm Alexander Paul Huaman' },
          { quoted: msg }
        )
      }

      // Construir URL con parámetros
      const url = new URL('https://api-codart.cgrt.org/api/v1/consultas/fd/nm')
      url.searchParams.append('n1', n1)
      url.searchParams.append('ap1', ap1)
      url.searchParams.append('ap2', ap2)

      // Petición a la API
      const { data: response } = await axios.get(url.toString(), {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      })

      // Verificar si la consulta fue exitosa
      if (!response.success || !response.data || !response.data.resultados || response.data.resultados.length === 0) {
        return sock.sendMessage(
          from,
          { text: '❌ No se encontraron resultados para la búsqueda.\n\n*Intenta con otros nombres o apellidos.*' },
          { quoted: msg }
        )
      }

      const { cantidad_resultados, resultados } = response.data

      // Construir mensaje con los resultados
      let texto = `┌─❐ *RESULTADOS DE BÚSQUEDA* ❐\n│\n`
      texto += ` *Total encontrado:* ${cantidad_resultados}\n`
      texto += ` *Búsqueda:* ${n1} ${ap1} ${ap2}\n`
      texto += `│\n────────────\n\n`

      // Limitar a 10 resultados para no saturar
      const maxResultados = Math.min(resultados.length, 10)
      
      for (let i = 0; i < maxResultados; i++) {
        const persona = resultados[i]
        texto += `┌─❐ *Resultado #${i + 1}* ❐\n`
        texto += `│\n`
        texto += `🆔 *DNI:* ${persona.dni || 'No disponible'}\n`
        texto += `👤 *Nombres:* ${persona.nombres || 'No disponible'}\n`
        texto += ` *Apellidos:* ${persona.apellidos || 'No disponible'}\n`
        texto += ` *Edad:* ${persona.edad ? persona.edad + ' años' : 'No disponible'}\n`
        texto += `│\n└────────────\n\n`
      }

      if (resultados.length > 10) {
        texto += `_📌 Se mostraron los primeros 10 resultados de ${resultados.length}_\n`
      }

      // Enviar el mensaje
      await sock.sendMessage(from, { text: texto }, { quoted: msg })

    } catch (err) {
      console.error('Error en búsqueda por nombre:', err?.response?.data || err.message)
      
      let mensajeError = '❌ Ocurrió un error al realizar la búsqueda.\n\n'
      
      if (err.response) {
        if (err.response.status === 401) {
          mensajeError += '🔐 Error de autenticación con la API.'
        } else if (err.response.status === 404) {
          mensajeError += '🔍 No se encontraron resultados.'
        } else if (err.response.status === 429) {
          mensajeError += '️ Demasiadas solicitudes. Intenta más tarde.'
        } else if (err.response.data?.errors?.ap2) {
          mensajeError += '⚠️ El segundo apellido debe contener solo letras.\n\n*Usa:* .nm Alexander Paul Huaman'
        } else {
          mensajeError += 'Intenta nuevamente en unos momentos.'
        }
      } else if (err.code === 'ECONNABORTED') {
        mensajeError += '⏱️ La solicitud tardó demasiado. Intenta nuevamente.'
      } else {
        mensajeError += 'Verifica tu conexión a internet e intenta de nuevo.'
      }
      
      await sock.sendMessage(from, { text: mensajeError }, { quoted: msg })
    }
  }
}
