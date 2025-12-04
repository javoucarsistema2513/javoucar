const io = require('socket.io-client');

// Conectar ao servidor
const socket = io('http://localhost:3001');

console.log('Conectando ao servidor Socket.IO...');

socket.on('connect', () => {
  console.log('Conectado ao servidor com ID:', socket.id);
  
  // Entrar em uma sala de teste
  socket.emit('join_room', {
    userId: 'test_user_1',
    room: 'test_room',
    vehicleData: {
      plate: 'TEST123',
      model: 'Test Model',
      color: 'Blue'
    }
  });
  
  // Enviar um alerta de teste
  setTimeout(() => {
    socket.emit('send_vehicle_alert', {
      targetPlate: 'TEST123',
      senderId: 'test_sender',
      message: 'Este é um alerta de teste',
      vehicleData: {
        plate: 'TEST123',
        model: 'Test Model',
        color: 'Blue'
      },
      timestamp: new Date().toISOString()
    });
  }, 2000);
});

socket.on('receive_vehicle_alert', (data) => {
  console.log('Alerta recebido:', data);
});

socket.on('alert_error', (data) => {
  console.log('Erro no alerta:', data);
});

socket.on('user_joined', (data) => {
  console.log('Usuário entrou:', data);
});

socket.on('disconnect', () => {
  console.log('Desconectado do servidor');
});