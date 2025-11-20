import React, { useState } from 'react';
import { Car, Palette, MapPin, ArrowLeft } from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { api } from '../../services/api';
import { VehicleData } from '../../types';
import { BRAZILIAN_STATES } from '../../constants';

interface RegisterVehicleProps {
  onNext: (vehicleData: VehicleData) => void; // Atualizado para receber os dados do veículo
  onBack: () => void;
}

export const RegisterVehicle: React.FC<RegisterVehicleProps> = ({ onNext, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<VehicleData>({
    plate: '',
    model: '',
    color: '',
    state: 'SP'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.registerVehicle(formData);
      onNext(formData); // Passar os dados do veículo para o próximo passo
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    if (e.target.name === 'plate') {
        value = value.toUpperCase();
    }
    setFormData({ ...formData, [e.target.name]: value });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Header Image Section - Sports Car Dashboard */}
      <div className="h-1/3 w-full relative">
         <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
                // Imagem solicitada pelo usuário
                backgroundImage: 'url("https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&q=80")',
            }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-brand-dark/90" />
        
        <button 
            onClick={onBack} 
            className="absolute top-6 left-6 text-white hover:text-brand-yellow transition-colors z-10 bg-black/20 p-2 rounded-full backdrop-blur-sm"
        >
            <ArrowLeft size={24} />
        </button>

        <div className="absolute bottom-8 left-6 z-10">
            <h2 className="text-3xl font-bold text-white mb-1">Cadastrar Veículo</h2>
            <p className="text-gray-300 text-sm">Identifique seu carro para receber alertas</p>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-20 px-6 py-8 overflow-y-auto shadow-inner">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full">
            <Input
            label="Placa do Veículo"
            name="plate"
            placeholder="ABC-1234"
            icon={<span className="font-bold text-xs text-gray-400">BR</span>}
            value={formData.plate}
            onChange={handleChange}
            maxLength={8}
            required
            className="uppercase"
            />
            <Input
            label="Modelo"
            name="model"
            placeholder="Ex: Honda Civic"
            icon={<Car size={18} />}
            value={formData.model}
            onChange={handleChange}
            required
            />
            <div className="grid grid-cols-2 gap-4">
                <Input
                label="Cor"
                name="color"
                placeholder="Ex: Prata"
                icon={<Palette size={18} />}
                value={formData.color}
                onChange={handleChange}
                required
                />
                <div className="w-full mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <MapPin size={18} />
                        </div>
                        <select
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            className="w-full rounded-xl border-2 bg-white py-3 pl-10 pr-8 text-gray-900 focus:border-brand-yellow focus:ring-brand-yellow focus:outline-none appearance-none border-gray-200"
                        >
                            {BRAZILIAN_STATES.map(uf => (
                                <option key={uf} value={uf}>{uf}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-6 pb-4">
            <Button type="submit" fullWidth disabled={isLoading}>
                {isLoading ? 'Cadastrando...' : 'Cadastrar Veículo'}
            </Button>
            </div>
        </form>
      </div>
    </div>
  );
};