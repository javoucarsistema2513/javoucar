
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
  const isInitialized = useRef(false);

  const fetchUserData = useCallback(async (session: any) => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    try {
      const { user: authUser } = session;
      const userMeta = authUser.user_metadata;
      
      setUserData({
        fullName: userMeta?.full_name || 'Usuário',
        email: authUser.email || '',
        phone: userMeta?.phone || '',
      });

      // Busca o veículo do usuário logado
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', authUser.id)
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
      console.error("Erro ao processar dados da sessão:", err);
      setCurrentScreen(AppScreen.VEHICLE_REGISTRATION);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Timer de segurança: Se em 4 segundos nada acontecer, libera a tela
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 4000);

    // O onAuthStateChange dispara o evento INITIAL_SESSION imediatamente se houver sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await fetchUserData(session);
      } else {
        setUserData(null);
        setVehicleData(null);
        setCurrentScreen(AppScreen.ONBOARDING);
        setLoading(false);
      }
      clearTimeout(safetyTimer);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [fetchUserData]);

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
        alert("Cadastro realizado! Verifique seu e-mail para ativar.");
        setCurrentScreen(AppScreen.LOGIN);
      }
    } catch (error: any) {
      alert(error.message || "Erro ao cadastrar.");
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
      // O onAuthStateChange cuidará da navegação
    } catch (error: any) {
      alert("E-mail ou senha inválidos.");
      setLoading(false);
    }
  };

  const handleVehicleRegistration = async (data: VehicleData) => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Usuário não identificado.");

      const normalized = normalizePlate(data.plate);
      const { error } = await supabase.from('vehicles').upsert({
        user_id: authUser.id,
        plate: normalized,
        model: data.model,
        color: data.color,
        state: data.state
      });

      if (error) throw error;
      setVehicleData({ ...data, plate: normalized });
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
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4 shadow-lg"></div>
          <h1 className="text-2xl font-black italic tracking-tighter mb-1">Jávou<span className="text-yellow-400">Car</span></h1>
          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-60 animate-pulse">Sincronizando...</p>
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
      case AppScreen.DASHBOARD: return <Dashboard vehicle={vehicleData} user={userData} onLogout={() => supabase.auth.signOut()} />;
      default: return <Onboarding onStart={() => setCurrentScreen(AppScreen.SIGNUP)} onLogin={() => setCurrentScreen(AppScreen.LOGIN)} />;
    }
  };

  return (
    <div className="h-[100dvh] w-full flex justify-center bg-gray-900 overflow-hidden">
      <div className="w-full max-w-[500px] h-full bg-white relative shadow-2xl overflow-hidden">
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;
