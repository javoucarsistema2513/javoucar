
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, LogOut, Bell, ShieldCheck, MapPin, Zap, Sun, 
  Disc, Minimize2, AlertTriangle, Hash, CheckCircle2, XCircle, 
  Navigation, Trash2, Loader2, Lightbulb, TrafficCone, Package, 
  History, Clock, Camera, Compass as CompassIcon, Share2, ExternalLink, Info, Map as MapIcon
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

const withTimeout = (promise: Promise<any>, ms: number = 8000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo de resposta excedido')), ms))
  ]);
};

const Dashboard: React.FC<DashboardProps> = ({ vehicle, user, onLogout }) => {
  const [targetPlate, setTargetPlate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [activeAlert, setActiveAlert] = useState<AlertPayload | null>(null);
  const [alertHistory, setAlertHistory] = useState<AlertPayload[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  const [parkedLocation, setParkedLocation] = useState<ParkingLocation | null>(() => {
    try {
      const saved = localStorage.getItem('parked_location');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [currentPos, setCurrentPos] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [showParkingModal, setShowParkingModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [orientationPermission, setOrientationPermission] = useState<boolean>(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const initAudio = async () => {
    if (audioUnlocked) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      setAudioUnlocked(true);
    } catch (e) {}
  };

  const requestOrientationPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setOrientationPermission(true);
        }
      } catch (e) {
        console.error("Permissão de sensor negada");
      }
    } else {
      setOrientationPermission(true);
    }
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
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      } catch (e) {}
    };

    const toneSequence = () => {
      const now = ctx.currentTime;
      playTone(1200, now, 0.1);
      playTone(1200, now + 0.2, 0.1);
      if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    };

    toneSequence();
    alarmIntervalRef.current = setInterval(toneSequence, 2000);
  };

  const playConfirmationBeeps = () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    playTone(1600, now, 0.08);
    playTone(1900, now + 0.12, 0.08);
    if ("vibrate" in navigator) navigator.vibrate([50, 50]);
  };

  useEffect(() => {
    let channel: any;
    if (!vehicle?.plate) return;

    const setupRealtimeAlerts = async () => {
      const plate = normalizePlate(vehicle.plate);
      try {
        const { data } = await withTimeout(supabase
          .from('alerts')
          .select('*')
          .eq('target_plate', plate)
          .order('created_at', { ascending: false })
          .limit(2));
        if (data) setAlertHistory(data);
      } catch (e) {}

      channel = supabase.channel(`alerts-${plate}`)
        .on(
          'postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'alerts', 
            filter: `target_plate=eq.${plate}` 
          }, 
          (payload) => {
            const newAlert = payload.new as AlertPayload;
            if (newAlert) {
              setActiveAlert(newAlert);
              setShowReceivedModal(true);
              setAlertHistory(prev => [newAlert, ...prev].slice(0, 2));
              startAlarm();
            }
          }
        )
        .subscribe();
    };

    setupRealtimeAlerts();

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => console.warn(`GPS Error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    const handleOrientation = (e: any) => {
      let heading = 0;
      if (e.webkitCompassHeading) {
        // iOS
        heading = e.webkitCompassHeading;
      } else if (e.absolute && e.alpha !== null) {
        // Android Absolute
        heading = 360 - e.alpha;
      } else {
        // Fallback relative (menos preciso)
        heading = 360 - (e.alpha || 0);
      }
      setDeviceHeading(heading);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('deviceorientationabsolute', handleOrientation);

    return () => { 
      if (channel) supabase.removeChannel(channel);
      stopAlarm();
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
    };
  }, [vehicle?.plate]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return d > 1000 ? `${(d/1000).toFixed(1)}km` : `${Math.round(d)}m`;
  };

  const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const y = Math.sin((lon2 - lon1) * Math.PI/180) * Math.cos(lat2 * Math.PI/180);
    const x = Math.cos(lat1 * Math.PI/180) * Math.sin(lat2 * Math.PI/180) -
              Math.sin(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.cos((lon2 - lon1) * Math.PI/180);
    return (Math.atan2(y, x) * 180/Math.PI + 360) % 360;
  };

  const arrowRotation = (currentPos && parkedLocation) 
    ? (getBearing(currentPos.lat, currentPos.lng, parkedLocation.lat, parkedLocation.lng) - deviceHeading + 360) % 360
    : 0;

  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const currentLoc = parkedLocation || { lat: currentPos?.lat || 0, lng: currentPos?.lng || 0, timestamp: Date.now() };
        const updated = { ...currentLoc, photo: base64 };
        setParkedLocation(updated);
        localStorage.setItem('parked_location', JSON.stringify(updated));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMarkLocation = () => {
    initAudio();
    if (!currentPos) {
      alert("Aguardando sinal de GPS estável...");
      return;
    }
    
    // Alerta se a precisão estiver muito ruim (> 30 metros)
    if (currentPos.accuracy > 30) {
      if (!confirm(`Sinal de GPS fraco (${Math.round(currentPos.accuracy)}m). Deseja salvar assim mesmo?`)) return;
    }

    const newLoc: ParkingLocation = {
      lat: currentPos.lat,
      lng: currentPos.lng,
      timestamp: Date.now(),
      photo: parkedLocation?.photo
    };
    setParkedLocation(newLoc);
    localStorage.setItem('parked_location', JSON.stringify(newLoc));
    playConfirmationBeeps();
    alert("Vaga marcada com sucesso!");
  };

  const handleOpenMaps = () => {
    if (!parkedLocation) return;
    const origin = currentPos ? `&origin=${currentPos.lat},${currentPos.lng}` : '';
    const url = `https://www.google.com/maps/dir/?api=1${origin}&destination=${parkedLocation.lat},${parkedLocation.lng}&travelmode=walking`;
    window.open(url, '_blank');
  };

  const handleShareLocation = async () => {
    if (sharing || !parkedLocation) return;
    setSharing(true);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${parkedLocation.lat},${parkedLocation.lng}`;
    const shareText = `📍 Meu carro (${vehicle?.model}) está aqui: ${mapsUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Vaga JávouCar', text: shareText, url: mapsUrl });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert("Link copiado!");
      }
    } catch (err) {} finally { setSharing(false); }
  };

  const handleSendAlert = async (messageText: string) => {
    if (!messageText.trim() || sending) return;
    initAudio();
    const plateToSearch = normalizePlate(targetPlate);
    if (!plateToSearch || plateToSearch.length < 7) { 
      setErrorMsg('Placa inválida'); 
      return; 
    }
    setSending(true); 
    setErrorMsg('');
    try {
      const { data: targetVeh } = await withTimeout(supabase.from('vehicles').select('plate').eq('plate', plateToSearch).maybeSingle());
      if (!targetVeh) {
        setErrorMsg('Veículo não cadastrado');
        setSending(false);
        return;
      }
      const alertIcon = PRECONFIGURED_ALERTS.find(a => a.text === messageText)?.icon || 'bell';
      const { data: insertedData, error: insErr } = await withTimeout(supabase.from('alerts').insert({
        target_plate: targetVeh.plate,
        sender_name: user?.fullName || 'Motorista',
        message: messageText,
        icon: alertIcon
      }).select().single());
      if (insErr) throw insErr;
      if (normalizePlate(vehicle?.plate || '') === plateToSearch) {
        setActiveAlert(insertedData as AlertPayload);
        setShowReceivedModal(true);
        startAlarm();
      }
      setTargetPlate(''); setCustomMessage(''); 
      playConfirmationBeeps();
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      cleanupOldAlerts(targetVeh.plate);
    } catch (err) { setErrorMsg("Erro de conexão."); } finally { setSending(false); }
  };

  const cleanupOldAlerts = async (plate: string) => {
    try {
      const { data: latestTwo } = await supabase.from('alerts').select('id').eq('target_plate', plate).order('created_at', { ascending: false }).limit(2);
      if (latestTwo && latestTwo.length > 0) {
        const idsToKeep = latestTwo.map(item => item.id);
        await supabase.from('alerts').delete().eq('target_plate', plate).filter('id', 'not.in', `(${idsToKeep.join(',')})`);
      }
    } catch (e) {}
  };

  const getFirstName = (fullName: string) => fullName ? fullName.trim().split(' ')[0] : 'Motorista';

  const renderIcon = (name: string, baseClassName: string) => {
    const iconConfig: any = { 
      zap: { icon: Zap, color: 'text-yellow-500' }, 
      'door-closed': { icon: TrafficCone, color: 'text-orange-500' }, 
      sun: { icon: Lightbulb, color: 'text-amber-400' }, 
      package: { icon: Package, color: 'text-blue-500' }, 
      bell: { icon: Bell, color: 'text-red-500' }, 
      disc: { icon: Disc, color: 'text-slate-500' }, 
      'minimize-2': { icon: Minimize2, color: 'text-cyan-500' } 
    };
    const config = iconConfig[name] || { icon: Bell, color: 'text-blue-600' };
    const IconComp = config.icon;
    return <IconComp className={`${baseClassName} ${config.color}`} />;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden pt-safe" onClick={initAudio}>
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleCapturePhoto} />

      {showSuccessToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-in slide-in-from-top duration-300 font-bold text-sm">
          <CheckCircle2 size={18} /> <span>Alerta enviado!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-blue-600 pb-12 pt-6 px-5 rounded-b-[2.5rem] shadow-lg relative shrink-0">
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h2 className="text-white text-[11px] font-black uppercase tracking-widest italic">Jávou<span className="text-yellow-400">Car</span></h2>
            <h1 className="text-white text-xl font-black truncate max-w-[200px]">Olá, {getFirstName(user?.fullName || '')}</h1>
          </div>
          <button onClick={onLogout} className="bg-white/20 p-2.5 rounded-xl text-white active:scale-90 transition-transform"><LogOut size={20} /></button>
        </div>
      </div>

      <div className="px-5 -mt-8 relative z-10 shrink-0 space-y-3">
        <div className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100 flex items-center space-x-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg"><ShieldCheck className="text-white w-6 h-6" /></div>
          <div className="flex-grow min-w-0">
            <h3 className="text-gray-900 font-black text-sm uppercase truncate">{vehicle?.model}</h3>
            <p className="text-[10px] font-black text-gray-400 mt-0.5">
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg mr-1.5 font-mono">{vehicle?.plate}</span> • {vehicle?.color}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 shrink-0">
        <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <label className="text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 block">Avisar Motorista:</label>
          <div className="relative">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text" placeholder="PLACA DO CARRO"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 uppercase font-black text-lg tracking-widest"
              value={targetPlate} onChange={e => { setErrorMsg(''); setTargetPlate(e.target.value.toUpperCase()); }} maxLength={8}
              disabled={sending}
            />
          </div>
          {errorMsg && <p className="text-red-600 text-[10px] font-bold mt-2 ml-1 uppercase">{errorMsg}</p>}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar px-5 pt-4 pb-32">
        <div className="grid grid-cols-1 gap-2 mb-4">
          {PRECONFIGURED_ALERTS.map((alert) => (
            <button key={alert.id} disabled={sending} onClick={() => handleSendAlert(alert.text)} className="flex items-center p-4 bg-white border border-gray-100 rounded-2xl active:bg-blue-50 transition-all text-left shadow-sm group disabled:opacity-50">
              <div className="p-2.5 rounded-xl mr-4 bg-gray-50">{renderIcon(alert.icon, "w-5 h-5")}</div>
              <span className="text-gray-800 font-bold text-xs flex-grow">{alert.text}</span>
              <Send size={14} className="text-gray-300 group-active:text-blue-600" />
            </button>
          ))}
        </div>
        <textarea className="w-full p-4 bg-white border border-gray-100 rounded-3xl h-20 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs resize-none shadow-sm mb-3 disabled:opacity-50" placeholder="Mensagem personalizada..." disabled={sending} value={customMessage} onChange={e => setCustomMessage(e.target.value)} />
        <button onClick={() => handleSendAlert(customMessage)} disabled={sending || !customMessage.trim()} className="w-full py-4.5 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center space-x-3 shadow-xl uppercase text-xs active:scale-[0.97] transition-all disabled:bg-blue-400">
          {sending ? <Loader2 className="animate-spin w-4 h-4" /> : <Send size={18} />} <span>{sending ? 'Enviando...' : 'Avisar Agora'}</span>
        </button>
      </div>

      {/* Nav */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-8 pt-4 pb-[calc(1rem+var(--sab))] z-[100] flex justify-around items-center">
        <button onClick={() => { stopAlarm(); setShowParkingModal(false); setShowHistory(false); }} className={`flex flex-col items-center space-y-1 ${!showParkingModal && !showHistory ? 'text-blue-600' : 'text-gray-300'}`}>
          <Bell size={24} /> <span className="text-[9px] font-black uppercase tracking-tighter">Início</span>
        </button>
        <button onClick={() => { stopAlarm(); setShowParkingModal(true); requestOrientationPermission(); setShowHistory(false); }} className={`flex flex-col items-center space-y-1 ${showParkingModal ? 'text-blue-600' : 'text-gray-300'}`}>
          <MapPin size={24} /> <span className="text-[9px] font-black uppercase tracking-tighter">Vaga</span>
        </button>
        <button onClick={() => { stopAlarm(); setShowHistory(true); setShowParkingModal(false); }} className={`flex flex-col items-center space-y-1 ${showHistory ? 'text-blue-600' : 'text-gray-300'}`}>
          <History size={24} /> <span className="text-[9px] font-black uppercase tracking-tighter">Histórico</span>
        </button>
      </div>

      {/* MODAL VAGA - REFINADO */}
      {showParkingModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-end" onClick={() => setShowParkingModal(false)}>
          <div className="bg-white w-full rounded-t-[3rem] p-6 pb-[calc(2.5rem+var(--sab))] animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
                <div>
                   <h3 className="text-xl font-black uppercase italic text-gray-900">Onde estacionei?</h3>
                   <div className="flex items-center space-x-1.5 mt-1">
                      <div className={`w-2 h-2 rounded-full ${currentPos ? (currentPos.accuracy < 15 ? 'bg-green-500' : 'bg-yellow-500') : 'bg-red-500 animate-pulse'}`} />
                      <span className="text-[9px] font-black text-gray-400 uppercase">GPS: {currentPos ? `${Math.round(currentPos.accuracy)}m de precisão` : 'Aguardando sinal...'}</span>
                   </div>
                </div>
                <button onClick={() => setShowParkingModal(false)} className="bg-gray-100 p-2 rounded-full text-gray-400"><XCircle size={28} /></button>
             </div>

             <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Radar da Bússola */}
                <div className="bg-blue-50 rounded-[2.5rem] p-4 flex flex-col items-center justify-center border-2 border-blue-100 shadow-inner overflow-hidden relative group">
                   <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 to-transparent pointer-events-none" />
                   
                   {/* Mostrador de Bússola */}
                   <div className="relative w-24 h-24 flex items-center justify-center">
                      {/* Círculos concêntricos de radar */}
                      <div className="absolute inset-0 border border-blue-200/50 rounded-full scale-100" />
                      <div className="absolute inset-2 border border-blue-200/50 rounded-full scale-100" />
                      
                      {/* Seta de Direção */}
                      <div 
                        style={{ transform: `rotate(${arrowRotation}deg)` }} 
                        className="transition-transform duration-200 ease-out z-10"
                      >
                         <Navigation size={48} className="text-blue-600 fill-blue-600 drop-shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
                      </div>
                      
                      {/* Marcador de Norte (opcional para calibração) */}
                      <div 
                        style={{ transform: `rotate(${-deviceHeading}deg)` }} 
                        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 transition-transform duration-200"
                      >
                        <span className="text-[10px] font-black text-red-500">N</span>
                      </div>
                   </div>

                   <div className="mt-4 text-center">
                      <p className="text-2xl font-black text-blue-600 tracking-tighter leading-none">
                         {currentPos && parkedLocation ? calculateDistance(currentPos.lat, currentPos.lng, parkedLocation.lat, parkedLocation.lng) : '---'}
                      </p>
                      <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mt-1">Distância</p>
                   </div>
                </div>

                <div className="bg-gray-50 rounded-[2.5rem] p-2 border-2 border-gray-100 flex items-center justify-center relative overflow-hidden shadow-inner aspect-square">
                   {parkedLocation?.photo ? (
                      <img src={parkedLocation.photo} alt="Vaga" className="w-full h-full object-cover rounded-[2rem]" />
                   ) : (
                      <div className="flex flex-col items-center">
                        <Camera size={32} className="text-gray-200 mb-2" />
                        <span className="text-[8px] font-black text-gray-300 uppercase">Sem foto</span>
                      </div>
                   )}
                   <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-2 bg-white p-3 rounded-2xl shadow-lg active:scale-90 transition-transform">
                     <Camera size={18} className="text-blue-600" />
                   </button>
                </div>
             </div>

             <div className="space-y-3">
               <button 
                  onClick={handleMarkLocation} 
                  className={`w-full py-5 bg-blue-600 text-white font-black rounded-3xl uppercase shadow-xl flex items-center justify-center space-x-3 active:scale-95 transition-all ${!currentPos && 'opacity-50'}`}
               >
                  <MapPin size={20} /> <span>Marcar Vaga Atual</span>
               </button>
               <div className="grid grid-cols-2 gap-3">
                 <button onClick={handleOpenMaps} className="py-4 bg-gray-50 text-gray-700 font-bold rounded-2xl uppercase text-[10px] flex items-center justify-center space-x-2 border active:bg-gray-100">
                    <MapIcon size={16} className="text-blue-500" /> <span>Direções</span>
                 </button>
                 <button onClick={handleShareLocation} disabled={sharing} className="py-4 bg-blue-50 text-blue-700 font-bold rounded-2xl uppercase text-[10px] flex items-center justify-center space-x-2 border active:bg-blue-100 disabled:opacity-50">
                    <Share2 size={16} /> <span>Compartilhar</span>
                 </button>
               </div>
               {!orientationPermission && (
                  <p className="text-[8px] text-center text-gray-400 font-bold uppercase mt-2">
                     * Calibre os sensores do celular girando em "8" para melhor precisão
                  </p>
               )}
             </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end" onClick={() => setShowHistory(false)}>
          <div className="bg-white w-full rounded-t-[2.5rem] p-6 pb-[calc(2rem+var(--sab))] animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black uppercase italic text-gray-800">Alertas Recentes</h3>
                <button onClick={() => setShowHistory(false)} className="text-gray-300"><XCircle size={24} /></button>
             </div>
             <div className="space-y-2.5 pb-4 max-h-[40vh] overflow-y-auto no-scrollbar">
               {alertHistory.length === 0 ? (
                 <p className="text-center py-8 text-gray-400 font-bold uppercase text-[10px]">Nenhum alerta</p>
               ) : (
                 alertHistory.map(a => (
                   <div key={a.id} className="p-3.5 bg-gray-50 rounded-2xl border flex items-center space-x-3">
                      <div className="bg-white p-2 rounded-xl shadow-sm">{renderIcon(a.icon, "w-4 h-4")}</div>
                      <div className="flex-grow">
                        <p className="text-[9px] font-black text-gray-400 uppercase">DE: {getFirstName(a.sender_name)}</p>
                        <p className="text-xs font-bold text-gray-700">"{a.message}"</p>
                      </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      )}

      {showReceivedModal && activeAlert && (
        <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-lg z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => { stopAlarm(); setShowReceivedModal(false); }}>
           <div className="bg-white w-full max-w-[310px] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-white/20" onClick={e => e.stopPropagation()}>
              <div className="bg-blue-600 p-6 flex flex-col items-center relative overflow-hidden">
                 <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                 <div className="bg-white p-3.5 rounded-2xl mb-3 animate-bounce shadow-xl z-10">
                    {renderIcon(activeAlert.icon, "w-10 h-10")}
                 </div>
                 <h2 className="text-white text-xl font-black uppercase italic tracking-tighter z-10">Novo Alerta!</h2>
              </div>
              <div className="p-6 space-y-4 text-center">
                 <div className="bg-gray-50 p-3.5 rounded-[1.5rem] border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Seu Veículo</p>
                    <div className="flex flex-col items-center">
                       <span className="text-gray-900 font-black text-base uppercase leading-none mb-0.5">{vehicle?.model}</span>
                       <span className="text-blue-600 font-mono font-black text-lg tracking-widest">{vehicle?.plate}</span>
                       <span className="text-gray-400 font-bold text-[9px] uppercase mt-0.5">{vehicle?.color}</span>
                    </div>
                 </div>
                 <div className="bg-yellow-50 p-4 rounded-[1.5rem] border border-yellow-100">
                    <p className="text-gray-800 text-lg font-black italic leading-tight">"{activeAlert.message}"</p>
                 </div>
                 <div className="flex flex-col items-center pt-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Enviado por</p>
                    <p className="text-gray-900 font-black text-sm uppercase italic">{getFirstName(activeAlert.sender_name)}</p>
                 </div>
                 <button onClick={() => { stopAlarm(); playConfirmationBeeps(); setShowReceivedModal(false); }} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl text-sm uppercase shadow-lg active:scale-[0.97] transition-all">Entendido!</button>
              </div>
           </div>
        </div>
      )}
      
      <style>{`
        @keyframes radar-pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .radar-effect::before {
          content: ''; position: absolute; inset: 0; border: 2px solid #2563eb; border-radius: 9999px;
          animation: radar-pulse 2s infinite; pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
