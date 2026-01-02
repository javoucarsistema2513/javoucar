
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
    const value = e.target.value.toUpperCase();
    setFormData({ ...formData, plate: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePlate(formData.plate);
    
    if (normalized.length < 7) {
      alert("Por favor, insira uma placa válida.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ ...formData, plate: normalized });
    } catch (err) {
      alert("Erro ao cadastrar veículo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        <div className="text-center mb-6">
          <h1 
            className="text-4xl font-black text-gray-900 tracking-tighter italic"
            style={{ textShadow: '0 6px 12px rgba(0,0,0,0.1)' }}
          >
            Jávou<span className="text-yellow-400">Car</span>
          </h1>
          <h2 className="text-sm font-black text-gray-400 mt-1 uppercase tracking-widest">Garagem Virtual</h2>
        </div>

        <div className="mb-6 rounded-[2rem] overflow-hidden shadow-2xl h-48 border-4 border-gray-50 relative">
          <img 
            src={CAR_IMAGE_URL} 
            alt="Vehicle Example" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-blue-900/10"></div>
          <div className="absolute top-4 right-4 bg-yellow-400 p-2.5 rounded-2xl shadow-lg border-2 border-white">
             <AlertTriangle className="text-white w-6 h-6" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto no-scrollbar pb-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Placa do Veículo</label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                required
                type="text"
                placeholder="ABC-1234"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-xl tracking-tight"
                value={formData.plate}
                onChange={handlePlateChange}
                maxLength={8}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Modelo</label>
            <div className="relative">
              <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                required
                type="text"
                placeholder="Ex: Honda Civic"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                value={formData.model}
                onChange={e => setFormData({...formData, model: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Cor</label>
              <div className="relative">
                <Palette className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  required
                  type="text"
                  placeholder="Preto"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  value={formData.color}
                  onChange={e => setFormData({...formData, color: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Estado</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  required
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-bold"
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
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98] uppercase tracking-widest flex items-center justify-center space-x-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              <span>{loading ? 'Cadastrando...' : 'Cadastrar Veículo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleRegistration;
