import React from 'react';
import {
  AlertCircle,
  Clock,
  Cloud,
  CloudOff,
  Globe,
  LayoutGrid,
  ListTodo,
  Loader2,
  Menu,
  MonitorDown,
  Moon,
  Palette,
  PanelLeft,
  PanelRight,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Sun,
  UserCheck,
} from 'lucide-react';
import { formatEndTime, formatListDuration } from '../lib/formatters';
import { t } from '../lib/i18n';
import { usePwaInstall } from '../lib/pwa';
import { useFocusStore } from '../store/useFocusStore';
import { SoundscapeMenu } from './SoundscapeMenu';

interface NavbarProps {
  nowMs: number;
  totalListRemainingSeconds: number;
  customizeOpen: boolean;
  settingsOpen: boolean;
  onOpenMobileMenu: () => void;
  onOpenCommandPalette: () => void;
  onOpenCustomize: () => void;
  onOpenPwa: () => void;
  onOpenAuth: () => void;
  onOpenShare: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  nowMs,
  totalListRemainingSeconds,
  customizeOpen,
  settingsOpen,
  onOpenMobileMenu,
  onOpenCommandPalette,
  onOpenCustomize,
  onOpenPwa,
  onOpenAuth,
  onOpenShare,
  onOpenSettings,
}) => {
  const { isStandalone, canInstallPrompt, promptInstall } = usePwaInstall();
  const toggleSidebarCollapsed = useFocusStore((s) => s.toggleSidebarCollapsed);
  const theme = useFocusStore((s) => s.theme);
  const toggleTheme = useFocusStore((s) => s.toggleTheme);
  const settings = useFocusStore((s) => s.settings);
  const updateSettings = useFocusStore((s) => s.updateSettings);
  const activeTab = useFocusStore((s) => s.activeTab);
  const setActiveTab = useFocusStore((s) => s.setActiveTab);
  const user = useFocusStore((s) => s.user);
  const syncStatus = useFocusStore((s) => s.syncStatus);
  const syncError = useFocusStore((s) => s.syncError);
  const triggerManualSync = useFocusStore((s) => s.triggerManualSync);

  const lang = settings.language;
  const isSideRail = settings.navbarPosition === 'left' || settings.navbarPosition === 'right';
  const isIconsOnly = settings.navbarStyle === 'icons_only';
  const isPills = settings.navbarStyle === 'pills';
  const isBottom = settings.navbarPosition === 'bottom';

  // =========================================================================
  // SIMPLIFIED (ADHD-FRIENDLY) 5-ITEM NAVBAR
  // =========================================================================
  if (settings.layoutMode === 'simplified') {
    const anyModalOpen = customizeOpen || settingsOpen;
    const items = [
      {
        id: 'focus',
        label: t(lang, 'navFocusHome'),
        icon: Clock,
        active: !anyModalOpen && activeTab === 'list',
        onClick: () => setActiveTab('list'),
      },
      {
        id: 'lists',
        label: t(lang, 'navListsHub'),
        icon: ListTodo,
        active:
          !anyModalOpen &&
          (activeTab === 'lists_hub' || activeTab === 'not_now' || activeTab === 'completed'),
        onClick: () => setActiveTab('lists_hub'),
      },
      {
        id: 'presets',
        label: t(lang, 'navPresetsHub'),
        icon: LayoutGrid,
        active: !anyModalOpen && activeTab === 'presets_hub',
        onClick: () => setActiveTab('presets_hub'),
      },
      {
        id: 'customize',
        label: t(lang, 'navCustomize'),
        icon: Palette,
        active: customizeOpen,
        onClick: onOpenCustomize,
      },
      {
        id: 'settings',
        label: t(lang, 'navSettings'),
        icon: Settings,
        active: settingsOpen,
        badge:
          syncStatus === 'error'
            ? 'bg-rose-500'
            : user && syncStatus === 'synced'
              ? 'bg-emerald-500'
              : null,
        onClick: onOpenSettings,
      },
    ];

    if (isSideRail) {
      return (
        <nav
          className={`z-30 flex flex-col items-center justify-center gap-3 py-4 px-2.5 border-zinc-200/80 dark:border-zinc-800/90 bg-white/85 dark:bg-[#191b22]/92 backdrop-blur-md ${
            settings.navbarPosition === 'left' ? 'border-r' : 'border-l'
          }`}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                title={item.label}
                aria-label={item.label}
                style={
                  item.active
                    ? isPills
                      ? { backgroundColor: `${settings.accentColor}22`, color: settings.accentColor }
                      : { color: settings.accentColor }
                    : undefined
                }
                className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl transition ${
                  isIconsOnly ? 'h-12 w-12' : 'w-16 py-2 px-1'
                } ${
                  item.active
                    ? 'font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="h-6 w-6 stroke-[1.9]" />
                {!isIconsOnly && (
                  <span className="text-[10px] leading-none truncate max-w-full">
                    {item.label}
                  </span>
                )}
                {item.badge && (
                  <span
                    className={`absolute top-2.5 right-2.5 h-2 w-2 rounded-full ${item.badge}`}
                  />
                )}
              </button>
            );
          })}
        </nav>
      );
    }

    return (
      <nav
        className={`${
          isBottom
            ? 'sticky bottom-0 border-t'
            : 'wco-header wco-safe-right sticky top-0 border-b'
        } z-30 border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#191b22]/95 backdrop-blur-md`}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-1.5 sm:py-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                title={item.label}
                aria-label={item.label}
                style={
                  item.active
                    ? isPills
                      ? { backgroundColor: `${settings.accentColor}20`, color: settings.accentColor }
                      : { color: settings.accentColor }
                    : undefined
                }
                className={`wco-no-drag relative flex flex-col items-center justify-center gap-1 rounded-2xl transition ${
                  isIconsOnly ? 'h-12 min-w-[56px] px-4' : 'h-12 min-w-[64px] px-3'
                } ${
                  item.active
                    ? 'font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="h-6 w-6 stroke-[1.9]" />
                {!isIconsOnly && (
                  <span className="text-[11px] leading-none">{item.label}</span>
                )}
                {item.badge && (
                  <span
                    className={`absolute top-2 right-3 h-2 w-2 rounded-full ${item.badge}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // =========================================================================
  // ADVANCED NAVBAR (Full Toolbar)
  // =========================================================================
  const listDurationText = formatListDuration(totalListRemainingSeconds, lang);
  const endTimeText = formatEndTime(
    nowMs,
    totalListRemainingSeconds,
    settings.use24HourTime,
  );

  const btnShape = isPills ? 'rounded-full' : 'rounded-lg';
  const btnBase = `inline-flex items-center justify-center gap-1.5 border text-xs font-medium transition ${btnShape}`;

  const renderLabel = (text: string) => {
    if (isIconsOnly || isSideRail) return null;
    return <span className="hidden md:inline">{text}</span>;
  };

  const renderSyncBadge = () => {
    if (!user) {
      return (
        <span
          title={t(lang, 'localMode')}
          className={`inline-flex items-center gap-1 ${btnShape} bg-zinc-200/80 dark:bg-zinc-800/90 px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400`}
        >
          <CloudOff className="h-3.5 w-3.5" />
          {!isIconsOnly && !isSideRail && (
            <span className="hidden sm:inline">{t(lang, 'localMode')}</span>
          )}
        </span>
      );
    }

    if (syncStatus === 'syncing') {
      return (
        <span
          title={t(lang, 'syncing')}
          className={`inline-flex items-center gap-1 ${btnShape} bg-violet-500/15 px-2 py-1 text-[11px] font-medium text-violet-600 dark:text-violet-300`}
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {!isIconsOnly && !isSideRail && (
            <span className="hidden sm:inline">{t(lang, 'syncing')}</span>
          )}
        </span>
      );
    }

    if (syncStatus === 'offline') {
      return (
        <span
          title={t(lang, 'offline')}
          className={`inline-flex items-center gap-1 ${btnShape} bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-300`}
        >
          <CloudOff className="h-3.5 w-3.5" />
          {!isIconsOnly && !isSideRail && (
            <span className="hidden sm:inline">{t(lang, 'offline')}</span>
          )}
        </span>
      );
    }

    if (syncStatus === 'error') {
      return (
        <button
          type="button"
          onClick={onOpenAuth}
          title={syncError ?? t(lang, 'syncErrorTitle')}
          className={`inline-flex items-center gap-1 ${btnShape} bg-rose-500/15 px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-500/25 transition`}
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {!isIconsOnly && !isSideRail && (
            <span className="hidden sm:inline">
              {lang === 'tr' ? 'Senk. Hatası' : 'Sync Error'}
            </span>
          )}
          <RefreshCw className="h-3 w-3" />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => void triggerManualSync()}
        title={t(lang, 'synced')}
        className={`inline-flex items-center gap-1 ${btnShape} bg-emerald-500/15 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition`}
      >
        <Cloud className="h-3.5 w-3.5" />
        {!isIconsOnly && !isSideRail && (
          <span className="hidden sm:inline">{t(lang, 'synced')}</span>
        )}
      </button>
    );
  };

  const handlePwaClick = async () => {
    if (canInstallPrompt) {
      const outcome = await promptInstall();
      if (outcome !== 'unavailable') return;
    }
    onOpenPwa();
  };

  if (isSideRail) {
    return (
      <nav
        className={`z-30 flex flex-col items-center justify-between gap-3 py-3 px-2 border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50/85 dark:bg-[#1a1c24]/90 backdrop-blur-md ${
          settings.navbarPosition === 'left' ? 'border-r' : 'border-l'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            aria-label="Menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200"
            title={`${t(lang, 'sidebarToggleTitle')} (Ctrl+B)`}
          >
            {settings.sidebarPosition === 'right' ? (
              <PanelRight className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>

          <img src="/favicon.svg" alt="Morjon Focus" className="h-7 w-7 rounded-lg" />

          {settings.showSummaryInHeader && (
            <div className="flex flex-col items-center gap-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 px-1.5 py-2 text-[10px] font-mono tabular-nums">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{listDurationText}</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {endTimeText}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <SoundscapeMenu
            direction={settings.navbarPosition === 'left' ? 'right' : 'left'}
            compactLabel
            shapeClass={btnShape}
          />

          <button
            type="button"
            onClick={onOpenCommandPalette}
            className={`${btnBase} h-9 w-9 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200`}
            title="Ctrl+K"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onOpenCustomize}
            className={`${btnBase} h-9 w-9 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-fuchsia-600 dark:text-fuchsia-400`}
            title={t(lang, 'customize')}
          >
            <Palette className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => updateSettings({ language: lang === 'en' ? 'tr' : 'en' })}
            className={`${btnBase} h-9 w-9 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] font-bold`}
            title={t(lang, 'languageLabel')}
          >
            {lang.toUpperCase()}
          </button>

          <button
            type="button"
            onClick={onOpenAuth}
            className={`relative ${btnBase} h-9 w-9 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900`}
            title={
              syncStatus === 'error'
                ? syncError ?? t(lang, 'syncErrorTitle')
                : t(lang, 'cloudSignIn')
            }
          >
            {user ? (
              <UserCheck
                className={`h-4 w-4 ${syncStatus === 'error' ? 'text-rose-500' : 'text-emerald-500'}`}
              />
            ) : (
              <Cloud className="h-4 w-4 text-violet-500" />
            )}
            {syncStatus === 'error' && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-900" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenShare}
            className={`${btnBase} h-9 w-9 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900`}
            title={t(lang, 'share')}
          >
            <Share2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className={`${btnBase} h-9 w-9 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900`}
            title={t(lang, 'themeToggle')}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-zinc-700" />
            )}
          </button>

          {!isStandalone && (
            <button
              type="button"
              onClick={() => void handlePwaClick()}
              className={`${btnBase} h-9 w-9 border-emerald-500/35 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300`}
              title={t(lang, 'installApp')}
            >
              <MonitorDown className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className={`${btnBase} h-9 w-9 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900`}
            title={t(lang, 'settings')}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </nav>
    );
  }

  return (
    <header
      className={`${
        isBottom
          ? 'sticky bottom-0 border-t'
          : 'wco-header wco-safe-right sticky top-0 border-b'
      } z-30 border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50/88 dark:bg-[#1a1c24]/90 backdrop-blur-md`}
    >
      <div className="mx-auto flex min-h-[54px] max-w-6xl items-center justify-between gap-2 px-3 sm:px-5 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className={`wco-no-drag lg:hidden inline-flex h-8 w-8 items-center justify-center ${btnShape} border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0`}
            aria-label="Menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className={`wco-no-drag hidden lg:inline-flex h-8 w-8 items-center justify-center ${btnShape} border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0`}
            title={`${t(lang, 'sidebarToggleTitle')} (Ctrl+B)`}
          >
            {settings.sidebarPosition === 'right' ? (
              <PanelRight className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>

          <div className="hidden xl:flex items-center gap-2 pr-2 mr-1 border-r border-zinc-200 dark:border-zinc-800 shrink-0">
            <img src="/favicon.svg" alt="" className="h-6 w-6 rounded-md" />
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Morjon Focus
            </span>
          </div>

          {settings.showSummaryInHeader && (
            <div className="wco-no-drag flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div
                className={`flex items-center gap-1.5 ${btnShape} bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 px-2.5 py-1 text-xs shadow-sm`}
                title={t(lang, 'listTimeLabel')}
              >
                <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                  {t(lang, 'listTimeLabel')}:
                </span>
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {listDurationText}
                </span>
              </div>

              <div
                className={`flex items-center gap-1.5 ${btnShape} bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 px-2.5 py-1 text-xs shadow-sm`}
                title={t(lang, 'endTimeLabel')}
              >
                <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                  {t(lang, 'endTimeLabel')}:
                </span>
                <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {endTimeText}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="wco-no-drag flex items-center gap-1 sm:gap-1.5 shrink-0">
          <SoundscapeMenu
            direction={isBottom ? 'up' : 'down'}
            compactLabel={isIconsOnly}
            shapeClass={btnShape}
          />

          <button
            type="button"
            onClick={onOpenCommandPalette}
            className={`${btnBase} h-8 px-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800`}
            title="Ctrl+K"
          >
            <Search className="h-3.5 w-3.5" />
            {!isIconsOnly && (
              <kbd className="hidden md:inline rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 font-mono text-[10px] text-zinc-500">
                Ctrl+K
              </kbd>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenCustomize}
            className={`${btnBase} h-8 px-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-fuchsia-600 dark:text-fuchsia-400 hover:bg-zinc-100 dark:hover:bg-zinc-800`}
            title={t(lang, 'customize')}
          >
            <Palette className="h-3.5 w-3.5" />
            {renderLabel(t(lang, 'customize'))}
          </button>

          <button
            type="button"
            onClick={() => updateSettings({ language: lang === 'en' ? 'tr' : 'en' })}
            className={`${btnBase} h-8 px-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800`}
            title={t(lang, 'languageLabel')}
          >
            <Globe className="h-3.5 w-3.5 text-sky-500" />
            <span className="text-[11px] font-bold">{lang.toUpperCase()}</span>
          </button>

          {renderSyncBadge()}

          <button
            type="button"
            onClick={onOpenAuth}
            style={!user ? { backgroundColor: settings.accentColor } : undefined}
            className={`${btnBase} h-8 px-2.5 ${
              user
                ? 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                : 'border-transparent text-white shadow-sm hover:brightness-110'
            }`}
            title={user ? user.email ?? 'Account' : t(lang, 'cloudSignIn')}
          >
            {user ? (
              <>
                <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                {!isIconsOnly && (
                  <span className="hidden md:inline max-w-[100px] truncate">
                    {user.email?.split('@')[0] ?? 'Account'}
                  </span>
                )}
              </>
            ) : (
              <>
                <Cloud className="h-3.5 w-3.5" />
                {!isIconsOnly && (
                  <span className="hidden sm:inline">{t(lang, 'cloudSignIn')}</span>
                )}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenShare}
            className={`${btnBase} h-8 w-8 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800`}
            title={t(lang, 'share')}
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className={`${btnBase} h-8 w-8 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800`}
            title={t(lang, 'themeToggle')}
          >
            {theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-zinc-700" />
            )}
          </button>

          {!isStandalone && (
            <button
              type="button"
              onClick={() => void handlePwaClick()}
              className={`${btnBase} h-8 px-2 border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25`}
              title={t(lang, 'installApp')}
            >
              <MonitorDown className="h-3.5 w-3.5" />
              {renderLabel(t(lang, 'installApp'))}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className={`${btnBase} h-8 w-8 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800`}
            title={t(lang, 'settings')}
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
