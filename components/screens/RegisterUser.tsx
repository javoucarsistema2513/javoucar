import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { api } from '../../services/api';
import { UserData } from '../../types';
import { supabase } from '../../services/supabase';

interface RegisterUserProps {
  onNext: () => void;
  onBack: () => void;
  onLoginClick: () => void;
}

export const RegisterUser: React.FC<RegisterUserProps> = ({ onNext, onBack, onLoginClick }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UserData>({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userExists, setUserExists] = useState(false);
  const [existingUserEmail, setExistingUserEmail] = useState('');

  // Verificar se o usuário já está logado
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        
        if (user) {
          setUserExists(true);
          setExistingUserEmail(user.email || '');
        }
      } catch (error) {
        console.error('Erro ao verificar sessão do usuário:', error);
      }
    };
    
    checkUserSession();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }

    setIsLoading(true);
    try {
      await api.registerUser(formData);
      onNext();
    } catch (error: any) {
      console.error(error);
      alert('Erro ao criar conta: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Se o usuário já está logado, mostra uma mensagem diferente
  if (userExists) {
    return (
      <div className="flex flex-col h-full bg-gray-50 relative">
        {/* Header */}
        <div className="h-1/3 w-full relative bg-gradient-to-br from-brand-dark to-gray-800 min-h-[150px]">
          <button 
              onClick={onBack} 
              className="absolute top-5 left-5 text-white hover:text-brand-yellow transition-colors z-10 bg-black/20 p-2 rounded-full backdrop-blur-sm"
          >
              <ArrowLeft size={20} />
          </button>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4 text-center">
              <div className="w-16 h-16 bg-brand-yellow/20 rounded-full flex items-center justify-center mb-3">
                  <User size={32} className="text-brand-yellow" />
              </div>
              <h2 className="text-2xl font-bold mb-1">Conta Existente</h2>
              <p className="text-gray-300 text-sm max-w-xs">Você já tem uma conta cadastrada</p>
          </div>
        </div>

        {/* Form Section */}
        <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-20 px-4 py-6 overflow-y-auto shadow-2xl">
          <div className="flex flex-col items-center justify-center h-full">
            <div className="bg-green-50 p-4 rounded-full mb-4">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Conta já registrada</h3>
            <p className="text-gray-600 text-center mb-6">
              Email: <span className="font-mono font-bold">{existingUserEmail}</span>
            </p>
            
            <div className="w-full">
              <Button 
                fullWidth 
                onClick={onNext} 
                className="h-12 text-base font-bold mb-3"
              >
                Continuar para Veículo
              </Button>
              
              <Button 
                variant="secondary" 
                fullWidth 
                onClick={onLoginClick} 
                className="h-12 text-base font-bold"
              >
                Fazer Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Header */}
      <div className="h-1/3 w-full relative bg-gradient-to-br from-brand-dark to-gray-800 min-h-[150px]">
        <button 
            onClick={onBack} 
            className="absolute top-5 left-5 text-white hover:text-brand-yellow transition-colors z-10 bg-black/20 p-2 rounded-full backdrop-blur-sm"
        >
            <ArrowLeft size={20} />
        </button>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4 text-center">
            <div className="w-16 h-16 bg-brand-yellow/20 rounded-full flex items-center justify-center mb-3">
                <User size={32} className="text-brand-yellow" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Criar Conta</h2>
            <p className="text-gray-300 text-sm max-w-xs">Preencha seus dados para começar</p>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-20 px-4 py-6 overflow-y-auto shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 h-full">
            <Input
            label="Nome Completo"
            name="name"
            type="text"
            placeholder="Seu nome"
            icon={<User size={16} />}
            value={formData.name}
            onChange={handleChange}
            required
            />
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
            label="Telefone"
            name="phone"
            type="tel"
            placeholder="(00) 00000-0000"
            icon={<Phone size={16} />}
            value={formData.phone}
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
            <Input
            label="Confirmar Senha"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={16} />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            />

            <div className="mt-5 pt-2">
              <Button type="submit" fullWidth disabled={isLoading} className="h-12 text-base font-bold">
                  {isLoading ? 'Criando conta...' : 'Próximo: Veículo'}
              </Button>
            </div>

            <div className="py-5 text-center mt-auto">
                <p className="text-gray-500 text-sm">
                    Já tem uma conta?{' '}
                    <button 
                        type="button"
                        onClick={onLoginClick}
                        className="font-bold text-brand-dark hover:text-brand-yellow transition-colors"
                    >
                        Faça Login
                    </button>
                </p>
            </div>
        </form>
      </div>
    </div>
  );
};