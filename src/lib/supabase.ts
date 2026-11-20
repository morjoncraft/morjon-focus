import { createClient, type SupabaseClient } from '@supabase/supabase-js';

if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('morjon-focus-supabase-override');
  } catch {
    // ignore storage access issues
  }
}

let cachedClient: SupabaseClient | null = null;
let cachedKey = '';

function getEnvSupabaseConfig(): { url: string; anonKey: string } {
  return {
    url: (import.meta.env.VITE_SUPABASE_URL ?? '').trim(),
    anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim(),
  };
}

export function isSupabaseConfigured(): boolean {
  const cfg = getEnvSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getEnvSupabaseConfig();
  if (!cfg.url || !cfg.anonKey) return null;

  const signature = `${cfg.url}|${cfg.anonKey}`;
  if (cachedClient && cachedKey === signature) {
    return cachedClient;
  }

  cachedClient = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  cachedKey = signature;
  return cachedClient;
}
