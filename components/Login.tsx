
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
    <div className="flex flex-col h-full bg-white p-5">
      <div className="flex items-center mb-1">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      <div className="text-center mb-6">
        <h1 
          className="text-3xl font-black text-gray-900 tracking-tighter italic"
          style={{ textShadow: '0 4px 8px rgba(0,0,0,0.08)' }}
        >
          Jávou<span className="text-yellow-400">Car</span>
        </h1>
        <p className="text-gray-400 mt-0.5 font-bold uppercase tracking-widest text-[9px]">Acesse sua conta</p>
      </div>

      <form onSubmit={handleLoginSubmit} className="space-y-4 flex-grow">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-[11px] font-bold border border-red-100">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              required
              type="email"
              placeholder="seu@email.com"
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Senha</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              required
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full pl-11 pr-11 py-3 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 p-2"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex justify-end pr-1">
            <button 
              type="button" 
              onClick={onForgotPassword}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest"
            >
              Esqueci a senha
            </button>
          </div>
        </div>

        <div className="pt-2 space-y-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center space-x-2 uppercase tracking-widest text-xs"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            <span>{loading ? 'Entrando...' : 'Entrar Agora'}</span>
          </button>
          
          <button
            type="button"
            onClick={onGoToSignup}
            className="w-full py-2 text-gray-500 font-bold text-[11px]"
          >
            Ainda não é membro? <span className="text-blue-600 border-b border-blue-600">Criar Conta</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
