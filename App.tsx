
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
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(() => {
    const cached = localStorage.getItem('javoucar_session_active');
    return cached ? AppScreen.DASHBOARD : AppScreen.ONBOARDING;
  });
  
  const [userData, setUserData] = useState<UserData | null>(() => {
    const cached = localStorage.getItem('javoucar_user');
    return cached ? JSON.parse(cached) : null;
  });
  
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(() => {
    const cached = localStorage.getItem('javoucar_vehicle');
    return cached ? JSON.parse(cached) : null;
  });
  
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const fetchUserData = useCallback(async (user: any) => {
    if (!user) { 
      setLoading(false); 
      return; 
    }

    try {
      const userMeta = user.user_metadata;
      const newUserData = {
        fullName: userMeta?.full_name || 'Usuário',
        email: user.email || '',
        phone: userMeta?.phone || '',
      };
      
      setUserData(newUserData);
      localStorage.setItem('javoucar_user', JSON.stringify(newUserData));

      const { data: vehicle } = await supabase.from('vehicles').select('*').eq('user_id', user.id).maybeSingle();

      if (vehicle) {
        setVehicleData(vehicle);
        localStorage.setItem('javoucar_vehicle', JSON.stringify(vehicle));
        localStorage.setItem('javoucar_session_active', 'true');
        setCurrentScreen(AppScreen.DASHBOARD);
      } else {
        localStorage.removeItem('javoucar_vehicle');
        setCurrentScreen(AppScreen.VEHICLE_REGISTRATION);
      }
    } catch (err) {
      console.error("Erro na sincronização:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLocalLogout = useCallback(() => {
    localStorage.clear();
    setUserData(null);
    setVehicleData(null);
    setCurrentScreen(AppScreen.ONBOARDING);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Failsafe mais rápido: 2.5s para liberar a UI caso o Supabase demore
    const failsafe = setTimeout(() => {
      setLoading(false);
    }, 2500);

    // Gerenciamento único de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          await fetchUserData(session.user);
        }
      } else {
        // Se não há sessão no Supabase, verificamos se devemos deslogar localmente
        const hasSession = localStorage.getItem('javoucar_session_active');
        if (event === 'SIGNED_OUT' || !hasSession) {
          handleLocalLogout();
        } else {
          setLoading(false);
        }
      }
      clearTimeout(failsafe);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(failsafe);
    };
  }, [fetchUserData, handleLocalLogout]);

  const handleLogout = async () => {
    handleLocalLogout();
    try { await supabase.auth.signOut(); } catch (e) {}
  };

  const handleVehicleUpdate = (updatedVehicle: VehicleData | null) => {
    setVehicleData(updatedVehicle);
    if (updatedVehicle) {
      localStorage.setItem('javoucar_vehicle', JSON.stringify(updatedVehicle));
    } else {
      localStorage.removeItem('javoucar_vehicle');
    }
  };

  const handleUserSignup = async (data: UserData) => {
    setLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password!,
        options: { data: { full_name: data.fullName, phone: data.phone } }
      });
      if (error) throw error;
      if (authData.user && !authData.session) {
        alert("Verifique seu e-mail para confirmar a conta!");
        setCurrentScreen(AppScreen.LOGIN);
      }
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleLogin = async (data: UserData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password! });
      if (error) throw error;
    } catch (e: any) { 
      alert("Login falhou. Verifique e-mail e senha."); 
      setLoading(false); 
    }
  };

  const handleVehicleRegistration = async (data: VehicleData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const normalized = normalizePlate(data.plate);
      const { error } = await supabase.from('vehicles').upsert({ user_id: user.id, plate: normalized, model: data.model, color: data.color, state: data.state });
      if (error) throw error;
      
      const newVehicle = { ...data, plate: normalized };
      handleVehicleUpdate(newVehicle);
      localStorage.setItem('javoucar_session_active', 'true');
      setCurrentScreen(AppScreen.DASHBOARD);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-blue-600 flex items-center justify-center overflow-hidden">
        <div className="text-white text-center">
          <div className="w-10 h-10 border-4 border-white/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-6"></div>
          <h1 className="text-3xl font-black italic tracking-tighter mb-2">Jávou<span className="text-yellow-400">Car</span></h1>
          <p className="text-[7px] font-black uppercase tracking-[0.4em] opacity-40 animate-pulse">Sincronizando Radar...</p>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case AppScreen.ONBOARDING: return <Onboarding onStart={() => setCurrentScreen(AppScreen.SIGNUP)} onLogin={() => setCurrentScreen(AppScreen.LOGIN)} />;
      case AppScreen.SIGNUP: return <Signup onSubmit={handleUserSignup} onBack={() => setCurrentScreen(AppScreen.ONBOARDING)} />;
      case AppScreen.LOGIN: return <Login onLogin={handleLogin} onBack={() => setCurrentScreen(AppScreen.ONBOARDING)} onGoToSignup={() => setCurrentScreen(AppScreen.SIGNUP)} onForgotPassword={() => setCurrentScreen(AppScreen.FORGOT_PASSWORD)} />;
      case AppScreen.FORGOT_PASSWORD: return <ForgotPassword onBack={() => setCurrentScreen(AppScreen.LOGIN)} />;
      case AppScreen.RESET_PASSWORD: return <ResetPassword onComplete={() => setCurrentScreen(AppScreen.LOGIN)} />;
      case AppScreen.VEHICLE_REGISTRATION: return <VehicleRegistration onSubmit={handleVehicleRegistration} onBack={() => setCurrentScreen(AppScreen.SIGNUP)} />;
      case AppScreen.DASHBOARD: return <Dashboard vehicle={vehicleData} user={userData} onLogout={handleLogout} onVehicleUpdate={handleVehicleUpdate} />;
      default: return <Onboarding onStart={() => setCurrentScreen(AppScreen.SIGNUP)} onLogin={() => setCurrentScreen(AppScreen.LOGIN)} />;
    }
  };

  return (
    <div className="h-[100dvh] w-full flex justify-center bg-gray-950 overflow-hidden">
      <div className="w-full max-w-[500px] h-full bg-white relative shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden">
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;
