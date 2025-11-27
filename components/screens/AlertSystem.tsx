import React, { useState, useEffect } from 'react';
import { Search, Send, Siren, Ban, Lightbulb, Unlock, BellRing, CircleDashed, Wind, MessageSquare } from 'lucide-react';
import { Button } from '../Button';
import { PREDEFINED_ALERTS } from '../../constants';
import { AlertOption } from '../../types';
import { api } from '../../services/api';
import { supabase } from '../../services/supabase';
import { socketService } from '../../services/socket';
import { AlertModal } from '../AlertModal';

interface AlertSystemProps {
  onLogout: () => void;
}

export const AlertSystem: React.FC<AlertSystemProps> = ({ onLogout }) => {
  const [targetPlate, setTargetPlate] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<AlertOption | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Estado para o Modal de Recebimento
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [receivedAlertData, setReceivedAlertData] = useState<any>(null);

  // Estado de Conexão (Rede Móvel/WiFi)
  const [isConnected, setIsConnected] = useState(navigator.onLine);
  const [isChannelReady, setIsChannelReady] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [userPlate, setUserPlate] = useState<string | null>(null);

  // Configuração do Supabase Realtime (Broadcast) e Socket.IO
  useEffect(() => {
    console.log('Iniciando configuração do AlertSystem');
    // Listeners de Rede do Navegador (3G/4G detection)
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar se o usuário já tem um veículo registrado
    const checkUserVehicle = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (user) {
          // Verificar se o usuário já tem um veículo registrado
          const { data: vehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .select('plate')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (vehicleError) {
            console.error('Erro ao buscar veículo:', vehicleError);
          } else if (vehicle) {
            setUserPlate(vehicle.plate);
            // Registrar automaticamente o usuário no Socket.IO com o veículo existente
            socketService.registerUser(user.id, vehicle.plate);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar veículo do usuário:', error);
      }
    };
    
    checkUserVehicle();

    // Conectar ao servidor Socket.IO
    socketService.connect();
    
    // Ouvir eventos de conexão Socket.IO
    const handleSocketConnect = () => {
      setIsSocketConnected(true);
      console.log('Socket.IO conectado');
    };
    
    const handleSocketDisconnect = () => {
      setIsSocketConnected(false);
      console.log('Socket.IO desconectado');
    };
    
    // Ouvir alertas recebidos via Socket.IO
    const handleReceiveAlert = (data: any) => {
      console.log('🔔 Alerta recebido via Socket.IO:', data);
      setReceivedAlertData(data);
      setShowReceivedModal(true);
    };
    
    // Ouvir confirmação de envio
    const handleAlertSent = (data: any) => {
      console.log('✅ Alerta enviado:', data);
      if (data.success) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setTargetPlate('');
          setSelectedAlert(null);
          setCustomMessage('');
        }, 3000);
      }
    };

    // Registrar listeners do Socket.IO
    socketService.onRegistrationSuccess(handleSocketConnect);
    socketService.onReceiveAlert(handleReceiveAlert);
    socketService.onAlertSent(handleAlertSent);

    // Verificar status da conexão periodicamente
    const connectionCheckInterval = setInterval(() => {
      setIsSocketConnected(socketService.isConnected());
    }, 5000);

    // Ping para manter conexão ativa (útil para redes móveis)
    const pingInterval = setInterval(() => {
      if (socketService.isConnected()) {
        socketService.ping();
      }
    }, 30000);

    // Cleanup
    return () => {
      console.log('Limpando AlertSystem');
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectionCheckInterval);
      clearInterval(pingInterval);
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
    console.log('Enviando alerta para placa:', targetPlate);
    if (!targetPlate) {
      alert("Por favor, digite a placa do veículo.");
      return;
    }
    if (!selectedAlert && !customMessage) {
      alert("Selecione um alerta ou escreva uma mensagem.");
      return;
    }
    if (!isConnected) {
      alert("Sem conexão com a internet. Verifique seu sinal.");
      return;
    }

    setIsSending(true);
    const finalMessage = customMessage || selectedAlert?.label || '';
    const icon = selectedAlert?.iconName || 'BellRing';
    const category = selectedAlert?.category || 'info';
    
    try {
      // 1. Busca detalhes do veículo (Simulado)
      const vehicleDetails = await api.getVehicleDetails(targetPlate);
      console.log('Detalhes do veículo:', vehicleDetails);

      // 2. Envia para a API (Mock/Banco)
      await api.sendAlert(targetPlate, finalMessage);
      console.log('Alerta enviado para API');

      // 3. Envia alerta via Socket.IO
      const payloadData = {
        plate: vehicleDetails.plate,
        model: vehicleDetails.model,
        color: vehicleDetails.color,
        message: finalMessage,
        iconName: icon,
        category: category,
        timestamp: new Date().toISOString()
      };

      console.log('📤 Enviando alerta via Socket.IO:', payloadData);
      
      // Envia alerta direcionado para a placa específica
      socketService.sendTargetedAlert({
        targetPlate: vehicleDetails.plate,
        ...payloadData
      });

      // Se não quiser esperar a confirmação do Socket.IO, podemos mostrar sucesso imediatamente
      // setShowSuccess(true);
      // setTimeout(() => {
      //   setShowSuccess(false);
      //   setTargetPlate('');
      //   setSelectedAlert(null);
      //   setCustomMessage('');
      // }, 3000);

    } catch (e) {
      console.error(e);
      alert("Erro ao enviar alerta. Verifique sua conexão.");
    } finally {
      setIsSending(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-brand-yellow px-4 animate-in fade-in duration-300">
        <div className="bg-white p-5 rounded-full mb-5 shadow-xl animate-bounce-slow">
          <Send size={40} className="text-brand-dark" />
        </div>
        <h2 className="text-3xl font-black text-brand-dark mb-2">Enviado!</h2>
        <p className="text-brand-dark/80 text-center mb-6 text-base font-medium">
            O motorista do veículo <br/>
            <span className="font-mono font-bold text-xl uppercase bg-white/50 px-2 rounded mt-1 inline-block border border-black/10">{targetPlate}</span>
            <br/>foi notificado com sucesso.
        </p>
        <Button variant="secondary" onClick={() => setShowSuccess(false)} className="shadow-xl">
            Enviar Novo Alerta
        </Button>
      </div>
    );
  }

  // Define status visual da conexão
  const isOnline = isConnected && (isChannelReady || isSocketConnected);
  console.log('Status da conexão:', { isConnected, isChannelReady, isSocketConnected, isOnline });

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Modal de Recebimento */}
      <AlertModal 
        isOpen={showReceivedModal} 
        onClose={() => setShowReceivedModal(false)} 
        data={receivedAlertData}
      />

      {/* Header */}
      <header className="bg-brand-dark text-white p-5 pb-8 rounded-b-3xl shadow-lg z-10 transition-all duration-300">
        <div className="flex justify-between items-center mb-5">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tighter">Jávou<span className="text-brand-yellow">Car</span></h1>
          </div>
          <button onClick={onLogout} className="text-xs font-medium bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition-colors">Sair</button>
        </div>
        
        <div className="relative">
            <label className="text-xs text-gray-400 ml-1 mb-2 block uppercase tracking-wider font-bold">Destinatário</label>
            <div className="relative group">
                <input
                    type="text"
                    value={targetPlate}
                    onChange={(e) => setTargetPlate(e.target.value.toUpperCase())}
                    placeholder="DIGITE A PLACA"
                    maxLength={8}
                    className="w-full bg-gray-800 border-2 border-transparent focus:border-brand-yellow rounded-2xl py-3.5 pl-12 pr-4 text-2xl font-mono tracking-widest text-white placeholder-gray-600 focus:outline-none uppercase shadow-inner transition-all"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-brand-yellow rounded-lg text-brand-dark font-bold shadow-lg shadow-brand-yellow/20">
                    <Search size={16} />
                </div>
            </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-24">
        <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Alertas Rápidos</h3>
            <div className="grid grid-cols-2 gap-2.5">
            {PREDEFINED_ALERTS.map((alert) => (
                <button
                key={alert.id}
                onClick={() => {
                    setSelectedAlert(alert);
                    setCustomMessage('');
                }}
                className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2.5 relative overflow-hidden group ${
                    selectedAlert?.id === alert.id
                    ? 'border-brand-yellow bg-yellow-50 text-brand-dark shadow-md ring-2 ring-brand-yellow/20 ring-offset-1'
                    : 'border-white bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50 shadow-sm'
                }`}
                >
                <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${
                    alert.category === 'urgent' ? 'bg-red-100 text-red-600' : 
                    alert.category === 'warning' ? 'bg-amber-100 text-amber-600' : 
                    'bg-blue-100 text-blue-600'
                }`}>
                    {iconMap[alert.iconName]}
                </div>
                <span className="text-xs font-bold leading-tight">{alert.label}</span>
                </button>
            ))}
            </div>
        </div>

        <div className="mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Mensagem Personalizada</h3>
            <div className={`bg-white p-3 rounded-2xl shadow-sm border-2 transition-all ${customMessage ? 'border-brand-yellow ring-2 ring-brand-yellow/10' : 'border-transparent'}`}>
                <div className="flex items-start gap-2.5">
                    <div className="mt-1 text-brand-yellow">
                        <MessageSquare size={18} />
                    </div>
                    <textarea
                        className="w-full resize-none bg-transparent border-none focus:ring-0 p-0 text-gray-800 placeholder-gray-400 text-sm font-medium min-h-[70px]"
                        placeholder="Escreva sua mensagem aqui..."
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

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-gray-100 z-20">
        <div className="max-w-md mx-auto">
            <Button 
                fullWidth 
                onClick={handleSend} 
                disabled={isSending || (!targetPlate || (!selectedAlert && !customMessage))}
                className="shadow-xl shadow-brand-yellow/20 h-12 text-base font-bold"
            >
                {isSending ? 'Enviando...' : (
                    <>
                        <Send size={18} className="mr-1.5" />
                        Enviar Alerta
                    </>
                )}
            </Button>
        </div>
      </div>
    </div>
  );
};