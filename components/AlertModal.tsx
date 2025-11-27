import React, { useEffect, useRef } from 'react';
import { Siren, Ban, Lightbulb, Unlock, BellRing, CircleDashed, Wind, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    plate: string;
    model: string;
    color: string;
    message: string;
    iconName: string;
    category: 'urgent' | 'warning' | 'info';
  } | null;
}

export const AlertModal: React.FC<AlertModalProps> = ({ isOpen, onClose, data }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<any>(null);

  // Inicializa o contexto de áudio
  useEffect(() => {
    console.log('AlertModal montado. isOpen:', isOpen, 'data:', data);
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    return () => {
      stopAlarm();
      if (audioCtxRef.current?.state !== 'closed') {
        audioCtxRef.current?.close();
      }
    };
  }, []);

  // Controla o Loop de Alarme
  useEffect(() => {
    console.log('AlertModal estado mudou. isOpen:', isOpen);
    if (isOpen) {
      startAlarm();
    } else {
      stopAlarm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number, vol = 0.1) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Envelope de volume para evitar 'cliques'
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  const startAlarm = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;

    // Garante que o contexto esteja rodando (política de autoplay)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(e => console.log("Áudio bloqueado pelo navegador", e));
    }

    const playTripleBeep = () => {
      // Re-verifica estado a cada loop para garantir que toque
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      // 3 Bips de alta frequência (Urgência)
      // Bip 1
      playTone(880, 'square', 0.1, now);
      // Bip 2
      playTone(880, 'square', 0.1, now + 0.15);
      // Bip 3
      playTone(880, 'square', 0.1, now + 0.30);
    };

    // Toca o primeiro imediatamente
    playTripleBeep();

    // Define o Loop Contínuo (A cada 1.2 segundos - sensação de urgência)
    // Isso garante que toque ATÉ o usuário confirmar
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(playTripleBeep, 1200);
  };

  const stopAlarm = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleConfirm = () => {
    console.log('AlertModal confirmado');
    // 1. Para o alarme imediatamente
    stopAlarm();
    
    // 2. Toca os 2 bips de confirmação (Sucesso)
    if (audioCtxRef.current) {
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;
        // Tom mais agradável (Sine wave) e um pouco mais grave
        playTone(600, 'sine', 0.15, now, 0.2);
        playTone(800, 'sine', 0.15, now + 0.2, 0.2);
    }

    // 3. Fecha o modal
    onClose();
  };

  if (!isOpen || !data) {
    console.log('AlertModal não está aberto ou não tem dados. isOpen:', isOpen, 'data:', data);
    return null;
  }

  const iconMap: Record<string, React.ReactNode> = {
    Siren: <Siren size={48} />,
    Ban: <Ban size={48} />,
    Lightbulb: <Lightbulb size={48} />,
    Unlock: <Unlock size={48} />,
    BellRing: <BellRing size={48} />,
    CircleDashed: <CircleDashed size={48} />,
    Wind: <Wind size={48} />
  };

  const getAnimationClass = (category: string) => {
    if (category === 'urgent') return 'animate-shake text-red-600';
    if (category === 'warning') return 'animate-pulse-fast text-amber-500';
    return 'animate-bounce-slow text-blue-500';
  };

  const getThemeColor = (category: string) => {
    if (category === 'urgent') return 'border-red-500 bg-red-50';
    if (category === 'warning') return 'border-amber-400 bg-amber-50';
    return 'border-brand-yellow bg-yellow-50';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        {/* Header Visual com Ícone */}
        <div className={`pt-10 pb-6 px-6 flex flex-col items-center text-center border-b-4 ${getThemeColor(data.category)}`}>
          <div className={`p-4 bg-white rounded-full shadow-lg mb-4 ${getAnimationClass(data.category)}`}>
            {iconMap[data.iconName] || <BellRing size={48} />}
          </div>
          
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Novo Alerta</span>
          
          {/* MENSAGEM EM DESTAQUE */}
          <h2 className="text-3xl font-black text-gray-900 leading-tight drop-shadow-sm">
            {data.message}
          </h2>
        </div>

        {/* Conteúdo com detalhes do carro */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-gray-50">
            
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5 text-brand-dark">
                    <CheckCircle2 size={100} />
                </div>
                
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                    Veículo Solicitado
                </p>

                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                    <div className="col-span-2 text-center bg-gray-100 rounded-lg p-3 border border-gray-200">
                        <span className="text-xs text-gray-500 block mb-1 uppercase tracking-wider">Placa</span>
                        <span className="text-4xl font-mono font-black text-gray-900 tracking-widest uppercase">
                            {data.plate}
                        </span>
                    </div>
                    
                    <div className="pl-1">
                        <span className="text-xs text-gray-500 block mb-1">Modelo</span>
                        <span className="text-lg font-bold text-gray-800 block truncate leading-tight">{data.model}</span>
                    </div>

                    <div className="pl-1 border-l border-gray-200">
                        <span className="text-xs text-gray-500 block mb-1">Cor</span>
                        <span className="text-lg font-bold text-gray-800 block truncate leading-tight">{data.color}</span>
                    </div>
                </div>
            </div>

            <div className="text-center px-4">
                <p className="text-sm text-gray-500 animate-pulse">
                    O alarme continuará tocando até a confirmação.
                </p>
            </div>
        </div>

        {/* Rodapé com Ação Obrigatória */}
        <div className="p-4 bg-white border-t border-gray-100 pb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <Button 
                onClick={handleConfirm} 
                fullWidth 
                className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30 py-4 text-lg transform active:scale-95 transition-all"
            >
                <CheckCircle2 className="mr-2" />
                Confirmar Leitura
            </Button>
        </div>
      </div>
    </div>
  );
};