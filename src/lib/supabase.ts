import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder').trim();

// Robust sanitization: Ensure we only have the base domain/origin
// This prevents errors like edjjivudeovgfaqtonbm.supabase.co/rest/v1/auth/v1/signup
if (supabaseUrl) {
  // Extract strictly the domain and protocol, ignoring any paths like /rest/v1
  const cleanUrl = supabaseUrl.replace(/^https?:\/\//, '').split('/')[0];
  supabaseUrl = `https://${cleanUrl}`;
}

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
