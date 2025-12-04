const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Configuração do Express
const app = express();
const server = http.createServer(app);

// Configuração do CORS
app.use(cors());

// Configuração do Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*", // Em produção, especifique a origem exata
    methods: ["GET", "POST"]
  }
});

// Armazenamento temporário para salas e usuários (em produção, use um banco de dados)
const rooms = new Map();
const users = new Map();

// Eventos do Socket.IO
io.on('connection', (socket) => {
  console.log('Usuário conectado:', socket.id);

  // Entrar em uma sala
  socket.on('join_room', (data) => {
    const { userId, room, vehicleData } = data;
    
    // Associar o socket à sala
    socket.join(room);
    
    // Armazenar informações do usuário
    users.set(socket.id, { userId, room, vehicleData });
    
    // Se a sala não existir, cria-la
    if (!rooms.has(room)) {
      rooms.set(room, {
        users: new Map()
      });
    }
    
    // Adicionar usuário à sala
    rooms.get(room).users.set(userId, {
      socketId: socket.id,
      vehicleData: vehicleData
    });
    
    // Notificar outros usuários na sala
    socket.to(room).emit('user_joined', {
      userId,
      message: `${userId} entrou na sala`
    });
    
    console.log(`Usuário ${userId} entrou na sala ${room}`);
  });

  // Enviar mensagem
  socket.on('send_message', (data) => {
    const { room, senderId, message, timestamp } = data;
    
    // Emitir mensagem para todos na sala, exceto o remetente
    socket.to(room).emit('receive_message', {
      senderId,
      message,
      timestamp,
      roomId: room
    });
    
    console.log(`Mensagem enviada na sala ${room}: ${senderId} - ${message}`);
  });

  // Enviar alerta específico para veículos
  socket.on('send_vehicle_alert', (data) => {
    const { targetPlate, senderId, message, vehicleData, timestamp } = data;
    
    // Procurar usuário com a placa específica
    let targetSocketId = null;
    
    // Percorrer todas as salas para encontrar o veículo com a placa
    for (const [roomId, roomData] of rooms.entries()) {
      for (const [userId, userData] of roomData.users.entries()) {
        if (userData.vehicleData && userData.vehicleData.plate === targetPlate) {
          targetSocketId = userData.socketId;
          break;
        }
      }
      if (targetSocketId) break;
    }
    
    // Se encontrou o usuário alvo, enviar alerta diretamente para ele
    if (targetSocketId) {
      io.to(targetSocketId).emit('receive_vehicle_alert', {
        senderId,
        message,
        vehicleData,
        timestamp
      });
      
      console.log(`Alerta enviado para veículo ${targetPlate}: ${message}`);
    } else {
      // Se não encontrou, enviar erro de volta ao remetente
      socket.emit('alert_error', {
        message: `Veículo com placa ${targetPlate} não encontrado`
      });
    }
  });

  // Confirmação de alerta
  socket.on('alert_confirmed', (data) => {
    const { senderId, targetPlate, timestamp } = data;
    
    // Procurar o socket do remetente original
    let senderSocketId = null;
    
    // Percorrer todas as salas para encontrar o remetente
    for (const [roomId, roomData] of rooms.entries()) {
      for (const [userId, userData] of roomData.users.entries()) {
        if (userData.userId === senderId) {
          senderSocketId = userData.socketId;
          break;
        }
      }
      if (senderSocketId) break;
    }
    
    // Se encontrou o remetente, enviar confirmação
    if (senderSocketId) {
      io.to(senderSocketId).emit('alert_confirmation_received', {
        targetPlate,
        timestamp,
        message: `Confirmação de recebimento recebida do veículo ${targetPlate}`
      });
      
      console.log(`Confirmação de alerta recebida de ${targetPlate} por ${senderId}`);
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    
    if (user) {
      const { userId, room } = user;
      
      // Remover usuário do armazenamento
      users.delete(socket.id);
      
      // Remover usuário da sala
      if (rooms.has(room)) {
        rooms.get(room).users.delete(userId);
        
        // Notificar outros usuários na sala
        socket.to(room).emit('user_left', {
          userId,
          message: `${userId} saiu da sala`
        });
        
        console.log(`Usuário ${userId} saiu da sala ${room}`);
      }
    }
    
    console.log('Usuário desconectado:', socket.id);
  });
});

// Endpoint básico para verificar se o servidor está funcionando
app.get('/', (req, res) => {
  res.send('Servidor Socket.IO do JávouCar está rodando!');
});

// Iniciar o servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});