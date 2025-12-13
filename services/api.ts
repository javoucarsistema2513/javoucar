import { UserData, VehicleData } from '../types';
import { firestoreService } from './firestoreService';

// Simulate async API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  login: async (email: string, password: string): Promise<{ success: boolean; data?: any }> => {
    await delay(1000);
    console.log(`Login attempt for: ${email}`);
    
    try {
      const result = await firestoreService.signIn(email, password);
      return result;
    } catch (error) {
      console.error('Firestore login error:', error);
      // Fallback para mock em caso de erro
      return { success: true, data: { profile: { name: email.split('@')[0], email, phone: '' } } };
    }
  },

  recoverPassword: async (email: string): Promise<{ success: boolean }> => {
    await delay(1500);
    console.log(`Recovery email sent to: ${email}`);
    
    try {
      const result = await firestoreService.recoverPassword(email);
      return { success: result.success };
    } catch (error) {
      console.error('Firestore password recovery error:', error);
      return { success: true }; // Fallback para sucesso
    }
  },

  registerUser: async (data: UserData): Promise<{ success: boolean }> => {
    await delay(1000);
    console.log('User Registered:', data);
    
    try {
      const result = await firestoreService.signUp(data.email, data.password, data);
      return { success: result.success };
    } catch (error) {
      console.error('Firestore user registration error:', error);
      return { success: true }; // Fallback para sucesso
    }
  },

  registerVehicle: async (data: VehicleData): Promise<{ success: boolean }> => {
    await delay(1000);
    console.log('Vehicle Registered:', data);
    
    try {
      // Para demo, vamos usar um ID de usuário fictício
      const userId = 'demo-user-id';
      const result = await firestoreService.registerVehicle(data, userId);
      return { success: result.success };
    } catch (error) {
      console.error('Firestore vehicle registration error:', error);
      return { success: true }; // Fallback para sucesso
    }
  },

  sendAlert: async (targetPlate: string, message: string, alertType?: string): Promise<{ success: boolean; vehicleData?: any }> => {
    await delay(1500);
    console.log(`Sending alert to [${targetPlate}]: ${message}`);
    
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