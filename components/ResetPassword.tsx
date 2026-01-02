
import React, { useState } from 'react';
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';

interface ResetPasswordProps {
  onComplete: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col h-full bg-white p-8 items-center justify-center text-center">
        <div className="bg-green-50 p-6 rounded-full mb-6">
          <CheckCircle2 className="w-16 h-16 text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2 italic">Senha Alterada!</h2>
        <p className="text-gray-500 mb-8 font-medium">
          Sua senha foi redefinida com sucesso. Você já pode acessar sua conta.
        </p>
        <button
          onClick={onComplete}
          className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest"
        >
          Fazer Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white p-6 justify-center">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic">
          Nova <span className="text-yellow-400">Senha</span>
        </h1>
        <p className="text-gray-400 mt-1 font-bold uppercase tracking-widest text-xs">
          Crie uma senha segura e fácil de lembrar
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nova Senha</label>
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
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Confirmar Nova Senha</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              required
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center space-x-2 uppercase tracking-widest"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          <span>{loading ? 'Redefinindo...' : 'Atualizar Senha'}</span>
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
