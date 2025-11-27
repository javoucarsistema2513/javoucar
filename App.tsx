import React, { useState, useEffect } from 'react';
import { AppScreen } from './types';
import { Onboarding } from './components/screens/Onboarding';
import { Login } from './components/screens/Login';
import { ForgotPassword } from './components/screens/ForgotPassword';
import { RegisterUser } from './components/screens/RegisterUser';
import { RegisterVehicle } from './components/screens/RegisterVehicle';
import { AlertSystem } from './components/screens/AlertSystem';
import { VehicleRegistration } from './components/screens/VehicleRegistration';
import { supabase } from './services/supabase';
import { api } from './services/api';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.ONBOARDING);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [userPlate, setUserPlate] = useState<string | null>(null);

  useEffect(() => {
    // 1. Verifica sessão inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Se já tem sessão ao abrir o app, verifica se tem veículo registrado
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Verificar se o usuário já tem um veículo registrado
            const { data: vehicle, error } = await supabase
              .from('vehicles')
              .select('plate')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (!error && vehicle) {
              setUserPlate(vehicle.plate);
              setCurrentScreen(AppScreen.ALERT_SYSTEM);
            } else {
              // Se não tem veículo, vai para o registro de veículo
              setCurrentScreen(AppScreen.ALERT_SYSTEM);
            }
          } else {
            setCurrentScreen(AppScreen.ALERT_SYSTEM);
          }
        } catch (error) {
          console.error('Erro ao verificar veículo do usuário:', error);
          setCurrentScreen(AppScreen.ALERT_SYSTEM);
        }
      }
      setIsCheckingSession(false);
    });

    // 2. Escuta eventos de Auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // LÓGICA DE PROTEÇÃO DE FLUXO:
        // Se o usuário está no meio do cadastro (Usuário ou Veículo),
        // NÃO redirecionamos automaticamente para o AlertSystem.
        // Deixamos o fluxo natural dos componentes (onNext) controlar a navegação.
        setCurrentScreen((prev) => {
          if (prev === AppScreen.REGISTER_USER || prev === AppScreen.REGISTER_VEHICLE) {
            return prev;
          }
          return AppScreen.ALERT_SYSTEM;
        });
      } else {
        // Se fez logout (session null), volta pro Onboarding
        // Mas apenas se estivermos dentro do sistema, para evitar resets indesejados
        setCurrentScreen((prev) => {
             if (prev === AppScreen.ALERT_SYSTEM) {
                 return AppScreen.ONBOARDING;
             }
             return prev;
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigateTo = (screen: AppScreen) => {
    setCurrentScreen(screen);
  };

  const handleLogout = async () => {
    await api.logout();
    setUserPlate(null);
    navigateTo(AppScreen.LOGIN);
  };

  const handleVehicleRegistered = (plate: string) => {
    setUserPlate(plate);
  };

  if (isCheckingSession) {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-yellow"></div>
        </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case AppScreen.ONBOARDING:
        return <Onboarding onNext={() => navigateTo(AppScreen.LOGIN)} />;
      
      case AppScreen.LOGIN:
        return (
            <Login 
                onLoginSuccess={() => {}} // Redirecionamento gerido pelo AuthListener (se não for cadastro)
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
                // CRUCIAL: Após criar usuário, força navegação para cadastro de veículo
                onNext={() => navigateTo(AppScreen.REGISTER_VEHICLE)} 
                onBack={() => navigateTo(AppScreen.LOGIN)}
                onLoginClick={() => navigateTo(AppScreen.LOGIN)}
            />
        );

      case AppScreen.REGISTER_VEHICLE:
        return (
            <RegisterVehicle 
                // Após veículo, finalmente libera para o sistema
                onNext={() => navigateTo(AppScreen.ALERT_SYSTEM)} 
                onBack={() => navigateTo(AppScreen.REGISTER_USER)}
            />
        );
        
      case AppScreen.ALERT_SYSTEM:
        // Se o usuário ainda não registrou seu veículo, mostre o componente de registro
        if (!userPlate) {
          return <VehicleRegistration onRegistered={handleVehicleRegistered} onLogout={handleLogout} />;
        }
        return <AlertSystem onLogout={handleLogout} />;
        
      default:
        return <Onboarding onNext={() => navigateTo(AppScreen.LOGIN)} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-0">
      {/* Container responsivo: Full height no mobile, card no desktop */}
      <div className="w-full h-screen max-h-screen bg-white overflow-hidden relative flex flex-col">
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;