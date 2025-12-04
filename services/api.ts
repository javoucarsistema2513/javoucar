import { UserData, VehicleData } from '../types';
import { supabaseService } from './supabaseService';

// Simulate async API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  login: async (email: string, password: string): Promise<{ success: boolean; data?: any }> => {
    await delay(1000);
    console.log(`Login attempt for: ${email}`);
    
    // Use Supabase service for authentication
    const result = await supabaseService.signIn(email, password);
    return result;
  },

  recoverPassword: async (email: string): Promise<{ success: boolean }> => {
    await delay(1500);
    console.log(`Recovery email sent to: ${email}`);
    
    // Use Supabase service for password recovery
    const result = await supabaseService.recoverPassword(email);
    return { success: result.success };
  },

  registerUser: async (data: UserData): Promise<{ success: boolean }> => {
    await delay(1000);
    console.log('User Registered:', data);
    
    // For demo purposes, we'll still use the mock implementation
    // In a real app, you would use:
    // const result = await supabaseService.signUp(data.email, data.password, data);
    // return { success: result.success };
    
    return { success: true };
  },

  registerVehicle: async (data: VehicleData): Promise<{ success: boolean }> => {
    await delay(1000);
    console.log('Vehicle Registered:', data);
    
    // For demo purposes, we'll still use the mock implementation
    // In a real app, you would use:
    // const result = await supabaseService.registerVehicle(data, userId);
    // return { success: result.success };
    
    return { success: true };
  },

  sendAlert: async (targetPlate: string, message: string, alertType?: string): Promise<{ success: boolean; vehicleData?: any }> => {
    await delay(1500);
    console.log(`Sending alert to [${targetPlate}]: ${message}`);
    
    // For demo purposes, we'll still use the mock implementation
    // In a real app, you would use:
    // const result = await supabaseService.sendAlert(targetPlate, message, senderUserId, alertType);
    // return { success: result.success, vehicleData: result.vehicleData };
    
    // Find vehicle data in mock database (keeping this for demo)
    const mockVehicleDatabase = [
      { 
        plate: 'ABC1234', 
        model: 'Honda Civic', 
        color: 'Prata', 
        brandLogo: 'Honda',
        iconName: 'Car',
        category: 'info'
      },
      { 
        plate: 'XYZ9876', 
        model: 'Ford Mustang', 
        color: 'Vermelho', 
        brandLogo: 'Ford',
        iconName: 'Car',
        category: 'info'
      },
      { 
        plate: 'DEF5678', 
        model: 'Chevrolet Onix', 
        color: 'Branco', 
        brandLogo: 'Chevrolet',
        iconName: 'Car',
        category: 'info'
      },
      { 
        plate: 'GHI4321', 
        model: 'Volkswagen Gol', 
        color: 'Preto', 
        brandLogo: 'Volkswagen',
        iconName: 'Car',
        category: 'info'
      },
      { 
        plate: 'JKL8520', 
        model: 'Renault Kwid', 
        color: 'Azul', 
        brandLogo: 'Renault',
        iconName: 'Car',
        category: 'info'
      }
    ];
    
    const vehicleData = mockVehicleDatabase.find(v => v.plate === targetPlate.toUpperCase());
    
    if (vehicleData) {
      // Determine icon and category based on message content or alert type
      let iconName = 'BellRing';
      let category: 'urgent' | 'warning' | 'info' = 'info';
      
      if (message.toLowerCase().includes('urgência') || message.toLowerCase().includes('preciso sair')) {
        iconName = 'Siren';
        category = 'urgent';
      } else if (message.toLowerCase().includes('bloqueando') || message.toLowerCase().includes('bloqueio')) {
        iconName = 'Ban';
        category = 'urgent';
      } else if (message.toLowerCase().includes('farol') || message.toLowerCase().includes('luz')) {
        iconName = 'Lightbulb';
        category = 'warning';
      } else if (message.toLowerCase().includes('porta') || message.toLowerCase().includes('trunk')) {
        iconName = 'Unlock';
        category = 'warning';
      } else if (message.toLowerCase().includes('alarme')) {
        iconName = 'BellRing';
        category = 'urgent';
      } else if (message.toLowerCase().includes('pneu') || message.toLowerCase().includes('flat')) {
        iconName = 'CircleDashed';
        category = 'warning';
      } else if (message.toLowerCase().includes('janela') || message.toLowerCase().includes('window')) {
        iconName = 'Wind';
        category = 'info';
      }
      
      return { 
        success: true, 
        vehicleData: {
          plate: vehicleData.plate,
          model: vehicleData.model,
          color: vehicleData.color,
          message: message,
          iconName: iconName,
          category: category
        }
      };
    }
    
    // Return success even if vehicle not found (for demo purposes)
    return { success: true };
  }
};