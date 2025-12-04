import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, ArrowLeft, Car } from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { api } from '../../services/api';
import { supabaseService } from '../../services/supabaseService';

interface RegisterUserProps {
  onNext: (userData: any) => void;
  onBack: () => void;
  onLoginClick: () => void;
}

export const RegisterUser: React.FC<RegisterUserProps> = ({ onNext, onBack, onLoginClick }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  // Carregar dados do usuário do localStorage se existirem
  useEffect(() => {
    try {
      const savedUserData = localStorage.getItem('javoucar_user_data');
      if (savedUserData) {
        const parsedUserData = JSON.parse(savedUserData);
        setFormData({
          name: parsedUserData.name || '',
          email: parsedUserData.email || '',
          phone: parsedUserData.phone || '',
          password: ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário do localStorage:', error);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== confirmPassword) {
      alert("Senhas não conferem");
      return;
    }
    
    setIsLoading(true);
    try {
      // Use Supabase service for user registration
      const result = await supabaseService.signUp(
        formData.email, 
        formData.password, 
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        }
      );
      
      if (result.success) {
        // Passar os dados do usuário para o callback
        onNext({ 
          name: formData.name, 
          email: formData.email, 
          phone: formData.phone,
          id: result.data?.user?.id
        });
      } else {
        alert("Erro ao registrar usuário. Por favor, tente novamente.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao registrar usuário. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Header Image Section */}
      <div className="h-1/3 w-full relative min-h-[180px]">
        <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
                // Imagem solicitada pelo usuário (Porsche)
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
            <h2 className="text-2xl font-bold text-white mb-1">Criar Conta</h2>
            <p className="text-gray-300 text-sm">Registre-se para começar</p>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-20 px-4 py-6 overflow-y-auto shadow-inner">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 h-full">
            <Input
            label="Nome Completo"
            name="name"
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
            
            <div className="grid grid-cols-1 gap-3">
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
            </div>

            <div className="mt-auto pt-4 pb-2">
            <Button type="submit" fullWidth disabled={isLoading} className="py-3">
                {isLoading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
            
            <p className="text-center text-gray-500 text-sm mt-4">
                Já tem uma conta?{' '}
                <button 
                    type="button"
                    onClick={onLoginClick}
                    className="font-bold text-brand-dark hover:text-brand-yellow transition-colors"
                >
                    Faça login
                </button>
            </p>
            </div>
        </form>
      </div>
    </div>
  );
};