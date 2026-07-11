import fs from 'fs';

export default {
  command: ['registrar'],
  description: 'Regístrate en el bot: .registrar nombre|password',
  exec: async ({ sock, from, msg, args }) => {
    const input = args.join(' ').split('|');
    if (input.length < 2) return sock.sendMessage(from, { text: 'Uso correcto: .registrar nombre|password' });
    
    const [nombre, password] = input;
    const userId = msg.key.remoteJid;
    let users = JSON.parse(fs.readFileSync('./users.json', 'utf-8'));

    if (users[userId]) return sock.sendMessage(from, { text: '❌ Ya estás registrado.' });

    // Guardamos nombre, password, 1 crédito y la fecha actual
    const fechaRegistro = new Date().toLocaleDateString('es-PE');
    users[userId] = { 
        nombre, 
        password, 
        creditos: 1, 
        fecha: fechaRegistro 
    };
    
    fs.writeFileSync('./users.json', JSON.stringify(users, null, 2));
    
    // El menú personalizado que solicitaste
    const menuUsuario = `
╔═════👤 **PERFIL DE USUARIO** 👤═════
║ 
║ 👤 **Nombre:** ${nombre}
║ 💰 **Créditos:** 1
║ 📅 **Registro:** ${fechaRegistro}
║ 
╚══════════════════════════════════╝
¡Registro completado con éxito! Ahora tienes 1 crédito disponible.`;

    sock.sendMessage(from, { text: menuUsuario });
  }
}

