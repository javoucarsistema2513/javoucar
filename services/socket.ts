// Import dinâmico para evitar problemas de tipo
let io: any = null;
let Socket: any = null;

// Carregar socket.io-client dinamicamente
if (typeof window !== 'undefined') {
  import('socket.io-client')
    .then((module) => {
      io = module.io;
      Socket = module.Socket;
      console.log('Socket.IO client carregado com sucesso');
    })
    .catch((error) => {
      console.error('Erro ao carregar socket.io-client:', error);
    });
}

// URL do servidor Socket.IO (ajuste conforme necessário)
const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.REACT_APP_BACKEND_URL || 'https://javoucar.onrender.com')
  : 'http://localhost:3001';

class SocketService {
  private socket: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Conectar ao servidor Socket.IO
  async connect() {
    console.log('Tentando conectar ao Socket.IO...');
    // Aguardar carregamento do módulo
    while (!io) {
      console.log('Aguardando carregamento do módulo Socket.IO...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.socket?.connected) {
      console.log('Socket já está conectado');
      return;
    }

    // Configuração otimizada para redes móveis
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Prioriza WebSocket, mas permite polling fallback
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 10000, // Timeout de 10 segundos
      pingTimeout: 60000,
      pingInterval: 25000,
      withCredentials: true
    });

    // Eventos de conexão
    this.socket.on('connect', () => {
      console.log('Conectado ao servidor Socket.IO:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Desconectado do servidor Socket.IO:', reason);
      
      // Tentar reconectar manualmente se for um motivo conhecido
      if (reason === 'io server disconnect') {
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Erro de conexão Socket.IO:', error);
      this.handleReconnect();
    });

    this.socket.on('reconnect', (attempt: number) => {
      console.log('Reconectado ao servidor Socket.IO na tentativa:', attempt);
    });

    this.socket.on('reconnect_error', (error: Error) => {
      console.error('Erro durante reconexão:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Falha ao reconectar após', this.maxReconnectAttempts, 'tentativas');
    });
  }

  // Registrar usuário no servidor
  registerUser(userId: string, plate: string) {
    if (!this.socket?.connected) {
      console.warn('Socket não conectado. Tentando conectar...');
      this.connect();
    }

    console.log('Registrando usuário:', userId, 'com placa:', plate);
    this.socket?.emit('register_user', { userId, plate });
  }

  // Enviar alerta
  sendAlert(alertData: any) {
    if (!this.socket?.connected) {
      console.warn('Socket não conectado. Tentando conectar...');
      this.connect();
    }

    console.log('Enviando alerta:', alertData);
    this.socket?.emit('send_alert', alertData);
  }

  // Enviar alerta direcionado
  sendTargetedAlert(alertData: any) {
    if (!this.socket?.connected) {
      console.warn('Socket não conectado. Tentando conectar...');
      this.connect();
    }

    console.log('Enviando alerta direcionado:', alertData);
    this.socket?.emit('send_targeted_alert', alertData);
  }

  // Ouvir eventos de alerta recebido
  onReceiveAlert(callback: (data: any) => void) {
    this.socket?.on('receive_alert', (data: any) => {
      console.log('Recebendo alerta:', data);
      callback(data);
    });
  }

  // Ouvir confirmação de envio de alerta
  onAlertSent(callback: (data: any) => void) {
    this.socket?.on('alert_sent', callback);
  }

  // Ouvir confirmação de registro
  onRegistrationSuccess(callback: (data: any) => void) {
    this.socket?.on('registration_success', callback);
  }

  // Ping para manter conexão ativa (útil para redes móveis)
  ping() {
    this.socket?.emit('ping');
  }

  // Ouvir pong (resposta ao ping)
  onPong(callback: () => void) {
    this.socket?.on('pong', callback);
  }

  // Reconectar manualmente
  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log('Tentando reconectar... (tentativa', this.reconnectAttempts, ')');
        this.socket?.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  // Tratar reconexão automática
  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log('Tentando reconectar automaticamente... (tentativa', this.reconnectAttempts, ')');
        this.socket?.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  // Desconectar
  disconnect() {
    this.socket?.disconnect();
  }

  // Verificar status da conexão
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Obter ID do socket
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Exportar instância singleton
export const socketService = new SocketService();