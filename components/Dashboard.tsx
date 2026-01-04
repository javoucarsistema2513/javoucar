
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, LogOut, Bell, ShieldCheck, MapPin, Zap, 
  Hash, CheckCircle2, TrafficCone, Package, Clock, Calendar,
  Camera, Share2, Trash2, Loader2, Navigation2, Compass, LocateFixed, Wifi, WifiOff,
  DoorClosed, Sun, Disc, Minimize2, Car
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
  const [connStatus, setConnStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [parkingSpot, setParkingSpot] = useState<ParkingLocation | null>(vehicle?.parking_data || null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [bearingToCar, setBearingToCar] = useState<number>(0);
  const [isLocating, setIsLocating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const receivedIdsRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

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

  const initAudio = () => { if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); };
  
  const stopAlarm = () => { if (alarmIntervalRef.current) { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; } };
  const startAlarm = () => {
    stopAlarm(); initAudio();
    const tone = () => {
      const ctx = audioContextRef.current; if (!ctx) return;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
      if ("vibrate" in navigator) navigator.vibrate([300, 100, 300]);
    };
    tone(); alarmIntervalRef.current = setInterval(tone, 1000);
  };

  useEffect(() => {
    if (!vehicle?.plate) return;
    const myPlate = normalizePlate(vehicle.plate);

    const setupRealtime = () => {
      const channel = supabase.channel(`radar_${myPlate}`, {
        config: { broadcast: { self: true } }
      });

      channel
        .on('broadcast', { event: 'alert' }, ({ payload }) => {
          if (receivedIdsRef.current.has(payload.id)) return;
          receivedIdsRef.current.add(payload.id);
          
          setActiveAlert(payload);
          // Limitado apenas aos 2 últimos alertas em tempo real
          setAlertHistory(prev => [payload, ...prev].slice(0, 2));
          setShowReceivedModal(true);
          startAlarm();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') setConnStatus('online');
          else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setConnStatus('offline');
        });

      channelRef.current = channel;
    };

    setupRealtime();
    // Busca inicial também limitada apenas aos 2 últimos registros
    supabase.from('alerts').select('*').eq('target_plate', myPlate).order('created_at', { ascending: false }).limit(2)
      .then(({ data }) => { if (data) setAlertHistory(data); });

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); stopAlarm(); };
  }, [vehicle?.plate]);

  const handleSendAlert = async (text: string) => {
    if (!text || sending) return;
    initAudio();
    const plate = normalizePlate(targetPlate);
    if (plate.length < 7) { setErrorMsg('Placa incompleta'); return; }
    
    setSending(true); 
    setErrorMsg('');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) throw new Error("Sessão expirada.");

      const alertId = crypto.randomUUID();
      const alertData = {
        id: alertId,
        target_plate: plate,
        sender_name: String(user?.fullName || 'Motorista'),
        message: text,
        icon: PRECONFIGURED_ALERTS.find(a => a.text === text)?.icon || 'bell',
        created_at: new Date().toISOString()
      };

      const broadcastChannel = supabase.channel(`radar_${plate}`);
      broadcastChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await broadcastChannel.send({
            type: 'broadcast',
            event: 'alert',
            payload: alertData
          });
          setTimeout(() => supabase.removeChannel(broadcastChannel), 1000);
        }
      });

      const { error: dbError } = await supabase.from('alerts').insert([alertData]);
      if (dbError) throw new Error(`Erro no Banco: ${dbError.message}`);

      setTargetPlate(''); 
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2000);
    } catch (err: any) { 
      console.error("Erro Crítico:", err);
      setErrorMsg(err.message || "Erro de conexão."); 
    } 
    finally { setSending(false); }
  };

  const handleSaveParking = async (photoBase64?: string) => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) throw new Error("Não autenticado.");

          const newSpot: ParkingLocation = { 
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude, 
            timestamp: Date.now(), 
            photo: photoBase64 || parkingSpot?.photo 
          };
          
          const { error } = await supabase.from('vehicles').update({ parking_data: newSpot }).eq('user_id', authUser.id);
          if (error) throw error;
          
          setParkingSpot(newSpot);
        } catch (err: any) {
          console.error("Erro ao salvar vaga:", err);
          alert(`Erro ao salvar vaga: ${err.message}`);
        } finally {
          setIsLocating(false);
        }
      },
      () => { alert("Ative o GPS"); setIsLocating(false); },
      { enableHighAccuracy: true }
    );
  };

  const handleClearParking = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { error } = await supabase.from('vehicles').update({ parking_data: null }).eq('user_id', authUser.id);
        if (error) throw error;
        setParkingSpot(null);
      }
    } catch (err: any) {
      console.error("Erro ao limpar vaga:", err);
      alert(`Erro ao limpar: ${err.message}`);
    }
  };

  const handleShareLocation = async () => {
    if (!parkingSpot || isSharing) return;
    setIsSharing(true);
    const url = `https://www.google.com/maps/search/?api=1&query=${parkingSpot.lat},${parkingSpot.lng}`;
    
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Minha Vaga - JávouCar', url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copiado para a área de transferência!");
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Erro ao compartilhar:", err);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handleSaveParking(reader.result as string);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!parkingSpot || activeTab !== 'parking') return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentDistance(calculateDistance(pos.coords.latitude, pos.coords.longitude, parkingSpot.lat, parkingSpot.lng));
        setBearingToCar(calculateBearing(pos.coords.latitude, pos.coords.longitude, parkingSpot.lat, parkingSpot.lng));
        if (pos.coords.heading !== null) setCurrentHeading(pos.coords.heading);
      },
      null, { enableHighAccuracy: true }
    );

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const webkitHeading = (e as any).webkitCompassHeading;
      if (webkitHeading) setCurrentHeading(webkitHeading);
      else if (e.alpha) setCurrentHeading(360 - e.alpha);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [parkingSpot, activeTab]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden pt-safe" onClick={initAudio}>
      {showSuccessToast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[9999] bg-green-600 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center space-x-2 animate-in slide-in-from-top-4 border border-white/20">
          <CheckCircle2 size={16} /> <span className="text-[10px] font-black uppercase tracking-widest italic">Aviso Enviado!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-blue-600 pb-12 pt-6 px-6 rounded-b-[3rem] shadow-2xl shrink-0 transition-all">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter border ${connStatus === 'online' ? 'bg-green-400/20 text-green-100 border-green-400/30' : 'bg-red-400/20 text-red-100 border-red-400/30'}`}>
                {connStatus === 'online' ? <Wifi size={10} /> : <WifiOff size={10} />}
                <span>{connStatus === 'online' ? 'Radar Ativo' : 'Reconectando...'}</span>
              </div>
            </div>
            <h1 className="text-white text-3xl font-black truncate tracking-tighter leading-none italic">Olá, {getFirstName(user?.fullName)}</h1>
          </div>
          <button onClick={onLogout} className="bg-white/10 p-3 rounded-2xl text-white active:scale-90 transition-all border border-white/5 backdrop-blur-md"><LogOut size={20} /></button>
        </div>
      </div>

      {activeTab === 'home' && (
        <>
          <div className="px-6 -mt-8 shrink-0 z-20">
            <div className="bg-white p-5 rounded-[2rem] shadow-xl border border-blue-50 flex items-center space-x-4">
              <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><ShieldCheck size={24} /></div>
              <div className="flex-grow min-w-0">
                <h3 className="text-gray-950 font-black text-sm uppercase truncate tracking-tight italic">{vehicle?.model || 'Meu Veículo'}</h3>
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-mono text-[11px] font-black border border-blue-100">{vehicle?.plate || '---'}</span>
              </div>
            </div>
          </div>

          <div className="px-6 pt-6 shrink-0">
            <div className="p-4 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
              <label className="text-[9px] font-black uppercase text-gray-400 mb-2 block ml-1 tracking-[0.2em] italic">Qual placa avisar?</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="text" placeholder="ABC1D23"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl uppercase font-black text-2xl tracking-[0.25em] outline-none transition-all placeholder:text-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  value={targetPlate} onChange={e => { setErrorMsg(''); setTargetPlate(e.target.value.toUpperCase()); }} maxLength={7}
                />
              </div>
              {errorMsg && <p className="text-red-600 text-[10px] font-black mt-2 ml-1 uppercase animate-pulse leading-tight">{errorMsg}</p>}
            </div>
          </div>

          <div className="flex-grow overflow-y-auto no-scrollbar px-6 pt-6 pb-32">
            <div className="grid grid-cols-1 gap-2.5">
              {PRECONFIGURED_ALERTS.map((alert) => {
                const Icon = getAlertIcon(alert.icon);
                return (
                  <button 
                    key={alert.id} disabled={sending} onClick={() => handleSendAlert(alert.text)} 
                    className="flex items-center p-4 bg-white border border-gray-100 rounded-[1.8rem] active:scale-95 transition-all text-left shadow-sm group disabled:opacity-50"
                  >
                    <div className={`p-3 rounded-2xl mr-4 ${alert.bgColor} group-active:bg-blue-600 transition-colors`}>
                      <Icon className={`w-6 h-6 ${alert.color} group-active:text-white`} />
                    </div>
                    <span className="text-gray-950 font-black text-xs flex-grow uppercase italic tracking-tight group-active:text-blue-600 leading-tight">{alert.text}</span>
                    <div className="bg-gray-50 p-2.5 rounded-full group-active:bg-blue-50">
                      {sending ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <Send size={16} className="text-gray-300" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activeTab === 'parking' && (
         <div className="flex-grow overflow-y-auto no-scrollbar px-6 pt-6 pb-32 flex flex-col items-center">
            {!parkingSpot ? (
              <div className="flex flex-col items-center justify-center pt-10 text-center space-y-8 w-full">
                 <div className="bg-blue-50 p-10 rounded-full animate-pulse border-4 border-white shadow-xl">
                    <MapPin size={60} className="text-blue-600" />
                 </div>
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter">Radar de Vaga</h3>
                 <div className="w-full space-y-3">
                    <button onClick={() => handleSaveParking()} disabled={isLocating} className="w-full py-6 bg-blue-600 text-white font-black rounded-[2rem] shadow-xl flex items-center justify-center space-x-3 uppercase tracking-widest text-xs active:scale-95">
                      {isLocating ? <Loader2 className="animate-spin" /> : <LocateFixed size={20} />}
                      <span>{isLocating ? 'Capturando...' : 'Fixar Localização'}</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-gray-100 text-gray-700 font-black rounded-[2rem] flex items-center justify-center space-x-3 text-[10px] uppercase tracking-widest">
                      <Camera size={18} /> <span>Tirar Foto da Vaga</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handlePhotoUpload} />
                 </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 w-full">
                 <div className="relative bg-[#0a0f1e] rounded-full w-[260px] h-[260px] mx-auto shadow-[0_20px_60px_rgba(0,0,0,0.4)] border-[8px] border-white flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent" />
                    
                    <div className="absolute w-full h-full transition-transform duration-300 ease-out" style={{ transform: `rotate(${-currentHeading}deg)` }}>
                        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white font-black text-xl italic drop-shadow-lg">N</span>
                        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 font-black text-xl italic">S</span>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-black text-xl italic">L</span>
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-black text-xl italic">O</span>
                        
                        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                          <div key={deg} className="absolute inset-0 flex items-start justify-center" style={{ transform: `rotate(${deg}deg)` }}>
                             <div className="w-0.5 h-2.5 bg-white/20 mt-1" />
                          </div>
                        ))}
                    </div>

                    <div className="absolute w-full h-full transition-transform duration-500 ease-out" style={{ transform: `rotate(${bearingToCar - currentHeading}deg)` }}>
                       <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.8)] border-2 border-white animate-bounce">
                             <Car size={24} className="text-white fill-white" />
                          </div>
                       </div>
                    </div>

                    <div className="absolute z-10 flex flex-col items-center">
                       <div className="text-white text-3xl font-black italic tracking-tighter leading-none mb-1">
                          {currentDistance !== null ? (currentDistance < 1000 ? `${Math.round(currentDistance)}m` : `${(currentDistance/1000).toFixed(1)}km`) : '--'}
                       </div>
                       <div className="text-[7px] font-black text-blue-400 uppercase tracking-[0.3em]">Distância Real</div>
                       <Navigation2 size={16} className="text-white fill-white mt-2 animate-pulse" />
                    </div>

                    <div className="absolute inset-4 border border-white/5 rounded-full pointer-events-none" />
                    <div className="absolute inset-10 border border-white/5 rounded-full pointer-events-none" />
                 </div>

                 <div className="grid grid-cols-3 gap-3 px-2">
                    <button 
                      onClick={handleShareLocation} 
                      disabled={isSharing}
                      className="flex flex-col items-center justify-center py-4 bg-white rounded-[1.8rem] border border-gray-100 text-blue-600 shadow-sm active:bg-blue-50 disabled:opacity-50"
                    >
                       {isSharing ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />} 
                       <span className="text-[7px] font-black uppercase mt-1.5 tracking-widest">Enviar</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center py-4 bg-white rounded-[1.8rem] border border-gray-100 text-blue-600 shadow-sm active:bg-blue-50">
                       <Camera size={20} /> <span className="text-[7px] font-black uppercase mt-1.5 tracking-widest">Foto</span>
                    </button>
                    <button onClick={() => { if(confirm("Apagar vaga?")) handleClearParking(); }} className="flex flex-col items-center justify-center py-4 bg-red-50 rounded-[1.8rem] border border-red-100 text-red-500 shadow-sm active:bg-red-100">
                       <Trash2 size={20} /> <span className="text-[7px] font-black uppercase mt-1.5 tracking-widest">Limpar</span>
                    </button>
                 </div>

                 {parkingSpot.photo && (
                    <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white relative aspect-[16/9] mx-2">
                       <img src={parkingSpot.photo} alt="Referência" className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                          <div className="w-full flex justify-between items-end">
                             <div>
                                <span className="text-white text-[9px] font-black uppercase tracking-widest italic flex items-center mb-0.5"><Camera size={12} className="mr-1.5" /> Referência Visual</span>
                                <span className="text-white/50 text-[7px] font-bold uppercase">{formatTime(new Date(parkingSpot.timestamp).toISOString())}</span>
                             </div>
                             <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${parkingSpot.lat},${parkingSpot.lng}`)} className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg">
                                <Compass size={20} />
                             </button>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
            )}
         </div>
      )}

      {activeTab === 'events' && (
        <div className="flex-grow overflow-y-auto no-scrollbar px-6 pt-6 pb-32">
          <h3 className="text-gray-950 font-black text-xl uppercase italic tracking-tighter mb-4">Últimos Alertas</h3>
          <div className="space-y-3">
            {alertHistory.length === 0 ? (
              <div className="bg-white p-12 rounded-[2.5rem] text-center border border-gray-100 shadow-sm text-gray-300 flex flex-col items-center">
                <Calendar size={40} className="mb-4 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest italic">Nada por enquanto</p>
              </div>
            ) : (
              alertHistory.map((alert) => (
                <div key={alert.id} className="bg-white p-4 rounded-3xl border border-gray-50 shadow-sm flex items-start space-x-4 animate-in slide-in-from-left">
                  <div className="p-3 rounded-2xl bg-blue-50">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{getFirstName(alert.sender_name)}</span>
                      <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{formatTime(alert.created_at)}</span>
                    </div>
                    <p className="text-gray-950 font-black text-[12px] uppercase italic leading-tight">"{alert.message}"</p>
                  </div>
                </div>
              ))
            )}
            {alertHistory.length > 0 && (
              <p className="text-center text-[8px] font-black text-gray-300 uppercase tracking-[0.3em] pt-4 italic">
                Apenas as 2 mensagens mais recentes são exibidas
              </p>
            )}
          </div>
        </div>
      )}

      {/* Nav de Abas */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-3xl border-t border-gray-100 px-8 pt-4 pb-[calc(1.5rem+var(--sab))] z-[100] flex justify-around items-center rounded-t-[3rem] shadow-[0_-15px_50px_rgba(0,0,0,0.1)]">
        <button onClick={() => { setActiveTab('home'); stopAlarm(); }} className={`flex flex-col items-center space-y-2 transition-all ${activeTab === 'home' ? 'text-blue-600 scale-110' : 'text-gray-300'}`}>
          <div className={`p-2.5 rounded-2xl transition-all ${activeTab === 'home' ? 'bg-blue-100 shadow-inner' : ''}`}><Bell size={28} /></div>
          <span className="text-[8px] font-black uppercase italic tracking-widest">Avisar</span>
        </button>
        <button onClick={() => { setActiveTab('parking'); stopAlarm(); }} className={`flex flex-col items-center space-y-2 transition-all ${activeTab === 'parking' ? 'text-blue-600 scale-110' : 'text-gray-300'}`}>
          <div className={`p-2.5 rounded-2xl transition-all ${activeTab === 'parking' ? 'bg-blue-100 shadow-inner' : ''}`}><Compass size={28} /></div>
          <span className="text-[8px] font-black uppercase italic tracking-widest">Radar</span>
        </button>
        <button onClick={() => { setActiveTab('events'); stopAlarm(); }} className={`flex flex-col items-center space-y-2 transition-all ${activeTab === 'events' ? 'text-blue-600 scale-110' : 'text-gray-300'}`}>
          <div className={`p-2.5 rounded-2xl transition-all ${activeTab === 'events' ? 'bg-blue-100 shadow-inner' : ''}`}><Clock size={28} /></div>
          <span className="text-[8px] font-black uppercase italic tracking-widest">Histórico</span>
        </button>
      </div>

      {/* Modal Alerta Recebido - Prioridade Máxima */}
      {showReceivedModal && activeAlert && (
        <div className="fixed inset-0 bg-gray-950/98 backdrop-blur-3xl z-[99999999] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-[290px] rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 flex flex-col">
              <div className="bg-red-600 p-8 flex flex-col items-center text-center">
                 <div className="bg-white p-5 rounded-[2.5rem] mb-4 shadow-2xl animate-bounce">
                    <Bell className="w-10 h-10 text-red-600" />
                 </div>
                 <h2 className="text-white text-xl font-black uppercase italic tracking-tighter leading-none">ALERTA VEICULAR!</h2>
              </div>
              <div className="p-7 space-y-5 text-center">
                 <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-inner">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Para o seu veículo</span>
                    <span className="text-blue-600 font-mono font-black text-2xl tracking-widest block uppercase leading-none">{vehicle?.plate}</span>
                 </div>
                 <div className="space-y-1">
                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic">{getFirstName(activeAlert.sender_name)} avisou:</span>
                    <p className="text-gray-950 text-base font-black italic uppercase leading-tight tracking-tight px-1">"{activeAlert.message}"</p>
                 </div>
                 <button onClick={() => { stopAlarm(); setShowReceivedModal(false); }} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase shadow-xl active:scale-95 border-b-4 border-blue-800 transition-all">
                   OK, Entendido!
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
