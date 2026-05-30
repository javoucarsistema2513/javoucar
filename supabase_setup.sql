-- SCRIPT DEFINITIVO PARA O SUPABASE (SQL EDITOR)
-- ATENÇÃO: NÃO use // para comentários em SQL. Use apenas --
-- Este script configura as tabelas e permissões necessárias.

-- 1. Criar a tabela de perfis (profiles) se não existir
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  admin_category TEXT CHECK (admin_category IN ('homens', 'mulheres', 'jovens', 'todas')),
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar a tabela de visitantes (visitors) se não existir
CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  age INTEGER,
  gender TEXT,
  birth_date DATE,
  invited_by TEXT,
  participates_in_cell TEXT,
  cell_leader TEXT,
  category TEXT,
  is_married_or_lives_together TEXT,
  prayer_request TEXT,
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- 3. Garantir colunas necessárias (migração segura)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='visitors' AND column_name='invited_by') THEN
    ALTER TABLE public.visitors ADD COLUMN invited_by TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='visitors' AND column_name='address') THEN
    ALTER TABLE public.visitors ADD COLUMN address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='visitors' AND column_name='birth_date') THEN
    ALTER TABLE public.visitors ADD COLUMN birth_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='visitors' AND column_name='observation') THEN
    ALTER TABLE public.visitors ADD COLUMN observation TEXT;
  END IF;
END $$;

-- 4. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- 5. Limpar e Recriar Políticas para PROFILES
DROP POLICY IF EXISTS "Permitir leitura de perfis para usuários autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Master admins podem gerenciar tudo em perfis" ON public.profiles;
DROP POLICY IF EXISTS "Equipe pode ver perfis" ON public.profiles;
DROP POLICY IF EXISTS "Gerenciar conta própria" ON public.profiles;
DROP POLICY IF EXISTS "Master admin total" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem gerenciar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Gerenciar perfis" ON public.profiles;

CREATE POLICY "Equipe pode ver perfis" ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gerenciar perfis" ON public.profiles FOR ALL TO authenticated USING (
  auth.uid() = id 
  OR auth.jwt() ->> 'email' = 'adminnovo@gmail.com'
  OR (auth.jwt() -> 'raw_user_meta_data' ->> 'admin_category') IS NOT NULL
) WITH CHECK (
  auth.uid() = id 
  OR auth.jwt() ->> 'email' = 'adminnovo@gmail.com'
  OR (auth.jwt() -> 'raw_user_meta_data' ->> 'admin_category') IS NOT NULL
);

-- 6. Limpar e Recriar Políticas para VISITORS
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.visitors;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.visitors;
DROP POLICY IF EXISTS "Permitir deleção para quem criou ou master admin" ON public.visitors;
DROP POLICY IF EXISTS "Permitir atualização para quem criou ou master admin" ON public.visitors;
DROP POLICY IF EXISTS "Ver todos visitantes" ON public.visitors;
DROP POLICY IF EXISTS "Cadastrar visitante" ON public.visitors;
DROP POLICY IF EXISTS "Deletar / Editar permissão master" ON public.visitors;
DROP POLICY IF EXISTS "Deletar / Editar visitantes" ON public.visitors;
DROP POLICY IF EXISTS "Gerenciar visitante" ON public.visitors;

CREATE POLICY "Ver todos visitantes" ON public.visitors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gerenciar visitante" ON public.visitors FOR ALL TO authenticated USING (
  auth.uid() = created_by 
  OR auth.jwt() ->> 'email' = 'adminnovo@gmail.com'
  OR (auth.jwt() -> 'raw_user_meta_data' ->> 'admin_category') IS NOT NULL
) WITH CHECK (
  auth.uid() = created_by 
  OR auth.jwt() ->> 'email' = 'adminnovo@gmail.com'
  OR (auth.jwt() -> 'raw_user_meta_data' ->> 'admin_category') IS NOT NULL
);
