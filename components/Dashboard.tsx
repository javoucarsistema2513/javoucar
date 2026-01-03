
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, LogOut, Bell, ShieldCheck, MapPin, Zap, Sun, 
  Disc, Minimize2, Hash, CheckCircle2, 
  Loader2, Lightbulb, TrafficCone, Package, Clock, Calendar, AlertTriangle,
  Navigation, Camera, Share2, Trash2, Crosshair, ChevronUp
} from 'lucide-react';
import { VehicleData, UserData, PRECONFIGURED_ALERTS, normalizePlate, ParkingLocation } from '../types';
import { supabase } from '../supabase';

interface DashboardProps {
  vehicle: VehicleData | null;
  user: UserData | null;
  onLogout: () => void;
}

interface AlertPayload {
  id: string;
  message: string;
  icon: string;
  target_plate: string;
  sender_name: string;
  created_at: string;
}

const Dashboard: React.FC<DashboardProps> = ({ vehicle, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'events' | 'parking'>('home');
  const [targetPlate, setTargetPlate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [activeAlert, setActiveAlert] = useState<AlertPayload | null>(null);
  const [alertHistory, setAlertHistory] = useState<AlertPayload[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Vaga States
  const [parkingSpot, setParkingSpot] = useState<ParkingLocation | null>(null);
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [bearing, setBearing] = useState<number | null>(null);
  const [heading, setHeading] = useState<number>(0);
  
  const receivedIdsRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const wakeLockRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  const getFirstName = (name: any) => {
    if (!name || typeof name !== 'string') return 'Motorista';
    return name.trim().split(' ')[0];
  };

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('WakeLock erro:', err);
      }
    }
  };

  const initAudioAndPermissions = async () => {
    if (audioUnlocked) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        await (DeviceOrientationEvent as any).requestPermission();
      }

      setAudioUnlocked(true);
      requestWakeLock();
    } catch (e) {}
  };

  const playTwoBeeps = () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    
    const playBeep = (time: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.4, time + 0.01);
      gain.gain.linearRampToValueAtTime(0, time + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.15);
    };

    const now = ctx.currentTime;
    playBeep(now, 1000);
    playBeep(now + 0.15, 1250);
  };

  const stopAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  };

  const startAlarm = () => {
    stopAlarm();
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const toneSequence = () => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(1300, now + 0.1);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.7, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.5);
      if ("vibrate" in navigator) navigator.vibrate([400, 200, 400]);
    };
    toneSequence();
    alarmIntervalRef.current = setInterval(toneSequence, 1200);
  };

  useEffect(() => {
    if (!vehicle?.plate) return;
    const myPlate = normalizePlate(vehicle.plate);
    let channel: any = null;

    const setupSubscription = () => {
      if (channel) supabase.removeChannel(channel);
      channel = supabase
        .channel(`alerts-live-${myPlate}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'alerts', filter: `target_plate=eq.${myPlate}` },
          (payload) => {
            const newAlert = payload.new as AlertPayload;
            if (!newAlert || receivedIdsRef.current.has(newAlert.id)) return;
            receivedIdsRef.current.add(newAlert.id);
            
            setActiveAlert(newAlert);
            setAlertHistory(prev => [newAlert, ...prev].slice(0, 2));
            setShowReceivedModal(true);
            startAlarm();
          }
        )
        .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));
    };

    supabase
      .from('alerts')
      .select('*')
      .eq('target_plate', myPlate)
      .order('created_at', { ascending: false })
      .limit(2)
      .then(({ data }) => {
        if (data) {
          setAlertHistory(data);
          data.forEach(a => receivedIdsRef.current.add(a.id));
        }
      });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setupSubscription();
        requestWakeLock();
      }
    };

    const savedSpot = localStorage.getItem(`parking_${myPlate}`);
    if (savedSpot) setParkingSpot(JSON.parse(savedSpot));

    setupSubscription();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (channel) supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopAlarm();
      if (wakeLockRef.current) wakeLockRef.current.release();
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [vehicle?.plate]);

  useEffect(() => {
    if (activeTab === 'parking' && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation(pos.coords);
          if (pos.coords.heading !== null) setHeading(pos.coords.heading);
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      
      const handleOrientation = (e: DeviceOrientationEvent) => {
        const h = (e as any).webkitCompassHeading || e.alpha;
        if (h !== null && h !== undefined) setHeading(h);
      };
      window.addEventListener('deviceorientation', handleOrientation);
      return () => {
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    }
  }, [activeTab]);

  useEffect(() => {
    if (userLocation && parkingSpot) {
      const dist = calculateDistance(userLocation.latitude, userLocation.longitude, parkingSpot.lat, parkingSpot.lng);
      setDistance(dist);
      const brng = calculateBearing(userLocation.latitude, userLocation.longitude, parkingSpot.lat, parkingSpot.lng);
      setBearing(brng);
    }
  }, [userLocation, parkingSpot]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const λ1 = lon1 * Math.PI/180;
    const λ2 = lon2 * Math.PI/180;
    const y = Math.sin(λ2-λ1) * Math.cos(φ2);
    const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
    const θ = Math.atan2(y, x);
    return (θ*180/Math.PI + 360) % 360;
  };

  const saveParkingLocation = () => {
    if (!userLocation) {
      alert("Aguardando sinal GPS...");
      return;
    }
    const spot: ParkingLocation = {
      lat: userLocation.latitude,
      lng: userLocation.longitude,
      timestamp: Date.now()
    };
    setParkingSpot(spot);
    localStorage.setItem(`parking_${vehicle?.plate}`, JSON.stringify(spot));
    playTwoBeeps();
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const takeParkingPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re: any) => {
          if (parkingSpot) {
            const updated = { ...parkingSpot, photo: re.target.result };
            setParkingSpot(updated);
            localStorage.setItem(`parking_${vehicle?.plate}`, JSON.stringify(updated));
            playTwoBeeps();
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const shareLocation = () => {
    if (!parkingSpot) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${parkingSpot.lat},${parkingSpot.lng}`;
    const message = `Localização atual do meu veículo (${vehicle?.model || 'carro'}): ${url}`;
    if (navigator.share) {
      navigator.share({
        title: 'Localização Atual do Veículo - JávouCar',
        text: message,
        url: url
      });
    } else {
      window.open(url, '_blank');
    }
  };

  const clearParking = () => {
    if (confirm("Deseja apagar o registro desta vaga?")) {
      setParkingSpot(null);
      localStorage.removeItem(`parking_${vehicle?.plate}`);
      playTwoBeeps();
    }
  };

  const handleSendAlert = async (messageText: string) => {
    if (!messageText || typeof messageText !== 'string' || !messageText.trim() || sending) return;
    initAudioAndPermissions();
    
    const plateToSearch = normalizePlate(targetPlate).trim();
    if (plateToSearch.length < 7) { 
      setErrorMsg('Placa incompleta'); 
      return; 
    }
    
    setSending(true); 
    setErrorMsg('');
    
    try {
      const { data: targetVeh } = await supabase
        .from('vehicles')
        .select('plate')
        .eq('plate', plateToSearch)
        .maybeSingle();

      if (!targetVeh) {
        setErrorMsg('Não encontrado');
        setSending(false);
        return;
      }

      const alertConfig = PRECONFIGURED_ALERTS.find(a => a.text === messageText);

      const { error } = await supabase.from('alerts').insert({
        id: crypto.randomUUID(),
        target_plate: targetVeh.plate,
        sender_name: String(user?.fullName || 'Motorista'),
        message: String(messageText),
        icon: alertConfig?.icon || 'bell'
      });

      if (error) throw error;
      setTargetPlate(''); 
      setCustomMessage(''); 
      playTwoBeeps();
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) { 
      setErrorMsg("Falha de rede"); 
    } finally { 
      setSending(false); 
    }
  };

  const renderIcon = (name: string, className: string) => {
    const icons: any = { 
      zap: Zap, 'door-closed': TrafficCone, sun: Lightbulb, 
      package: Package, bell: Bell, disc: Disc, 'minimize-2': Minimize2 
    };
    const IconComp = icons[name] || Bell;
    return <IconComp className={className} />;
  };

  const getActiveAlertConfig = () => {
    if (!activeAlert) return PRECONFIGURED_ALERTS[4];
    return PRECONFIGURED_ALERTS.find(a => a.icon === activeAlert.icon) || PRECONFIGURED_ALERTS[4];
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden pt-safe" onClick={initAudioAndPermissions}>
      
      {showSuccessToast && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[9999] bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center space-x-2 animate-in slide-in-from-top duration-500 font-black italic border border-white/10">
          <CheckCircle2 size={16} /> <span className="text-xs uppercase tracking-tighter">Concluído!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-blue-600 pb-12 pt-8 px-5 rounded-b-[3rem] shadow-xl shrink-0 relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-1.5 mb-1">
              <h2 className="text-white text-[9px] font-black uppercase tracking-widest italic opacity-70">Jávou<span className="text-yellow-400">Car</span></h2>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            </div>
            <h1 className="text-white text-2xl font-black truncate tracking-tighter">Oi, {getFirstName(user?.fullName)}</h1>
          </div>
          <button onClick={onLogout} className="bg-white/10 p-3 rounded-xl text-white active:scale-90 transition-all border border-white/5 shadow-lg"><LogOut size={20} /></button>
        </div>
      </div>

      {activeTab === 'home' && (
        <>
          <div className="px-5 -mt-8 shrink-0 z-20">
            <div className="bg-white p-4 rounded-[2rem] shadow-xl border border-gray-100 flex items-center space-x-4">
              <div className="bg-blue-600 p-3 rounded-2xl shadow-md text-white">
                <ShieldCheck size={24} />
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="text-gray-950 font-black text-base uppercase truncate leading-none mb-1 tracking-tight">{String(vehicle?.model || '')}</h3>
                <div className="flex items-center">
                   <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg mr-2 font-mono text-[10px] font-black border border-blue-100">{String(vehicle?.plate || '')}</span>
                   <span className="text-[10px] font-black text-gray-400 uppercase italic">{String(vehicle?.color || '')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 pt-6 shrink-0">
            <div className="p-4 bg-white rounded-[2rem] border border-gray-100 shadow-md">
              <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1 tracking-widest">Placa do Alvo</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="text" placeholder="ABC1D23"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-50 uppercase font-black text-2xl tracking-widest outline-none transition-all placeholder:text-gray-200"
                  value={targetPlate} onChange={e => { setErrorMsg(''); setTargetPlate(e.target.value.toUpperCase()); }} maxLength={7}
                />
              </div>
              {errorMsg && <p className="text-red-600 text-[9px] font-black mt-1.5 ml-1 uppercase">{String(errorMsg)}</p>}
            </div>
          </div>

          <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-5 pb-32">
            <div className="grid grid-cols-1 gap-2.5 mb-6">
              {PRECONFIGURED_ALERTS.map((alert) => (
                <button 
                  key={alert.id} 
                  disabled={sending} 
                  onClick={() => handleSendAlert(alert.text)} 
                  className="flex items-center p-3.5 bg-white border border-gray-100 rounded-[1.5rem] active:bg-blue-600 active:text-white transition-all text-left shadow-sm group disabled:opacity-50"
                >
                  <div className={`p-3 rounded-xl mr-4 shadow-sm group-active:bg-white/20 ${alert.bgColor}`}>
                    {renderIcon(alert.icon, `w-5 h-5 ${alert.color} group-active:text-white`)}
                  </div>
                  <span className="text-gray-900 font-black text-[11px] flex-grow uppercase italic tracking-tight group-active:text-white leading-tight">{String(alert.text)}</span>
                  <div className="bg-gray-50 p-2 rounded-full group-active:bg-white/20">
                    <Send size={14} className="text-gray-300 group-active:text-white" />
                  </div>
                </button>
              ))}
            </div>
            
            <div className="space-y-3">
              <textarea 
                className="w-full p-5 bg-white border border-gray-100 rounded-[2rem] h-24 focus:ring-2 focus:ring-blue-50 outline-none font-bold text-xs resize-none shadow-sm" 
                placeholder="Aviso personalizado..." 
                value={customMessage} 
                onChange={e => setCustomMessage(e.target.value)} 
              />
              <button 
                onClick={() => handleSendAlert(customMessage)} 
                disabled={sending || !customMessage.trim()} 
                className="w-full py-4.5 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center space-x-3 shadow-lg uppercase text-xs active:scale-95 transition-all disabled:bg-gray-200 tracking-[0.15em]"
              >
                {sending ? <Loader2 className="animate-spin w-5 h-5" /> : <Send size={18} />} 
                <span>{sending ? 'ENVIANDO...' : 'ENVIAR AGORA'}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'events' && (
        <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-6 pb-32">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-gray-950 font-black text-lg uppercase italic tracking-tighter">Eventos</h3>
            <div className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Últimos 2</div>
          </div>

          <div className="space-y-3">
            {alertHistory.length === 0 ? (
              <div className="bg-white p-8 rounded-[2.5rem] text-center border border-gray-100 shadow-sm">
                <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-black text-[9px] uppercase tracking-widest leading-none">Nada registrado</p>
              </div>
            ) : (
              alertHistory.map((alert) => {
                const config = PRECONFIGURED_ALERTS.find(a => a.icon === alert.icon) || PRECONFIGURED_ALERTS[4];
                return (
                  <div key={alert.id} className="bg-white p-3.5 rounded-[1.5rem] border border-gray-50 shadow-sm flex items-start space-x-3 animate-in slide-in-from-bottom duration-500">
                    <div className={`p-2.5 rounded-xl shadow-sm ${config.bgColor}`}>
                      {renderIcon(alert.icon, `w-5 h-5 ${config.color}`)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{String(getFirstName(alert.sender_name))}</span>
                        <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-lg">{formatTime(alert.created_at)}</span>
                      </div>
                      <p className="text-gray-950 font-black text-[11px] uppercase italic leading-tight">"{String(alert.message || '')}"</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'parking' && (
        <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-6 pb-32 flex flex-col">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-gray-950 font-black text-lg uppercase italic tracking-tighter">Vaga</h3>
            <div className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Localizador</div>
          </div>

          {!parkingSpot ? (
            <div className="flex-grow flex flex-col items-center justify-center p-4 text-center space-y-4">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col items-center w-full">
                <div className="bg-blue-50 p-4 rounded-full mb-4">
                  <MapPin className="w-10 h-10 text-blue-600 animate-pulse" />
                </div>
                <h4 className="text-gray-950 font-black text-base uppercase italic mb-1 tracking-tighter">Vaga não marcada</h4>
                <p className="text-gray-400 text-[9px] font-bold leading-tight uppercase tracking-widest">Salve onde estacionou via GPS.</p>
              </div>
              <button 
                onClick={saveParkingLocation}
                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-[0.15em] text-[10px] flex items-center justify-center space-x-2 active:scale-95 transition-all"
              >
                <Crosshair size={18} />
                <span>MARCAR POSIÇÃO ATUAL</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bússola */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-50 flex flex-col items-center relative overflow-hidden">
                <div className="absolute top-3 right-5">
                  <button onClick={clearParking} className="p-2 text-gray-200 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
                
                <div className="relative w-32 h-32 rounded-full border-4 border-gray-50 flex items-center justify-center mb-4">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  </div>
                  <div 
                    className="absolute w-10 h-10 flex items-center justify-center transition-transform duration-300 ease-out"
                    style={{ transform: `rotate(${(bearing || 0) - heading}deg)` }}
                  >
                    <ChevronUp className="w-10 h-10 text-blue-600 stroke-[4px]" />
                  </div>
                  <span className="absolute top-1 text-[8px] font-black text-gray-300">N</span>
                  <span className="absolute bottom-1 text-[8px] font-black text-gray-300">S</span>
                  <span className="absolute left-1 text-[8px] font-black text-gray-300">O</span>
                  <span className="absolute right-1 text-[8px] font-black text-gray-300">L</span>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1.5 mb-0.5">
                    <Navigation size={12} className="text-blue-600" />
                    <span className="text-xl font-black text-gray-950 tracking-tighter italic leading-none">
                      {distance ? (distance < 1000 ? `${distance.toFixed(0)}m` : `${(distance/1000).toFixed(1)}km`) : '...'}
                    </span>
                  </div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Distância Estimada</p>
                </div>
              </div>

              {/* Botões Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={takeParkingPhoto}
                  className="bg-white h-24 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center space-y-1 relative cursor-pointer active:scale-95 transition-all overflow-hidden"
                >
                  {parkingSpot.photo ? (
                    <>
                      <img src={String(parkingSpot.photo)} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      <div className="relative z-10 flex flex-col items-center">
                        <Camera size={20} className="text-white drop-shadow-md" />
                        <span className="text-[8px] font-black text-white uppercase drop-shadow-md">Novo Registro</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Camera size={20} className="text-blue-600" />
                      <span className="text-[8px] font-black text-gray-400 uppercase">Foto Local</span>
                    </>
                  )}
                </div>

                <div 
                  onClick={shareLocation}
                  className="bg-white h-24 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center space-y-1 cursor-pointer active:scale-95 transition-all"
                >
                  <Share2 size={20} className="text-blue-600" />
                  <span className="text-[8px] font-black text-gray-400 uppercase">Localização Atual</span>
                </div>
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl flex items-center space-x-3 border border-blue-50">
                <Clock size={14} className="text-blue-600" />
                <div>
                   <p className="text-[7px] font-black text-blue-400 uppercase leading-none">Vaga salva em:</p>
                   <p className="text-[10px] font-black text-blue-800 uppercase italic leading-tight">{new Date(parkingSpot.timestamp).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nav Inferior */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 px-8 pt-4 pb-[calc(1.2rem+var(--sab))] z-[100] flex justify-around items-center shrink-0 shadow-lg rounded-t-[2.5rem]">
        <button 
          onClick={() => { setActiveTab('home'); stopAlarm(); }} 
          className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'home' ? 'text-blue-600 scale-105' : 'text-gray-300'}`}
        >
          <div className={`p-2.5 rounded-xl ${activeTab === 'home' ? 'bg-blue-50' : 'bg-transparent'}`}>
            <Bell size={24} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter italic">Início</span>
        </button>
        
        <button 
          onClick={() => { setActiveTab('parking'); stopAlarm(); }} 
          className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'parking' ? 'text-blue-600 scale-105' : 'text-gray-300'}`}
        >
          <div className={`p-2.5 rounded-xl ${activeTab === 'parking' ? 'bg-blue-50' : 'bg-transparent'}`}>
            <MapPin size={24} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter italic">Vaga</span>
        </button>
        
        <button 
          onClick={() => { setActiveTab('events'); stopAlarm(); }} 
          className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'events' ? 'text-blue-600 scale-105' : 'text-gray-300'}`}
        >
          <div className={`p-2.5 rounded-xl ${activeTab === 'events' ? 'bg-blue-50' : 'bg-transparent'}`}>
            <Clock size={24} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter italic">Eventos</span>
        </button>
      </div>

      {/* MODAL RECEBIDO */}
      {showReceivedModal && activeAlert && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-md z-[100000] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-[310px] max-h-[80vh] rounded-[3rem] shadow-2xl overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-300 flex flex-col border border-white/10">
              <div className={`p-8 flex flex-col items-center text-center shrink-0 ${getActiveAlertConfig().bgColor.replace('bg-', 'bg-').replace('-50', '-600')}`}>
                 <div className="bg-white p-5 rounded-[2rem] mb-5 shadow-xl animate-bounce">
                    {renderIcon(activeAlert.icon, `w-10 h-10 ${getActiveAlertConfig().color}`)}
                 </div>
                 <h2 className="text-white text-2xl font-black uppercase italic tracking-tighter leading-none">ALERTA NO CARRO!</h2>
              </div>
              <div className="p-6 space-y-5 text-center flex-grow">
                 <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100">
                    <span className="text-blue-600 font-mono font-black text-2xl tracking-widest block mb-1">{String(vehicle?.plate || '')}</span>
                    <span className="text-gray-900 font-black text-[10px] uppercase italic">{String(vehicle?.model || '')} • {String(vehicle?.color || '')}</span>
                 </div>
                 <div className="bg-amber-400/5 p-5 rounded-[2rem] border border-amber-400/20">
                    <p className="text-gray-950 text-xl font-black italic uppercase leading-tight tracking-tight">"{String(activeAlert.message || '')}"</p>
                 </div>
                 <button 
                  onClick={() => { stopAlarm(); playTwoBeeps(); setShowReceivedModal(false); }} 
                  className="w-full py-5 bg-blue-600 text-white font-black rounded-[2rem] text-sm uppercase shadow-xl active:scale-95 transition-all mt-2 tracking-widest"
                 >
                   RECEBIDO!
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
