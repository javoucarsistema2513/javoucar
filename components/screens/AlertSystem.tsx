import React, { useState, useEffect } from 'react';
import { Search, Send, Siren, Ban, Lightbulb, Unlock, BellRing, CircleDashed, Wind, MessageSquare } from 'lucide-react';
import { Button } from '../Button';
import { PREDEFINED_ALERTS } from '../../constants';
import { AlertOption } from '../../types';
import { api } from '../../services/api';
import { AlertModal } from '../AlertModal';
import io from 'socket.io-client';

interface AlertSystemProps {
  onLogout: () => void;
}

export const AlertSystem: React.FC<AlertSystemProps> = ({ onLogout }) => {
  const [targetPlate, setTargetPlate] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<AlertOption | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Estado para o Modal de Recebimento (Pronto para integração com Backend)
  // O backend irá disparar setShowReceivedModal(true) via WebSocket/Push
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [receivedAlertData, setReceivedAlertData] = useState<any>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    // Determine WebSocket URL based on environment
    let WEBSOCKET_URL = 'http://localhost:3001';
    
    if (process.env.NODE_ENV === 'production') {
      // Try different possible URLs for Render deployment
      if (window.location.hostname.includes('onrender.com')) {
        // If we're on a Render domain, try to connect to the backend service
        WEBSOCKET_URL = 'https://javoucar-backend.onrender.com';
      } else if (window.location.hostname.includes('javoucarsistem')) {
        // If we're on the custom domain, connect to the backend
        WEBSOCKET_URL = 'https://javoucar-backend.onrender.com';
      } else {
        // Fallback for other domains
        WEBSOCKET_URL = 'https://javoucar-backend.onrender.com';
      }
    }
    
    console.log('Connecting to WebSocket at:', WEBSOCKET_URL);
    
    // Connect to WebSocket server
    const socket = io(WEBSOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    
    // Register user with a mock user ID for demonstration
    // In a real app, this would come from the authentication system
    const userId = 'user_' + Math.random().toString(36).substr(2, 9);
    socket.emit('registerUser', userId);
    console.log('Registered user with ID:', userId);
    
    // Listen for alert events
    socket.on('alertReceived', (data) => {
      console.log('Alert received:', data);
      
      // Transform the received data to match what AlertModal expects
      const transformedData = {
        message: data.message,
        sender: data.sender,
        timestamp: data.timestamp,
        plate: data.vehicle?.plate || 'ABC1234',
        model: data.vehicle?.model || 'Modelo Padrão',
        color: data.vehicle?.color || 'Branco',
        iconName: 'BellRing', // Default icon
        category: 'info' as const // Default category
      };
      
      setReceivedAlertData(transformedData);
      setShowReceivedModal(true);
    });
    
    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
    
    socket.on('connect', () => {
      console.log('WebSocket connected successfully');
    });
    
    // Clean up connection on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const iconMap: Record<string, React.ReactNode> = {
    Siren: <Siren size={20} />,
    Ban: <Ban size={20} />,
    Lightbulb: <Lightbulb size={20} />,
    Unlock: <Unlock size={20} />,
    BellRing: <BellRing size={20} />,
    CircleDashed: <CircleDashed size={20} />,
    Wind: <Wind size={20} />
  };

  const handleSend = async () => {
    if (!targetPlate) {
      alert("Por favor, digite a placa do veículo.");
      return;
    }
    if (!selectedAlert && !customMessage) {
      alert("Selecione um alerta ou escreva uma mensagem.");
      return;
    }

    setIsSending(true);
    const finalMessage = customMessage || selectedAlert?.label || '';
    
    try {
      await api.sendAlert(targetPlate, finalMessage);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setTargetPlate('');
        setSelectedAlert(null);
        setCustomMessage('');
      }, 3000);
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar alerta.");
    } finally {
      setIsSending(false);
    }
  };

  // Update the AlertModal to play 2 beeps when closed (confirmation)
  const handleCloseModal = () => {
    setShowReceivedModal(false);
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-brand-yellow px-6 animate-in fade-in duration-300">
        <div className="bg-white p-4 rounded-full mb-6 shadow-xl">
          <Send size={48} className="text-brand-dark" />
        </div>
        <h2 className="text-3xl font-bold text-brand-dark mb-2">Enviado!</h2>
        <p className="text-brand-dark/80 text-center mb-8">O motorista do veículo <span className="font-bold uppercase">{targetPlate}</span> foi notificado.</p>
        <Button variant="secondary" onClick={() => setShowSuccess(false)}>Novo Alerta</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 relative mobile-full-width">
      {/* Modal de Recebimento - Invisível até ser acionado pelo Backend */}
      <AlertModal 
        isOpen={showReceivedModal} 
        onClose={handleCloseModal} 
        data={receivedAlertData}
      />

      {/* Header */}
      <header className="bg-brand-dark text-white p-4 pb-6 rounded-b-3xl shadow-lg z-10 mobile-full-width">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">Jávou<span className="text-brand-yellow">Car</span></h1>
          <button onClick={onLogout} className="text-xs text-gray-400 hover:text-white transition-colors">Sair</button>
        </div>
        
        <div className="relative">
            <label className="text-xs text-gray-400 ml-1 mb-1 block uppercase tracking-wider font-bold">Destinatário</label>
            <div className="relative">
                <input
                    type="text"
                    value={targetPlate}
                    onChange={(e) => setTargetPlate(e.target.value.toUpperCase())}
                    placeholder="Digite a PLACA"
                    maxLength={8}
                    className="w-full bg-gray-800 border-none rounded-xl py-3 pl-10 pr-4 text-xl font-mono tracking-widest text-white placeholder-gray-600 focus:ring-2 focus:ring-brand-yellow uppercase mobile-full-width"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20 -mt-2 mobile-full-width">
        <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Alertas Rápidos</h3>
            <div className="grid grid-cols-2 gap-2">
            {PREDEFINED_ALERTS.map((alert) => (
                <button
                key={alert.id}
                onClick={() => {
                    setSelectedAlert(alert);
                    setCustomMessage('');
                }}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-1 ${
                    selectedAlert?.id === alert.id
                    ? 'border-brand-yellow bg-yellow-50 text-brand-dark scale-[1.02] shadow-md'
                    : 'border-white bg-white text-gray-600 hover:border-gray-200 shadow-sm'
                }`}
                >
                <div className={`p-1 rounded-full ${
                    alert.category === 'urgent' ? 'bg-red-100 text-red-600' : 
                    alert.category === 'warning' ? 'bg-amber-100 text-amber-600' : 
                    'bg-blue-100 text-blue-600'
                }`}>
                    {iconMap[alert.iconName]}
                </div>
                <span className="text-xs font-medium leading-tight">{alert.label}</span>
                </button>
            ))}
            </div>
        </div>

        <div className="mb-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Personalizado</h3>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-start gap-2">
                    <MessageSquare className="text-gray-400 mt-1" size={16} />
                    <textarea
                        className="w-full resize-none bg-transparent border-none focus:ring-0 p-0 text-gray-700 placeholder-gray-400 text-sm"
                        rows={2}
                        placeholder="Digite uma mensagem personalizada..."
                        value={customMessage}
                        onChange={(e) => {
                            setCustomMessage(e.target.value);
                            setSelectedAlert(null);
                        }}
                    />
                </div>
            </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/90 backdrop-blur-md border-t border-gray-200 z-20 mobile-full-width">
        <div className="max-w-md mx-auto">
            <Button 
                fullWidth 
                onClick={handleSend} 
                disabled={isSending || (!targetPlate || (!selectedAlert && !customMessage))}
                className="shadow-lg shadow-brand-yellow/20 py-3"
            >
                {isSending ? 'Enviando...' : (
                    <>
                        <Send size={16} />
                        Enviar Alerta
                    </>
                )}
            </Button>
        </div>
      </div>
    </div>
  );
};