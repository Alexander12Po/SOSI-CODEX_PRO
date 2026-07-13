import axios from 'axios';

export default {
  command: ['denuncias'],
  description: 'Consulta denuncias por DNI',
  exec: async ({ sock, from, msg, args }) => {
    const dni = args[0];
    if (!dni) return sock.sendMessage(from, { text: '❌ Ingresa un DNI. Ejemplo: .denuncias 12345678' });

    try {
      const { data } = await axios.get(`https://api-codart.cgrt.org/api/v1/consultas/fd/den/${dni}`);
      
      if (!data.success || data.data.cantidad_denuncias === 0) {
        return sock.sendMessage(from, { text: '❌ No se encontraron denuncias para ese DNI.' });
      }

      let resultado = `📋 *Denuncias encontradas: ${data.data.cantidad_denuncias}*\n\n`;
      
      data.data.denuncias.forEach((d) => {
        resultado += `*Nº ${d.numero}* - ${d.tipo}\n` +
                     `📄 Orden: ${d.n_orden}\n` +
                     `📅 Hecho: ${d.f_hecho}\n` +
                     `📝 Condición: ${d.condicion}\n` +
                     `💬 Resumen: ${d.resumen}\n\n`;
      });

      sock.sendMessage(from, { text: resultado }, { quoted: msg });
    } catch (err) {
      console.error(err);
      sock.sendMessage(from, { text: '❌ Error al consultar la API de Denuncias.' }, { quoted: msg });
    }
  }
}
