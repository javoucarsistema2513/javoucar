import { UserData, VehicleData } from '../types';

// Simulate async API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Determine backend URL based on environment
const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://javoucar-backend.onrender.com' 
  : 'http://localhost:3001';

export const api = {
  login: async (email: string, password: string): Promise<{ success: boolean }> => {
    await delay(1000);
    console.log(`Login attempt for: ${email}`);
    // Always success for demo
    return { success: true };
  },

  recoverPassword: async (email: string): Promise<{ success: boolean }> => {
    await delay(1500);
    console.log(`Recovery email sent to: ${email}`);
    return { success: true };
  },

  registerUser: async (data: UserData): Promise<{ success: boolean }> => {
    await delay(1000);
    console.log('User Registered:', data);
    return { success: true };
  },

  registerVehicle: async (data: VehicleData): Promise<{ success: boolean }> => {
    await delay(1000);
    console.log('Vehicle Registered:', data);
    return { success: true };
  },

  sendAlert: async (targetPlate: string, message: string): Promise<{ success: boolean }> => {
    await delay(1500);
    console.log(`Sending alert to [${targetPlate}]: ${message}`);
    return { success: true };
  }
};

// Future implementation with actual backend
export const backendApi = {
  baseUrl: BACKEND_URL,
  
  registerUser: async (data: UserData) => {
    const response = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  registerVehicle: async (data: VehicleData, token: string) => {
    const response = await fetch(`${BACKEND_URL}/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  sendAlert: async (targetPlate: string, message: string, token: string) => {
    const response = await fetch(`${BACKEND_URL}/alerts/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ targetPlate, message })
    });
    return response.json();
  },
  
  savePushSubscription: async (subscription: any, token: string) => {
    const response = await fetch(`${BACKEND_URL}/push-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ subscription })
    });
    return response.json();
  }
};