import { io } from 'socket.io-client';

// Conectar ao servidor Socket.IO - usando variável de ambiente ou padrão
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || process.env.VITE_SOCKET_URL || 'http://localhost:3001';
const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  withCredentials: false
});

export default socket;