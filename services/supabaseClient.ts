import { createClient } from '@supabase/supabase-js'

// Substitua essas variáveis com seus valores reais do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

// Criar cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)