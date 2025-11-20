import React, { useState, useEffect } from 'react';
import { AppScreen } from './types';
import { Onboarding } from './components/screens/Onboarding';
import { Login } from './components/screens/Login';
import { ForgotPassword } from './components/screens/ForgotPassword';
import { RegisterUser } from './components/screens/RegisterUser';
import { RegisterVehicle } from './components/screens/RegisterVehicle';
import { AlertSystem } from './components/screens/AlertSystem';

// Tipos para os dados persistentes
interface PersistentData {
  user: {
    name: string;
    email: string;
    phone: string;
  } | null;
  vehicle: {
    plate: string;
    model: string;
    color: string;
    state: string;
  } | null;
  hasCompletedOnboarding: boolean;
  lastScreen: AppScreen;
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.ONBOARDING);
  const [persistentData, setPersistentData] = useState<PersistentData>({
    user: null,
    vehicle: null,
    hasCompletedOnboarding: false,
    lastScreen: AppScreen.ONBOARDING
  });

  // Register service worker for push notifications and PWA
  useEffect(() => {
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registrado com sucesso:', registration);
          
          // Solicitar permissão para notificações push
          if ('PushManager' in window) {
            const permission = await Notification.requestPermission();
            console.log('Permissão de notificação:', permission);
          }
        } catch (error) {
          console.error('Erro ao registrar Service Worker:', error);
        }
      }
    };

    registerServiceWorker();
    
    // Verificar se o app está sendo executado como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App está sendo executado como PWA');
    }
  }, []);

  // Carregar dados persistentes do localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('javoucar_persistent_data');
    if (savedData) {
      try {
        const parsedData: PersistentData = JSON.parse(savedData);
        setPersistentData(parsedData);
        
        // Se já completou o onboarding, pular direto para o sistema de alertas
        if (parsedData.hasCompletedOnboarding && parsedData.user && parsedData.vehicle) {
          setCurrentScreen(AppScreen.ALERT_SYSTEM);
        } else if (parsedData.hasCompletedOnboarding) {
          // Se completou onboarding mas não tem veículo, ir para cadastro de veículo
          setCurrentScreen(AppScreen.REGISTER_VEHICLE);
        }
      } catch (e) {
        console.error('Failed to parse persistent data', e);
      }
    }
  }, []);

  // Salvar dados persistentes no localStorage sempre que mudarem
  useEffect(() => {
    localStorage.setItem('javoucar_persistent_data', JSON.stringify(persistentData));
  }, [persistentData]);

  const navigateTo = (screen: AppScreen) => {
    setCurrentScreen(screen);
    setPersistentData(prev => ({
      ...prev,
      lastScreen: screen
    }));
  };

  const handleUserRegistered = (userData: { name: string; email: string; phone: string }) => {
    setPersistentData(prev => ({
      ...prev,
      user: userData
    }));
    navigateTo(AppScreen.REGISTER_VEHICLE);
  };

  const handleVehicleRegistered = (vehicleData: { plate: string; model: string; color: string; state: string }) => {
    setPersistentData(prev => ({
      ...prev,
      vehicle: vehicleData,
      hasCompletedOnboarding: true
    }));
    navigateTo(AppScreen.ALERT_SYSTEM);
  };

  const handleLogout = () => {
    // Limpar dados do usuário e veículo, mas manter o onboarding completo
    setPersistentData(prev => ({
      ...prev,
      user: null,
      vehicle: null,
      hasCompletedOnboarding: prev.hasCompletedOnboarding // manter o onboarding
    }));
    navigateTo(AppScreen.LOGIN);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case AppScreen.ONBOARDING:
        // Agora o fluxo natural é Onboarding -> Login
        return <Onboarding onNext={() => {
          setPersistentData(prev => ({
            ...prev,
            hasCompletedOnboarding: true
          }));
          navigateTo(AppScreen.LOGIN);
        }} />;
      
      case AppScreen.LOGIN:
        return (
            <Login 
                onLoginSuccess={() => navigateTo(AppScreen.ALERT_SYSTEM)}
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
                onNext={(userData) => handleUserRegistered(userData)} 
                onBack={() => navigateTo(AppScreen.LOGIN)}
                onLoginClick={() => navigateTo(AppScreen.LOGIN)}
            />
        );

      case AppScreen.REGISTER_VEHICLE:
        return (
            <RegisterVehicle 
                onNext={(vehicleData) => handleVehicleRegistered(vehicleData)} 
                onBack={() => navigateTo(AppScreen.REGISTER_USER)}
            />
        );
        
      case AppScreen.ALERT_SYSTEM:
        return <AlertSystem onLogout={handleLogout} />;
        
      default:
        return <Onboarding onNext={() => navigateTo(AppScreen.LOGIN)} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-0 m-0">
      {/* Mobile Container Frame - melhorado para PWA */}
      <div className="w-full h-[100dvh] bg-white overflow-hidden relative flex flex-col mobile-container">
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;