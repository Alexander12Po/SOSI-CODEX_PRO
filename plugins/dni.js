import axios from 'axios'

export default {
  command: ['dni'],
  description: 'Consulta datos detallados de una persona por su DNI (Perú)',
  exec: async ({ sock, from, msg, args }) => {
    const dni = args[0]

    if (!dni || !/^\d{8}$/.test(dni)) {
      await sock.sendMessage(
        from,
        { text: '❌ *Error:* Debes ingresar un DNI válido de 8 dígitos.\n\n💡 _Ejemplo: .dni 12345678_' },
        { quoted: msg }
      )
      return false
    }

    const token = 'jmdCRmBLZ13ITSmUGCWcBnDcTuOddttU7d0UbL8S7HJNelk8loSpnVkUyFJO'

    try {
      await sock.sendMessage(from, { text: '⚡ *SOSI CODEX PREMIUM* • _Procesando consulta VIP..._' }, { quoted: msg })

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
          { text: '❌ *SOSI CODEX* • No se encontraron registros válidos para el DNI provisto.' },
          { quoted: msg }
        )
        return false
      }

      const userData = response.data

      // Lógica de separación de DNI y Nombres de Padres en caso vengan juntos por la API
      const extraerDatosPadre = (cadena) => {
        if (!cadena) return { nombre: 'NO REGISTRA', dni: '--------' };
        const match = cadena.match(/(.*?)\s*-\s*(\d+)/);
        if (match) return { nombre: match[1].trim(), dni: match[2].trim() };
        return { nombre: cadena.trim(), dni: '--------' };
      };

      const padre = extraerDatosPadre(userData.informacion_general.padre);
      const madre = extraerDatosPadre(userData.informacion_general.madre);

      // Separación de la Edad
      let edadLimpia = userData.nacimiento.edad || '---';
      if (edadLimpia.toLowerCase().includes('años')) {
        edadLimpia = edadLimpia.toUpperCase();
      } else {
        edadLimpia = `${edadLimpia} AÑOS`.toUpperCase();
      }

      // Estructuración del Texto Solicitado Exáctamente
      const text = `╭━━━〔 🤖 SOSI CODEX PREMIUM 〕━━━⬣
┃        🔍 CONSULTA RENIEC
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣

👤 *DATOS PERSONALES*
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┣ 🆔 DNI          : \`${userData.dni.completo || dni}\`
┣ 👤 Nombres      : ${userData.nombres}
┣ 👥 Apellidos    : ${userData.apellidos}
┣ ⚧️ Género       : ${userData.genero.toUpperCase()}
┣ 🎂 Nacimiento   : ${userData.nacimiento.fecha}
┣ 🎈 Edad         : ${edadLimpia}
┣ 🌎 Lugar Nac.   : ${userData.nacimiento.distrito}, ${userData.nacimiento.provincia}, ${userData.nacimiento.departamento}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👨‍👩‍👦 *FILIACIÓN*
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┣ 👨 Padre : ${padre.nombre}
┣ 🆔 DNI   : ${padre.dni}
┣ 👩 Madre : ${madre.nombre}
┣ 🆔 DNI   : ${madre.dni}
┣ 💍 Estado Civil : ${userData.informacion_general.estado_civil.toUpperCase()}
┣ 🎓 Educación    : ${userData.informacion_general.nivel_educativo.toUpperCase()}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏠 *DOMICILIO*
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┣ 📍 Dirección
┃ ${userData.domicilio.direccion}
┣ 🗺️ Residencia : ${userData.domicilio.distrito}, ${userData.domicilio.provincia}, ${userData.domicilio.departamento}
┣ 📌 Ubigeo     : ${userData.ubigeos.reniec}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *INFORMACIÓN COMPLEMENTARIA*
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┣ 📏 Estatura      : ${userData.informacion_general.estatura}
┣ ❤️ Donante       : ${userData.informacion_general.donante_organos.toUpperCase()}
┣ ⚠️ Restricciones : ${userData.informacion_general.restriccion.toUpperCase()}
┣ 📅 Inscripción   : ${userData.informacion_general.fecha_inscripcion}
┣ 🪪 Emisión       : ${userData.informacion_general.fecha_emision}
┣ ⏳ Caducidad     : ${userData.informacion_general.fecha_caducidad}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

      if (userData.images && userData.images.length > 0 && userData.images[0].data_uri) {
        const base64Data = userData.images[0].data_uri.split(',')[1]
        const imageBuffer = Buffer.from(base64Data, 'base64')
        return { image: imageBuffer, caption: text }
      } else {
        return { text: text }
      }

    } catch (err) {
      console.error('Error consultando DNI:', err?.response?.data || err.message)
      await sock.sendMessage(
        from,
        { text: '❌ *SOSI CODEX* • El servicio externo no respondió de forma correcta.' },
        { quoted: msg }
      )
      return false
    }
  }
}
