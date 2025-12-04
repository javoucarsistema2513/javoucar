import { io } from 'socket.io-client';

// Conectar ao servidor Socket.IO
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
const socket = io(SOCKET_URL);

export default socket;