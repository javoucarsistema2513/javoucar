import { io } from 'socket.io-client';

// Conectar ao servidor Socket.IO - usando variável de ambiente ou padrão
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || process.env.VITE_SOCKET_URL || 'http://localhost:3003';
const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  withCredentials: false
});

// Adicionar listeners para erros de conexão
socket.on('connect_error', (error) => {
  console.error('Erro de conexão Socket.IO:', error);
  console.error('Verifique se a VITE_SOCKET_URL está configurada corretamente nas variáveis de ambiente');
});

socket.on('connect_failed', (error) => {
  console.error('Falha na conexão Socket.IO:', error);
  console.error('Verifique se o servidor Socket.IO está em execução e acessível');
});

export default socket;