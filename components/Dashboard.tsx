import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, LogOut, Bell, ShieldCheck, MapPin, Zap, 
  Hash, CheckCircle2, TrafficCone, Package, Clock, Calendar,
  Camera, Share2, Trash2, Loader2, Navigation2, Compass, LocateFixed, Wifi, WifiOff,
  DoorClosed, Sun, Disc, Minimize2, Car, RefreshCw, X, MessageSquareText
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
  const [connStatus, setConnStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [parkingSpot, setParkingSpot] = useState<ParkingLocation | null>(vehicle?.parking_data || null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [bearingToCar, setBearingToCar] = useState<number>(0);
  const [isLocating, setIsLocating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [hasOrientationPermission, setHasOrientationPermission] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const receivedIdsRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const getFirstName = (name: any) => (name?.trim().split(' ')[0] || 'Motorista');
  const formatTime = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const getAlertIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      'zap': Zap, 'door-closed': DoorClosed, 'sun': Sun, 
      'package': Package, 'bell': Bell, 'disc': Disc, 'minimize-2': Minimize2
    };
    return icons[iconName] || Bell;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; 
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); 
  };

  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const φ1 = lat1 * Math.PI/180; const φ2 = lat2 * Math.PI/180;
    const Δλ = (lon2 - lon1) * Math.PI/180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  const initAudio = async () => { 
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  };

  const requestOrientationPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setHasOrientationPermission(true);
          window.addEventListener('deviceorientation', handleOrientation, true);
        }
      } catch (err) {
        console.error("Permission error:", err);
      }
    } else {
      setHasOrientationPermission(true);
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  };

  const handleOrientation = (e: DeviceOrientationEvent) => {
    let heading = 0;
    if ((e as any).webkitCompassHeading) {
      heading = (e as any).webkitCompassHeading;
    } else if (e.alpha !== null) {
      heading = 360 - e.alpha;
    }
    setCurrentHeading(heading);
  };
  
  const stopAlarm = () => { 
    if (alarmIntervalRef.current) { 
      clearInterval(alarmIntervalRef.current); 
      alarmIntervalRef.current = null; 
    } 
  };
  
  const playConfirmationSound = async () => {
    await initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.15);
    if ("vibrate" in navigator) navigator.vibrate(30);
  };

  const startAlarm = async () => {
    stopAlarm();
    await initAudio();
    const tone = () => {
      const ctx = audioContextRef.current; 
      if (!ctx) return;
      const osc = ctx.createOscillator(); 
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime); 
      osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      osc.connect(gain); 
      gain.connect(ctx.destination);
      osc.start(); 
      osc.stop(ctx.currentTime + 0.5);
      if ("vibrate" in navigator) navigator.vibrate([250, 100, 250]);
    };
    tone();
    alarmIntervalRef.current = setInterval(tone, 1000);
  };

  const triggerSystemNotification = (payload: AlertPayload) => {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((registration) => {
        // Fix: Cast options to any as vibrate might not be present in some NotificationOptions definitions
        registration.showNotification(`ALERTA: ${payload.target_plate}`, {
          body: `${getFirstName(payload.sender_name)} avisou: ${payload.message}`,
          icon: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=192&h=192',
          vibrate: [200, 100, 200, 100, 200],
          tag: 'javoucar-alert',
          renotify: true,
          data: { url: window.location.href }
        } as any);
      });
    }
  };

  const subscribeToRadar = useCallback(() => {
    if (!vehicle?.plate) return;
    const myPlate = normalizePlate(vehicle.plate);
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`radar_${myPlate}`, { config: { broadcast: { self: true } } });
    
    channel
      .on('broadcast', { event: 'alert' }, ({ payload }) => {
        if (receivedIdsRef.current.has(payload.id)) return;
        receivedIdsRef.current.add(payload.id);
        
        setActiveAlert(payload);
        setAlertHistory(prev => [payload, ...prev].slice(0, 2));
        setShowReceivedModal(true);
        startAlarm();
        triggerSystemNotification(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnStatus('online');
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        } else {
          setConnStatus('offline');
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => subscribeToRadar(), 3000);
        }
      });

    channelRef.current = channel;
  }, [vehicle?.plate]);

  useEffect(() => {
    subscribeToRadar();
    
    if (vehicle?.plate) {
      supabase.from('alerts')
        .select('*')
        .eq('target_plate', normalizePlate(vehicle.plate))
        .order('created_at', { ascending: false })
        .limit(2)
        .then(({ data }) => { if (data) setAlertHistory(data); });
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && connStatus === 'offline') {
        subscribeToRadar();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
      
    return () => { 
      if (channelRef.current) supabase.removeChannel(channelRef.current); 
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      stopAlarm(); 
    };
  }, [vehicle?.plate, subscribeToRadar]);

  const handleSendAlert = async (text: string) => {
    if (!text || sending) return;
    await initAudio();
    const plate = normalizePlate(targetPlate);
    if (plate.length < 7) { setErrorMsg('Placa incompleta'); return; }
    
    setSending(true); 
    setErrorMsg('');

    try {
      const alertId = crypto.randomUUID();
      const alertData = {
        id: alertId,
        target_plate: plate,
        sender_name: String(user?.fullName || 'Motorista'),
        message: text,
        icon: PRECONFIGURED_ALERTS.find(a => a.text === text)?.icon || 'bell',
        created_at: new Date().toISOString()
      };
      
      const { error: dbError } = await supabase.from('alerts').insert([alertData]);
      if (dbError) throw dbError;

      const sendChannel = supabase.channel(`radar_${plate}`);
      sendChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await sendChannel.send({ 
            type: 'broadcast', 
            event: 'alert', 
            payload: alertData 
          });
          setTimeout(() => supabase.removeChannel(sendChannel), 1000);
        }
      });

      setTargetPlate(''); 
      setCustomMessage('');
      setShowSuccessToast(true);
      playConfirmationSound();
      setTimeout(() => setShowSuccessToast(false), 2000);
      
    } catch (err: any) { 
      setErrorMsg(err.message || "Erro de conexão."); 
    } finally {
      setSending(false);
    }
  };

  const handleSaveParking = async (photoBase64?: string) => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) throw new Error("Não autenticado.");
          const newSpot: ParkingLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now(), photo: photoBase64 || parkingSpot?.photo };
          await supabase.from('vehicles').update({ parking_data: newSpot }).eq('user_id', authUser.id);
          setParkingSpot(newSpot);
          playConfirmationSound();
        } catch (err: any) {
          alert(`Erro ao salvar: ${err.message}`);
        } finally {
          setIsLocating(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      () => { alert("Ative o GPS."); setIsLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleClearParking = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await supabase.from('vehicles').update({ parking_data: null }).eq('user_id', authUser.id);
      setParkingSpot(null);
      playConfirmationSound();
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsLocating(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        if (width > 800) { height *= 800 / width; width = 800; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.drawImage(img, 0, 0, width, height); handleSaveParking(canvas.toDataURL('image/jpeg', 0.6)); }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleShareLocation = async () => {
    if (!parkingSpot) return;
    setIsSharing(true);
    const url = `https://www.google.com/maps/search/?api=1&query=${parkingSpot.lat},${parkingSpot.lng}`;
    const text = `Meu carro está estacionado aqui: ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Localização do meu veículo - JávouCar',
          text: text,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Link de localização copiado!");
      }
    } catch (err) {
      console.error("Erro ao compartilhar:", err);
    } finally {
      setIsSharing(false);
    }
  };

  useEffect(() => {
    if (!parkingSpot || activeTab !== 'parking') return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentDistance(calculateDistance(pos.coords.latitude, pos.coords.longitude, parkingSpot.lat, parkingSpot.lng));
        setBearingToCar(calculateBearing(pos.coords.latitude, pos.coords.longitude, parkingSpot.lat, parkingSpot.lng));
      },
      null, { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [parkingSpot, activeTab]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden pt-safe" onPointerDown={initAudio}>
      {/* Toast Feedback */}
      {showSuccessToast && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[9999] bg-green-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center space-x-2 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={14} /> 
          <span className="text-[9px] font-black uppercase tracking-widest italic">Aviso Enviado!</span>
        </div>
      )}

      {/* Header com Status Radar */}
      <div className="bg-blue-600 pb-6 pt-4 px-5 rounded-b-[2rem] shadow-xl shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <div className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter border mb-1 ${connStatus === 'online' ? 'bg-green-400/20 text-green-100 border-green-400/30' : 'bg-red-400/20 text-red-100 border-red-400/30 animate-pulse'}`}>
              {connStatus === 'online' ? <Wifi size={8} /> : <WifiOff size={8} />}
              <span>{connStatus === 'online' ? 'Radar Ativo' : 'Reconectando...'}</span>
            </div>
            <h1 className="text-white text-xl font-black truncate tracking-tighter italic leading-none">Olá, {getFirstName(user?.fullName)}</h1>
          </div>
          <button onClick={onLogout} className="bg-white/10 p-2.5 rounded-xl text-white active:scale-90 transition-all backdrop-blur-md border border-white/5"><LogOut size={16} /></button>
        </div>
      </div>

      {activeTab === 'home' && (
        <>
          <div className="px-5 -mt-4 z-20">
            <div className="bg-white p-3.5 rounded-[1.2rem] shadow-xl border border-blue-50 flex items-center space-x-3">
              <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg"><ShieldCheck size={20} /></div>
              <div className="flex-grow min-w-0">
                <h3 className="text-gray-950 font-black text-[11px] uppercase truncate tracking-tight italic">{vehicle?.model || 'Seu Veículo'}</h3>
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-mono text-[10px] font-black border border-blue-100 mt-0.5 inline-block">{vehicle?.plate || '---'}</span>
              </div>
            </div>
          </div>

          <div className="px-5 pt-4 shrink-0 space-y-2">
            <div className="p-3 bg-white rounded-[1.5rem] border border-gray-100 shadow-lg space-y-2.5">
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="text" placeholder="PLACA DO VEÍCULO"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl uppercase font-black text-sm tracking-widest outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100"
                  value={targetPlate} onChange={e => { setErrorMsg(''); setTargetPlate(e.target.value.toUpperCase()); }} maxLength={7}
                />
              </div>
              
              <div className="relative">
                <MessageSquareText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="text" placeholder="MENSAGEM PERSONALIZADA..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl uppercase font-black text-[10px] tracking-tight italic outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100"
                  value={customMessage} onChange={e => setCustomMessage(e.target.value)}
                />
              </div>

              {errorMsg && <p className="text-red-600 text-[8px] font-black mt-1 ml-1 uppercase italic">{errorMsg}</p>}
              
              <button 
                onClick={() => handleSendAlert(customMessage)}
                disabled={sending || !customMessage || !targetPlate}
                className="w-full py-3 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-30"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Enviar</span>
              </button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-4 pb-24">
            <div className="mb-2">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Avisos Rápidos</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {PRECONFIGURED_ALERTS.map((alert) => {
                const Icon = getAlertIcon(alert.icon);
                return (
                  <button 
                    key={alert.id} disabled={sending} onClick={() => handleSendAlert(alert.text)} 
                    className="flex items-center p-3 bg-white border border-gray-100 rounded-xl active:scale-95 transition-all text-left shadow-sm group disabled:opacity-50"
                  >
                    <div className={`p-2.5 rounded-lg mr-3.5 ${alert.bgColor} group-active:bg-blue-600`}>
                      <Icon className={`w-5 h-5 ${alert.color} group-active:text-white`} />
                    </div>
                    <span className="text-gray-950 font-black text-[11px] flex-grow uppercase italic tracking-tight group-active:text-blue-600 leading-tight">{alert.text}</span>
                    <div className="bg-gray-50 p-1.5 rounded-full">
                      <Send size={12} className="text-gray-300" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activeTab === 'parking' && (
         <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-4 pb-24 flex flex-col items-center">
            {!parkingSpot ? (
              <div className="flex flex-col items-center justify-center pt-8 text-center space-y-6 w-full">
                 <div className="bg-blue-50 p-8 rounded-full animate-pulse border-4 border-white shadow-xl">
                    <MapPin size={40} className="text-blue-600" />
                 </div>
                 <h3 className="text-xl font-black italic uppercase tracking-tighter">Radar de Vaga</h3>
                 <div className="w-full space-y-2">
                    <button onClick={() => handleSaveParking()} disabled={isLocating} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg flex items-center justify-center space-x-2 uppercase tracking-widest text-[10px] active:scale-95">
                      {isLocating ? <Loader2 className="animate-spin w-4 h-4" /> : <LocateFixed size={18} />}
                      <span>Fixar Localização</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-gray-100 text-gray-700 font-black rounded-xl flex items-center justify-center space-x-2 text-[9px] uppercase tracking-widest active:scale-95 border border-gray-200">
                      <Camera size={16} /> <span>Foto da Vaga</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handlePhotoUpload} />
                 </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 w-full flex flex-col items-center">
                 <div className="relative bg-[#0a0f1e] rounded-full w-[230px] h-[230px] shadow-2xl border-[6px] border-white flex items-center justify-center overflow-hidden">
                    <div className="absolute w-full h-full transition-transform duration-100 ease-linear" style={{ transform: `rotate(${-currentHeading}deg)` }}>
                        <span className="absolute top-3 left-1/2 -translate-x-1/2 text-blue-500 font-black text-lg italic">N</span>
                        {[0, 90, 180, 270].map(deg => (
                          <div key={deg} className="absolute inset-0 flex items-start justify-center" style={{ transform: `rotate(${deg}deg)` }}>
                             <div className="w-0.5 h-3 bg-white/20 mt-1" />
                          </div>
                        ))}
                    </div>
                    <div className="absolute w-full h-full transition-transform duration-300 ease-out" style={{ transform: `rotate(${bearingToCar - currentHeading}deg)` }}>
                       <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg border-2 border-white animate-bounce">
                             <Car size={24} className="text-white fill-white" />
                          </div>
                       </div>
                    </div>
                    <div className="absolute z-10 flex flex-col items-center bg-gray-950/80 backdrop-blur-lg p-5 rounded-full border border-white/5">
                       <div className="text-white text-3xl font-black italic tracking-tighter leading-none mb-0.5">
                          {currentDistance !== null ? (currentDistance < 1000 ? `${Math.round(currentDistance)}m` : `${(currentDistance/1000).toFixed(1)}km`) : '--'}
                       </div>
                       <div className="text-[7px] font-black text-blue-400 uppercase tracking-widest">Distância</div>
                    </div>
                    {!hasOrientationPermission && (
                       <div className="absolute inset-0 z-50 bg-gray-950/90 flex flex-col items-center justify-center p-4 text-center">
                          <Compass size={32} className="text-blue-500 mb-2 animate-spin-slow" />
                          <button onClick={requestOrientationPermission} className="bg-blue-600 text-white px-5 py-2 rounded-full font-black text-[8px] uppercase tracking-widest active:scale-95">
                             Ativar Bússola
                          </button>
                       </div>
                    )}
                 </div>

                 <div className="w-full grid grid-cols-3 gap-2 px-1">
                    <button onClick={handleShareLocation} disabled={isSharing} className="flex flex-col items-center py-3 bg-white rounded-xl border border-gray-100 text-blue-600 shadow-sm active:bg-blue-50">
                       {isSharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />} 
                       <span className="text-[7px] font-black uppercase mt-1">Enviar</span>
                    </button>
                    <button onClick={requestOrientationPermission} className="flex flex-col items-center py-3 bg-white rounded-xl border border-gray-100 text-blue-600 shadow-sm active:bg-blue-50">
                       <RefreshCw size={18} className={hasOrientationPermission ? 'animate-spin-slow' : ''} /> 
                       <span className="text-[7px] font-black uppercase mt-1">Girar</span>
                    </button>
                    <button onClick={() => { if(confirm("Apagar?")) handleClearParking(); }} className="flex flex-col items-center py-3 bg-red-50 rounded-xl border border-red-100 text-red-500 active:bg-red-100">
                       <Trash2 size={18} /> <span className="text-[7px] font-black uppercase mt-1">Limpar</span>
                    </button>
                 </div>

                 {parkingSpot.photo && (
                    <div className="w-full px-1">
                      <div className="rounded-2xl overflow-hidden shadow-lg border-4 border-white relative aspect-video">
                         <img src={parkingSpot.photo} alt="Ref" className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                            <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${parkingSpot.lat},${parkingSpot.lng}`)} className="bg-blue-600 text-white p-2 rounded-lg ml-auto">
                               <Navigation2 size={16} />
                            </button>
                         </div>
                      </div>
                    </div>
                 )}
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handlePhotoUpload} />
              </div>
            )}
         </div>
      )}

      {activeTab === 'events' && (
        <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-4 pb-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-950 font-black text-xl uppercase italic tracking-tighter leading-none">Últimos Eventos</h3>
            <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{alertHistory.length} Recentes</span>
          </div>
          <div className="space-y-2">
            {alertHistory.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center border border-gray-100 text-gray-300 flex flex-col items-center">
                <Calendar size={32} className="mb-3 opacity-10" />
                <p className="text-[9px] font-black uppercase italic tracking-widest">Sem registros</p>
              </div>
            ) : (
              alertHistory.map((alert) => (
                <div key={alert.id} className="bg-white p-3.5 rounded-xl border border-gray-50 flex items-start space-x-3 shadow-md animate-in slide-in-from-bottom-2">
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 shrink-0"><Bell size={16} /></div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest truncate">{getFirstName(alert.sender_name)}</span>
                      <span className="text-[8px] font-black text-blue-600 italic shrink-0 bg-blue-50/50 px-1.5 py-0.5 rounded-md">{formatTime(alert.created_at)}</span>
                    </div>
                    <p className="text-gray-950 font-black text-[11px] uppercase italic leading-tight tracking-tight">"{alert.message}"</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Nav Inferior Minimalista */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 px-6 pt-2.5 pb-[calc(0.6rem+var(--sab))] z-[100] flex justify-around items-center rounded-t-[2rem] shadow-[0_-5px_25px_rgba(0,0,0,0.03)]">
        <button onClick={() => { setActiveTab('home'); stopAlarm(); }} className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-300'}`}>
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'home' ? 'bg-blue-50' : ''}`}><Bell size={20} /></div>
          <span className="text-[7px] font-black uppercase italic tracking-widest">Avisar</span>
        </button>
        <button onClick={() => { setActiveTab('parking'); stopAlarm(); }} className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'parking' ? 'text-blue-600' : 'text-gray-300'}`}>
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'parking' ? 'bg-blue-50' : ''}`}><Compass size={20} /></div>
          <span className="text-[7px] font-black uppercase italic tracking-widest">Radar</span>
        </button>
        <button onClick={() => { setActiveTab('events'); stopAlarm(); }} className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'events' ? 'text-blue-600' : 'text-gray-300'}`}>
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'events' ? 'bg-blue-50' : ''}`}><Clock size={20} /></div>
          <span className="text-[7px] font-black uppercase italic tracking-widest">Eventos</span>
        </button>
      </div>

      {/* MODAL DE ALERTA RECEBIDO - DIMENSIONADO PARA SER MAIS COMPACTO */}
      {showReceivedModal && activeAlert && (
        <div className="fixed inset-0 bg-gray-950/98 backdrop-blur-3xl z-[99999999] flex items-center justify-center p-6 animate-in fade-in duration-500">
           <div className="bg-white w-full max-w-[310px] rounded-[2.5rem] shadow-[0_50px_120px_rgba(0,0,0,0.95)] overflow-hidden animate-in zoom-in-90 duration-300 relative flex flex-col">
              
              <button 
                onClick={() => { stopAlarm(); playConfirmationSound(); setShowReceivedModal(false); }} 
                className="absolute top-4 right-4 p-2 bg-gray-100/80 rounded-full text-gray-400 active:scale-90 transition-all z-20"
              >
                 <X size={16} />
              </button>

              <div className="bg-red-600 p-6 flex flex-col items-center text-center">
                 <div className="bg-white p-3.5 rounded-[1.2rem] mb-3 shadow-xl animate-bounce">
                    <Bell className="w-8 h-8 text-red-600" />
                 </div>
                 <h2 className="text-white text-lg font-black uppercase italic tracking-tighter leading-none mb-1">ALERTA URGENTE</h2>
                 <p className="text-red-100 text-[7px] font-black uppercase tracking-[0.3em] opacity-80">Ação imediata!</p>
              </div>

              <div className="p-5 space-y-4">
                 <div className="bg-gray-50 p-3.5 rounded-[1.2rem] border border-gray-100 shadow-inner space-y-1">
                    <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest block text-center">Seu Veículo</span>
                    <div className="flex flex-col items-center">
                       <h4 className="text-gray-950 font-black text-[12px] uppercase italic tracking-tight text-center">
                         {vehicle?.model} • {vehicle?.color}
                       </h4>
                       <span className="text-blue-600 font-mono font-black text-xl tracking-[0.15em] uppercase leading-none mt-1">
                         {vehicle?.plate}
                       </span>
                    </div>
                 </div>

                 <div className="text-center space-y-2 px-1">
                    <div className="inline-block bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                       <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic">
                         {getFirstName(activeAlert.sender_name)} avisou:
                       </span>
                    </div>
                    <p className="text-gray-950 text-lg font-black italic uppercase leading-tight tracking-tight px-1">
                      "{activeAlert.message}"
                    </p>
                 </div>

                 <button 
                   onClick={() => { stopAlarm(); playConfirmationSound(); setShowReceivedModal(false); }} 
                   className="w-full py-3.5 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-2xl active:scale-[0.96] transition-all flex items-center justify-center space-x-2 border-b-4 border-blue-800"
                 >
                   <CheckCircle2 size={16} />
                   <span>OK, ENTENDIDO!</span>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;