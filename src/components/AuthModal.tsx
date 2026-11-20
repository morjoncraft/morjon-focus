import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Cloud,
  Copy,
  Database,
  KeyRound,
  LogOut,
  Mail,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { t } from '../lib/i18n';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { SUPABASE_SCHEMA_SQL } from '../lib/supabaseSchemaSql';
import { computeDeltaBatch, diagnoseSyncError } from '../lib/syncEngine';
import { useFocusStore } from '../store/useFocusStore';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'signup' | 'magic';

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const user = useFocusStore((s) => s.user);
  const lists = useFocusStore((s) => s.lists);
  const tasks = useFocusStore((s) => s.tasks);
  const lang = useFocusStore((s) => s.settings.language);
  const syncStatus = useFocusStore((s) => s.syncStatus);
  const syncError = useFocusStore((s) => s.syncError);
  const lastSyncedAt = useFocusStore((s) => s.lastSyncedAt);
  const lastSyncStats = useFocusStore((s) => s.lastSyncStats);
  const triggerManualSync = useFocusStore((s) => s.triggerManualSync);
  const handleAuthUserChange = useFocusStore((s) => s.handleAuthUserChange);
  const signOutUser = useFocusStore((s) => s.signOutUser);

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clearOnSignOut, setClearOnSignOut] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [showSqlSection, setShowSqlSection] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const pendingDeltaCount = useMemo(() => {
    if (!user) return 0;
    const batch = computeDeltaBatch(user.id, lists, tasks);
    return batch.dirtyLists.length + batch.dirtyTasks.length;
  }, [user, lists, tasks]);

  const diagnostic = useMemo(
    () => (syncError ? diagnoseSyncError(syncError, lang) : null),
    [syncError, lang],
  );

  if (!open) return null;

  const isTr = lang === 'tr';
  const configured = isSupabaseConfigured();

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setSqlCopied(true);
      window.setTimeout(() => setSqlCopied(false), 3000);
    } catch {
      // ignore clipboard errors
    }
  };

  const statusLabel = (() => {
    switch (syncStatus) {
      case 'synced':
        return isTr ? 'Buluta kaydedildi' : 'Synced';
      case 'syncing':
        return isTr ? 'Senkronize ediliyor...' : 'Syncing...';
      case 'offline':
        return isTr ? 'Çevrimdışı' : 'Offline';
      case 'error':
        return isTr ? 'Hata' : 'Error';
      default:
        return isTr ? 'Lokal Mod' : 'Guest';
    }
  })();

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage({
        type: 'err',
        text: isTr
          ? 'Bulut senkronizasyonu şu an yapılandırılmamış (.env içinde VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY gerekli).'
          : 'Cloud sync is not configured yet (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in .env).',
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
            ? 'Magic Link e-posta adresine gönderildi! Gelen kutundaki bağlantıya tıklayarak giriş yapabilirsin.'
            : 'Magic Link sent! Check your inbox and click the link to sign in.',
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
          if (!useFocusStore.getState().syncError) {
            onClose();
          }
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
    signOutUser(clearOnSignOut);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl animate-fade-slide">
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
                {t(lang, 'deltaSyncBadge')}
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
                <span
                  className={`font-semibold ${
                    syncStatus === 'error'
                      ? 'text-rose-500'
                      : syncStatus === 'offline'
                        ? 'text-amber-500'
                        : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {isTr ? 'Bekleyen Değişiklik (Delta):' : 'Pending Delta Rows:'}
                </span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {pendingDeltaCount}
                </span>
              </div>
              {lastSyncStats && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {isTr ? 'Son Delta Aktarımı:' : 'Last Delta Push:'}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                    {lastSyncStats.upsertedLists} {isTr ? 'liste' : 'lists'},{' '}
                    {lastSyncStats.upsertedTasks} {isTr ? 'görev' : 'tasks'}
                  </span>
                </div>
              )}
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
            </div>

            {diagnostic && (
              <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3.5 text-xs space-y-2">
                <div className="flex items-start gap-2 text-rose-600 dark:text-rose-300 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{diagnostic.title}</span>
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-200/90 leading-relaxed">
                  {diagnostic.detail}
                </p>
                {syncError && (
                  <div className="rounded-lg bg-black/15 dark:bg-black/35 px-2.5 py-1.5 font-mono text-[10px] text-rose-700 dark:text-rose-200 break-all">
                    {syncError}
                  </div>
                )}
                {diagnostic.needsSchemaSql && (
                  <button
                    type="button"
                    onClick={() => void handleCopySql()}
                    className="w-full inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition"
                  >
                    {sqlCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>{t(lang, 'copiedSqlToast')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>{t(lang, 'copySqlBtn')}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            <label className="flex items-start gap-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 p-2.5 text-[11px] text-zinc-600 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={clearOnSignOut}
                onChange={(e) => setClearOnSignOut(e.target.checked)}
                className="mt-0.5 rounded accent-violet-600"
              />
              <span>
                {isTr
                  ? 'Çıkış yaparken bu cihazdaki lokal verileri temizle (ortak bilgisayarlar ve hesap değişimi için önerilir)'
                  : 'Clear local data on this device when signing out (recommended for shared computers and switching accounts)'}
              </span>
            </label>

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

            <div className="border-t border-zinc-200/80 dark:border-zinc-800 pt-2">
              <button
                type="button"
                onClick={() => setShowSqlSection((v) => !v)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                <Database className="h-3 w-3" />
                <span>
                  {isTr ? 'Veritabanı SQL Kurulumu (Supabase)' : 'Database SQL Setup (Supabase)'}
                </span>
              </button>
              {showSqlSection && (
                <div className="mt-2 space-y-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3 text-[11px]">
                  <p className="text-zinc-500 dark:text-zinc-400">
                    {isTr
                      ? 'Supabase Dashboard → SQL Editor içinde bir kez çalıştırarak lists/tasks tablolarını ve RLS politikalarını oluşturabilirsin.'
                      : 'Run this once in Supabase Dashboard → SQL Editor to create the lists/tasks tables and RLS policies.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleCopySql()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-[11px] font-semibold text-white dark:text-zinc-900"
                  >
                    {sqlCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{sqlCopied ? t(lang, 'copiedSqlToast') : t(lang, 'copySqlBtn')}</span>
                  </button>
                </div>
              )}
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
                  {isTr ? 'Bulut senkronizasyonu aktif değil' : 'Cloud sync is not configured'}
                </p>
                <p className="mt-0.5 text-[11px] opacity-90">
                  {isTr
                    ? 'Bulut senkronizasyonu için .env dosyasına Supabase bilgilerini ekleyip sunucuyu yeniden başlatın. Misafir Modu bu sırada tamamen çalışır.'
                    : 'Add your Supabase env variables to .env and restart the dev server to enable cloud sync. Guest Mode works offline right away.'}
                </p>
              </div>
            )}

            {mode === 'magic' && (
              <div className="rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 py-2 text-[11px] text-violet-700 dark:text-violet-200 leading-relaxed">
                {isTr
                  ? 'Şifresiz giriş: E-posta adresine tek kullanımlık güvenli bir giriş bağlantısı gönderilir; bağlantıya tıkladığında otomatik giriş yapılır.'
                  : "Passwordless sign-in: We'll email you a secure one-time link that signs you in automatically when clicked."}
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
                    placeholder={isTr ? 'ornek@eposta.com' : 'you@example.com'}
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
          </div>
        )}
      </div>
    </div>
  );
};
