import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { api } from '../../services/api';

interface ForgotPasswordProps {
  onBack: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.recoverPassword(email);
      setIsSent(true);
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar e-mail");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
        <div className="flex flex-col h-full bg-white p-8 items-center justify-center text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 animate-in zoom-in duration-300">
                <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">E-mail Enviado!</h2>
            <p className="text-gray-500 mb-8 max-w-xs">
                Verifique sua caixa de entrada. Enviamos instruções para recuperar sua senha em <span className="font-bold text-gray-800">{email}</span>.
            </p>
            <Button onClick={onBack} fullWidth variant="outline">
                Voltar ao Login
            </Button>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      <div className="h-1/3 w-full relative">
        <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&q=80")',
            }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-brand-dark/90" />
        
        <button 
            onClick={onBack} 
            className="absolute top-6 left-6 text-white hover:text-brand-yellow transition-colors z-10 bg-black/20 p-2 rounded-full backdrop-blur-sm"
        >
            <ArrowLeft size={24} />
        </button>

        <div className="absolute bottom-8 left-6 z-10">
            <h2 className="text-3xl font-bold text-white mb-1">Recuperar Senha</h2>
            <p className="text-gray-200 text-sm font-medium">Informe seu e-mail cadastrado</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-20 px-6 py-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full">
            <p className="text-gray-600 text-sm mb-2 leading-relaxed">
                Não se preocupe! Digite seu e-mail abaixo e enviaremos um link para você redefinir sua senha.
            </p>
            
            <Input
                label="E-mail Cadastrado"
                type="email"
                placeholder="seu@email.com"
                icon={<Mail size={18} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />

            <div className="mt-6">
                <Button type="submit" fullWidth disabled={isLoading || !email}>
                    {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
};