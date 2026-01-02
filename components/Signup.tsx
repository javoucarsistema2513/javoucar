
import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, User, Mail, Phone, Lock, Loader2 } from 'lucide-react';
import { UserData } from '../types';

interface SignupProps {
  onSubmit: (data: UserData) => Promise<void>;
  onBack: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSubmit, onBack }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Senhas não conferem!");
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });
    } catch (error: any) {
      alert(error.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white p-6">
      <div className="flex items-center mb-0">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      <div className="text-center mb-6">
        <h1 
          className="text-4xl font-black text-gray-900 tracking-tighter italic"
          style={{ textShadow: '0 6px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)' }}
        >
          Jávou<span className="text-yellow-400">Car</span>
        </h1>
        <h2 className="text-base font-bold text-gray-400 mt-0.5 uppercase tracking-widest">Crie sua conta</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-grow overflow-y-auto no-scrollbar pb-6">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              required
              disabled={loading}
              type="text"
              placeholder="João da Silva"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
              value={formData.fullName}
              onChange={e => setFormData({...formData, fullName: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              required
              disabled={loading}
              type="email"
              placeholder="seu@email.com"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Telefone</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              required
              disabled={loading}
              type="tel"
              placeholder="(11) 99999-9999"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                required
                disabled={loading}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 p-2"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Confirmar Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                required
                disabled={loading}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98] uppercase tracking-widest text-sm flex items-center justify-center space-x-2"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : null}
            <span>{loading ? 'Criando Conta...' : 'Cadastrar Agora'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Signup;
