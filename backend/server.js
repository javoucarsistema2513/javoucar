import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuração de __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do Express e Socket.IO
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*", // Em produção, especifique os domínios permitidos
    methods: ["GET", "POST"],
    credentials: true
  },
  // Configurações otimizadas para redes móveis (3G/4G/5G)
  transports: ['websocket', 'polling'],
  upgrade: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: false
});

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../dist')));

// Middleware para parsear JSON
app.use(express.json());

// Armazenamento temporário para usuários conectados (em produção, use Redis ou banco de dados)
const connectedUsers = new Map();

// Eventos do Socket.IO
io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);
  
  // Registro de usuário
  socket.on('register_user', (userData) => {
    console.log('Recebendo registro de usuário:', userData);
    connectedUsers.set(socket.id, {
      userId: userData.userId,
      plate: userData.plate,
      socketId: socket.id,
      connectedAt: new Date()
    });
    
    console.log('Usuário registrado:', userData.userId, 'com placa:', userData.plate);
    console.log('Lista de usuários conectados:', Array.from(connectedUsers.entries()));
    socket.emit('registration_success', { message: 'Registrado com sucesso!' });
  });
  
  // Envio de alerta
  socket.on('send_alert', (alertData) => {
    console.log('Alerta recebido:', alertData);
    
    // Enviar alerta apenas para o remetente (feedback de envio)
    socket.emit('receive_alert', alertData);
    
    // Confirmação de envio
    socket.emit('alert_sent', { 
      success: true, 
      message: 'Alerta enviado com sucesso!',
      timestamp: new Date()
    });
  });
  
  // Envio de alerta direto para uma placa específica
  socket.on('send_targeted_alert', (alertData) => {
    console.log('Alerta direcionado recebido:', alertData);
    
    // Procurar usuário com a placa específica
    let targetSocketFound = false;
    for (const [socketId, userData] of connectedUsers.entries()) {
      console.log('Verificando usuário:', userData.plate, 'comparando com:', alertData.targetPlate);
      // Normalizar as placas para comparação (maiúsculas e sem espaços)
      const userPlateNormalized = userData.plate.toUpperCase().replace(/\s/g, '');
      const targetPlateNormalized = alertData.targetPlate.toUpperCase().replace(/\s/g, '');
      
      console.log('Comparando placas normalizadas:', userPlateNormalized, 'com', targetPlateNormalized);
      
      if (userPlateNormalized === targetPlateNormalized) {
        // Enviar alerta para o usuário específico
        console.log('Enviando alerta para socket:', socketId);
        // Usar socket.emit diretamente através do io
        io.to(socketId).emit('receive_alert', alertData);
        targetSocketFound = true;
        
        console.log('Alerta enviado para placa:', alertData.targetPlate);
      }
    }
    
    // Confirmação de envio - sempre enviar para o remetente
    socket.emit('alert_sent', { 
      success: targetSocketFound, 
      message: targetSocketFound ? 'Alerta direcionado enviado com sucesso!' : 'Nenhum usuário encontrado com essa placa.',
      targetPlate: alertData.targetPlate,
      timestamp: new Date()
    });
  });
  
  // Ping para manter a conexão ativa (útil para redes móveis)
  socket.on('ping', () => {
    socket.emit('pong');
  });
  
  // Desconexão
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    connectedUsers.delete(socket.id);
  });
  
  // Tratamento de erros
  socket.on('error', (error) => {
    console.error('Erro no socket:', error);
  });
});

// Rota para servir o frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Iniciar servidor
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor Socket.IO rodando na porta ${PORT}`);
  console.log(`Acesse http://localhost:${PORT}`);
});

// Função para limpar usuários inativos (opcional)
setInterval(() => {
  const now = new Date();
  for (const [socketId, userData] of connectedUsers.entries()) {
    // Remover usuários inativos por mais de 1 hora
    if (now - userData.connectedAt > 3600000) {
      connectedUsers.delete(socketId);
      console.log('Usuário removido por inatividade:', userData.userId);
    }
  }
}, 300000); // Verificar a cada 5 minutos