import { useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, CheckCircle2, Inbox, Pencil, Plus, Share2 } from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { CompletedStatsView } from './components/CompletedStatsView';
import { CustomEmojiThemeModal } from './components/CustomEmojiThemeModal';
import { CustomizeModal } from './components/CustomizeModal';
import { HeroTimer } from './components/HeroTimer';
import { Navbar } from './components/Navbar';
import { NotNowView } from './components/NotNowView';
import { QuickAddTask } from './components/QuickAddTask';
import { SettingsModal } from './components/SettingsModal';
import { ShareModal } from './components/ShareModal';
import { SidebarLists } from './components/SidebarLists';
import { TaskListView } from './components/TaskListView';
import { SURFACE_THEMES, hexToRgba } from './lib/colors';
import { formatTimer, getLocalDateKey } from './lib/formatters';
import { t } from './lib/i18n';
import { requestPersistentStorage } from './lib/notifications';
import { decodeShareInput } from './lib/shareCodec';
import { getSupabaseClient } from './lib/supabase';
import { useFocusStore } from './store/useFocusStore';
import type { SharedListPayload } from './types';

export function App() {
  const lists = useFocusStore((s) => s.lists);
  const tasks = useFocusStore((s) => s.tasks);
  const activeListId = useFocusStore((s) => s.activeListId);
  const activeTab = useFocusStore((s) => s.activeTab);
  const theme = useFocusStore((s) => s.theme);
  const settings = useFocusStore((s) => s.settings);
  const isTimerRunning = useFocusStore((s) => s.isTimerRunning);
  const isAlarmActive = useFocusStore((s) => s.isAlarmActive);

  const selectList = useFocusStore((s) => s.selectList);
  const setActiveTab = useFocusStore((s) => s.setActiveTab);
  const updateList = useFocusStore((s) => s.updateList);
  const tickTimer = useFocusStore((s) => s.tickTimer);
  const toggleTimer = useFocusStore((s) => s.toggleTimer);
  const applyColorMePalette = useFocusStore((s) => s.applyColorMePalette);
  const applyEmojiMeTheme = useFocusStore((s) => s.applyEmojiMeTheme);
  const pickRandomTask = useFocusStore((s) => s.pickRandomTask);
  const dismissAlarm = useFocusStore((s) => s.dismissAlarm);
  const setStoragePersisted = useFocusStore((s) => s.setStoragePersisted);
  const setNetworkOnline = useFocusStore((s) => s.setNetworkOnline);
  const handleAuthUserChange = useFocusStore((s) => s.handleAuthUserChange);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customEmojiModal, setCustomEmojiModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
  }>({ open: false, mode: 'create' });
  const [incomingShare, setIncomingShare] = useState<SharedListPayload | null>(null);

  const [editingListTitle, setEditingListTitle] = useState(false);
  const [draftListName, setDraftListName] = useState('');
  const quickAddInputRef = useRef<HTMLInputElement | null>(null);

  const lang = settings.language;
  const isDark = theme === 'dark';
  const surface = SURFACE_THEMES[settings.surfaceTheme] ?? SURFACE_THEMES['llama-slate'];

  const regularLists = useMemo(
    () =>
      lists
        .filter((l) => !l.deleted_at && !l.is_preset)
        .sort((a, b) => a.sort_order - b.sort_order),
    [lists],
  );

  const activeList = useMemo(
    () => regularLists.find((l) => l.id === activeListId) ?? regularLists[0] ?? null,
    [regularLists, activeListId],
  );

  const activeListTasks = useMemo(() => {
    if (!activeList) return [];
    return tasks
      .filter((t) => !t.deleted_at && t.status === 'todo' && t.list_id === activeList.id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [tasks, activeList]);

  const topTask = activeListTasks[0] ?? null;

  const totalListRemainingSeconds = useMemo(
    () => activeListTasks.reduce((acc, item) => acc + Math.max(0, item.remaining_seconds), 0),
    [activeListTasks],
  );

  const notNowCount = useMemo(
    () => tasks.filter((item) => !item.deleted_at && item.status === 'not_now').length,
    [tasks],
  );

  const completedTodayCount = useMemo(() => {
    const todayKey = getLocalDateKey();
    return tasks.filter(
      (item) =>
        !item.deleted_at &&
        item.status === 'completed' &&
        item.completed_at &&
        getLocalDateKey(new Date(item.completed_at)) === todayKey,
    ).length;
  }, [tasks]);

  // 1. Sync Dark/Light class + PWA theme-color meta + html lang
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const meta = document.getElementById('theme-color-meta');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? surface.darkBg : surface.lightBg);
    }
  }, [theme, lang, surface.darkBg, surface.lightBg]);

  // 2. Request persistent browser storage on startup
  useEffect(() => {
    void requestPersistentStorage().then((granted) => {
      setStoragePersisted(granted);
    });
  }, [setStoragePersisted]);

  // 3. Parse incoming ?share=... URL parameter on startup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share');
    if (!shareParam) return;

    void decodeShareInput(`?share=${encodeURIComponent(shareParam)}`)
      .then((payload) => {
        setIncomingShare(payload);
        setShareOpen(true);
        const cleanUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, '', cleanUrl);
      })
      .catch(() => {
        // Ignore malformed share param
      });
  }, []);

  // 4. Online/Offline listeners + Supabase Auth session subscription
  useEffect(() => {
    const onOnline = () => setNetworkOnline(true);
    const onOffline = () => setNetworkOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const supabase = getSupabaseClient();
    if (!supabase) {
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        void handleAuthUserChange({
          id: data.session.user.id,
          email: data.session.user.email,
        });
      }
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void handleAuthUserChange({
          id: session.user.id,
          email: session.user.email,
        });
      } else {
        void handleAuthUserChange(null);
      }
    });

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      authSub.subscription.unsubscribe();
    };
  }, [handleAuthUserChange, setNetworkOnline]);

  // 5. Drift-free timer loop + live End Time clock
  useEffect(() => {
    const clockInterval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    if (!isTimerRunning) return;

    tickTimer(Date.now());
    const timerInterval = window.setInterval(() => {
      const now = Date.now();
      tickTimer(now);
      setNowMs(now);
    }, 250);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        tickTimer(now);
        setNowMs(now);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(timerInterval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isTimerRunning, tickTimer]);

  // 6. Live browser tab title
  useEffect(() => {
    if (topTask) {
      document.title = `${formatTimer(topTask.remaining_seconds)} - ${topTask.title}`;
    } else {
      document.title = 'Morjon Focus';
    }
  }, [topTask?.remaining_seconds, topTask?.title]);

  // 7. Global Keyboard Shortcuts (C = Color Me Surprise, E = Emoji Me Surprise, R = Random Task, Space = Play/Pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'c') {
        e.preventDefault();
        applyColorMePalette('surprise');
      } else if (key === 'e') {
        e.preventDefault();
        applyEmojiMeTheme('surprise');
      } else if (key === 'r') {
        e.preventDefault();
        pickRandomTask();
      } else if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applyColorMePalette, applyEmojiMeTheme, pickRandomTask, toggleTimer]);

  const commitListRename = () => {
    setEditingListTitle(false);
    if (!activeList) return;
    const cleaned = draftListName.trim();
    if (cleaned && cleaned !== activeList.name) {
      updateList(activeList.id, { name: cleaned });
    }
  };

  const handleFabClick = () => {
    if (activeTab !== 'list') {
      setActiveTab('list');
    }
    window.setTimeout(() => {
      quickAddInputRef.current?.focus();
      quickAddInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 40);
  };

  const fontClass =
    settings.fontStyle === 'mono'
      ? 'font-mono'
      : settings.fontStyle === 'rounded'
        ? 'tracking-tight'
        : 'font-sans';

  const bgStyle: React.CSSProperties = {
    backgroundColor: isDark ? surface.darkBg : surface.lightBg,
    ...(settings.ambientGlow
      ? {
          backgroundImage: `radial-gradient(780px circle at 18% 8%, ${hexToRgba(
            surface.glowColors[0],
            isDark ? 0.2 : 0.14,
          )}, transparent 58%), radial-gradient(640px circle at 88% 88%, ${hexToRgba(
            surface.glowColors[1],
            isDark ? 0.16 : 0.12,
          )}, transparent 55%)`,
        }
      : {}),
  };

  const navPosition = settings.navbarPosition;
  const isVerticalLayout = navPosition === 'top' || navPosition === 'bottom';

  const navbarElement = (
    <Navbar
      nowMs={nowMs}
      totalListRemainingSeconds={totalListRemainingSeconds}
      onOpenMobileMenu={() => setMobileMenuOpen(true)}
      onOpenCustomize={() => setCustomizeOpen(true)}
      onOpenAuth={() => setAuthOpen(true)}
      onOpenShare={() => setShareOpen(true)}
      onOpenSettings={() => setSettingsOpen(true)}
    />
  );

  return (
    <div
      style={bgStyle}
      onClick={() => {
        if (isAlarmActive) dismissAlarm();
      }}
      className={`min-h-screen flex text-zinc-900 dark:text-zinc-100 transition-colors duration-300 ${fontClass} ${
        isVerticalLayout ? 'flex-col' : 'flex-row'
      }`}
    >
      {/* Visual Alarm Flashing Frame */}
      {isAlarmActive && settings.visualAlarm && (
        <div
          className="pointer-events-none fixed inset-0 z-40 animate-visual-alarm"
          style={{
            boxShadow: `inset 0 0 0 6px ${settings.accentColor}, inset 0 0 55px ${hexToRgba(
              settings.accentColor,
              0.55,
            )}`,
          }}
        />
      )}

      {(navPosition === 'top' || navPosition === 'left') && navbarElement}

      <div className="flex flex-1 min-w-0 min-h-0">
        <SidebarLists
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          notNowCount={notNowCount}
          completedTodayCount={completedTodayCount}
        />

        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-3 sm:px-6 py-4 sm:py-6 space-y-4 pb-24">
            {/* Visual Alarm Dismiss Pill */}
            {isAlarmActive && (
              <button
                type="button"
                onClick={dismissAlarm}
                style={{ backgroundColor: settings.accentColor }}
                className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-lg animate-bounce"
              >
                <BellRing className="h-4 w-4" />
                <span>{t(lang, 'visualAlarmBanner')}</span>
              </button>
            )}

            {/* Compact Narrow-Window Quick Switcher */}
            <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1">
              {regularLists.map((list) => {
                const selected = activeTab === 'list' && activeList?.id === list.id;
                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => selectList(list.id)}
                    style={selected ? { backgroundColor: settings.accentColor } : undefined}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      selected
                        ? 'text-white shadow-sm'
                        : 'bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span>{list.emoji}</span>
                    <span>{list.name}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setActiveTab('not_now')}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'not_now'
                    ? 'bg-amber-500 text-zinc-950 font-semibold'
                    : 'bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Inbox className="h-3.5 w-3.5" />
                <span>
                  {t(lang, 'notNowShort')} ({notNowCount})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'completed'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{t(lang, 'archiveTab')}</span>
              </button>
            </div>

            {activeTab === 'list' && (
              <>
                {activeList && (
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl">{activeList.emoji}</span>
                      {editingListTitle ? (
                        <input
                          type="text"
                          autoFocus
                          value={draftListName}
                          onChange={(e) => setDraftListName(e.target.value)}
                          onBlur={commitListRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitListRename();
                            if (e.key === 'Escape') setEditingListTitle(false);
                          }}
                          className="rounded-lg bg-white dark:bg-zinc-900 px-2 py-0.5 text-base font-bold ring-2 ring-violet-500 focus:outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDraftListName(activeList.name);
                            setEditingListTitle(true);
                          }}
                          className="group inline-flex items-center gap-1.5 min-w-0 text-left"
                        >
                          <h2 className="truncate text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {activeList.name}
                          </h2>
                          <Pencil className="h-3.5 w-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShareOpen(true)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800 transition shrink-0"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t(lang, 'share')}</span>
                    </button>
                  </div>
                )}

                <HeroTimer
                  activeTask={topTask}
                  onQuickApplyPreset={() => setMobileMenuOpen(true)}
                  onOpenCustomEmojiModal={(mode) =>
                    setCustomEmojiModal({ open: true, mode })
                  }
                />

                <QuickAddTask inputRef={quickAddInputRef} />

                <TaskListView tasks={activeListTasks} nowMs={nowMs} />
              </>
            )}

            {activeTab === 'not_now' && <NotNowView />}

            {activeTab === 'completed' && <CompletedStatsView />}
          </div>
        </main>
      </div>

      {(navPosition === 'bottom' || navPosition === 'right') && navbarElement}

      {/* Floating Action Button (FAB) */}
      {settings.showFabButton && (
        <button
          type="button"
          onClick={handleFabClick}
          style={{ backgroundColor: settings.accentColor }}
          className={`fixed ${
            navPosition === 'bottom' ? 'bottom-16' : 'bottom-5'
          } ${
            navPosition === 'right' ? 'right-16' : 'right-5'
          } z-30 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xl hover:scale-105 active:scale-95 transition`}
          title={t(lang, 'add')}
          aria-label={t(lang, 'add')}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <CustomizeModal open={customizeOpen} onClose={() => setCustomizeOpen(false)} />

      <CustomEmojiThemeModal
        open={customEmojiModal.open}
        initialMode={customEmojiModal.mode}
        onClose={() => setCustomEmojiModal((prev) => ({ ...prev, open: false }))}
      />

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <ShareModal
        open={shareOpen}
        onClose={() => {
          setShareOpen(false);
          setIncomingShare(null);
        }}
        incomingPayload={incomingShare}
        onClearIncoming={() => setIncomingShare(null)}
      />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default App;
