import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  admin_category: 'homens' | 'mulheres' | 'jovens' | null;
  role: 'user' | 'admin';
  created_at?: string;
}

export const userService = {
  async getProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching profiles:', error);
      throw error;
    }
    return (data || []) as UserProfile[];
  },

  async upsertProfile(profile: UserProfile) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(profile);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error upserting profile:', error);
      throw error;
    }
  },

  async updateProfile(id: string, profile: Partial<UserProfile>) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  async deleteProfile(id: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  },

  async deleteAllExceptMaster(masterEmails: string[]) {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .not('email', 'in', `(${masterEmails.join(',')})`);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error clearing profiles:', error);
      throw error;
    }
  }
};
