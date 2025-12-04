import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, Siren, Ban, Lightbulb, Unlock, BellRing, CircleDashed, Wind, MessageSquare, Check } from 'lucide-react';
import { Button } from '../Button';
import { PREDEFINED_ALERTS } from '../../constants';
import { AlertOption } from '../../types';
import { api } from '../../services/api';
import { AlertModal } from '../AlertModal';
import { useSocket } from '../../hooks/useSocket';
import { ContinuousBeepPlayer } from '../../utils/audioUtils';

interface AlertSystemProps {
  onLogout: () => void;
}

export const AlertSystem: React.FC<AlertSystemProps> = ({ onLogout }) => {
  const [targetPlate, setTargetPlate] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<AlertOption | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // State for the Received Modal
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [receivedAlertData, setReceivedAlertData] = useState<any>(null);
  
  // State for incoming alerts
  const [incomingAlert, setIncomingAlert] = useState<any>(null);
  
  // State for confirmation message
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  
  // Player de áudio para bips contínuos (mantém uma única instância)
  const beepPlayerRef = useRef<ContinuousBeepPlayer>(new ContinuousBeepPlayer());
  
  // Socket.IO
  const socket = useSocket();

  const iconMap: Record<string, React.ReactNode> = {
    Siren: <Siren size={20} />,
    Ban: <Ban size={20} />,
    Lightbulb: <Lightbulb size={20} />,
    Unlock: <Unlock size={20} />,
    BellRing: <BellRing size={20} />,
    CircleDashed: <CircleDashed size={20} />,
    Wind: <Wind size={20} />
  };

  // Efeito para escutar eventos do socket
  useEffect(() => {
    if (!socket) return;

    // Escutar por alertas recebidos
    socket.on('receive_vehicle_alert', (data) => {
      console.log('Alerta recebido:', data);
      setIncomingAlert(data);
      setShowReceivedModal(true);
      setReceivedAlertData({
        plate: data.vehicleData?.plate || 'Desconhecida',
        model: data.vehicleData?.model || 'Veículo Desconhecido',
        color: data.vehicleData?.color || 'Desconhecida',
        message: data.message,
        iconName: 'BellRing',
        category: 'info'
      });
      
      // Iniciar bips contínuos quando receber um alerta
      // De acordo com os requisitos, deve tocar 3 bips contínuos
      beepPlayerRef.current.startContinuousBeeps();
    });

    // Escutar por confirmação de alerta
    socket.on('alert_confirmation_received', (data) => {
      console.log('Confirmação recebida:', data);
      setConfirmationMessage(data.message);
      
      // Mostrar mensagem de confirmação por alguns segundos
      setTimeout(() => {
        setConfirmationMessage(null);
      }, 5000);
    });

    // Escutar por erros de alerta
    socket.on('alert_error', (data) => {
      console.log('Erro no alerta:', data);
      alert(data.message);
    });

    // Limpar listeners quando o componente desmontar
    return () => {
      socket.off('receive_vehicle_alert');
      socket.off('alert_confirmation_received');
      socket.off('alert_error');
      // Parar qualquer bip que esteja tocando
      beepPlayerRef.current.stopContinuousBeeps();
    };
  }, [socket]);

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
    const alertType = selectedAlert?.id || 'custom';
    
    try {
      // Enviar alerta via Socket.IO
      socket.emit('send_vehicle_alert', {
        targetPlate: targetPlate.toUpperCase(),
        senderId: 'currentUser', // Em uma implementação real, isso viria do usuário autenticado
        message: finalMessage,
        vehicleData: {
          plate: targetPlate.toUpperCase(),
          model: 'Veículo Desconhecido', // Em uma implementação real, buscaríamos do banco de dados
          color: 'Desconhecida'
        },
        timestamp: new Date().toISOString()
      });
      
      // Também manter a chamada à API para compatibilidade
      const response = await api.sendAlert(targetPlate, finalMessage, alertType);
      
      // If we received vehicle data, show the recipient modal
      if (response.vehicleData) {
        setReceivedAlertData(response.vehicleData);
        setShowReceivedModal(true);
      }
      
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

  // Função para lidar com a confirmação do alerta recebido
  const handleAlertConfirmation = () => {
    // Parar os bips contínuos
    beepPlayerRef.current.stopContinuousBeeps();
    
    // Reproduzir dois bips finais de confirmação
    beepPlayerRef.current.playConfirmationBeeps();
    
    // Fechar o modal
    setShowReceivedModal(false);
    setIncomingAlert(null);
    setReceivedAlertData(null);
    
    // Enviar confirmação de volta ao remetente (opcional)
    if (incomingAlert) {
      socket.emit('alert_confirmed', {
        senderId: incomingAlert.senderId,
        targetPlate: incomingAlert.vehicleData?.plate,
        timestamp: new Date().toISOString()
      });
    }
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-brand-yellow px-4 animate-in fade-in duration-300">
        <div className="bg-white p-4 rounded-full mb-6 shadow-xl">
          <Send size={48} className="text-brand-dark" />
        </div>
        <h2 className="text-2xl font-bold text-brand-dark mb-2">Enviado!</h2>
        <p className="text-brand-dark/80 text-center mb-6">O motorista do veículo <span className="font-bold uppercase">{targetPlate}</span> foi notificado.</p>
        <Button variant="secondary" onClick={() => setShowSuccess(false)} className="px-6 py-3">Novo Alerta</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Mensagem de confirmação flutuante */}
      {confirmationMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg animate-in slide-in-from-top duration-300 text-sm max-w-[90%]">
          <div className="flex items-center gap-2">
            <Check size={16} />
            <span className="truncate">{confirmationMessage}</span>
          </div>
        </div>
      )}
      
      {/* Modal de Recebimento */}
      <AlertModal 
        isOpen={showReceivedModal} 
        onClose={handleAlertConfirmation} 
        onConfirm={handleAlertConfirmation}
        data={receivedAlertData}
      />
      
      {/* Header */}
      <header className="bg-brand-dark text-white p-4 pb-8 rounded-b-3xl shadow-lg z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-lg font-bold">Jávou<span className="text-brand-yellow">Car</span></h1>
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
                    className="w-full bg-gray-800 border-none rounded-xl py-3 pl-10 pr-4 text-xl font-mono tracking-widest text-white placeholder-gray-600 focus:ring-2 focus:ring-brand-yellow uppercase"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            </div>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20 -mt-4">
        <div className="mb-5">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Alertas Rápidos</h3>
            <div className="grid grid-cols-2 gap-3">
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
                <div className={`p-2 rounded-full ${
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
        
        <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Personalizado</h3>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-start gap-2">
                    <MessageSquare className="text-gray-400 mt-1" size={18} />
                    <textarea
                        className="w-full resize-none bg-transparent border-none focus:ring-0 p-0 text-gray-700 placeholder-gray-400 text-sm"
                        rows={3}
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

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-md border-t border-gray-200 z-20">
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