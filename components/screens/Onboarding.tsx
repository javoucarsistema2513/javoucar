import React from 'react';
import { Car, ShieldAlert } from 'lucide-react';
import { Button } from '../Button';

interface OnboardingProps {
  onNext: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onNext }) => {
  return (
    <div className="flex flex-col h-full items-center justify-between p-8 relative overflow-hidden bg-black">
      {/* Background Image - Dark/Black Car Aesthetic */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          // Imagem mais escura e nítida (Black Aesthetic)
          backgroundImage: 'url("https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=1920&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Gradient Overlay - Adjusted for less "faded" look, more dramatic */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 z-0" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full text-center mt-20">
        <div className="relative mb-12 group">
          <div className="absolute -inset-4 bg-brand-yellow/20 rounded-full blur-2xl group-hover:bg-brand-yellow/30 transition-all duration-500"></div>
          <div className="relative bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl shadow-2xl ring-1 ring-white/20">
            <Car size={56} className="text-brand-yellow mb-2 drop-shadow-lg" />
            <ShieldAlert size={28} className="text-white absolute top-3 right-3" />
          </div>
        </div>
        
        <h1 
          className="text-6xl font-extrabold text-white mb-6 tracking-tighter"
          style={{ textShadow: '0 5px 15px rgba(0,0,0,0.9)' }}
        >
          Jávou<span className="text-brand-yellow">Car</span>
        </h1>
        
        {/* Texto com contraste forçado via style manual para garantir visibilidade */}
        <p 
          className="text-white text-xl max-w-xs mx-auto leading-relaxed font-bold"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.8)' }}
        >
          Comunicação rápida e inteligente entre motoristas.
        </p>
      </div>

      <div className="w-full mb-10 z-10 space-y-4">
        <Button onClick={onNext} fullWidth className="shadow-xl shadow-brand-yellow/20 border-none py-4 text-lg">
          Começar Agora
        </Button>
        <p className="text-center text-gray-400 text-sm font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>v1.0.0</p>
      </div>
    </div>
  );
};