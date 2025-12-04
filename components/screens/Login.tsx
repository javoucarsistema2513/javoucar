import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowLeft, ShieldAlert, UserPlus } from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { api } from '../../services/api';

interface LoginProps {
  onLoginSuccess: (userData: any) => void;
  onBack: () => void;
  onForgotPasswordClick: () => void;
  onRegisterClick: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onBack, onForgotPasswordClick, onRegisterClick }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Carregar dados do usuário do localStorage se existirem
  useEffect(() => {
    try {
      const savedUserData = localStorage.getItem('javoucar_user_data');
      if (savedUserData) {
        const parsedUserData = JSON.parse(savedUserData);
        setFormData({
          email: parsedUserData.email || '',
          password: ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário do localStorage:', error);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Usar a API service que já tem o fallback para mock
      const result = await api.login(formData.email, formData.password);
      
      if (result.success) {
        // Pass user data to the callback
        onLoginSuccess({
          email: formData.email,
          name: result.data?.profile?.name || 'Usuário',
          phone: result.data?.profile?.phone || ''
        });
      } else {
        alert("Falha no login. Por favor, verifique suas credenciais.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao fazer login. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative auth-form-container">
      {/* Header Image Section */}
      <div className="w-full relative auth-header">
        <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&q=80")',
            }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-brand-dark/90" />
        
        <button 
            onClick={onBack} 
            className="absolute top-4 left-4 text-white hover:text-brand-yellow transition-colors z-10 bg-black/20 p-2 rounded-full backdrop-blur-sm"
        >
            <ArrowLeft size={20} />
        </button>

        <div className="absolute bottom-6 left-4 z-10">
            <h2 className="text-2xl font-bold text-white mb-1">Bem-vindo</h2>
            <p className="text-gray-300 text-sm">Faça login para continuar</p>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 bg-white auth-form-content form-content">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full">
            <Input
            label="E-mail"
            name="email"
            type="email"
            placeholder="seu@email.com"
            icon={<Mail size={16} />}
            value={formData.email}
            onChange={handleChange}
            required
            />
            
            <Input
            label="Senha"
            name="password"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={16} />}
            value={formData.password}
            onChange={handleChange}
            required
            />

            <div className="mt-auto pt-4 pb-2">
            <Button type="submit" fullWidth disabled={isLoading} className="auth-button">
                {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
            
            <div className="flex flex-col gap-3 mt-4">
                <button 
                type="button"
                onClick={onForgotPasswordClick}
                className="py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-medium flex items-center justify-center gap-2 transition-colors text-sm auth-button"
                >
                <ShieldAlert size={16} />
                Esqueci minha senha
                </button>
                
                <button 
                type="button"
                onClick={onRegisterClick}
                className="py-3 px-4 bg-brand-dark hover:bg-brand-yellow text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors text-sm auth-button"
                >
                <UserPlus size={16} />
                Criar conta
                </button>
            </div>
            </div>
        </form>
      </div>
    </div>
  );
};