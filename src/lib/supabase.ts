import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const RUNTIME_CONFIG_KEY = 'morjon-focus-supabase-override';

interface SupabaseOverrideConfig {
  url: string;
  anonKey: string;
}

let cachedClient: SupabaseClient | null = null;
let cachedKey = '';

export function getSupabaseConfig(): { url: string; anonKey: string; source: 'env' | 'runtime' | 'none' } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey, source: 'env' };
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(RUNTIME_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SupabaseOverrideConfig>;
        if (parsed.url?.trim() && parsed.anonKey?.trim()) {
          return {
            url: parsed.url.trim(),
            anonKey: parsed.anonKey.trim(),
            source: 'runtime',
          };
        }
      }
    } catch {
      // ignore invalid storage
    }
  }

  return { url: '', anonKey: '', source: 'none' };
}

export function setRuntimeSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  if (!cleanUrl || !cleanKey) {
    localStorage.removeItem(RUNTIME_CONFIG_KEY);
  } else {
    localStorage.setItem(RUNTIME_CONFIG_KEY, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
  }
  cachedClient = null;
  cachedKey = '';
}

export function isSupabaseConfigured(): boolean {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
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
