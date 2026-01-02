
import React, { useState } from 'react';
import { ArrowLeft, Mail, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabase';

interface ForgotPasswordProps {
  onBack: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col h-full bg-white p-8 items-center justify-center text-center">
        <div className="bg-green-50 p-6 rounded-full mb-6">
          <CheckCircle2 className="w-16 h-16 text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2 italic">E-mail Enviado!</h2>
        <p className="text-gray-500 mb-8 font-medium">
          Verifique sua caixa de entrada e clique no link para redefinir sua senha.
        </p>
        <button
          onClick={onBack}
          className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest"
        >
          Voltar para o Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white p-6">
      <div className="flex items-center mb-4">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic">
          Recuperar <span className="text-blue-600">Acesso</span>
        </h1>
        <p className="text-gray-400 mt-1 font-bold uppercase tracking-widest text-xs">
          Enviaremos um link para seu e-mail
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Seu E-mail Cadastrado</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              required
              type="email"
              placeholder="exemplo@email.com"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center space-x-2 uppercase tracking-widest disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          <span>{loading ? 'Enviando...' : 'Enviar Link'}</span>
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;
