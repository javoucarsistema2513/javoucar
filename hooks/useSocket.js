import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Conectar ao servidor Socket.IO - usando variável de ambiente ou padrão
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || process.env.VITE_SOCKET_URL || 'http://localhost:3003';

export const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Criar conexão apenas uma vez
    if (!socketRef.current) {
      console.log('Conectando ao servidor Socket.IO:', SOCKET_URL);
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        withCredentials: false
      });
    }

    // Conectar ao socket quando o componente montar
    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }

    // Lidar com erros de conexão
    socketRef.current.on('connect_error', (error) => {
      console.error('Erro de conexão Socket.IO:', error);
      console.error('Verifique se a VITE_SOCKET_URL está configurada corretamente nas variáveis de ambiente');
    });

    socketRef.current.on('connect_failed', (error) => {
      console.error('Falha na conexão Socket.IO:', error);
      console.error('Verifique se o servidor Socket.IO está em execução e acessível');
    });

    return () => {
      // Desconectar ao desmontar o componente (opcional)
      // socketRef.current.disconnect();
    };
  }, []);

  return socketRef.current;
};