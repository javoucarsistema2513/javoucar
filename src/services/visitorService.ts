import { supabase } from '../lib/supabase';
import { Visitor } from '../types';

export const visitorService = {
  async testConnection() {
    try {
      const { error } = await supabase.from('visitors').select('id').limit(1);
      if (error) throw error;
    } catch (error) {
      console.error("Supabase connection error:", error);
    }
  },

  async addVisitor(visitorData: Omit<Visitor, 'id' | 'createdAt' | 'createdBy'>, userId?: string) {
    try {
      let finalUserId = userId;
      
      if (!finalUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        finalUserId = user.id;
      }
      
      const { data, error } = await supabase
        .from('visitors')
        .insert([
          {
            name: visitorData.name,
            phone: visitorData.phone,
            address: visitorData.address || '',
            age: (visitorData.age && !isNaN(visitorData.age)) ? visitorData.age : null,
            gender: visitorData.gender || null,
            birth_date: (visitorData.birthDate && visitorData.birthDate.length === 10) ? visitorData.birthDate : null,
            participates_in_cell: visitorData.participatesInCell || null,
            cell_leader: visitorData.cellLeader || null,
            category: visitorData.category || null,
            is_married_or_lives_together: visitorData.isMarriedOrLivesTogether || null,
            prayer_request: visitorData.prayerRequest || null,
            invited_by: visitorData.invitedBy || null,
            observation: visitorData.observation || null,
            created_by: finalUserId,
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase Insert Detailed Error:', error);
        throw error;
      }
      
      if (!data) throw new Error('No data returned from Suprabase insert');

      return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        address: data.address,
        age: data.age,
        gender: data.gender,
        birthDate: data.birth_date,
        participatesInCell: data.participates_in_cell,
        cellLeader: data.cell_leader,
        category: data.category,
        isMarriedOrLivesTogether: data.is_married_or_lives_together,
        prayerRequest: data.prayer_request,
        invitedBy: data.invited_by,
        observation: data.observation,
        createdAt: { seconds: new Date(data.created_at).getTime() / 1000 },
        createdBy: data.created_by
      } as Visitor;
    } catch (error) {
      console.error('Supabase Insert Error:', error);
      throw error;
    }
  },

  async getVisitors() {
    try {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Map Supabase fields to our Visitor interface if needed
      return (data || []).map(v => ({
        id: v.id,
        name: v.name,
        phone: v.phone,
        address: v.address,
        age: v.age,
        gender: v.gender,
        birthDate: v.birth_date,
        participatesInCell: v.participates_in_cell,
        cellLeader: v.cell_leader,
        category: v.category,
        isMarriedOrLivesTogether: v.is_married_or_lives_together,
        prayerRequest: v.prayer_request,
        invitedBy: v.invited_by,
        observation: v.observation,
        createdAt: { seconds: new Date(v.created_at).getTime() / 1000 },
        createdBy: v.created_by
      })) as Visitor[];
    } catch (error) {
      console.error('Supabase Fetch Error:', error);
      throw error;
    }
  },

  async deleteVisitor(id: string) {
    try {
      const { error } = await supabase
        .from('visitors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Supabase Delete Error:', error);
      throw error;
    }
  },

  async updateVisitor(id: string, visitorData: Partial<Visitor>) {
    try {
      const { data, error } = await supabase
        .from('visitors')
        .update({
          name: visitorData.name,
          phone: visitorData.phone,
          address: visitorData.address || '',
          age: (visitorData.age && !isNaN(visitorData.age)) ? visitorData.age : null,
          gender: visitorData.gender || null,
          birth_date: (visitorData.birthDate && visitorData.birthDate.length === 10) ? visitorData.birthDate : null,
          participates_in_cell: visitorData.participatesInCell || null,
          cell_leader: visitorData.cellLeader || null,
          category: visitorData.category || null,
          is_married_or_lives_together: visitorData.isMarriedOrLivesTogether || null,
          prayer_request: visitorData.prayerRequest || null,
          invited_by: visitorData.invitedBy || null,
          observation: visitorData.observation || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      if (!data) throw new Error('No data returned from Supabase update');

      return {
        data: {
          id: data.id,
          name: data.name,
          phone: data.phone,
          address: data.address,
          age: data.age,
          gender: data.gender,
          birthDate: data.birth_date,
          participatesInCell: data.participates_in_cell,
          cellLeader: data.cell_leader,
          category: data.category,
          isMarriedOrLivesTogether: data.is_married_or_lives_together,
          prayerRequest: data.prayer_request,
          invitedBy: data.invited_by,
          observation: data.observation,
          createdAt: { seconds: new Date(data.created_at).getTime() / 1000 },
          createdBy: data.created_by
        } as Visitor
      };
    } catch (error) {
      console.error('Supabase Update Error:', error);
      throw error;
    }
  }
};
