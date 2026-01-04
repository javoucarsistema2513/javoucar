
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, LogOut, Bell, ShieldCheck, MapPin, Zap, Sun, 
  Disc, Minimize2, Hash, CheckCircle2, 
  Lightbulb, TrafficCone, Package, Clock, Calendar,
  Navigation, Camera, Share2, Trash2, Crosshair, Car, Loader2,
  X, Compass, LocateFixed, Navigation2
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
  
  // Estados da Vaga
  const [parkingSpot, setParkingSpot] = useState<ParkingLocation | null>(vehicle?.parking_data || null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [bearingToCar, setBearingToCar] = useState<number>(0);
  const [isLocating, setIsLocating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const receivedIdsRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);

  const getFirstName = (name: any) => {
    if (!name || typeof name !== 'string') return 'Motorista';
    return name.trim().split(' ')[0];
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  };

  // Cálculos de Geodesia
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; 
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δλ = (lon2 - lon1) * Math.PI/180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    return (θ * 180 / Math.PI + 360) % 360;
  };

  const initAudio = () => {
    if (audioContextRef.current) return;
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  };

  const playBeep = () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  };

  const stopAlarm = () => { 
    if (alarmIntervalRef.current) { 
      clearInterval(alarmIntervalRef.current); 
      alarmIntervalRef.current = null; 
    } 
  };

  const startAlarm = () => {
    stopAlarm();
    initAudio();
    const tone = () => {
      const ctx = audioContextRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1300, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
      if ("vibrate" in navigator) navigator.vibrate([400, 100, 400]);
    };
    tone();
    alarmIntervalRef.current = setInterval(tone, 1300);
  };

  // Efeito para monitorar distância e direção (Radar)
  useEffect(() => {
    if (!parkingSpot || activeTab !== 'parking') return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const d = calculateDistance(
          pos.coords.latitude, 
          pos.coords.longitude, 
          parkingSpot.lat, 
          parkingSpot.lng
        );
        const b = calculateBearing(
          pos.coords.latitude,
          pos.coords.longitude,
          parkingSpot.lat,
          parkingSpot.lng
        );
        setCurrentDistance(d);
        setBearingToCar(b);
        if (pos.coords.heading !== null) {
          setCurrentHeading(pos.coords.heading);
        }
      },
      (err) => console.error("Erro GPS:", err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [parkingSpot, activeTab]);

  useEffect(() => {
    if (!vehicle?.plate) return;
    const myPlate = normalizePlate(vehicle.plate);
    let channel: any = null;

    const setupSubscription = () => {
      if (channel) supabase.removeChannel(channel);
      channel = supabase.channel(`ch_${myPlate}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'alerts', 
          filter: `target_plate=eq.${myPlate}` 
        }, (payload) => {
          const alert = payload.new as AlertPayload;
          if (!alert || receivedIdsRef.current.has(alert.id)) return;
          receivedIdsRef.current.add(alert.id);
          setActiveAlert(alert);
          setAlertHistory(prev => [alert, ...prev].slice(0, 2));
          setShowReceivedModal(true);
          startAlarm();
        })
        .subscribe(s => setIsConnected(s === 'SUBSCRIBED'));
    };

    supabase.from('alerts')
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

    setupSubscription();
    return () => { if (channel) supabase.removeChannel(channel); stopAlarm(); };
  }, [vehicle?.plate]);

  const handleSendAlert = async (text: string) => {
    if (!text || sending) return;
    initAudio();
    const plate = normalizePlate(targetPlate);
    if (plate.length < 7) { setErrorMsg('Placa incompleta'); return; }
    setSending(true);
    setErrorMsg('');
    try {
      const alertConfig = PRECONFIGURED_ALERTS.find(a => a.text === text);
      const { error } = await supabase.from('alerts').insert({
        id: crypto.randomUUID(),
        target_plate: plate,
        sender_name: String(user?.fullName || 'Motorista'),
        message: text,
        icon: alertConfig?.icon || 'bell'
      });
      if (error) throw error;
      setTargetPlate('');
      playBeep();
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      setErrorMsg("Erro de conexão.");
    } finally {
      setSending(false);
    }
  };

  const handleSaveParking = async (photoBase64?: string) => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newSpot: ParkingLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: Date.now(),
          photo: photoBase64 || parkingSpot?.photo
        };
        
        try {
          const { error } = await supabase
            .from('vehicles')
            .update({ parking_data: newSpot })
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
          
          if (error) throw error;
          setParkingSpot(newSpot);
          playBeep();
        } catch (e) {
          alert("Erro ao salvar vaga.");
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        alert("Ative o GPS para marcar a vaga.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleClearParking = async () => {
    if (!window.confirm("Apagar registro da vaga?")) return;
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ parking_data: null })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      if (error) throw error;
      setParkingSpot(null);
      setCurrentDistance(null);
    } catch (e) {
      alert("Erro ao limpar vaga.");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      handleSaveParking(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleShareLocation = async () => {
    if (!parkingSpot) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${parkingSpot.lat},${parkingSpot.lng}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Localização do meu veículo - JávouCar',
          text: `Estacionei meu veículo aqui:`,
          url: url
        });
      } catch (e) {
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  };

  const renderIcon = (name: string, className: string) => {
    const icons: any = { zap: Zap, 'door-closed': TrafficCone, sun: Lightbulb, package: Package, bell: Bell, disc: Disc, 'minimize-2': Minimize2 };
    const IconComp = icons[name] || Bell;
    return <IconComp className={className} />;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden pt-safe" onClick={initAudio}>
      {showSuccessToast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[9999] bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-in slide-in-from-top italic font-black text-[10px] uppercase border border-white/20">
          <CheckCircle2 size={16} /> <span>Alerta Enviado!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-blue-600 pb-10 pt-8 px-5 rounded-b-[2.5rem] shadow-xl shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-1.5 mb-1">
              <h2 className="text-white text-[9px] font-black uppercase tracking-widest italic opacity-70">Jávou<span className="text-yellow-400">Car</span></h2>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
            </div>
            <h1 className="text-white text-2xl font-black truncate tracking-tighter leading-none">Olá, {getFirstName(user?.fullName)}</h1>
          </div>
          <button onClick={onLogout} className="bg-white/10 p-3 rounded-xl text-white active:scale-90 transition-all border border-white/5"><LogOut size={20} /></button>
        </div>
      </div>

      {activeTab === 'home' && (
        <>
          <div className="px-5 -mt-6 shrink-0 z-20">
            <div className="bg-white p-4 rounded-[1.8rem] shadow-xl border border-gray-100 flex items-center space-x-4">
              <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg"><ShieldCheck size={22} /></div>
              <div className="flex-grow min-w-0">
                <h3 className="text-gray-950 font-black text-[13px] uppercase truncate tracking-tight">{String(vehicle?.model || 'Meu Carro')}</h3>
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-mono text-[10px] font-black border border-blue-100">{String(vehicle?.plate || '---')}</span>
              </div>
            </div>
          </div>

          <div className="px-5 pt-4 shrink-0">
            <div className="p-3 bg-white rounded-[1.8rem] border border-gray-100 shadow-sm">
              <label className="text-[9px] font-black uppercase text-gray-400 mb-1 block ml-1 tracking-widest italic">Avisar qual veículo?</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="text" placeholder="ABC1D23"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border-0 rounded-2xl uppercase font-black text-2xl tracking-[0.2em] outline-none transition-all placeholder:text-gray-200"
                  value={targetPlate} onChange={e => { setErrorMsg(''); setTargetPlate(e.target.value.toUpperCase()); }} maxLength={7}
                />
              </div>
              {errorMsg && <p className="text-red-600 text-[8px] font-black mt-2 ml-1 uppercase">{errorMsg}</p>}
            </div>
          </div>

          <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-4 pb-32">
            <div className="grid grid-cols-1 gap-2">
              {PRECONFIGURED_ALERTS.map((alert) => (
                <button 
                  key={alert.id} 
                  disabled={sending} 
                  onClick={() => handleSendAlert(alert.text)} 
                  className="flex items-center p-3.5 bg-white border border-gray-100 rounded-[1.5rem] active:bg-blue-600 active:text-white transition-all text-left group disabled:opacity-50 shadow-sm"
                >
                  <div className={`p-2.5 rounded-xl mr-3 ${alert.bgColor} group-active:bg-white/20`}>
                    {renderIcon(alert.icon, `w-5 h-5 ${alert.color} group-active:text-white`)}
                  </div>
                  <span className="text-gray-950 font-black text-[11px] flex-grow uppercase italic tracking-tight group-active:text-white leading-tight">{alert.text}</span>
                  <div className="bg-gray-50 p-2 rounded-full group-active:bg-white/20">
                    {sending ? <Loader2 size={12} className="animate-spin text-blue-600" /> : <Send size={12} className="text-gray-300 group-active:text-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'events' && (
        <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-6 pb-32">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-950 font-black text-xl uppercase italic tracking-tighter">Eventos Recentes</h3>
          </div>
          <div className="space-y-3">
            {alertHistory.length === 0 ? (
              <div className="bg-white p-12 rounded-[2.5rem] text-center border border-gray-100 shadow-sm text-gray-300 flex flex-col items-center">
                <Calendar size={32} className="mb-3 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum evento</p>
              </div>
            ) : (
              alertHistory.map((alert) => {
                const config = PRECONFIGURED_ALERTS.find(a => a.icon === alert.icon) || PRECONFIGURED_ALERTS[4];
                return (
                  <div key={alert.id} className="bg-white p-4 rounded-[1.8rem] border border-gray-50 shadow-sm flex items-start space-x-4 animate-in slide-in-from-left">
                    <div className={`p-3 rounded-2xl ${config.bgColor}`}>{renderIcon(alert.icon, `w-5 h-5 ${config.color}`)}</div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{getFirstName(alert.sender_name)}</span>
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{formatTime(alert.created_at)}</span>
                      </div>
                      <p className="text-gray-950 font-black text-[12px] uppercase italic leading-tight">"{alert.message}"</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'parking' && (
         <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-6 pb-32">
            {!parkingSpot ? (
              <div className="flex flex-col items-center justify-center pt-10 text-center space-y-8">
                 <div className="bg-blue-50 p-8 rounded-[4rem] animate-pulse">
                    <MapPin size={80} className="text-blue-600" />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Onde parei?</h3>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 max-w-[220px] mx-auto leading-relaxed">
                       Ative o radar para encontrar seu carro com facilidade.
                    </p>
                 </div>
                 <div className="w-full space-y-3 px-4">
                    <button 
                      onClick={() => handleSaveParking()}
                      disabled={isLocating}
                      className="w-full py-6 bg-blue-600 text-white font-black rounded-[2rem] shadow-xl flex items-center justify-center space-x-3 uppercase tracking-widest text-xs active:scale-95 transition-all"
                    >
                      {isLocating ? <Loader2 className="animate-spin" /> : <LocateFixed size={20} />}
                      <span>{isLocating ? 'Capturando GPS...' : 'Fixar Localização'}</span>
                    </button>
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 bg-gray-100 text-gray-700 font-black rounded-[2rem] flex items-center justify-center space-x-3 uppercase tracking-widest text-[10px] active:scale-95 transition-all"
                    >
                      <Camera size={18} />
                      <span>Fixar com Foto</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handlePhotoUpload} />
                 </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                 {/* RADAR VISUAL - TAMANHO REDUZIDO */}
                 <div className="relative bg-gray-950 rounded-[2.5rem] w-full max-w-[280px] aspect-square mx-auto shadow-2xl overflow-hidden border-4 border-white flex items-center justify-center">
                    {/* Anéis de Radar */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                       <div className="w-[80%] h-[80%] border border-blue-500/10 rounded-full" />
                       <div className="w-[60%] h-[60%] border border-blue-500/20 rounded-full" />
                       <div className="w-[40%] h-[40%] border border-blue-500/30 rounded-full" />
                       
                       {/* Scanner Line */}
                       <div className="absolute w-full h-full animate-[spin_5s_linear_infinite] origin-center">
                          <div className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500/50 to-transparent origin-left -translate-y-1/2" />
                       </div>
                    </div>

                    {/* Direcionador (Compass Needle) */}
                    <div 
                      className="absolute w-full h-full flex items-center justify-center transition-transform duration-700 ease-out"
                      style={{ transform: `rotate(${bearingToCar - currentHeading}deg)` }}
                    >
                       <div className="relative flex flex-col items-center">
                          <Navigation2 size={48} className="text-blue-500 fill-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
                          <div className="absolute -top-10 bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap shadow-lg">
                            MEU CARRO
                          </div>
                       </div>
                    </div>

                    {/* Central Status */}
                    <div className="absolute bottom-6 text-center">
                       <div className="text-3xl font-black text-white italic tracking-tighter">
                          {currentDistance !== null ? (currentDistance < 1000 ? `${Math.round(currentDistance)}m` : `${(currentDistance/1000).toFixed(1)}km`) : '--'}
                       </div>
                       <div className="text-[7px] font-black text-blue-400 uppercase tracking-[0.2em]">Direção Ativa</div>
                    </div>
                 </div>

                 {/* BARRA DE AÇÕES COMPACTA */}
                 <div className="grid grid-cols-3 gap-2">
                    <button onClick={handleShareLocation} className="flex flex-col items-center justify-center py-3 bg-white rounded-[1.2rem] border border-gray-100 shadow-sm text-blue-600 active:bg-blue-50 transition-all">
                       <Share2 size={18} />
                       <span className="text-[7px] font-black uppercase mt-1 tracking-widest">Enviar</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center py-3 bg-white rounded-[1.2rem] border border-gray-100 shadow-sm text-blue-600 active:bg-blue-50 transition-all">
                       <Camera size={18} />
                       <span className="text-[7px] font-black uppercase mt-1 tracking-widest">Foto</span>
                    </button>
                    <button onClick={handleClearParking} className="flex flex-col items-center justify-center py-3 bg-red-50 rounded-[1.2rem] border border-red-100 shadow-sm text-red-500 active:bg-red-100 transition-all">
                       <Trash2 size={18} />
                       <span className="text-[7px] font-black uppercase mt-1 tracking-widest">Limpar</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handlePhotoUpload} />
                 </div>

                 {parkingSpot.photo && (
                    <div className="rounded-[2rem] overflow-hidden shadow-lg border-2 border-white relative aspect-[2/1] group">
                       <img src={parkingSpot.photo} alt="Referência" className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
                          <div className="flex justify-between items-end w-full">
                            <div>
                               <span className="text-white text-[9px] font-black uppercase tracking-widest italic flex items-center"><Camera size={12} className="mr-1.5" /> Referência Visual</span>
                               <span className="text-white/60 text-[7px] font-bold uppercase tracking-widest block">Registrado às {new Date(parkingSpot.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white active:scale-90 transition-all">
                               <Navigation size={14} />
                            </button>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
            )}
         </div>
      )}

      {/* Nav Superior */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-3xl border-t border-gray-100 px-8 pt-4 pb-[calc(1.5rem+var(--sab))] z-[100] flex justify-around items-center rounded-t-[3rem] shadow-[0_-10px_50px_rgba(0,0,0,0.06)]">
        <button onClick={() => { setActiveTab('home'); stopAlarm(); }} className={`flex flex-col items-center space-y-1.5 transition-all ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-300'}`}>
          <div className={`p-2.5 rounded-2xl transition-all ${activeTab === 'home' ? 'bg-blue-50' : 'bg-transparent'}`}><Bell size={26} /></div>
          <span className="text-[9px] font-black uppercase italic tracking-widest">Alertar</span>
        </button>
        <button onClick={() => { setActiveTab('parking'); stopAlarm(); }} className={`flex flex-col items-center space-y-1.5 transition-all ${activeTab === 'parking' ? 'text-blue-600' : 'text-gray-300'}`}>
          <div className={`p-2.5 rounded-2xl transition-all ${activeTab === 'parking' ? 'bg-blue-50' : 'bg-transparent'}`}><Compass size={26} /></div>
          <span className="text-[9px] font-black uppercase italic tracking-widest">Radar Vaga</span>
        </button>
        <button onClick={() => { setActiveTab('events'); stopAlarm(); }} className={`flex flex-col items-center space-y-1.5 transition-all ${activeTab === 'events' ? 'text-blue-600' : 'text-gray-300'}`}>
          <div className={`p-2.5 rounded-2xl transition-all ${activeTab === 'events' ? 'bg-blue-50' : 'bg-transparent'}`}><Clock size={26} /></div>
          <span className="text-[9px] font-black uppercase italic tracking-widest">Eventos</span>
        </button>
      </div>

      {/* MODAL DE ALERTA RECEBIDO - REDUZIDO */}
      {showReceivedModal && activeAlert && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[99999999] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-[300px] rounded-[3rem] shadow-[0_15px_50px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 flex flex-col border border-white/20">
              <div className={`p-8 flex flex-col items-center text-center ${(PRECONFIGURED_ALERTS.find(a => a.icon === activeAlert.icon) || PRECONFIGURED_ALERTS[4]).bgColor.replace('-50', '-600')}`}>
                 <div className="bg-white p-5 rounded-[2.5rem] mb-5 shadow-2xl animate-pulse ring-4 ring-white/10">
                    {renderIcon(activeAlert.icon, `w-12 h-12 ${(PRECONFIGURED_ALERTS.find(a => a.icon === activeAlert.icon) || PRECONFIGURED_ALERTS[4]).color}`)}
                 </div>
                 <h2 className="text-white text-2xl font-black uppercase italic tracking-tighter leading-none mb-1">AVISO URGENTE!</h2>
                 <p className="text-white/60 text-[8px] font-black uppercase tracking-[0.2em]">Propriedade de {getFirstName(user?.fullName)}</p>
              </div>
              <div className="p-6 space-y-5 text-center">
                 <div className="bg-gray-50 p-4 rounded-[2rem] border border-gray-100 shadow-inner">
                    <span className="text-blue-600 font-mono font-black text-2xl tracking-[0.2em] block mb-1">{String(vehicle?.plate || '---')}</span>
                    <span className="text-gray-400 font-black text-[9px] uppercase italic tracking-widest">{String(vehicle?.model || '')}</span>
                 </div>
                 <div className="bg-amber-400/10 p-5 rounded-[2.5rem] border-2 border-amber-400/20">
                    <p className="text-gray-950 text-base font-black italic uppercase leading-tight tracking-tight">"{activeAlert.message}"</p>
                 </div>
                 <button onClick={() => { stopAlarm(); playBeep(); setShowReceivedModal(false); }} className="w-full py-5 bg-blue-600 text-white font-black rounded-[2rem] text-xs uppercase shadow-xl active:scale-95 transition-all tracking-[0.2em] border-b-[4px] border-blue-800">
                   ENTENDI E VOU AGORA
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
