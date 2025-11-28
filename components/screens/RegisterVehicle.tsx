import React, { useState, useEffect } from 'react';
import { Car, Hash, Palette, MapPin, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { api } from '../../services/api';
import { VehicleData } from '../../types';
import { supabase } from '../../services/supabase';

// Estados brasileiros para o select
const BRAZILIAN_STATES = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];

interface RegisterVehicleProps {
  onNext: () => void;
  onBack: () => void;
}

export const RegisterVehicle: React.FC<RegisterVehicleProps> = ({ onNext, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingVehicle, setHasExistingVehicle] = useState(false);
  const [existingVehicle, setExistingVehicle] = useState<VehicleData | null>(null);
  const [formData, setFormData] = useState<VehicleData>({
    plate: '',
    model: '',
    color: '',
    state: 'SP' // Padrão para São Paulo
  });

  // Verificar se o usuário já tem um veículo registrado
  useEffect(() => {
    const checkExistingVehicle = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (user) {
          // Verificar se o usuário já tem um veículo registrado
          const { data: vehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .select('plate, model, color, state')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (vehicleError) {
            console.error('Erro ao buscar veículo:', vehicleError);
          } else if (vehicle) {
            setHasExistingVehicle(true);
            setExistingVehicle(vehicle);
            setFormData({
              plate: vehicle.plate,
              model: vehicle.model,
              color: vehicle.color,
              state: vehicle.state
            });
          }
        }
      } catch (error) {
        console.error('Erro ao verificar veículo existente:', error);
      }
    };
    
    checkExistingVehicle();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.registerVehicle(formData);
      onNext();
    } catch (error: any) {
      console.error(error);
      // Mensagem mais amigável para o usuário
      if (error.message) {
        alert('Erro ao cadastrar veículo: ' + error.message);
      } else {
        alert('Erro ao cadastrar veículo. Por favor, tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Se o usuário já tem um veículo registrado, mostra uma mensagem diferente
  if (hasExistingVehicle && existingVehicle) {
    return (
      <div className="flex flex-col h-full bg-gray-50 relative">
        {/* Header */}
        <div className="h-1/3 w-full relative bg-gradient-to-br from-brand-dark to-gray-800 min-h-[150px]">
          <button 
              onClick={onBack} 
              className="absolute top-5 left-5 text-white hover:text-brand-yellow transition-colors z-10 bg-black/20 p-2 rounded-full backdrop-blur-sm"
          >
              <ArrowLeft size={20} />
          </button>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4 text-center">
              <div className="w-16 h-16 bg-brand-yellow/20 rounded-full flex items-center justify-center mb-3">
                  <Car size={32} className="text-brand-yellow" />
              </div>
              <h2 className="text-2xl font-bold mb-1">Veículo Registrado!</h2>
              <p className="text-gray-300 text-sm max-w-xs">Você já tem um veículo cadastrado</p>
          </div>
        </div>

        {/* Form Section */}
        <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-20 px-4 py-6 overflow-y-auto shadow-2xl">
          <div className="flex flex-col items-center justify-center h-full">
            <div className="bg-green-50 p-4 rounded-full mb-4">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Veículo já cadastrado</h3>
            <p className="text-gray-600 text-center mb-6">
              Placa: <span className="font-mono font-bold">{existingVehicle.plate}</span><br/>
              Modelo: {existingVehicle.model}<br/>
              Cor: {existingVehicle.color}<br/>
              Estado: {existingVehicle.state}
            </p>
            
            <div className="w-full">
              <Button 
                fullWidth 
                onClick={onNext} 
                className="h-12 text-base font-bold mb-3"
              >
                Continuar para o Sistema
              </Button>
              
              <Button 
                variant="secondary" 
                fullWidth 
                onClick={() => setHasExistingVehicle(false)} 
                className="h-12 text-base font-bold"
              >
                Alterar Veículo
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Header */}
      <div className="h-1/3 w-full relative bg-gradient-to-br from-brand-dark to-gray-800 min-h-[150px]">
        <button 
            onClick={onBack} 
            className="absolute top-5 left-5 text-white hover:text-brand-yellow transition-colors z-10 bg-black/20 p-2 rounded-full backdrop-blur-sm"
        >
            <ArrowLeft size={20} />
        </button>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4 text-center">
            <div className="w-16 h-16 bg-brand-yellow/20 rounded-full flex items-center justify-center mb-3">
                <Car size={32} className="text-brand-yellow" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Seu Veículo</h2>
            <p className="text-gray-300 text-sm max-w-xs">Informe os dados do seu carro</p>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-20 px-4 py-6 overflow-y-auto shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 h-full">
            <Input
            label="Placa"
            name="plate"
            placeholder="Ex: ABC1234"
            icon={<Hash size={16} />}
            value={formData.plate}
            onChange={handleChange}
            required
            />
            <Input
            label="Modelo"
            name="model"
            placeholder="Ex: Honda Civic"
            icon={<Car size={16} />}
            value={formData.model}
            onChange={handleChange}
            required
            />
            <div className="grid grid-cols-2 gap-3">
                <Input
                label="Cor"
                name="color"
                placeholder="Ex: Prata"
                icon={<Palette size={16} />}
                value={formData.color}
                onChange={handleChange}
                required
                />
                <div className="w-full mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado (UF)</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <MapPin size={16} />
                        </div>
                        <select
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            className="w-full rounded-xl border-2 bg-white py-3 pl-9 pr-7 text-gray-900 focus:border-brand-yellow focus:ring-brand-yellow focus:outline-none appearance-none border-gray-200 text-sm"
                        >
                            {BRAZILIAN_STATES.map((estado) => (
                                <option key={estado.sigla} value={estado.sigla}>
                                    {estado.nome} ({estado.sigla})
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-5 pb-3">
            <Button type="submit" fullWidth disabled={isLoading} className="h-12 text-base font-bold">
                {isLoading ? 'Cadastrando...' : 'Finalizar Cadastro'}
            </Button>
            </div>
        </form>
      </div>
    </div>
  );
};