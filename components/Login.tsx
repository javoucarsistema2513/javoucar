
import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, LogIn, Loader2 } from 'lucide-react';
import { UserData } from '../types';

interface LoginProps {
  onLogin: (data: UserData) => void;
  onBack: () => void;
  onGoToSignup: () => void;
  onForgotPassword: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onBack, onGoToSignup, onForgotPassword }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin({ email, password, fullName: '', phone: '' });
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white p-6">
      <div className="flex items-center mb-2">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 
          className="text-5xl font-black text-gray-900 tracking-tighter italic"
          style={{ textShadow: '0 8px 16px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)' }}
        >
          Jávou<span className="text-yellow-400">Car</span>
        </h1>
        <p className="text-gray-400 mt-1 font-bold uppercase tracking-widest text-xs">Acesse sua garagem</p>
      </div>

      <form onSubmit={handleLoginSubmit} className="space-y-6 flex-grow">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100 animate-pulse">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Seu E-mail</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              required
              type="email"
              placeholder="seu@email.com"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Sua Senha</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              required
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full pl-12 pr-12 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 p-2"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex justify-end pr-1">
            <button 
              type="button" 
              onClick={onForgotPassword}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center space-x-2 uppercase tracking-widest"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            <span>{loading ? 'Entrando...' : 'Entrar Agora'}</span>
          </button>
          
          <button
            type="button"
            onClick={onGoToSignup}
            className="w-full py-4 text-gray-500 font-bold text-sm"
          >
            Ainda não é membro? <span className="text-blue-600 border-b-2 border-blue-600">Criar Conta</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
