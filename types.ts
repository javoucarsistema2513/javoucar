export enum AppScreen {
  ONBOARDING = 'ONBOARDING',
  LOGIN = 'LOGIN',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  REGISTER_USER = 'REGISTER_USER',
  REGISTER_VEHICLE = 'REGISTER_VEHICLE',
  ALERT_SYSTEM = 'ALERT_SYSTEM',
  SUCCESS_SENT = 'SUCCESS_SENT'
}

export interface UserData {
  name: string;
  email: string;
  phone: string;
  password?: string;
}

export interface VehicleData {
  plate: string;
  model: string;
  color: string;
  state: string;
}

export interface AlertOption {
  id: string;
  label: string;
  iconName: string;
  category: 'urgent' | 'warning' | 'info';
}