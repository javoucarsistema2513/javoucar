import React from 'react';
import { Siren, Ban, Lightbulb, Unlock, BellRing, CircleDashed, Wind, X } from 'lucide-react';
import { Button } from './Button';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    id?: string;
    message: string;
    sender?: {
      name: string;
      phone: string;
    };
    timestamp?: Date;
    plate?: string;
    model?: string;
    color?: string;
    iconName?: string;
    category?: 'urgent' | 'warning' | 'info';
  } | null;
}

// Variável para controlar a vibração contínua
let continuousVibrationInterval: NodeJS.Timeout | null = null;

// Função para parar a vibração contínua
const stopContinuousVibration = () => {
  if (continuousVibrationInterval) {
    clearInterval(continuousVibrationInterval);
    continuousVibrationInterval = null;
    if ('vibrate' in navigator) {
      navigator.vibrate(0); // Para qualquer vibração em andamento
    }
  }
};

// Function to play continuous beep sound and vibration
const playContinuousBeep = () => {
  // Inicia vibração contínua
  if ('vibrate' in navigator) {
    // Vibra por 200ms, para por 100ms, repetidamente
    continuousVibrationInterval = setInterval(() => {
      navigator.vibrate([200]);
    }, 300);
    
    // Para garantir que a vibração inicial comece imediatamente
    navigator.vibrate([200]);
  }
  
  // Toca beeps contínuos mais rápidos
  try {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const beep = () => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.3);
    };
    
    // Toca 3 beeps rápidos imediatamente
    beep();
    setTimeout(beep, 300);
    setTimeout(beep, 600);
    
    // Depois continua tocando a cada 1 segundo
    const interval = setInterval(beep, 1000);
    
    // Retorna a função para parar os beeps
    return () => {
      clearInterval(interval);
    };
  } catch (e) {
    console.log('Audio beep not supported');
    return () => {};
  }
};

// Function to play confirmation beeps (2 quick beeps)
const playConfirmationBeep = () => {
  stopContinuousVibration();
  
  if ('vibrate' in navigator) {
    // Vibração de confirmação: 2 pulsos curtos
    navigator.vibrate([200, 100, 200]);
  }
  
  // Tenta tocar beeps de confirmação
  try {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    let count = 0;
    
    const beep = () => {
      if (count >= 2) return;
      
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.value = 1000; // Tom mais alto para confirmação
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.2);
      
      count++;
      
      if (count < 2) {
        setTimeout(beep, 300);
      }
    };
    
    beep();
  } catch (e) {
    console.log('Audio beep not supported');
  }
};

export const AlertModal: React.FC<AlertModalProps> = ({ isOpen, onClose, data }) => {
  // Efeito para iniciar beeps contínuos quando o modal abre
  React.useEffect(() => {
    let stopBeeps = () => {};
    
    if (isOpen && data) {
      // Inicia beeps contínuos
      stopBeeps = playContinuousBeep();
    }
    
    // Cleanup quando o modal fecha
    return () => {
      stopBeeps();
      stopContinuousVibration();
    };
  }, [isOpen, data]);

  if (!isOpen || !data) return null;

  const iconMap: Record<string, React.ReactNode> = {
    Siren: <Siren size={64} />,
    Ban: <Ban size={64} />,
    Lightbulb: <Lightbulb size={64} />,
    Unlock: <Unlock size={64} />,
    BellRing: <BellRing size={64} />,
    CircleDashed: <CircleDashed size={64} />,
    Wind: <Wind size={64} />
  };

  const getAnimationClass = (category: string = 'info', iconName: string = 'BellRing') => {
    if (category === 'urgent') return 'animate-shake text-red-500';
    if (iconName === 'Lightbulb') return 'animate-pulse-fast text-yellow-500';
    return 'animate-bounce-slow text-blue-500';
  };

  const getBgColor = (category: string = 'info') => {
    if (category === 'urgent') return 'bg-red-50 border-red-100';
    if (category === 'warning') return 'bg-amber-50 border-amber-100';
    return 'bg-blue-50 border-blue-100';
  };

  // Custom close function that plays confirmation beeps
  const handleClose = () => {
    // Para os beeps contínuos e vibração
    stopContinuousVibration();
    
    // Toca beeps de confirmação
    playConfirmationBeep();
    
    // Fecha o modal após um pequeno delay para os beeps tocarem
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  // Determine which data structure we're using
  const isVehicleAlert = data.plate && data.model && data.color;
  const isMessageAlert = data.message && data.sender;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 z-10"
        >
          <X size={20} />
        </button>

        <div className={`flex flex-col items-center pt-12 pb-8 px-6 text-center ${getBgColor(data.category)}`}>
          <div className={`mb-6 ${getAnimationClass(data.category, data.iconName)}`}>
            {iconMap[data.iconName || 'BellRing'] || <BellRing size={64} />}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {data.message}
          </h2>
          <p className="text-gray-500 font-medium">
            {isVehicleAlert ? 'Alerta Recebido' : 'Nova Mensagem'}
          </p>
        </div>

        <div className="p-6 bg-white space-y-4">
          {isVehicleAlert ? (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3 text-center">Veículo Identificado</p>
              <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-3">
                <span className="text-gray-500 text-sm">Placa</span>
                <span className="text-2xl font-mono font-bold text-gray-900 tracking-widest uppercase bg-gray-200 px-2 rounded">{data.plate}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-500 text-sm">Modelo</span>
                <span className="font-semibold text-gray-800">{data.model}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Cor</span>
                <span className="font-semibold text-gray-800">{data.color}</span>
              </div>
            </div>
          ) : isMessageAlert ? (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3 text-center">Mensagem Recebida</p>
              <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-3">
                <span className="text-gray-500 text-sm">De</span>
                <span className="font-semibold text-gray-800">{data.sender?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Telefone</span>
                <span className="font-semibold text-gray-800">{data.sender?.phone}</span>
              </div>
            </div>
          ) : null}

          <Button onClick={handleClose} fullWidth className="shadow-lg shadow-brand-yellow/20">
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
};