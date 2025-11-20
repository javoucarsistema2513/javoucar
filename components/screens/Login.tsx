import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft, LogIn } from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { api } from '../../services/api';
import { initializePushNotifications } from '../../services/pushNotifications';

interface LoginProps {
  onLoginSuccess: () => void;
  onRegisterClick: () => void;
  onForgotPasswordClick: () => void;
  onBack: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onRegisterClick, onForgotPasswordClick, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.login(email, password);
      
      // In a real app, you would get the actual token from the login response
      const fakeToken = 'token_12345'; // This is just for demo purposes
      
      // Initialize push notifications
      await initializePushNotifications(fakeToken);
      
      onLoginSuccess();
    } catch (error) {
      console.error(error);
      alert("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Header Image Section */}
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
            <h2 className="text-3xl font-bold text-white mb-1 drop-shadow-lg">Bem-vindo</h2>
            <p className="text-gray-200 text-sm font-medium drop-shadow-md">Entre para acessar seus alertas</p>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-20 px-6 py-8 overflow-y-auto shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full">
            <div className="space-y-4">
                <Input
                    label="E-mail"
                    type="email"
                    placeholder="seu@email.com"
                    icon={<Mail size={18} />}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <div className="relative">
                    <Input
                        label="Senha"
                        type="password"
                        placeholder="••••••••"
                        icon={<Lock size={18} />}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button 
                        type="button"
                        onClick={onForgotPasswordClick}
                        className="absolute right-0 top-0 text-xs font-semibold text-brand-dark hover:text-brand-yellow transition-colors"
                    >
                        Esqueceu a senha?
                    </button>
                </div>
            </div>

            <div className="mt-8">
                <Button type="submit" fullWidth disabled={isLoading} className="shadow-lg shadow-brand-yellow/20">
                    {isLoading ? 'Entrando...' : (
                        <>
                            <LogIn size={20} />
                            Entrar
                        </>
                    )}
                </Button>
            </div>

            <div className="mt-auto pt-6 pb-4 text-center">
                <p className="text-gray-500 text-sm">
                    Não tem uma conta?{' '}
                    <button 
                        type="button"
                        onClick={onRegisterClick}
                        className="font-bold text-brand-dark hover:text-brand-yellow transition-colors"
                    >
                        Cadastre-se
                    </button>
                </p>
            </div>
        </form>
      </div>
    </div>
  );
};