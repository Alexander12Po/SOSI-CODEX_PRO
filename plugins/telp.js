import axios from 'axios'; // Asegúrate de tener axios instalado: npm install axios

export default {
  command: ['telp'],
  description: 'Consulta Teléfono por DNI',
  exec: async ({ sock, from, msg, args }) => {
    const dni = args[0];
    if (!dni) return sock.sendMessage(from, { text: '❌ Ingresa un DNI. Ejemplo: .telp 12345678' });

    try {
      // Llamada a la API
      const { data } = await axios.get(`https://api-codart.cgrt.org/api/v1/consultas/fd/telp/${dni}`);
      
      if (!data.success || data.data.lineas_encontradas === 0) {
        return sock.sendMessage(from, { text: '❌ No se encontraron líneas telefónicas para ese DNI.' });
      }

      // Formatear la respuesta
      let resultado = `📱 *Líneas encontradas: ${data.data.lineas_encontradas}*\n\n`;
      data.data.lineas.forEach((item, index) => {
        resultado += `*${index + 1}.* 📞 ${item.telefono}\n  🏢 Operador: ${item.operador}\n  📅 Periodo: ${item.periodo}\n\n`;
      });

      sock.sendMessage(from, { text: resultado }, { quoted: msg });
    } catch (err) {
      console.error(err);
      sock.sendMessage(from, { text: '❌ Error al consultar la API de Teléfonos.' }, { quoted: msg });
    }
  }
}
