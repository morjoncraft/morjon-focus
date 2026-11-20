-- ============================================================================
-- Morjon Focus — Supabase Veritabanı Şeması & Row Level Security (RLS)
-- Bu script'i Supabase Dashboard > SQL Editor kısmından tek seferde çalıştırın.
-- İdempotenttir; güvenle tekrar çalıştırılabilir.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. LISTS TABLOSU (Aktif Listeler ve Rutin Şablonları / Presets)
CREATE TABLE IF NOT EXISTS public.lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  emoji TEXT NOT NULL DEFAULT '🎯',
  is_preset BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

-- 2. TASKS TABLOSU (Görevler, Zamanlayıcı Durumu, Not-Now & Tamamlananlar)
-- Not: list_id NULL olabilir; böylece bir liste silindiğinde Not-Now havuzundaki
-- görevler kaybolmaz ve bağımsız olarak saklanmaya devam eder.
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id UUID NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  emoji TEXT NOT NULL DEFAULT '⚡',
  color TEXT NOT NULL DEFAULT 'zinc',
  duration_seconds INTEGER NOT NULL DEFAULT 1500 CHECK (duration_seconds >= 0),
  remaining_seconds INTEGER NOT NULL DEFAULT 1500,
  actual_focused_seconds INTEGER NOT NULL DEFAULT 0 CHECK (actual_focused_seconds >= 0),
  overtime_added_seconds INTEGER NOT NULL DEFAULT 0 CHECK (overtime_added_seconds >= 0),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'not_now', 'completed')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

-- 3. PERFORMANS İNDEKSLERİ
CREATE INDEX IF NOT EXISTS idx_lists_user_updated
  ON public.lists (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_user_updated
  ON public.tasks (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_list_sort
  ON public.tasks (list_id, status, sort_order);

-- 4. OTOMATİK updated_at TRIGGER'I
-- Çevrimdışı senkronizasyonda istemci tarafındaki updated_at değerini korur;
-- yalnızca updated_at değiştirilmeden yapılan doğrudan UPDATE'lerde now() atar.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lists_updated_at ON public.lists;
CREATE TRIGGER trg_lists_updated_at
  BEFORE UPDATE ON public.lists
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. ROW LEVEL SECURITY (RLS) POLİTİKALARI
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Lists politikaları (Her kullanıcı yalnızca kendi listelerini görebilir/düzenleyebilir)
DROP POLICY IF EXISTS "lists_select_own" ON public.lists;
CREATE POLICY "lists_select_own"
  ON public.lists
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lists_insert_own" ON public.lists;
CREATE POLICY "lists_insert_own"
  ON public.lists
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lists_update_own" ON public.lists;
CREATE POLICY "lists_update_own"
  ON public.lists
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lists_delete_own" ON public.lists;
CREATE POLICY "lists_delete_own"
  ON public.lists
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Tasks politikaları (Kullanıcı hem kendi user_id'sine hem de kendisine ait list_id'ye kısıtlanır)
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
CREATE POLICY "tasks_select_own"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      list_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.lists l
        WHERE l.id = list_id AND l.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
CREATE POLICY "tasks_update_own"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      list_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.lists l
        WHERE l.id = list_id AND l.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_own"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
