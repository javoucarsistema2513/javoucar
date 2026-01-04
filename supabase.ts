
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xeusfnoudyflimkstfkg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kiAaK0vpXpWFl4A8nK9_iw_albpyGCu';

// Configuração robusta para persistência de login
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});
