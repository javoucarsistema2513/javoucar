import React, { useState } from 'react';
import { User, Mail, Phone, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { api } from '../../services/api';
import { UserData } from '../../types';

interface RegisterUserProps {
  onNext: (userData: UserData) => void; // Atualizado para receber os dados do usuário
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== confirmPassword) {
      alert("Senhas não conferem");
      return;
    }
    
    setIsLoading(true);
    try {
      await api.registerUser(formData);
      // Passar os dados do usuário (sem a senha) para o próximo passo
      const { password, ...userData } = formData;
      onNext(userData);
    } catch (error) {
      console.error(error);
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
      <div className="h-1/3 w-full relative">
        <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
                // Imagem solicitada pelo usuário (Porsche)
                backgroundImage: 'url("https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&q=80")',
            }}
        />
        {/* Gradiente ajustado para não esconder a imagem, mas garantir leitura do texto */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-brand-dark/90" />
        
        <button 
            onClick={onBack} 
            className="absolute top-6 left-6 text-white hover:text-brand-yellow transition-colors z-10 bg-black/20 p-2 rounded-full backdrop-blur-sm"
        >
            <ArrowLeft size={24} />
        </button>

        <div className="absolute bottom-8 left-6 z-10">
            <h2 className="text-3xl font-bold text-white mb-1 drop-shadow-lg">Crie sua conta</h2>
            <p className="text-gray-200 text-sm font-medium drop-shadow-md">Junte-se à comunidade JávouCar</p>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-20 px-6 py-8 overflow-y-auto shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 h-full">
            <Input
            label="Nome Completo"
            name="name"
            placeholder="Ex: João Silva"
            icon={<User size={18} />}
            value={formData.name}
            onChange={handleChange}
            required
            />
            <Input
            label="E-mail"
            name="email"
            type="email"
            placeholder="seu@email.com"
            icon={<Mail size={18} />}
            value={formData.email}
            onChange={handleChange}
            required
            />
            <Input
            label="Telefone"
            name="phone"
            type="tel"
            placeholder="(00) 00000-0000"
            icon={<Phone size={18} />}
            value={formData.phone}
            onChange={handleChange}
            required
            />
            <Input
            label="Senha"
            name="password"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={18} />}
            value={formData.password}
            onChange={handleChange}
            required
            />
            <Input
            label="Confirmar Senha"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={18} />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            />

            <div className="mt-6 pt-2">
              <Button type="submit" fullWidth disabled={isLoading}>
                  {isLoading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </div>

            <div className="mt-auto py-4 text-center">
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