
import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { CAR_IMAGE_URL } from '../types';

interface OnboardingProps {
  onStart: () => void;
  onLogin: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onStart, onLogin }) => {
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="h-[45%] relative">
        <img 
          src={CAR_IMAGE_URL} 
          alt="Car background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/20"></div>
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2">
          <div className="bg-yellow-400 p-2.5 rounded-xl shadow-2xl border-4 border-white animate-bounce">
            <AlertTriangle className="text-white w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="flex-grow px-7 flex flex-col items-center text-center -mt-12 relative z-10 bg-white rounded-t-[2.5rem] pt-7">
        <h1 
          className="text-4xl font-black text-gray-900 mb-1 italic tracking-tighter"
          style={{ textShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          Jávou<span className="text-yellow-400">Car</span>
        </h1>
        <p className="text-gray-500 text-sm font-medium leading-tight mb-6 max-w-[240px]">
          O jeito mais rápido e seguro de alertar proprietários de veículos
        </p>
        
        <div className="w-full space-y-2.5 mb-5">
          <button
            onClick={onStart}
            className="w-full py-4 px-6 bg-blue-600 text-white font-black rounded-xl shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 text-sm uppercase tracking-wider"
          >
            <span>Começar Agora</span>
            <ArrowRight size={18} />
          </button>

          <button
            onClick={onLogin}
            className="w-full py-4 px-6 bg-gray-50 text-gray-700 font-bold rounded-xl active:scale-95 transition-all text-sm border border-gray-100"
          >
            Já tenho conta
          </button>
        </div>
        
        <div className="mt-auto pb-[calc(1rem+var(--sab))]">
           <span className="text-[7px] text-gray-300 font-black uppercase tracking-[0.4em]">SECURITY • UTILITY • GPS</span>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
