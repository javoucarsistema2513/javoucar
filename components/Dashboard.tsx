
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, LogOut, Bell, ShieldCheck, MapPin, Zap, Sun, 
  Disc, Minimize2, Hash, CheckCircle2, 
  Loader2, Lightbulb, TrafficCone, Package, Clock, Calendar, AlertTriangle,
  Navigation, Camera, Share2, Trash2, Crosshair, Car
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
  const watchIdRef = useRef<number | null>(null);

  const parkingKey = useMemo(() => {
    if (!vehicle?.plate) return 'parking_default';
    return `parking_${normalizePlate(vehicle.plate)}`;
  }, [vehicle?.plate]);

  const getFirstName = (name: any) => {
    if (!name || typeof name !== 'string') return 'Motorista';
    return name.trim().split(' ')[0];
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
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
      
      // Canal persistente com filtro de placa normalizado
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
            
            // Atualiza histórico na hora e mantém as últimas 20
            setAlertHistory(prev => {
              const updated = [newAlert, ...prev];
              const unique = Array.from(new Map(updated.map(item => [item.id, item])).values());
              return unique.slice(0, 20);
            });
            
            setShowReceivedModal(true);
            startAlarm();
          }
        )
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED');
          // Se desconectar, tenta reconectar após 5 segundos
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setTimeout(setupSubscription, 5000);
          }
        });
    };

    // Busca inicial do histórico (Aumentado para 20 itens)
    supabase
      .from('alerts')
      .select('*')
      .eq('target_plate', myPlate)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          setAlertHistory(data);
          data.forEach(a => receivedIdsRef.current.add(a.id));
        }
      });

    setupSubscription();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [vehicle?.plate]);

  useEffect(() => {
    const fetchParking = async () => {
      if (!vehicle?.plate) return;
      const myPlate = normalizePlate(vehicle.plate);
      
      const savedSpot = localStorage.getItem(parkingKey);
      if (savedSpot) {
        try {
          setParkingSpot(JSON.parse(savedSpot));
        } catch (e) {
          localStorage.removeItem(parkingKey);
        }
      }

      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('plate', myPlate)
          .maybeSingle();

        if (!error && data?.parking_data) {
          setParkingSpot(data.parking_data);
          localStorage.setItem(parkingKey, JSON.stringify(data.parking_data));
        }
      } catch (err) {
        console.info("Info: Sincronização offline ou coluna de vaga ausente.");
      }
    };
    fetchParking();
  }, [parkingKey, vehicle?.plate]);

  useEffect(() => {
    if (activeTab === 'parking' && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation(pos.coords);
          if (pos.coords.heading !== null) setHeading(pos.coords.heading);
        },
        null,
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      
      const handleOrientation = (e: DeviceOrientationEvent) => {
        const h = (e as any).webkitCompassHeading || (360 - (e.alpha || 0));
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

      setDistance(calculateDistance(userLocation.latitude, userLocation.longitude, parkingSpot.lat, parkingSpot.lng));
      setBearing(calculateBearing(userLocation.latitude, userLocation.longitude, parkingSpot.lat, parkingSpot.lng));
    }
  }, [userLocation, parkingSpot]);

  const saveParkingLocation = async () => {
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
    localStorage.setItem(parkingKey, JSON.stringify(spot));

    if (vehicle?.plate) {
      try {
        await supabase
          .from('vehicles')
          .update({ parking_data: spot } as any)
          .eq('plate', normalizePlate(vehicle.plate));
      } catch (err) {
        console.warn("Falha ao salvar no banco (coluna parking_data pode estar ausente)");
      }
    }

    playTwoBeeps();
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const clearParking = async () => {
    if (window.confirm("Deseja apagar a vaga definitivamente?")) {
      const myPlate = vehicle?.plate ? normalizePlate(vehicle.plate) : null;
      
      setParkingSpot(null);
      setDistance(null);
      setBearing(null);
      localStorage.removeItem(parkingKey);
      
      if (myPlate) {
        try {
          await supabase
            .from('vehicles')
            .update({ parking_data: null } as any)
            .eq('plate', myPlate);
        } catch (err) {
          console.warn("Vaga excluída localmente. Aviso: Coluna 'parking_data' ausente no banco.");
        }
      }
      playTwoBeeps();
    }
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
        reader.onload = async (re: any) => {
          if (parkingSpot) {
            const updated = { ...parkingSpot, photo: re.target.result };
            setParkingSpot(updated);
            localStorage.setItem(parkingKey, JSON.stringify(updated));
            if (vehicle?.plate) {
              try {
                await supabase
                  .from('vehicles')
                  .update({ parking_data: updated } as any)
                  .eq('plate', normalizePlate(vehicle.plate));
              } catch (e) {}
            }
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
    const message = `Localização da vaga (${vehicle?.model || 'veículo'}): ${url}`;
    if (navigator.share) {
      navigator.share({ title: 'Vaga JávouCar', text: message, url: url });
    } else {
      window.open(url, '_blank');
    }
  };

  const handleSendAlert = async (messageText: string) => {
    if (!messageText || !messageText.trim() || sending) return;
    initAudioAndPermissions();
    const plateToSearch = normalizePlate(targetPlate).trim();
    if (plateToSearch.length < 7) { setErrorMsg('Placa incompleta'); return; }
    setSending(true); 
    setErrorMsg('');
    try {
      const { data: targetVeh } = await supabase.from('vehicles').select('plate').eq('plate', plateToSearch).maybeSingle();
      if (!targetVeh) { setErrorMsg('Não encontrado'); setSending(false); return; }
      const alertConfig = PRECONFIGURED_ALERTS.find(a => a.text === messageText);
      const { error } = await supabase.from('alerts').insert({
        id: crypto.randomUUID(),
        target_plate: targetVeh.plate,
        sender_name: String(user?.fullName || 'Motorista'),
        message: String(messageText),
        icon: alertConfig?.icon || 'bell'
      });
      if (error) throw error;
      setTargetPlate(''); playTwoBeeps();
      setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) { setErrorMsg("Falha de rede"); } finally { setSending(false); }
  };

  const renderIcon = (name: string, className: string) => {
    const icons: any = { zap: Zap, 'door-closed': TrafficCone, sun: Lightbulb, package: Package, bell: Bell, disc: Disc, 'minimize-2': Minimize2 };
    const IconComp = icons[name] || Bell;
    return <IconComp className={className} />;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden pt-safe" onClick={initAudioAndPermissions}>
      {showSuccessToast && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[9999] bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center space-x-2 animate-in slide-in-from-top duration-500 font-black italic border border-white/10">
          <CheckCircle2 size={16} /> <span className="text-xs uppercase tracking-tighter text-nowrap">Concluído!</span>
        </div>
      )}

      {/* Header Fixo */}
      <div className="bg-blue-600 pb-10 pt-8 px-5 rounded-b-[2.5rem] shadow-xl shrink-0 relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-1.5 mb-1">
              <h2 className="text-white text-[9px] font-black uppercase tracking-widest italic opacity-70">Jávou<span className="text-yellow-400">Car</span></h2>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            </div>
            <h1 className="text-white text-2xl font-black truncate tracking-tighter leading-none">Oi, {getFirstName(user?.fullName)}</h1>
          </div>
          <button onClick={onLogout} className="bg-white/10 p-3 rounded-xl text-white active:scale-90 transition-all border border-white/5 shadow-lg"><LogOut size={20} /></button>
        </div>
      </div>

      {activeTab === 'home' && (
        <>
          <div className="px-5 -mt-6 shrink-0 z-20">
            <div className="bg-white p-4 rounded-[1.8rem] shadow-xl border border-gray-100 flex items-center space-x-4">
              <div className="bg-blue-600 p-2.5 rounded-2xl shadow-md text-white"><ShieldCheck size={22} /></div>
              <div className="flex-grow min-w-0">
                <h3 className="text-gray-950 font-black text-[13px] uppercase truncate leading-none mb-1 tracking-tight">{String(vehicle?.model || '')}</h3>
                <div className="flex items-center">
                   <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg mr-2 font-mono text-[9px] font-black border border-blue-100">{String(vehicle?.plate || '')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 pt-3 shrink-0">
            <div className="p-3 bg-white rounded-[1.8rem] border border-gray-100 shadow-sm">
              <label className="text-[9px] font-black uppercase text-gray-400 mb-1 block ml-1 tracking-widest">Placa do Alvo</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="text" placeholder="ABC1D23"
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-50 uppercase font-black text-xl tracking-widest outline-none transition-all placeholder:text-gray-200"
                  value={targetPlate} onChange={e => { setErrorMsg(''); setTargetPlate(e.target.value.toUpperCase()); }} maxLength={7}
                />
              </div>
              {errorMsg && <p className="text-red-600 text-[8px] font-black mt-1.5 ml-1 uppercase">{String(errorMsg)}</p>}
            </div>
          </div>

          <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-3 pb-32">
            <div className="grid grid-cols-1 gap-1.5 mb-4">
              {PRECONFIGURED_ALERTS.map((alert) => (
                <button key={alert.id} disabled={sending} onClick={() => handleSendAlert(alert.text)} className="flex items-center p-2.5 bg-white border border-gray-100 rounded-[1.2rem] active:bg-blue-600 active:text-white transition-all text-left shadow-sm group disabled:opacity-50">
                  <div className={`p-2.5 rounded-xl mr-3 shadow-sm group-active:bg-white/20 ${alert.bgColor}`}>
                    {renderIcon(alert.icon, `w-4 h-4 ${alert.color} group-active:text-white`)}
                  </div>
                  <span className="text-gray-900 font-black text-[10px] flex-grow uppercase italic tracking-tight group-active:text-white leading-tight">{String(alert.text)}</span>
                  <div className="bg-gray-50 p-1.5 rounded-full group-active:bg-white/20"><Send size={10} className="text-gray-300 group-active:text-white" /></div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'events' && (
        <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-6 pb-32">
          <div className="flex items-center justify-between mb-4 px-1 shrink-0">
            <h3 className="text-gray-950 font-black text-lg uppercase italic tracking-tighter leading-none">Histórico de Eventos</h3>
            <span className="text-[7px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">Últimos 20</span>
          </div>
          <div className="space-y-2">
            {alertHistory.length === 0 ? (
              <div className="bg-white p-8 rounded-[2rem] text-center border border-gray-100 shadow-sm">
                <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-black text-[9px] uppercase tracking-widest leading-none">Nada registrado ainda</p>
              </div>
            ) : (
              alertHistory.map((alert) => {
                const config = PRECONFIGURED_ALERTS.find(a => a.icon === alert.icon) || PRECONFIGURED_ALERTS[4];
                return (
                  <div key={alert.id} className="bg-white p-3 rounded-[1.2rem] border border-gray-50 shadow-sm flex items-start space-x-3 animate-in fade-in slide-in-from-left duration-300">
                    <div className={`p-2 rounded-xl shadow-sm ${config.bgColor}`}>{renderIcon(alert.icon, `w-4 h-4 ${config.color}`)}</div>
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">{String(getFirstName(alert.sender_name))}</span>
                        <span className="text-[7px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-lg">{formatTime(alert.created_at)}</span>
                      </div>
                      <p className="text-gray-950 font-black text-[10px] uppercase italic leading-tight">"{String(alert.message || '')}"</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'parking' && (
        <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-5 pb-32 flex flex-col">
          <div className="flex items-center justify-between mb-4 px-1 shrink-0">
            <div className="flex flex-col">
              <h3 className="text-gray-950 font-black text-lg uppercase italic tracking-tighter leading-none">Vaga</h3>
              <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic leading-none">Localizador GPS</span>
            </div>
            {parkingSpot && (
              <button 
                onClick={clearParking}
                className="p-3 bg-red-50 text-red-500 rounded-full active:scale-75 transition-all border border-red-100 shadow-sm"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>

          {!parkingSpot ? (
            <div className="flex-grow flex flex-col items-center justify-center p-4 text-center space-y-4">
              <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col items-center w-full">
                <div className="bg-blue-50 p-4 rounded-full mb-4 shadow-inner"><MapPin className="w-10 h-10 text-blue-600 animate-pulse" /></div>
                <h4 className="text-gray-950 font-black text-base uppercase italic mb-1 tracking-tighter leading-none">Vaga não marcada</h4>
                <p className="text-gray-400 text-[9px] font-bold leading-tight uppercase tracking-widest">Aguardando registro...</p>
              </div>
              <button onClick={saveParkingLocation} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-[0.15em] text-[10px] flex items-center justify-center space-x-2 active:scale-95 transition-all">
                <Crosshair size={18} /><span>SALVAR VAGA AQUI</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 flex-grow flex flex-col overflow-hidden">
              {/* Radar Médio (w-32) */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-50 flex flex-col items-center relative overflow-hidden shrink-0">
                <div className="relative w-32 h-32 rounded-full border-4 border-gray-50 bg-gray-50/20 flex items-center justify-center mb-4 shadow-inner">
                  <div className="absolute w-24 h-24 rounded-full border border-gray-200/20"></div>
                  <div className="absolute w-12 h-12 rounded-full border border-gray-200/20"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <div className="h-full w-[1px] bg-gray-400"></div>
                    <div className="w-full h-[1px] bg-gray-400"></div>
                  </div>
                  
                  <span className="absolute top-1.5 text-[8px] font-black text-gray-300">N</span>
                  <span className="absolute bottom-1.5 text-[8px] font-black text-gray-300">S</span>
                  <span className="absolute left-1.5 text-[8px] font-black text-gray-300">O</span>
                  <span className="absolute right-1.5 text-[8px] font-black text-gray-300">L</span>
                  
                  <div className="absolute w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-lg z-10"></div>
                  
                  <div className="absolute inset-0 transition-transform duration-300 ease-out" style={{ transform: `rotate(${(bearing || 0) - heading}deg)` }}>
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
                        <Car size={16} className="text-white" />
                      </div>
                      <div className="w-0.5 h-8 bg-gradient-to-t from-blue-600 to-transparent mt-1 opacity-50"></div>
                    </div>
                  </div>
                </div>

                <div className="text-center w-full px-1">
                  <div className="flex items-center justify-center space-x-1.5 mb-1">
                    <Navigation size={12} className="text-blue-600" />
                    <span className="text-2xl font-black text-gray-950 tracking-tighter italic leading-none">
                      {distance !== null ? (distance < 1000 ? `${distance.toFixed(0)}m` : `${(distance/1000).toFixed(1)}km`) : '---'}
                    </span>
                  </div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none text-nowrap">Distância aproximada</p>
                </div>
              </div>

              {/* Grid Ações Compacto (h-20) */}
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <div onClick={takeParkingPhoto} className="bg-white h-20 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center relative cursor-pointer active:scale-95 transition-all overflow-hidden">
                  {parkingSpot.photo ? (
                    <>
                      <img src={String(parkingSpot.photo)} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                      <div className="relative z-10 flex flex-col items-center"><Camera size={20} className="text-white drop-shadow-md" /><span className="text-[8px] font-black text-white uppercase drop-shadow-md">Trocar Foto</span></div>
                    </>
                  ) : (
                    <><Camera size={20} className="text-blue-600" /><span className="text-[8px] font-black text-gray-400 uppercase leading-none mt-1.5">Tirar Foto</span></>
                  )}
                </div>
                <div onClick={shareLocation} className="bg-white h-20 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all">
                  <Share2 size={20} className="text-blue-600" /><span className="text-[8px] font-black text-gray-400 uppercase leading-none mt-1.5">Partilhar</span>
                </div>
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl flex items-center space-x-3 border border-blue-50 mt-auto mb-2 shrink-0">
                <Clock size={12} className="text-blue-600" />
                <div className="min-w-0">
                   <p className="text-[7px] font-black text-blue-400 uppercase leading-none">Salvo em:</p>
                   <p className="text-[10px] font-black text-blue-800 uppercase italic leading-tight truncate">{new Date(parkingSpot.timestamp).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nav Inferior Fixo */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 px-8 pt-3 pb-[calc(1rem+var(--sab))] z-[100] flex justify-around items-center shrink-0 shadow-lg rounded-t-[2.5rem]">
        <button onClick={() => { setActiveTab('home'); stopAlarm(); }} className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'home' ? 'text-blue-600 scale-105' : 'text-gray-300'}`}>
          <div className={`p-2 rounded-xl ${activeTab === 'home' ? 'bg-blue-50' : 'bg-transparent'}`}><Bell size={22} /></div>
          <span className="text-[8px] font-black uppercase tracking-tighter italic">Alerta</span>
        </button>
        <button onClick={() => { setActiveTab('parking'); stopAlarm(); }} className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'parking' ? 'text-blue-600 scale-105' : 'text-gray-300'}`}>
          <div className={`p-2 rounded-xl ${activeTab === 'parking' ? 'bg-blue-50' : 'bg-transparent'}`}><MapPin size={22} /></div>
          <span className="text-[8px] font-black uppercase tracking-tighter italic">Vaga</span>
        </button>
        <button onClick={() => { setActiveTab('events'); stopAlarm(); }} className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'events' ? 'text-blue-600 scale-105' : 'text-gray-300'}`}>
          <div className={`p-2 rounded-xl ${activeTab === 'events' ? 'bg-blue-50' : 'bg-transparent'}`}><Clock size={22} /></div>
          <span className="text-[8px] font-black uppercase tracking-tighter italic">Log</span>
        </button>
      </div>

      {/* MODAL RECEBIDO (Z-INDEX EXTREMO) */}
      {showReceivedModal && activeAlert && (
        <div className="fixed inset-0 bg-gray-950/95 backdrop-blur-xl z-[999999] flex items-center justify-center p-6 animate-in fade-in duration-500">
           <div className="bg-white w-full max-w-[310px] max-h-[85vh] rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] overflow-y-auto no-scrollbar animate-in zoom-in-90 duration-300 flex flex-col border border-white/20">
              <div className={`p-8 flex flex-col items-center text-center shrink-0 ${ (PRECONFIGURED_ALERTS.find(a => a.icon === activeAlert.icon) || PRECONFIGURED_ALERTS[4]).bgColor.replace('-50', '-600')}`}>
                 <div className="bg-white p-6 rounded-[2.5rem] mb-6 shadow-2xl animate-pulse">
                    {renderIcon(activeAlert.icon, `w-12 h-12 ${ (PRECONFIGURED_ALERTS.find(a => a.icon === activeAlert.icon) || PRECONFIGURED_ALERTS[4]).color}`)}
                 </div>
                 <h2 className="text-white text-2xl font-black uppercase italic tracking-tighter leading-none mb-1">ALERTA URGENTE!</h2>
                 <p className="text-white/70 text-[8px] font-black uppercase tracking-widest">Recebido Agora</p>
              </div>
              <div className="p-6 space-y-5 text-center flex-grow">
                 <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 shadow-inner">
                    <span className="text-blue-600 font-mono font-black text-2xl tracking-widest block mb-1">{String(vehicle?.plate || '')}</span>
                    <span className="text-gray-900 font-black text-[10px] uppercase italic">{String(vehicle?.model || '')} • {String(vehicle?.color || '')}</span>
                 </div>
                 <div className="bg-amber-400/10 p-6 rounded-[2.5rem] border-2 border-amber-400/30">
                    <p className="text-gray-950 text-xl font-black italic uppercase leading-tight tracking-tight">"{String(activeAlert.message || '')}"</p>
                 </div>
                 <button 
                  onClick={() => { stopAlarm(); playTwoBeeps(); setShowReceivedModal(false); }} 
                  className="w-full py-6 bg-blue-600 text-white font-black rounded-[2.5rem] text-sm uppercase shadow-2xl active:scale-95 transition-all mt-2 tracking-[0.2em] border-b-4 border-blue-800"
                >
                  OK, ENTENDI!
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
