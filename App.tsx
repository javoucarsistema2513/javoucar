
import React, { useState, useEffect, useCallback } from 'react';
import { AppScreen, UserData, VehicleData } from './types';
import { supabase } from './supabase';
import Onboarding from './components/Onboarding';
import Signup from './components/Signup';
import Login from './components/Login';
import VehicleRegistration from './components/VehicleRegistration';
import Dashboard from './components/Dashboard';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.ONBOARDING);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVehicleAndNavigate = useCallback(async (userId: string, userMeta: any) => {
    try {
      const user: UserData = {
        fullName: userMeta?.full_name || 'Usuário',
        email: userMeta?.email || '',
        phone: userMeta?.phone || '',
      };
      setUserData(user);

      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (vehicle) {
        setVehicleData(vehicle);
        setCurrentScreen(AppScreen.DASHBOARD);
      } else {
        setVehicleData(null);
        setCurrentScreen(AppScreen.VEHICLE_REGISTRATION);
      }
    } catch (err) {
      console.error("Erro ao processar dados do usuário/veículo:", err);
      // Em caso de erro, permitimos que o usuário tente registrar o veículo novamente
      setCurrentScreen(AppScreen.VEHICLE_REGISTRATION);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Timeout de segurança: Se em 8 segundos nada acontecer, libera a tela
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);
      
      if (event === 'SIGNED_OUT') {
        setUserData(null);
        setVehicleData(null);
        setCurrentScreen(AppScreen.ONBOARDING);
        setLoading(false);
      } else if (event === 'PASSWORD_RECOVERY') {
        setCurrentScreen(AppScreen.RESET_PASSWORD);
        setLoading(false);
      } else if (session?.user) {
        // Captura SIGNED_IN, INITIAL_SESSION, USER_UPDATED
        await fetchVehicleAndNavigate(session.user.id, session.user.user_metadata);
      } else {
        // Nenhuma sessão ativa
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [fetchVehicleAndNavigate]);

  const handleUserSignup = async (data: UserData) => {
    setLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password!,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone
          }
        }
      });

      if (error) throw error;
      
      if (authData.user && !authData.session) {
        alert("Cadastro realizado! Por favor, verifique seu e-mail para confirmar a conta.");
        setCurrentScreen(AppScreen.LOGIN);
        setLoading(false);
      }
      // Se houver sessão (e-mail automático confirmado), o onAuthStateChange cuidará do resto
    } catch (error: any) {
      setLoading(false);
      throw error;
    }
  };

  const handleLogin = async (data: UserData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password!
      });
      if (error) throw error;
      // O onAuthStateChange cuidará do redirecionamento
    } catch (error: any) {
      setLoading(false);
      throw error;
    }
  };

  const handleVehicleRegistration = async (data: VehicleData) => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from('vehicles')
        .upsert({
          user_id: authUser.id,
          plate: data.plate,
          model: data.model,
          color: data.color,
          state: data.state
        });

      if (error) throw error;

      setVehicleData(data);
      setCurrentScreen(AppScreen.DASHBOARD);
    } catch (error: any) {
      alert("Erro ao salvar veículo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (screen: AppScreen) => {
    setCurrentScreen(screen);
  };

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-blue-600 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <h1 
            className="text-2xl font-black italic"
            style={{ textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          >
            Jávou<span className="text-yellow-400">Car</span>
          </h1>
          <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-2 animate-pulse">Sincronizando Garagem...</p>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case AppScreen.ONBOARDING:
        return <Onboarding onStart={() => navigateTo(AppScreen.SIGNUP)} onLogin={() => navigateTo(AppScreen.LOGIN)} />;
      case AppScreen.SIGNUP:
        return <Signup onSubmit={handleUserSignup} onBack={() => navigateTo(AppScreen.ONBOARDING)} />;
      case AppScreen.LOGIN:
        return <Login 
          onLogin={handleLogin} 
          onBack={() => navigateTo(AppScreen.ONBOARDING)} 
          onGoToSignup={() => navigateTo(AppScreen.SIGNUP)}
          onForgotPassword={() => navigateTo(AppScreen.FORGOT_PASSWORD)} 
        />;
      case AppScreen.FORGOT_PASSWORD:
        return <ForgotPassword onBack={() => navigateTo(AppScreen.LOGIN)} />;
      case AppScreen.RESET_PASSWORD:
        return <ResetPassword onComplete={() => navigateTo(AppScreen.LOGIN)} />;
      case AppScreen.VEHICLE_REGISTRATION:
        return <VehicleRegistration onSubmit={handleVehicleRegistration} onBack={() => navigateTo(AppScreen.SIGNUP)} />;
      case AppScreen.DASHBOARD:
        return <Dashboard vehicle={vehicleData} user={userData} onLogout={() => supabase.auth.signOut()} />;
      default:
        return <Onboarding onStart={() => navigateTo(AppScreen.SIGNUP)} onLogin={() => navigateTo(AppScreen.LOGIN)} />;
    }
  };

  return (
    <div className="h-[100dvh] w-full flex justify-center bg-gray-950">
      <div className="w-full max-w-[500px] h-full bg-white relative overflow-hidden flex flex-col shadow-2xl">
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;
