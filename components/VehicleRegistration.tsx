
import React, { useState } from 'react';
import { ArrowLeft, AlertTriangle, Hash, Palette, MapPin, Loader2 } from 'lucide-react';
import { VehicleData, BRAZILIAN_STATES, CAR_IMAGE_URL, normalizePlate } from '../types';

interface VehicleRegistrationProps {
  onSubmit: (data: VehicleData) => void;
  onBack: () => void;
}

const VehicleRegistration: React.FC<VehicleRegistrationProps> = ({ onSubmit, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    plate: '',
    model: '',
    color: '',
    state: ''
  });

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Limpeza rigorosa para evitar problemas de busca cross-browser
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/gi, '');
    setFormData({ ...formData, plate: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePlate(formData.plate);
    
    if (normalized.length < 7) {
      alert("A placa deve ter pelo menos 7 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ ...formData, plate: normalized });
    } catch (err) {
      alert("Erro ao cadastrar. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Fixo com Safe Area */}
      <div className="px-6 pt-safe pb-4 flex items-center shrink-0 border-b border-gray-100 bg-white/80 backdrop-blur-md z-20">
        <button onClick={onBack} className="p-2 -ml-2 active:bg-gray-100 rounded-full transition-all">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <div className="flex-grow text-center pr-8">
           <h1 className="text-xl font-black text-gray-900 italic tracking-tight">
             Jávou<span className="text-yellow-400">Car</span>
           </h1>
        </div>
      </div>

      {/* Conteúdo com Scroll Total para telas pequenas */}
      <div className="flex-grow overflow-y-auto no-scrollbar">
        <div className="px-6 py-4 space-y-6">
          <div className="text-center">
            <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Configure seu Veículo</h2>
          </div>

          {/* Imagem Adaptável para iPhone 8/SE */}
          <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-gray-50 relative aspect-[16/9] max-h-[160px] sm:max-h-none mx-auto w-full transition-all">
            <img 
              src={CAR_IMAGE_URL} 
              alt="Vehicle" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pb-20">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Placa (Ex: ABC1D23)</label>
              <div className="relative group">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  required
                  type="text"
                  placeholder="DIGITE A PLACA"
                  className="w-full pl-12 pr-4 py-4.5 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-black text-xl tracking-widest shadow-sm transition-all"
                  value={formData.plate}
                  onChange={handlePlateChange}
                  maxLength={7}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Modelo do Carro</label>
              <div className="relative group">
                <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  required
                  type="text"
                  placeholder="Ex: Honda Civic"
                  className="w-full pl-12 pr-4 py-4.5 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold shadow-sm transition-all"
                  value={formData.model}
                  onChange={e => setFormData({...formData, model: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Cor</label>
                <div className="relative group">
                  <Palette className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    required
                    type="text"
                    placeholder="Cor"
                    className="w-full pl-12 pr-4 py-4.5 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold shadow-sm transition-all"
                    value={formData.color}
                    onChange={e => setFormData({...formData, color: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Estado</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-4.5 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none appearance-none font-bold shadow-sm transition-all"
                    value={formData.state}
                    onChange={e => setFormData({...formData, state: e.target.value})}
                  >
                    <option value="">UF</option>
                    {BRAZILIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-blue-600 active:bg-blue-800 text-white font-black rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-[0.97] uppercase tracking-widest flex items-center justify-center space-x-2 text-sm"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                <span>{loading ? 'Processando...' : 'Finalizar Cadastro'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VehicleRegistration;
