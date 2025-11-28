import React, { useState, useEffect } from 'react';
import { Car, User, CheckCircle } from 'lucide-react';
import { Button } from '../Button';
import { socketService } from '../../services/socket';
import { supabase } from '../../services/supabase';
import { api } from '../../services/api';

interface VehicleRegistrationProps {
  onRegistered: (plate: string) => void;
  onLogout: () => void;
}

export const VehicleRegistration: React.FC<VehicleRegistrationProps> = ({ onRegistered, onLogout }) => {
  const [plate, setPlate] = useState('');
  const [userName, setUserName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasExistingVehicle, setHasExistingVehicle] = useState(false);
  const [existingVehiclePlate, setExistingVehiclePlate] = useState('');

  // Obter nome do usuário logado e verificar se já tem veículo registrado
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Obter usuário atual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (user) {
          setUserName(user.user_metadata?.full_name || user.email || '');
          
          // Verificar se o usuário já tem um veículo registrado
          const { data: vehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .select('plate')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (vehicleError) {
            console.error('Erro ao buscar veículo:', vehicleError);
          } else if (vehicle) {
            setHasExistingVehicle(true);
            setExistingVehiclePlate(vehicle.plate);
            setPlate(vehicle.plate);
            // Registrar automaticamente o usuário no Socket.IO com o veículo existente
            socketService.registerUser(user.id, vehicle.plate);
            onRegistered(vehicle.plate);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
      }
    };
    
    fetchUserData();
  }, [onRegistered]);

  const handleRegister = async () => {
    if (!plate) {
      alert("Por favor, digite a placa do seu veículo.");
      return;
    }

    setIsRegistering(true);
    
    try {
      // Registrar veículo no banco de dados
      const { success } = await api.registerVehicle({
        plate: plate,
        model: '', // Estes campos não são usados neste momento
        color: '',
        state: 'SP'
      });
      
      if (success) {
        // Registrar usuário no Socket.IO
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          socketService.registerUser(user.id, plate.toUpperCase());
          setIsRegistered(true);
          onRegistered(plate.toUpperCase());
        }
      }
    } catch (error: any) {
      console.error('Erro ao registrar veículo:', error);
      // Mensagem mais amigável para o usuário
      if (error.message) {
        alert('Erro ao registrar veículo: ' + error.message);
      } else {
        alert('Erro ao registrar veículo. Por favor, tente novamente.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Se o usuário já tem um veículo registrado, mostra uma mensagem diferente
  if (hasExistingVehicle) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-brand-yellow px-4 animate-in fade-in duration-300">
        <div className="bg-white p-5 rounded-full mb-5 shadow-xl animate-bounce-slow">
          <Car size={40} className="text-brand-dark" />
        </div>
        <h2 className="text-3xl font-black text-brand-dark mb-2">Veículo Registrado!</h2>
        <p className="text-brand-dark/80 text-center mb-6 text-base font-medium">
          Seu veículo <br/>
          <span className="font-mono font-bold text-xl uppercase bg-white/50 px-2 rounded mt-1 inline-block border border-black/10">
            {existingVehiclePlate}
          </span>
          <br/>já está registrado.
        </p>
        <Button 
          variant="secondary" 
          onClick={() => {
            setHasExistingVehicle(false);
          }} 
          className="shadow-xl mb-4"
        >
          Alterar Placa
        </Button>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-brand-yellow px-4 animate-in fade-in duration-300">
        <div className="bg-white p-5 rounded-full mb-5 shadow-xl animate-bounce-slow">
          <CheckCircle size={40} className="text-brand-dark" />
        </div>
        <h2 className="text-3xl font-black text-brand-dark mb-2">Registrado!</h2>
        <p className="text-brand-dark/80 text-center mb-6 text-base font-medium">
          Seu veículo <br/>
          <span className="font-mono font-bold text-xl uppercase bg-white/50 px-2 rounded mt-1 inline-block border border-black/10">
            {plate.toUpperCase()}
          </span>
          <br/>foi registrado com sucesso.
        </p>
        <Button 
          variant="secondary" 
          onClick={() => setIsRegistered(false)} 
          className="shadow-xl mb-4"
        >
          Alterar Placa
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="bg-brand-dark text-white p-5 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-5">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tighter">Jávou<span className="text-brand-yellow">Car</span></h1>
            <p className="text-xs text-gray-400 mt-1">Registro de Veículo</p>
          </div>
          <button 
            onClick={onLogout} 
            className="text-xs font-medium bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition-colors"
          >
            Sair
          </button>
        </div>
        
        <div className="text-center">
          <div className="w-16 h-16 bg-brand-yellow/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Car size={32} className="text-brand-yellow" />
          </div>
          <h2 className="text-xl font-bold mb-1">Olá, {userName}</h2>
          <p className="text-gray-300 text-sm">
            Registre seu veículo para receber alertas
          </p>
        </div>
      </header>

      <div className="flex-1 px-4 pt-6 pb-24 overflow-y-auto">
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Sua Placa</h3>
          <div className="relative group">
            <input
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="DIGITE A PLACA"
              maxLength={8}
              className="w-full bg-white border-2 border-gray-200 focus:border-brand-yellow rounded-2xl py-4 pl-5 pr-4 text-2xl font-mono tracking-widest text-gray-800 placeholder-gray-400 focus:outline-none shadow-sm transition-all"
            />
          </div>
          
          <div className="mt-6 p-3 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="flex items-start gap-2.5">
              <div className="mt-1 text-blue-600">
                <User size={18} />
              </div>
              <div>
                <h4 className="font-bold text-blue-900 mb-1">Importante</h4>
                <p className="text-sm text-blue-700">
                  Você receberá alertas enviados para esta placa. Certifique-se de digitar corretamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-gray-100">
        <div className="max-w-md mx-auto">
          <Button 
            fullWidth 
            onClick={handleRegister} 
            disabled={isRegistering || !plate}
            className="shadow-xl shadow-brand-yellow/20 h-12 text-base font-bold"
          >
            {isRegistering ? 'Registrando...' : 'Registrar Veículo'}
          </Button>
        </div>
      </div>
    </div>
  );
};