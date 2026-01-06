
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, LogOut, Bell, ShieldCheck, MapPin, Zap, 
  Hash, CheckCircle2, TrafficCone, Package, Clock, Calendar,
  Camera, Share2, Trash2, Loader2, Navigation2, Compass, LocateFixed, Wifi, WifiOff,
  DoorClosed, Sun, Disc, Minimize2, Car, RefreshCw, X, MessageSquareText,
  Target, Siren, Layout
} from 'lucide-react';
import { VehicleData, UserData, PRECONFIGURED_ALERTS, normalizePlate, ParkingLocation } from '../types';
import { supabase } from '../supabase';

interface DashboardProps {
  vehicle: VehicleData | null;
  user: UserData | null;
  onLogout: () => void;
  onVehicleUpdate: (updatedVehicle: VehicleData | null) => void;
}

interface AlertPayload {
  id: string;
  message: string;
  icon: string;
  target_plate: string;
  sender_name: string;
  created_at: string;
}

const Dashboard: React.FC<DashboardProps> = ({ vehicle, user, onLogout, onVehicleUpdate }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'events' | 'parking'>('home');
  const [targetPlate, setTargetPlate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [activeAlert, setActiveAlert] = useState<AlertPayload | null>(null);
  const [alertHistory, setAlertHistory] = useState<AlertPayload[]>([]);
  const [connStatus, setConnStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  const [parkingSpot, setParkingSpot] = useState<ParkingLocation | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [bearingToCar, setBearingToCar] = useState<number>(0);
  const [isLocating, setIsLocating] = useState(false);
  const [hasOrientationPermission, setHasOrientationPermission] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const receivedIdsRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    setParkingSpot(vehicle?.parking_data || null);
  }, [vehicle]);

  const getFirstName = (name: any) => (name?.trim().split(' ')[0] || 'Motorista');
  const formatTime = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const getAlertIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      'zap': Zap, 'traffic-cone': TrafficCone, 'sun': Sun, 'package': Package,
      'siren': Siren, 'disc': Disc, 'layout': Layout, 'bell': Bell,
      'door-closed': DoorClosed, 'minimize-2': Minimize2
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
    const φ1 = lat1 * Math.PI/180; 
    const φ2 = lat2 * Math.PI/180;
    const Δλ = (lon2 - lon1) * Math.PI/180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  const initAudio = async () => { 
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
  };

  const stopAlarm = () => { 
    if (alarmIntervalRef.current) { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; }
    if ("vibrate" in navigator) navigator.vibrate(0);
  };
  
  const playConfirmationSound = async () => {
    await initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(1200, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(now + 0.15);
    if ("vibrate" in navigator) navigator.vibrate(30);
  };

  const startAlarm = async () => {
    stopAlarm(); await initAudio();
    const tone = () => {
      const ctx = audioContextRef.current; if (!ctx) return;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.frequency.setValueAtTime(800, ctx.currentTime); 
      osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
      if ("vibrate" in navigator) navigator.vibrate([250, 100, 250]);
    };
    tone(); alarmIntervalRef.current = setInterval(tone, 1500); 
  };

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    let heading = 0;
    if ((event as any).webkitCompassHeading) {
      heading = (event as any).webkitCompassHeading;
    } else if (event.alpha !== null) {
      heading = 360 - event.alpha;
    }
    setCurrentHeading(heading);
  }, []);

  const requestOrientationPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setHasOrientationPermission(true);
        }
      } catch (err) { console.error(err); }
    } else {
      setHasOrientationPermission(true);
    }
  };

  useEffect(() => {
    if (hasOrientationPermission) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [hasOrientationPermission, handleOrientation]);

  const subscribeToRadar = useCallback(() => {
    if (!vehicle?.plate) return;
    const myPlate = normalizePlate(vehicle.plate);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase.channel(`radar_${myPlate}`, { config: { broadcast: { self: true } } });
    channel
      .on('broadcast', { event: 'alert' }, ({ payload }) => {
        if (receivedIdsRef.current.has(payload.id)) return;
        receivedIdsRef.current.add(payload.id);
        setActiveAlert(payload);
        setAlertHistory(prev => [payload, ...prev].slice(0, 5));
        setShowReceivedModal(true);
        startAlarm();
      })
      .subscribe((status) => setConnStatus(status === 'SUBSCRIBED' ? 'online' : 'offline'));
    channelRef.current = channel;
  }, [vehicle?.plate]);

  useEffect(() => {
    subscribeToRadar();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); stopAlarm(); };
  }, [vehicle?.plate, subscribeToRadar]);

  const handleSendAlert = async (text: string) => {
    if (!text || sending) return;
    await initAudio();
    const plate = normalizePlate(targetPlate);
    if (plate.length < 7) { alert('Placa incompleta'); return; }
    setSending(true);
    try {
      const selectedAlert = PRECONFIGURED_ALERTS.find(a => a.text === text);
      const alertId = crypto.randomUUID();
      const alertData = {
        id: alertId, target_plate: plate, sender_name: String(user?.fullName || 'Motorista'),
        message: text, icon: selectedAlert?.icon || 'bell', created_at: new Date().toISOString()
      };
      await supabase.from('alerts').insert([alertData]);
      const sendChannel = supabase.channel(`radar_${plate}`);
      sendChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await sendChannel.send({ type: 'broadcast', event: 'alert', payload: alertData });
          setTimeout(() => supabase.removeChannel(sendChannel), 1000);
        }
      });
      setTargetPlate(''); setCustomMessage(''); setShowSuccessToast(true);
      playConfirmationSound();
      setTimeout(() => setShowSuccessToast(false), 2000);
    } catch (err: any) { console.error(err); } finally { setSending(false); }
  };

  const handleSaveParking = async (photoBase64?: string) => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser || !vehicle) throw new Error("Acesso negado.");
          const newSpot = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now(), photo: photoBase64 || parkingSpot?.photo };
          
          setParkingSpot(newSpot);
          onVehicleUpdate({ ...vehicle, parking_data: newSpot });
          
          await supabase.from('vehicles').update({ parking_data: newSpot }).eq('user_id', authUser.id);
          playConfirmationSound();
        } catch (err: any) { alert(err.message); } finally { setIsLocating(false); }
      },
      () => { alert("Ative o GPS."); setIsLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleClearParking = async () => {
    // Reset Imediato Local
    setParkingSpot(null);
    if (vehicle) {
      onVehicleUpdate({ ...vehicle, parking_data: null });
    }
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { error } = await supabase.from('vehicles').update({ parking_data: null }).eq('user_id', authUser.id);
        if (error) throw error;
        playConfirmationSound();
      }
    } catch (err) {
      console.error("Erro ao sincronizar limpeza:", err);
    }
  };

  const handleShareLocation = async () => {
    if (!parkingSpot) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${parkingSpot.lat},${parkingSpot.lng}`;
    const text = `Localização do meu veículo JávouCar: ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: 'JávouCar Local', text });
      else { await navigator.clipboard.writeText(text); alert("Link copiado!"); }
    } catch (err) {}
  };

  useEffect(() => {
    if (!parkingSpot || activeTab !== 'parking') return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsAccuracy(pos.coords.accuracy);
        setCurrentDistance(calculateDistance(pos.coords.latitude, pos.coords.longitude, parkingSpot.lat, parkingSpot.lng));
        setBearingToCar(calculateBearing(pos.coords.latitude, pos.coords.longitude, parkingSpot.lat, parkingSpot.lng));
      },
      null, { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [parkingSpot, activeTab]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden pt-safe">
      {showSuccessToast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[9999] bg-green-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center space-x-2 animate-in slide-in-from-top-4">
          <CheckCircle2 size={14} /> <span className="text-[9px] font-black uppercase tracking-widest italic">Enviado!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-blue-600 pb-5 pt-3 px-4 rounded-b-[1.5rem] shadow-xl shrink-0 z-50">
        <div className="flex justify-between items-center">
          <div>
            <div className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase tracking-tighter border mb-1 ${connStatus === 'online' ? 'bg-green-400/20 text-green-100 border-green-400/30' : 'bg-red-400/20 text-red-100 border-red-400/30'}`}>
              {connStatus === 'online' ? <Wifi size={7} /> : <WifiOff size={7} />}
              <span>{connStatus === 'online' ? 'Radar Ativo' : 'Offline'}</span>
            </div>
            <h1 className="text-white text-lg font-black truncate tracking-tighter italic leading-none">Olá, {getFirstName(user?.fullName)}</h1>
          </div>
          <button onClick={onLogout} className="bg-white/10 p-2 rounded-xl text-white active:scale-90 transition-all border border-white/5"><LogOut size={16} /></button>
        </div>
      </div>

      {activeTab === 'home' && (
        <div className="flex flex-col flex-grow overflow-hidden">
          <div className="px-4 -mt-3 z-[60] shrink-0">
            <div className="bg-white p-3 rounded-xl shadow-lg border border-blue-50 flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white"><ShieldCheck size={18} /></div>
              <div className="flex-grow min-w-0">
                <h3 className="text-gray-900 font-black text-[10px] uppercase tracking-tight italic leading-tight truncate">{vehicle?.model || 'Seu Veículo'}</h3>
                <span className="text-blue-600 font-mono text-[10px] font-black block">{vehicle?.plate || '---'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col flex-grow min-h-0 overflow-hidden">
             <div className="px-4 pt-4 shrink-0">
                <div className="p-3 bg-white rounded-2xl shadow-md border border-gray-100">
                    <input 
                      type="text" 
                      placeholder="PLACA DESTINO" 
                      className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl uppercase font-black text-xs tracking-widest outline-none focus:ring-2 focus:ring-blue-100" 
                      value={targetPlate} 
                      onChange={e => setTargetPlate(e.target.value.toUpperCase())} 
                      maxLength={7} 
                    />
                </div>
             </div>
             
             <div className="flex-grow overflow-y-auto no-scrollbar px-4 pt-3 pb-32 space-y-2 min-h-0">
                {PRECONFIGURED_ALERTS.map(alert => {
                  const Icon = getAlertIconComponent(alert.icon);
                  return (
                    <button key={alert.id} onClick={() => handleSendAlert(alert.text)} className="flex items-center p-2.5 bg-white rounded-xl border border-gray-100 active:scale-95 transition-all shadow-sm group w-full">
                       <div className={`p-2 rounded-lg mr-3 shrink-0 ${alert.bgColor}`}><Icon className={`w-4 h-4 ${alert.color}`} /></div>
                       <span className="text-gray-900 font-black text-[10px] flex-grow uppercase italic tracking-tight text-left leading-tight truncate">{alert.text}</span>
                       <Send size={12} className="text-gray-200 shrink-0" />
                    </button>
                  );
                })}

                <div className="pt-2 space-y-2">
                   <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 space-y-2">
                      <input 
                        type="text" 
                        placeholder="MENSAGEM PERSONALIZADA..." 
                        className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl font-bold text-[10px] uppercase italic outline-none focus:ring-2 focus:ring-blue-100" 
                        value={customMessage} 
                        onChange={e => setCustomMessage(e.target.value)} 
                      />
                      <button 
                        onClick={() => handleSendAlert(customMessage)} 
                        disabled={sending || !customMessage} 
                        className="w-full py-3 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all"
                      >
                         {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} <span>Enviar Alerta</span>
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'parking' && (
         <div className="flex-grow flex flex-col items-center overflow-y-auto no-scrollbar px-5 pb-24">
            {!parkingSpot ? (
              <div className="flex flex-col items-center justify-center space-y-6 text-center py-10 flex-grow w-full">
                 <div className="relative">
                    <div className="bg-blue-50 p-10 rounded-full border-4 border-white shadow-xl"><MapPin size={48} className="text-blue-600" /></div>
                    <div className="absolute -top-1 -right-1 bg-yellow-400 w-6 h-6 rounded-full border-2 border-white animate-pulse" />
                 </div>
                 <div className="space-y-1">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-gray-900">Radar de Vaga</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] max-w-[180px]">O radar te guiará de volta ao veículo</p>
                 </div>
                 <div className="w-full space-y-2 max-w-[280px]">
                    <button onClick={() => handleSaveParking()} disabled={isLocating} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl shadow-xl flex items-center justify-center space-x-3 uppercase tracking-widest text-[10px] active:scale-95">
                      {isLocating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={18} />} <span>Fixar Localização</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-3.5 bg-white text-gray-600 font-black rounded-xl flex items-center justify-center space-x-2 text-[9px] uppercase tracking-widest border border-gray-100 active:scale-95">
                      <Camera size={16} /> <span>Foto da Vaga</span>
                    </button>
                 </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center flex-grow justify-center py-4 animate-in fade-in zoom-in-95">
                 <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-100 shadow-sm mb-4">
                    <Target size={12} className="text-blue-600" />
                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-[0.1em]">GPS: {gpsAccuracy ? `${Math.round(gpsAccuracy)}m` : '---'}</span>
                 </div>

                 <div className="relative bg-gray-950 rounded-full w-[220px] h-[220px] shadow-[0_30px_80px_rgba(0,0,0,0.5)] border-[5px] border-white flex items-center justify-center overflow-hidden shrink-0 mb-6">
                    <div className="absolute inset-0 transition-transform duration-100 ease-linear" style={{ transform: `rotate(${-currentHeading}deg)` }}>
                        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-red-500 font-black text-sm italic">N</span>
                        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/10 font-black text-sm">S</span>
                        {[...Array(36)].map((_, i) => (
                           <div key={i} className="absolute inset-0 flex items-start justify-center" style={{ transform: `rotate(${i * 10}deg)` }}>
                              <div className={`w-0.5 mt-0.5 ${i % 9 === 0 ? 'h-3.5 bg-white/20' : 'h-1.5 bg-white/5'}`} />
                           </div>
                        ))}
                    </div>

                    <div className="absolute inset-0 transition-transform duration-300 ease-out" style={{ transform: `rotate(${bearingToCar - currentHeading}deg)` }}>
                       <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                          <div className="bg-yellow-400 p-2 rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.5)] border-2 border-white">
                             <Car size={20} className="text-gray-900 fill-gray-900" />
                          </div>
                          <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[12px] border-b-white mt-0.5" />
                       </div>
                    </div>

                    <div className="absolute z-50 flex flex-col items-center bg-gray-950/90 backdrop-blur-xl p-4 rounded-full border border-white/5 shadow-2xl min-w-[90px]">
                       <div className="text-white text-xl font-black italic tracking-tighter leading-none mb-0.5">
                          {currentDistance !== null ? (currentDistance < 1000 ? `${Math.round(currentDistance)}m` : `${(currentDistance/1000).toFixed(1)}km`) : '--'}
                       </div>
                       <div className="text-[5px] font-black text-yellow-500 uppercase tracking-[0.4em] opacity-80">Distância</div>
                    </div>

                    {!hasOrientationPermission && (
                       <div className="absolute inset-0 z-[100] bg-gray-950/98 flex flex-col items-center justify-center p-6 text-center">
                          <Compass size={36} className="text-blue-500 mb-3 animate-spin-slow" />
                          <button onClick={() => requestOrientationPermission()} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[8px] uppercase tracking-widest active:scale-95 transition-all">Ativar Bússola</button>
                       </div>
                    )}
                 </div>

                 <div className="w-full grid grid-cols-3 gap-2 px-1 mb-4 max-w-[280px]">
                    <button onClick={handleShareLocation} className="flex flex-col items-center py-2.5 bg-white rounded-xl border border-gray-100 text-blue-600 shadow-sm active:bg-blue-50">
                       <Share2 size={18} /> <span className="text-[7px] font-black uppercase mt-1 italic tracking-tight">Enviar</span>
                    </button>
                    <button onClick={() => handleSaveParking()} className="flex flex-col items-center py-2.5 bg-blue-600 rounded-xl text-white shadow-lg active:scale-95 transition-all">
                       <LocateFixed size={18} /> <span className="text-[7px] font-black uppercase mt-1 italic tracking-tight">Fixar</span>
                    </button>
                    <button onClick={handleClearParking} className="flex flex-col items-center py-2.5 bg-red-50 rounded-xl border border-red-100 text-red-500 active:bg-red-100 transition-all">
                       <Trash2 size={18} /> <span className="text-[7px] font-black uppercase mt-1 italic tracking-tight">Limpar</span>
                    </button>
                 </div>

                 {parkingSpot.photo && (
                    <div className="w-full max-w-[280px] rounded-[1.25rem] overflow-hidden shadow-xl border-2 border-white relative aspect-[21/9] shrink-0">
                       <img src={parkingSpot.photo} alt="Vaga" className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                          <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${parkingSpot.lat},${parkingSpot.lng}`)} className="bg-white text-blue-600 px-2.5 py-1 rounded-lg flex items-center space-x-1 font-black text-[7px] uppercase shadow-lg ml-auto active:scale-90 transition-all">
                             <Navigation2 size={10} fill="currentColor" /> <span>Abrir Maps</span>
                          </button>
                       </div>
                    </div>
                 )}
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => handleSaveParking(ev.target?.result as string);
                    reader.readAsDataURL(file);
                 }} />
              </div>
            )}
         </div>
      )}

      {activeTab === 'events' && (
        <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-4 pb-32 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-900 font-black text-lg uppercase italic tracking-tighter">Histórico</h3>
            <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-widest">Ativo</span>
          </div>
          <div className="space-y-2">
            {alertHistory.length === 0 ? (
              <div className="bg-white p-10 rounded-[2rem] text-center border border-gray-100 text-gray-300 flex flex-col items-center">
                <Clock size={32} className="mb-3 opacity-10" />
                <p className="text-[9px] font-black uppercase italic tracking-widest">Sem alertas recentes</p>
              </div>
            ) : (
              alertHistory.map((alert) => (
                <div key={alert.id} className="bg-white p-3 rounded-xl border border-gray-50 flex items-start space-x-3 shadow-sm animate-in slide-in-from-bottom-2">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0"><Bell size={16} /></div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[80px]">{getFirstName(alert.sender_name)}</span>
                      <span className="text-[7px] font-black text-blue-600 italic bg-blue-50 px-1.5 py-0.5 rounded-md">{formatTime(alert.created_at)}</span>
                    </div>
                    <p className="text-gray-900 font-black text-xs uppercase italic leading-tight">"{alert.message}"</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Nav Inferior */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 px-6 pt-2 pb-[calc(0.5rem+var(--sab))] z-[100] flex justify-around items-center rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button onClick={() => { setActiveTab('home'); stopAlarm(); }} className={`flex flex-col items-center space-y-0.5 ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-300'} active:scale-90 transition-all`}>
          <div className={`p-2 rounded-xl ${activeTab === 'home' ? 'bg-blue-50' : ''}`}><Bell size={20} /></div>
          <span className="text-[7px] font-black uppercase italic tracking-widest">Avisar</span>
        </button>
        <button onClick={() => { setActiveTab('parking'); stopAlarm(); }} className={`flex flex-col items-center space-y-0.5 ${activeTab === 'parking' ? 'text-blue-600' : 'text-gray-300'} active:scale-90 transition-all`}>
          <div className={`p-2 rounded-xl ${activeTab === 'parking' ? 'bg-blue-50' : ''}`}><Compass size={20} /></div>
          <span className="text-[7px] font-black uppercase italic tracking-widest">Radar</span>
        </button>
        <button onClick={() => { setActiveTab('events'); stopAlarm(); }} className={`flex flex-col items-center space-y-0.5 ${activeTab === 'events' ? 'text-blue-600' : 'text-gray-300'} active:scale-90 transition-all`}>
          <div className={`p-2 rounded-xl ${activeTab === 'events' ? 'bg-blue-50' : ''}`}><Clock size={20} /></div>
          <span className="text-[7px] font-black uppercase italic tracking-widest">Vistos</span>
        </button>
      </div>

      {/* Modal Alerta Recebido (Grande) */}
      {showReceivedModal && activeAlert && (
        <div className="fixed inset-0 bg-gray-950/98 backdrop-blur-3xl z-[99999999] flex items-center justify-center p-5 animate-in fade-in duration-500">
           <div className="bg-white w-full max-w-[300px] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-90 relative">
              <button onClick={() => { stopAlarm(); playConfirmationSound(); setShowReceivedModal(false); }} className="absolute top-4 right-4 p-2 bg-gray-100/80 rounded-full text-gray-500 active:scale-90 z-20"><X size={18} /></button>
              <div className="bg-red-600 p-6 flex flex-col items-center text-center">
                 <div className="bg-white p-3.5 rounded-2xl mb-4 shadow-lg animate-bounce"><Bell className="w-10 h-10 text-red-600" /></div>
                 <h2 className="text-white text-xl font-black uppercase italic tracking-tighter mb-1 leading-none">ALERTA URGENTE</h2>
                 <p className="text-red-100 text-[8px] font-black uppercase tracking-[0.3em] opacity-80 italic">Verifique seu veículo</p>
              </div>
              <div className="p-6 space-y-5">
                 <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                    <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-1">Seu Veículo</span>
                    <h4 className="text-gray-950 font-black text-xs uppercase italic mb-1 truncate">{vehicle?.model}</h4>
                    <span className="text-blue-600 font-mono font-black text-2xl tracking-widest uppercase leading-none">{vehicle?.plate}</span>
                 </div>
                 <div className="text-center px-1">
                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic block mb-2">{getFirstName(activeAlert.sender_name)} avisou:</span>
                    <p className="text-gray-950 text-base font-black italic uppercase leading-tight tracking-tight">"{activeAlert.message}"</p>
                 </div>
                 <button onClick={() => { stopAlarm(); playConfirmationSound(); setShowReceivedModal(false); }} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all border-b-4 border-blue-800">ENTENDIDO!</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
