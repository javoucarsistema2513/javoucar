import React from 'react';
import { Siren, Ban, Lightbulb, Unlock, BellRing, CircleDashed, Wind, X, Check } from 'lucide-react';
import { Button } from './Button';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  data: {
    plate: string;
    model: string;
    color: string;
    message: string;
    iconName: string;
    category: 'urgent' | 'warning' | 'info';
  } | null;
}

export const AlertModal: React.FC<AlertModalProps> = ({ isOpen, onClose, onConfirm, data }) => {
  if (!isOpen || !data) return null;

  const iconMap: Record<string, React.ReactNode> = {
    Siren: <Siren size={48} />,
    Ban: <Ban size={48} />,
    Lightbulb: <Lightbulb size={48} />,
    Unlock: <Unlock size={48} />,
    BellRing: <BellRing size={48} />,
    CircleDashed: <CircleDashed size={48} />,
    Wind: <Wind size={48} />
  };

  const getAnimationClass = (category: string, iconName: string) => {
    if (category === 'urgent') return 'animate-shake text-red-500';
    if (iconName === 'Lightbulb') return 'animate-pulse-fast text-yellow-500';
    return 'animate-bounce-slow text-blue-500';
  };

  const getBgColor = (category: string) => {
    if (category === 'urgent') return 'bg-red-50 border-red-100';
    if (category === 'warning') return 'bg-amber-50 border-amber-100';
    return 'bg-blue-50 border-blue-100';
  };

  // Função para lidar com a confirmação
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300 alert-modal-content">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 z-10"
        >
          <X size={16} />
        </button>

        <div className={`flex flex-col items-center pt-8 pb-6 px-4 text-center ${getBgColor(data.category)}`}>
          <div className={`mb-4 ${getAnimationClass(data.category, data.iconName)}`}>
            {iconMap[data.iconName] || <BellRing size={48} />}
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-1 uppercase tracking-tight px-2">
            {data.message}
          </h2>
          <p className="text-gray-500 font-medium text-sm">Alerta Recebido</p>
        </div>

        <div className="p-4 bg-white space-y-3">
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2 text-center">Veículo Identificado</p>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2">
                    <span className="text-gray-500 text-xs">Placa</span>
                    <span className="text-lg font-mono font-bold text-gray-900 tracking-widest uppercase bg-gray-200 px-1.5 py-0.5 rounded">{data.plate}</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-500 text-xs">Modelo</span>
                    <span className="font-semibold text-gray-800 text-sm">{data.model}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">Cor</span>
                    <span className="font-semibold text-gray-800 text-sm">{data.color}</span>
                </div>
            </div>

            <Button onClick={handleConfirm} fullWidth className="shadow-lg shadow-brand-yellow/20 gap-2 py-2.5 btn-primary">
                <Check size={16} />
                Confirmar Recebimento
            </Button>
        </div>
      </div>
    </div>
  );
};