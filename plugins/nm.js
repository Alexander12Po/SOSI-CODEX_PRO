import axios from 'axios'

export default {
  command: ['arg', 'nm', 'buscarnombre', 'buscarname'],
  description: 'Busca personas por nombre completo (muestra solo coincidencia exacta)',
  exec: async ({ sock, from, msg, args }) => {
    const query = args.join(' ').trim()

    if (!query || args.length < 2) {
      return sock.sendMessage(
        from,
        { 
          text: '❌ *Búsqueda por Nombre Completo*\n\nEscribe el nombre completo que quieras buscar.\n\n*Ejemplo:*\n.nm Alexander Paul Huaman Ramos' 
        },
        { quoted: msg }
      )
    }

    const token = 'jmdCRmBLZ13ITSmUGCWcBnDcTuOddttU7d0UbL8S7HJNelk8loSpnVkUyFJO'

    try {
      await sock.sendMessage(from, { text: '🔎 Buscando en la base de datos...' }, { quoted: msg })

      // ✅ PARSEO INTELIGENTE: últimas 2 palabras son apellidos, el resto son nombres
      const palabras = query.split(/\s+/).filter(p => p.length > 0)
      
      let n1 = '', ap1 = '', ap2 = ''
      
      if (palabras.length === 2) {
        n1 = palabras[0]
        ap1 = palabras[1]
      } else if (palabras.length === 3) {
        n1 = palabras.slice(0, 2).join(' ')
        ap1 = palabras[2]
      } else {
        n1 = palabras.slice(0, -2).join(' ')
        ap1 = palabras[palabras.length - 2]
        ap2 = palabras[palabras.length - 1]
      }

      // Validar que solo contengan letras
      const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/
      if (!soloLetras.test(query)) {
        return sock.sendMessage(
          from,
          { text: '❌ El nombre solo debe contener letras.' },
          { quoted: msg }
        )
      }

      // Construir URL
      const url = new URL('https://api-codart.cgrt.org/api/v1/consultas/fd/nm')
      url.searchParams.append('n1', n1)
      url.searchParams.append('ap1', ap1)
      if (ap2) url.searchParams.append('ap2', ap2)

      const { data: response } = await axios.get(url.toString(), {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000
      })

      if (!response.success || !response.data || !response.data.resultados || response.data.resultados.length === 0) {
        return sock.sendMessage(
          from,
          { text: '❌ No se encontraron resultados.' },
          { quoted: msg }
        )
      }

      const resultados = response.data.resultados

      // ✅ FUNCIÓN PARA NORMALIZAR (quita tildes, mayúsculas, espacios)
      const normalizar = (texto) => {
        if (!texto) return ''
        return texto
          .toString()
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      }

      // ✅ BUSCAR COINCIDENCIA EXACTA
      const nombreBuscado = normalizar(query)
      
      const coincidenciasExactas = resultados.filter(r => {
        const nombreCompleto = normalizar(`${r.nombres || ''} ${r.apellidos || ''}`)
        return nombreCompleto === nombreBuscado
      })

      // ✅ Si hay coincidencia exacta, mostrar SOLO esa
      if (coincidenciasExactas.length > 0) {
        const persona = coincidenciasExactas[0]
        
        const texto = `┌─❐ *RESULTADO EXACTO* ✅❐\n│\n` +
          `🆔 *DNI:* ${persona.dni || 'N/D'}\n` +
          `👤 *Nombres:* ${persona.nombres || 'N/D'}\n` +
          `👥 *Apellidos:* ${persona.apellidos || 'N/D'}\n` +
          `🎂 *Edad:* ${persona.edad ? persona.edad + ' años' : 'N/D'}\n` +
          `│\n└────────────\n\n` +
          `✅ *Coincidencia exacta encontrada*`

        return await sock.sendMessage(from, { text: texto }, { quoted: msg })
      }

      // ✅ Si no hay coincidencia exacta, buscar las más cercanas
      const coincidenciasCercanas = resultados.map(r => {
        const nombreCompleto = normalizar(`${r.nombres || ''} ${r.apellidos || ''}`)
        const palabrasBuscadas = nombreBuscado.split(' ')
        const palabrasResultado = nombreCompleto.split(' ')
        
        // Calcular cuántas palabras coinciden
        const coincidencias = palabrasBuscadas.filter(p => palabrasResultado.includes(p)).length
        const porcentaje = Math.round((coincidencias / palabrasBuscadas.length) * 100)
        
        return { ...r, porcentaje, nombreCompleto }
      })
      .filter(r => r.porcentaje >= 70)
      .sort((a, b) => b.porcentaje - a.porcentaje)
      .slice(0, 3)

      if (coincidenciasCercanas.length > 0) {
        let texto = `┌─❐ *COINCIDENCIAS CERCANAS* ❐\n│\n` +
          ` *Buscaste:* ${query}\n` +
          `📊 *Resultados similares:* ${coincidenciasCercanas.length}\n` +
          `│\n└────────────\n\n`

        coincidenciasCercanas.forEach((persona, i) => {
          texto += `┌─❐ *Opción #${i + 1}* (${persona.porcentaje}% similitud) ❐\n` +
            `│\n` +
            `🆔 *DNI:* ${persona.dni || 'N/D'}\n` +
            `👤 *Nombres:* ${persona.nombres || 'N/D'}\n` +
            ` *Apellidos:* ${persona.apellidos || 'N/D'}\n` +
            ` *Edad:* ${persona.edad ? persona.edad + ' años' : 'N/D'}\n` +
            `│\n└────────────\n\n`
        })

        texto += `_⚠️ No se encontró coincidencia exacta. Estas son las más cercanas._`

        return await sock.sendMessage(from, { text: texto }, { quoted: msg })
      }

      // Si no hay nada cercano
      return await sock.sendMessage(
        from,
        { text: '❌ No se encontró ninguna coincidencia exacta ni cercana.\n\n*Verifica que el nombre esté escrito correctamente.*' },
        { quoted: msg }
      )

    } catch (err) {
      console.error('Error en búsqueda:', err?.response?.data || err.message)
      
      let mensajeError = '❌ Error al realizar la búsqueda.\n\n'
      
      if (err.response) {
        if (err.response.status === 401) mensajeError += '🔐 Error de autenticación.'
        else if (err.response.status === 429) mensajeError += '⏱️ Demasiadas solicitudes.'
        else mensajeError += 'Intenta de nuevo.'
      } else if (err.code === 'ECONNABORTED') {
        mensajeError += '⏱️ Tiempo agotado.'
      } else {
        mensajeError += 'Verifica tu conexión.'
      }
      
      await sock.sendMessage(from, { text: mensajeError }, { quoted: msg })
    }
  }
}
