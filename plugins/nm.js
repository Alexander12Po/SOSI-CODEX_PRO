import fetch from 'node-fetch';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // Verificar si el usuario ingresó texto
    if (!text) {
        return m.reply(`*⚠️ Uso incorrecto.*\nPor favor, ingresa los nombres y apellidos separados por "|".\n\n*Ejemplo:*\n${usedPrefix + command} Alexander Paul|Huaman|Ramos`);
    }

    // Separar los argumentos usando "|"
    let [n1, ap1, ap2] = text.split('|');

    // Validar que se hayan proporcionado los tres parámetros
    if (!n1 || !ap1 || !ap2) {
        return m.reply(`*⚠️ Formato incompleto.*\nAsegúrate de incluir Nombre, Apellido Paterno y Apellido Materno separados por el carácter "|".\n\n*Ejemplo:*\n${usedPrefix + command} Alexander Paul|Huaman|Ramos`);
    }

    // Configuración de la API
    const token = 'jmdCRmBLZ13ITSmUGCWcBnDcTuOddttU7d0UbL8S7HJNelk8loSpnVkUyFJO';
    const url = `https://api-codart.cgrt.org/api/v1/consultas/fd/nm?n1=${encodeURIComponent(n1.trim())}&ap1=${encodeURIComponent(ap1.trim())}&ap2=${encodeURIComponent(ap2.trim())}`;

    try {
        await m.reply('*⏳ Consultando a la base de datos...*');

        // Petición a la API con los Headers requeridos
        let res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        let json = await res.json();

        // Validar si la consulta fue exitosa
        if (!json.success || !json.data || !json.data.resultados) {
            return m.reply('*❌ Error en la API o no se encontraron resultados.*');
        }

        // Extraer los datos
        let cantidad = json.data.cantidad_resultados;
        let resultados = json.data.resultados;

        if (cantidad === 0 || resultados.length === 0) {
            return m.reply(`*ℹ️ No se encontró ninguna persona con esos datos:* ${n1.trim()} ${ap1.trim()} ${ap2.trim()}`);
        }

        // Construir el mensaje de respuesta
        let mensaje = `*✅ RESULTADOS ENCONTRADOS (${cantidad})*\n\n`;

        resultados.forEach((resultado, index) => {
            mensaje += `*👤 Persona ${index + 1}*\n`;
            mensaje += `*DNI:* ${resultado.dni}\n`;
            mensaje += `*Nombres:* ${resultado.nombres}\n`;
            mensaje += `*Apellidos:* ${resultado.apellidos}\n`;
            mensaje += `*Edad:* ${resultado.edad} años\n`;
            mensaje += `─────────────────\n`;
        });

        // Enviar el resultado final
        await m.reply(mensaje.trim());

    } catch (error) {
        console.error('Error en el comando nm:', error);
        m.reply('*❌ Ocurrió un error inesperado al realizar la consulta.*');
    }
};

// Configuración del plugin
handler.command = ['nm', 'mn']; // El bot reaccionará a .nm y .mn
handler.help = ['nm <nombres|apellidopaterno|apellidomaterno>'];
handler.tags = ['busquedas'];

export default handler;
