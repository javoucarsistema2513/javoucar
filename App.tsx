import React, { useState, useEffect } from 'react';
import { AppScreen } from './types';
import { Onboarding } from './components/screens/Onboarding';
import { Login } from './components/screens/Login';
import { ForgotPassword } from './components/screens/ForgotPassword';
import { RegisterUser } from './components/screens/RegisterUser';
import { RegisterVehicle } from './components/screens/RegisterVehicle';
import { AlertSystem } from './components/screens/AlertSystem';
import { useSocket } from './hooks/useSocket';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.ONBOARDING);
  const [userData, setUserData] = useState<any>(null);
  const [vehicleData, setVehicleData] = useState<any>(null);
  
  // Socket.IO
  const socket = useSocket();

  // Efeito para conectar o usuário à sala quando ele fizer login
  useEffect(() => {
    if (!socket || !userData) return;

    // Quando o usuário estiver na tela de alertas, conectar à sala
    if (currentScreen === AppScreen.ALERT_SYSTEM && vehicleData) {
      socket.emit('join_room', {
        userId: userData.email || 'unknown_user',
        room: 'javoucar_main_room',
        vehicleData: vehicleData
      });
    }

    // Limpar quando o componente desmontar
    return () => {
      // Opcional: sair da sala quando o componente desmontar
      // socket.emit('leave_room', { room: 'javoucar_main_room' });
    };
  }, [socket, userData, vehicleData, currentScreen]);

  // Carregar dados persistidos do localStorage na inicialização
  useEffect(() => {
    try {
      const savedUserData = localStorage.getItem('javoucar_user_data');
      const savedVehicleData = localStorage.getItem('javoucar_vehicle_data');
      const savedLastScreen = localStorage.getItem('javoucar_last_screen');
      
      if (savedUserData) {
        const parsedUserData = JSON.parse(savedUserData);
        setUserData(parsedUserData);
      }
      
      if (savedVehicleData) {
        const parsedVehicleData = JSON.parse(savedVehicleData);
        setVehicleData(parsedVehicleData);
      }
      
      // Se ambos os dados existirem, ir direto para o sistema de alertas
      if (savedUserData && savedVehicleData) {
        setCurrentScreen(AppScreen.ALERT_SYSTEM);
      } else if (savedUserData && !savedVehicleData) {
        // Se só o usuário estiver salvo, ir para o cadastro do veículo
        setCurrentScreen(AppScreen.REGISTER_VEHICLE);
      } else if (savedLastScreen) {
        // Restaurar a última tela acessada, se existir
        setCurrentScreen(savedLastScreen as AppScreen);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do localStorage:', error);
    }
  }, []);

  const navigateTo = (screen: AppScreen) => {
    setCurrentScreen(screen);
    // Salvar a última tela acessada
    localStorage.setItem('javoucar_last_screen', screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case AppScreen.ONBOARDING:
        // Agora o fluxo natural é Onboarding -> Login
        return <Onboarding onNext={() => navigateTo(AppScreen.LOGIN)} />;
      
      case AppScreen.LOGIN:
        return (
            <Login 
                onLoginSuccess={(userData) => {
                  setUserData(userData);
                  // Salvar dados do usuário
                  localStorage.setItem('javoucar_user_data', JSON.stringify(userData));
                  // Se já tiver veículo salvo, ir direto para o sistema de alertas
                  const savedVehicleData = localStorage.getItem('javoucar_vehicle_data');
                  if (savedVehicleData) {
                    navigateTo(AppScreen.ALERT_SYSTEM);
                  } else {
                    navigateTo(AppScreen.REGISTER_VEHICLE);
                  }
                }}
                onRegisterClick={() => navigateTo(AppScreen.REGISTER_USER)}
                onForgotPasswordClick={() => navigateTo(AppScreen.FORGOT_PASSWORD)}
                onBack={() => navigateTo(AppScreen.ONBOARDING)}
            />
        );

      case AppScreen.FORGOT_PASSWORD:
        return <ForgotPassword onBack={() => navigateTo(AppScreen.LOGIN)} />;

      case AppScreen.REGISTER_USER:
        return (
            <RegisterUser 
                onNext={(userData) => {
                  setUserData(userData);
                  // Salvar dados do usuário
                  localStorage.setItem('javoucar_user_data', JSON.stringify(userData));
                  navigateTo(AppScreen.REGISTER_VEHICLE);
                }} 
                onBack={() => navigateTo(AppScreen.LOGIN)}
                onLoginClick={() => navigateTo(AppScreen.LOGIN)}
            />
        );

      case AppScreen.REGISTER_VEHICLE:
        return (
            <RegisterVehicle 
                onNext={(vehicleData) => {
                  setVehicleData(vehicleData);
                  // Salvar dados do veículo
                  localStorage.setItem('javoucar_vehicle_data', JSON.stringify(vehicleData));
                  navigateTo(AppScreen.ALERT_SYSTEM);
                }} 
                onBack={() => {
                  // Se já tiver usuário salvo, voltar para o login
                  const savedUserData = localStorage.getItem('javoucar_user_data');
                  if (savedUserData) {
                    navigateTo(AppScreen.LOGIN);
                  } else {
                    navigateTo(AppScreen.REGISTER_USER);
                  }
                }}
            />
        );
        
      case AppScreen.ALERT_SYSTEM:
        return <AlertSystem onLogout={() => {
          setUserData(null);
          setVehicleData(null);
          // Limpar dados do localStorage ao fazer logout
          localStorage.removeItem('javoucar_user_data');
          localStorage.removeItem('javoucar_vehicle_data');
          navigateTo(AppScreen.LOGIN);
        }} />;
        
      default:
        return <Onboarding onNext={() => navigateTo(AppScreen.LOGIN)} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-0">
      {/* Mobile Container Frame - Ajustado para melhor responsividade */}
      <div className="w-full h-[100dvh] bg-white overflow-hidden relative flex flex-col max-w-md mx-auto">
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;