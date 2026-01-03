
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
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/gi, '');
    setFormData({ ...formData, plate: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePlate(formData.plate);
    if (normalized.length < 7) {
      alert("Placa incompleta.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ ...formData, plate: normalized });
    } catch (err) {
      alert("Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-5 pt-safe pb-2 flex items-center shrink-0 border-b border-gray-50 bg-white z-20">
        <button onClick={onBack} className="p-2 -ml-2 active:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-grow text-center pr-8">
           <h1 className="text-base font-black text-gray-900 italic tracking-tight">
             Jávou<span className="text-yellow-400">Car</span>
           </h1>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-4">
        <div className="space-y-4">
          <div className="rounded-[1.5rem] overflow-hidden shadow-md border border-gray-50 relative aspect-[18/8] max-h-[110px] mx-auto w-full shrink-0">
            <img 
              src={CAR_IMAGE_URL} 
              alt="Vehicle" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/10 to-transparent"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 pb-10">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-widest">Placa</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  required
                  type="text"
                  placeholder="DIGITE A PLACA"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-2xl outline-none font-black text-xl tracking-widest transition-all"
                  value={formData.plate}
                  onChange={handlePlateChange}
                  maxLength={7}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-widest">Modelo</label>
              <input
                required
                type="text"
                placeholder="Ex: Toyota Corolla"
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-2xl outline-none font-bold text-sm"
                value={formData.model}
                onChange={e => setFormData({...formData, model: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-widest">Cor</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Prata"
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-2xl outline-none font-bold text-sm"
                  value={formData.color}
                  onChange={e => setFormData({...formData, color: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-widest">Estado</label>
                <select
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-2xl outline-none font-bold text-sm appearance-none"
                  value={formData.state}
                  onChange={e => setFormData({...formData, state: e.target.value})}
                >
                  <option value="">UF</option>
                  {BRAZILIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center space-x-2 text-[11px]"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? 'Sincronizando...' : 'Finalizar'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VehicleRegistration;
