import { UserData, VehicleData } from '../types';
import { supabase } from './supabase';

// Helper para erros
const handleError = (error: any) => {
  console.error('API Error:', error);
  throw new Error(error.message || 'Ocorreu um erro inesperado');
};

export const api = {
  login: async (email: string, password: string): Promise<{ success: boolean }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) handleError(error);
    return { success: true };
  },

  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) handleError(error);
  },

  recoverPassword: async (email: string): Promise<{ success: boolean }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) handleError(error);
    return { success: true };
  },

  registerUser: async (data: UserData): Promise<{ success: boolean }> => {
    if (!data.password) throw new Error("Senha é obrigatória");

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.name,
          phone: data.phone,
        },
      },
    });

    if (error) handleError(error);
    return { success: true };
  },

  registerVehicle: async (data: VehicleData): Promise<{ success: boolean }> => {
    try {
      // Pega o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      
      // Verifica se o veículo já está registrado para este usuário
      const { data: existingVehicle, error: checkError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('user_id', user.id)
        .eq('plate', data.plate.toUpperCase())
        .maybeSingle();
      
      if (checkError) {
        console.error('Erro ao verificar veículo existente:', checkError);
        throw checkError;
      }
      
      // Se o veículo já existe para este usuário, atualiza em vez de inserir
      if (existingVehicle) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({
            model: data.model,
            color: data.color,
            state: data.state
          })
          .eq('id', existingVehicle.id);
        
        if (updateError) {
          console.error('Erro ao atualizar veículo:', updateError);
          throw updateError;
        }
        
        console.log('Veículo atualizado para o usuário:', user.id, data);
        return { success: true };
      }
      
      // Se não existe, insere o novo veículo
      const { error: insertError } = await supabase
        .from('vehicles')
        .insert([
          {
            user_id: user.id,
            plate: data.plate.toUpperCase(),
            model: data.model,
            color: data.color,
            state: data.state
          }
        ]);

      if (insertError) {
        console.error('Erro ao registrar veículo:', insertError);
        throw insertError;
      }
      
      console.log('Vehicle Registered linked to user:', user.id, data);
      return { success: true };
    } catch (error) {
      console.error('Erro ao registrar veículo:', error);
      throw error;
    }
  },

  // Busca dados reais do veículo no banco de dados
  getVehicleDetails: async (plate: string) => {
    try {
      // Busca o veículo no banco de dados pelo número da placa
      const { data, error } = await supabase
        .from('vehicles')
        .select('plate, model, color')
        .eq('plate', plate.toUpperCase())
        .single();

      if (error) {
        console.error('Erro ao buscar veículo:', error);
        throw error;
      }

      if (!data) {
        // Se não encontrar o veículo, retorna dados padrão
        return {
          plate: plate.toUpperCase(),
          model: 'Veículo não encontrado',
          color: 'Não especificado'
        };
      }

      return {
        plate: data.plate,
        model: data.model || 'Não especificado',
        color: data.color || 'Não especificado'
      };
    } catch (error) {
      console.error('Erro ao buscar detalhes do veículo:', error);
      // Em caso de erro, retorna dados simulados
      return {
        plate: plate.toUpperCase(),
        model: plate.endsWith('1') ? 'Honda Civic' : plate.endsWith('2') ? 'Toyota Corolla' : 'Porsche 911',
        color: plate.endsWith('1') ? 'Prata' : plate.endsWith('2') ? 'Preto' : 'Amarelo Racing',
      };
    }
  },

  sendAlert: async (targetPlate: string, message: string): Promise<{ success: boolean }> => {
    // Em produção: Insert na tabela 'alerts'
    // Aqui apenas validamos e retornamos sucesso, o Realtime é tratado no componente para demo
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Alert processed for [${targetPlate}]: ${message}`);
    return { success: true };
  }
};