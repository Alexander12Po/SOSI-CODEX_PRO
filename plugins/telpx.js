import axios from 'axios';

export default {
  command: ['telpx'],
  description: 'Consulta datos de titular por número de teléfono',
  exec: async ({ sock, from, msg, args }) => {
    const numero = args[0];
    if (!numero) return sock.sendMessage(from, { text: '❌ Ingresa un número de teléfono. Ejemplo: .telpx 900000001' });

    try {
      // Llamada a la API
      const { data } = await axios.get(`https://api-codart.cgrt.org/api/v1/consultas/fd/telp/cel/${numero}`);
      
      if (!data.success || data.data.titulares_encontrados === 0) {
        return sock.sendMessage(from, { text: '❌ No se encontraron datos para ese número de teléfono.' });
      }

      // Formatear la respuesta
      const t = data.data.titulares[0];
      const resultado = `👤 *Titular Encontrado*
      
🔹 *Nombre:* ${t.titular || 'No disponible'}
🆔 *DNI/RUC:* ${t.dni_ruc || 'No disponible'}
📞 *Número:* ${t.telefono}
🏢 *Operador:* ${t.operador}
💼 *Empresa:* ${t.empresa || 'No disponible'}
📱 *Plan:* ${t.plan || 'No disponible'}
📧 *Correo:* ${t.correo || 'No disponible'}`;

      sock.sendMessage(from, { text: resultado }, { quoted: msg });
    } catch (err) {
      console.error(err);
      sock.sendMessage(from, { text: '❌ Error al consultar la API de Teléfonos.' }, { quoted: msg });
    }
  }
}
