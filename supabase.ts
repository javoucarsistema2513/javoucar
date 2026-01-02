
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xeusfnoudyflimkstfkg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kiAaK0vpXpWFl4A8nK9_iw_albpyGCu';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
