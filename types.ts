
export enum AppScreen {
  ONBOARDING = 'ONBOARDING',
  SIGNUP = 'SIGNUP',
  LOGIN = 'LOGIN',
  VEHICLE_REGISTRATION = 'VEHICLE_REGISTRATION',
  DASHBOARD = 'DASHBOARD',
  PROFILE = 'PROFILE',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  RESET_PASSWORD = 'RESET_PASSWORD'
}

export interface UserData {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
}

export interface ParkingLocation {
  lat: number;
  lng: number;
  timestamp: number;
  photo?: string; // Base64 image
}

export interface VehicleData {
  plate: string;
  model: string;
  color: string;
  state: string;
  parking_data?: ParkingLocation | null;
}

export interface AlertMessage {
  id: string;
  text: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const PRECONFIGURED_ALERTS: AlertMessage[] = [
  { id: '1', text: 'Preciso sair com urgência!', icon: 'zap', color: 'text-amber-500', bgColor: 'bg-amber-50' },
  { id: '2', text: 'Bloqueando a saída!', icon: 'traffic-cone', color: 'text-red-500', bgColor: 'bg-red-50' },
  { id: '3', text: 'Farol aceso!', icon: 'sun', color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
  { id: '4', text: 'Porta malas aberto!', icon: 'package', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { id: '5', text: 'Alarme acionado!', icon: 'siren', color: 'text-rose-600', bgColor: 'bg-rose-50' },
  { id: '6', text: 'Pneu murcho ou baixo', icon: 'disc', color: 'text-slate-600', bgColor: 'bg-slate-50' },
  { id: '7', text: 'Janela aberta!', icon: 'layout', color: 'text-cyan-500', bgColor: 'bg-cyan-50' }
];

export const CAR_IMAGE_URL = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=800";

export const normalizePlate = (plate: string) => plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
