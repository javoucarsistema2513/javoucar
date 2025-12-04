import { createClient } from '@supabase/supabase-js'

// Obter variáveis de ambiente de forma segura
declare const process: any;
declare const importMeta: any;

const SUPABASE_URL = typeof importMeta !== 'undefined' && importMeta.env?.VITE_SUPABASE_URL
  ? importMeta.env.VITE_SUPABASE_URL
  : typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL
  ? process.env.VITE_SUPABASE_URL
  : 'YOUR_SUPABASE_URL'

const SUPABASE_ANON_KEY = typeof importMeta !== 'undefined' && importMeta.env?.VITE_SUPABASE_ANON_KEY
  ? importMeta.env.VITE_SUPABASE_ANON_KEY
  : typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY
  ? process.env.VITE_SUPABASE_ANON_KEY
  : 'YOUR_SUPABASE_ANON_KEY'

// Validar configuração
if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_URL === 'undefined') {
  console.warn('SUPABASE_URL não está configurada corretamente')
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY' || SUPABASE_ANON_KEY === 'undefined') {
  console.warn('SUPABASE_ANON_KEY não está configurada corretamente')
}

let supabaseInstance = null

// Criar cliente Supabase apenas se as variáveis estiverem definidas corretamente
if (SUPABASE_URL && SUPABASE_ANON_KEY && 
    SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
    SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
    SUPABASE_URL !== 'undefined' &&
    SUPABASE_ANON_KEY !== 'undefined' &&
    SUPABASE_URL.startsWith('http')) {
  try {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  } catch (error) {
    console.error('Erro ao criar cliente Supabase:', error)
  }
} else {
  console.warn('Cliente Supabase não foi criado devido à configuração inválida')
}

export const supabase = supabaseInstance