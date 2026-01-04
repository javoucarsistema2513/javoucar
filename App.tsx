
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppScreen, UserData, VehicleData, normalizePlate } from './types';
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
  const initialCheckPerformed = useRef(false);

  const fetchVehicleAndNavigate = useCallback(async (userId: string, userMeta: any) => {
    try {
      const user: UserData = {
        fullName: userMeta?.full_name || 'Usuário',
        email: userMeta?.email || '',
        phone: userMeta?.phone || '',
      };
      setUserData(user);

      const { data: vehicle, error }: any = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) console.error("Erro ao buscar veículo:", error);

      if (vehicle) {
        setVehicleData(vehicle);
        setCurrentScreen(AppScreen.DASHBOARD);
      } else {
        setVehicleData(null);
        setCurrentScreen(AppScreen.VEHICLE_REGISTRATION);
      }
    } catch (err) {
      console.error("Erro ao processar dados de login:", err);
      setCurrentScreen(AppScreen.VEHICLE_REGISTRATION);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Verificação imediata de sessão existente ao abrir o app
    const checkInitialSession = async () => {
      if (initialCheckPerformed.current) return;
      initialCheckPerformed.current = true;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchVehicleAndNavigate(session.user.id, session.user.user_metadata);
      } else {
        setLoading(false);
      }
    };

    checkInitialSession();

    // 2. Ouvinte de mudanças de estado (Login/Logout/Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          await fetchVehicleAndNavigate(session.user.id, session.user.user_metadata);
        }
      } else if (event === 'SIGNED_OUT') {
        setUserData(null);
        setVehicleData(null);
        setCurrentScreen(AppScreen.ONBOARDING);
        setLoading(false);
      }
    });

    return () => {
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
          data: { full_name: data.fullName, phone: data.phone }
        }
      });
      if (error) throw error;
      if (authData.user && !authData.session) {
        alert("Verifique seu e-mail para confirmar o cadastro!");
        setCurrentScreen(AppScreen.LOGIN);
      }
    } catch (error: any) {
      alert(error.message || "Erro ao criar conta.");
      throw error;
    } finally {
      setLoading(false);
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
    } catch (error: any) {
      alert(error.message || "E-mail ou senha incorretos.");
      setLoading(false);
      throw error;
    }
  };

  const handleVehicleRegistration = async (data: VehicleData) => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Não autenticado");

      const { error } = await supabase
        .from('vehicles')
        .upsert({
          user_id: authUser.id,
          plate: normalizePlate(data.plate),
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

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-blue-600 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
          <h1 className="text-2xl font-black italic tracking-tighter">Jávou<span className="text-yellow-400">Car</span></h1>
          <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.3em] mt-3 animate-pulse">Autenticando...</p>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case AppScreen.ONBOARDING:
        return <Onboarding onStart={() => setCurrentScreen(AppScreen.SIGNUP)} onLogin={() => setCurrentScreen(AppScreen.LOGIN)} />;
      case AppScreen.SIGNUP:
        return <Signup onSubmit={handleUserSignup} onBack={() => setCurrentScreen(AppScreen.ONBOARDING)} />;
      case AppScreen.LOGIN:
        return <Login 
          onLogin={handleLogin} 
          onBack={() => setCurrentScreen(AppScreen.ONBOARDING)} 
          onGoToSignup={() => setCurrentScreen(AppScreen.SIGNUP)}
          onForgotPassword={() => setCurrentScreen(AppScreen.FORGOT_PASSWORD)} 
        />;
      case AppScreen.FORGOT_PASSWORD:
        return <ForgotPassword onBack={() => setCurrentScreen(AppScreen.LOGIN)} />;
      case AppScreen.RESET_PASSWORD:
        return <ResetPassword onComplete={() => setCurrentScreen(AppScreen.LOGIN)} />;
      case AppScreen.VEHICLE_REGISTRATION:
        return <VehicleRegistration onSubmit={handleVehicleRegistration} onBack={() => setCurrentScreen(AppScreen.SIGNUP)} />;
      case AppScreen.DASHBOARD:
        return <Dashboard vehicle={vehicleData} user={userData} onLogout={() => supabase.auth.signOut()} />;
      default:
        return <Onboarding onStart={() => setCurrentScreen(AppScreen.SIGNUP)} onLogin={() => setCurrentScreen(AppScreen.LOGIN)} />;
    }
  };

  return (
    <div className="h-[100dvh] w-full flex justify-center bg-gray-950 overflow-hidden">
      <div className="w-full max-w-[500px] h-full bg-white relative overflow-hidden flex flex-col shadow-2xl">
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;
