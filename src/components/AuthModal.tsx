import React, { useState } from 'react';
import {
  Cloud,
  KeyRound,
  LogOut,
  Mail,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  getSupabaseClient,
  getSupabaseConfig,
  isSupabaseConfigured,
  setRuntimeSupabaseConfig,
} from '../lib/supabase';
import { useFocusStore } from '../store/useFocusStore';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'signup' | 'magic';

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const user = useFocusStore((s) => s.user);
  const lang = useFocusStore((s) => s.settings.language);
  const syncStatus = useFocusStore((s) => s.syncStatus);
  const syncError = useFocusStore((s) => s.syncError);
  const lastSyncedAt = useFocusStore((s) => s.lastSyncedAt);
  const triggerManualSync = useFocusStore((s) => s.triggerManualSync);
  const handleAuthUserChange = useFocusStore((s) => s.handleAuthUserChange);

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const cfg = getSupabaseConfig();
  const [showConfigOverride, setShowConfigOverride] = useState(!isSupabaseConfigured());
  const [sbUrl, setSbUrl] = useState(cfg.url);
  const [sbKey, setSbKey] = useState(cfg.anonKey);

  if (!open) return null;

  const isTr = lang === 'tr';
  const configured = isSupabaseConfigured();

  const handleSaveRuntimeConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setRuntimeSupabaseConfig(sbUrl, sbKey);
    setMessage({
      type: 'ok',
      text: isTr
        ? 'Supabase bağlantı bilgileri kaydedildi. Şimdi giriş yapabilirsin.'
        : 'Supabase configuration saved. You can sign in now.',
    });
    setShowConfigOverride(false);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage({
        type: 'err',
        text: isTr
          ? 'Önce .env dosyasına veya aşağıya Supabase URL ve Anon Key girin.'
          : 'Please enter your Supabase URL and Anon Key below or in .env first.',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setMessage({
          type: 'ok',
          text: isTr
            ? 'Magic Link e-posta adresine gönderildi!'
            : 'Magic Link sent to your email!',
        });
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session?.user) {
          await handleAuthUserChange({
            id: data.session.user.id,
            email: data.session.user.email,
          });
          setMessage({
            type: 'ok',
            text: isTr
              ? 'Hesap oluşturuldu ve lokal verilerin birleştirildi!'
              : 'Account created and local data merged!',
          });
        } else {
          setMessage({
            type: 'ok',
            text: isTr
              ? 'Kayıt başarılı! Onay e-postanı kontrol et.'
              : 'Sign up successful! Check your confirmation email.',
          });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.user) {
          await handleAuthUserChange({
            id: data.user.id,
            email: data.user.email,
          });
          onClose();
        }
      }
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Authentication failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    await handleAuthUserChange(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl animate-fade-slide">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {isTr ? 'Bulut Yedekleme & Hesap' : 'Cloud Sync & Account'}
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {isTr
                  ? 'Lokal verilerin girişte otomatik birleştirilir'
                  : 'Local tasks are automatically merged on sign in'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {user ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {isTr ? 'Hesap:' : 'Account:'}
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {user.email ?? user.id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {isTr ? 'Durum:' : 'Status:'}
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {syncStatus}
                </span>
              </div>
              {lastSyncedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {isTr ? 'Son eşitleme:' : 'Last synced:'}
                  </span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {new Date(lastSyncedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {syncError && <p className="pt-1 text-rose-500">{syncError}</p>}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void triggerManualSync()}
                className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {isTr ? 'Şimdi Senkronize Et' : 'Sync Now'}
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                {isTr ? 'Çıkış Yap' : 'Sign Out'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
              {(
                [
                  { id: 'login', label: isTr ? 'Giriş Yap' : 'Sign In' },
                  { id: 'signup', label: isTr ? 'Kayıt Ol' : 'Sign Up' },
                  { id: 'magic', label: 'Magic Link' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMode(tab.id);
                    setMessage(null);
                  }}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                    mode === tab.id
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {!configured && (
              <div className="rounded-xl border border-amber-300/60 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-200">
                <p className="font-semibold">
                  {isTr ? 'Supabase yapılandırması eksik' : 'Supabase not configured yet'}
                </p>
                <p className="mt-0.5 text-[11px] opacity-90">
                  {isTr
                    ? '.env dosyanıza VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ekleyin veya aşağıdan girin. Misafir Modu bu sırada tamamen çalışır.'
                    : 'Add VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY in .env or enter them below. Guest Mode works offline right away.'}
                </p>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {isTr ? 'E-posta' : 'Email'}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {mode !== 'magic' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {isTr ? 'Şifre' : 'Password'}
                  </label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
              )}

              {message && (
                <div
                  className={`rounded-xl px-3 py-2 text-xs font-medium ${
                    message.type === 'ok'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-xs font-semibold text-white shadow-sm transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {loading
                  ? isTr
                    ? 'İşleniyor...'
                    : 'Working...'
                  : mode === 'magic'
                    ? isTr
                      ? 'Magic Link Gönder'
                      : 'Send Magic Link'
                    : mode === 'signup'
                      ? isTr
                        ? 'Hesap Oluştur ve Birleştir'
                        : 'Create Account & Merge'
                      : isTr
                        ? 'Giriş Yap ve Senkronize Et'
                        : 'Sign In & Sync'}
              </button>
            </form>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => setShowConfigOverride((v) => !v)}
                className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {showConfigOverride
                  ? isTr
                    ? 'Supabase ayarlarını gizle'
                    : 'Hide Supabase connection settings'
                  : isTr
                    ? 'Supabase URL / Anon Key düzenle'
                    : 'Configure Supabase URL / Anon Key'}
              </button>

              {showConfigOverride && (
                <form onSubmit={handleSaveRuntimeConfig} className="mt-2.5 space-y-2">
                  <input
                    type="url"
                    value={sbUrl}
                    onChange={(e) => setSbUrl(e.target.value)}
                    placeholder="https://xxxx.supabase.co"
                    className="h-8 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <input
                    type="text"
                    value={sbKey}
                    onChange={(e) => setSbKey(e.target.value)}
                    placeholder="Supabase Anon Key"
                    className="h-8 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    type="submit"
                    className="h-8 rounded-lg bg-zinc-800 dark:bg-zinc-200 px-3 text-[11px] font-semibold text-white dark:text-zinc-900"
                  >
                    {isTr ? 'Kaydet' : 'Save Connection'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
