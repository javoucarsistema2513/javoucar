import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Conectar ao servidor Socket.IO
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

export const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Criar conexão apenas uma vez
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL);
    }

    // Conectar ao socket quando o componente montar
    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }

    return () => {
      // Desconectar ao desmontar o componente (opcional)
      // socketRef.current.disconnect();
    };
  }, []);

  return socketRef.current;
};