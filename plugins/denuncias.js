import axios from 'axios';

export default {
  command: ['denuncias'],
  description: 'Consulta el registro de denuncias por DNI',
  exec: async ({ sock, from, msg, args }) => {
    const dni = args[0];
    
    // Validar que el usuario haya ingresado un DNI
    if (!dni) {
      return sock.sendMessage(from, { text: '❌ Ingresa un DNI. Ejemplo: .denuncias 12345678' }, { quoted: msg });
    }

    try {
      // 1. Llamada a la API
      const { data } = await axios.get(`https://api-codart.cgrt.org/api/v1/consultas/fd/den/${dni}`);
      
      // 2. Verificación de éxito y cantidad
      if (!data.success || data.data.cantidad_denuncias === 0) {
        return sock.sendMessage(from, { text: '✅ No se encontraron denuncias registradas para el DNI ingresado.' }, { quoted: msg });
      }

      // 3. Construcción del mensaje con todos los detalles del JSON
      let resultado = `📋 *DENUNCIAS ENCONTRADAS: ${data.data.cantidad_denuncias}*\n\n`;
      
      data.data.denuncias.forEach((d) => {
        resultado += `*Nº ${d.numero}* - 🚨 *${d.tipo}*\n` +
                     `📄 *Orden:* ${d.n_orden}\n` +
                     `🚓 *Comisaría:* ${d.comisaria}\n` +
                     `📅 *Fecha de hecho:* ${d.f_hecho}\n` +
                     `🕒 *Fecha de registro:* ${d.f_registro}\n` +
                     `📌 *Intervención:* ${d.intervencion}\n` +
                     `📝 *Condición:* ${d.condicion}\n` +
                     `💬 *Resumen:* ${d.resumen}\n` +
                     `──────────────────\n`;
      });

      // 4. Enviar el resultado final al usuario
      sock.sendMessage(from, { text: resultado }, { quoted: msg });
      
    } catch (err) {
      console.error('Error en API denuncias:', err);
      sock.sendMessage(from, { text: '❌ Ocurrió un error al comunicarse con el servidor de denuncias. Intenta de nuevo más tarde.' }, { quoted: msg });
    }
  }
}
