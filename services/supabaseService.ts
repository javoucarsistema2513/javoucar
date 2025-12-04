import { supabase } from './supabaseClient'
import { UserData, VehicleData } from '../types'

export const supabaseService = {
  // User authentication
  async signUp(email: string, password: string, userData: UserData) {
    try {
      // Verificar se o cliente Supabase está disponível
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      // Insert user data into the users table
      if (data.user) {
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              name: userData.name,
              email: userData.email,
              phone: userData.phone,
              created_at: new Date(),
            },
          ])

        if (insertError) throw insertError
      }

      return { success: true, data }
    } catch (error) {
      console.error('Sign up error:', error)
      return { success: false, error }
    }
  },

  async signIn(email: string, password: string) {
    try {
      // Verificar se o cliente Supabase está disponível
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Get user profile data
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError) throw profileError

      return { success: true, data: { ...data, profile } }
    } catch (error) {
      console.error('Sign in error:', error)
      return { success: false, error }
    }
  },

  async signOut() {
    try {
      // Verificar se o cliente Supabase está disponível
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      return { success: false, error }
    }
  },

  async recoverPassword(email: string) {
    try {
      // Verificar se o cliente Supabase está disponível
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Password recovery error:', error)
      return { success: false, error }
    }
  },

  // User management
  async getUserProfile(userId: string) {
    try {
      // Verificar se o cliente Supabase está disponível
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Get user profile error:', error)
      return { success: false, error }
    }
  },

  // Vehicle management
  async registerVehicle(vehicleData: VehicleData, userId: string) {
    try {
      // Verificar se o cliente Supabase está disponível
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('vehicles')
        .insert([
          {
            user_id: userId,
            plate: vehicleData.plate,
            model: vehicleData.model,
            color: vehicleData.color,
            state: vehicleData.state,
            created_at: new Date(),
          },
        ])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Vehicle registration error:', error)
      return { success: false, error }
    }
  },

  async getUserVehicles(userId: string) {
    try {
      // Verificar se o cliente Supabase está disponível
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Get user vehicles error:', error)
      return { success: false, error }
    }
  },

  async getVehicleByPlate(plate: string) {
    try {
      // Verificar se o cliente Supabase está disponível
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          user:users(name, email, phone)
        `)
        .eq('plate', plate)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Get vehicle by plate error:', error)
      return { success: false, error }
    }
  },

  // Alert system
  async sendAlert(
    targetPlate: string,
    message: string,
    senderUserId: string,
    alertType?: string
  ) {
    try {
      // Verificar se o cliente Supabase está disponível
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // Get target vehicle and user
      const vehicleResult = await this.getVehicleByPlate(targetPlate)
      if (!vehicleResult.success) {
        throw new Error('Vehicle not found')
      }

      const { data: alertData, error } = await supabase
        .from('alerts')
        .insert([
          {
            sender_user_id: senderUserId,
            target_plate: targetPlate,
            message: message,
            alert_type: alertType || 'info',
            created_at: new Date(),
            is_read: false,
          },
        ])
        .select()
        .single()

      if (error) throw error
      return { success: true, data: alertData, vehicleData: vehicleResult.data }
    } catch (error) {
      console.error('Send alert error:', error)
      return { success: false, error }
    }
  },

  async getUserAlerts(userId: string) {
    try {
      // Verificar se o cliente Supabase está disponível
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          sender:users(name, email),
          vehicle:vehicles(model, color)
        `)
        .or(`sender_user_id.eq.${userId},target_plate.in.(${userId})`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Get user alerts error:', error)
      return { success: false, error }
    }
  },

  async markAlertAsRead(alertId: string) {
    try {
      // Verificar se o cliente Supabase está disponível
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Mark alert as read error:', error)
      return { success: false, error }
    }
  },
}