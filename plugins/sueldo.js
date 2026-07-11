import axios from 'axios'

export default {
  command: ['sueldo', 'sueldos', 'trabajo'],
  description: 'Consulta el historial de sueldos y empleos de una persona por su DNI',
  exec: async ({ sock, from, msg, args }) => {
    const s_dni = args[0]

    // Validación de DNI (8 dígitos)
    if (!s_dni || !/^\d{8}$/.test(s_dni)) {
      return sock.sendMessage(
        from,
        { text: '❌ *Uso incorrecto.*\nDebes ingresar un DNI válido de 8 dígitos.\n\n*Ejemplo:* .sueldo 12345678' },
        { quoted: msg }
      )
    }

    // Tu token directo
    const token = 'jmdCRmBLZ13ITSmUGCWcBnDcTuOddttU7d0UbL8S7HJNelk8loSpnVkUyFJO'

    try {
      await sock.sendMessage(from, { text: '🔎 Consultando historial laboral y de sueldos...' }, { quoted: msg })

      // Petición a la API de Sueldos
      const { data: response } = await axios.get(`https://api-codart.cgrt.org/api/v1/consultas/fd/suel/${s_dni}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      // Verificar si la consulta fue exitosa
      if (!response.success || !response.data || !response.data.sueldos) {
        return sock.sendMessage(
          from,
          { text: '❌ No se encontró historial de sueldos o empleos para el DNI ingresado.' },
          { quoted: msg }
        )
      }

      const info = response.data
      const totalRegistros = info.total_registros

      if (totalRegistros === 0 || info.sueldos.length === 0) {
        return sock.sendMessage(
          from,
          { text: `ℹ️ No se registraron empleos ni sueldos para el DNI: ${info.consulta}` },
          { quoted: msg }
        )
      }

      // Construcción del encabezado del mensaje
      let text = `┌─❐ *HISTORIAL LABORAL Y SUELDOS* ❐\n`
      text += `│\n`
      text += `│ 🆔 *DNI Consultado:* ${info.consulta}\n`
      text += `│ 💼 *Total de Registros:* ${totalRegistros}\n`
      text += `│\n`
      text += `└────────────\n\n`

      // Recorrer e integrar cada registro de sueldo en la respuesta
      info.sueldos.forEach((registro, index) => {
        text += `🏢 *Registro ${index + 1}*\n`
        text += `• *Empresa:* ${registro.empresa}\n`
        text += `• *RUC:* ${registro.ruc}\n`
        text += `• *Periodo:* ${registro.periodo} *(Año/Mes)*\n`
        text += `• *Situación:* ${registro.situacion}\n`
        text += `• *Sueldo:* ${registro.sueldo}\n`
        text += `─────────────────\n`
      })

      // Enviar el mensaje estructurado a WhatsApp
      await sock.sendMessage(from, { text: text.trim() }, { quoted: msg })

    } catch (err) {
      console.error('Error consultando Sueldos:', err?.response?.data || err.message)
      
      const errorDeApi = err?.response?.data?.message || 'Ocurrió un error inesperado al consultar los sueldos.'
      
      await sock.sendMessage(
        from,
        { text: `❌ *Error en la consulta:*\n${errorDeApi}` },
        { quoted: msg }
      )
    }
  }
}
