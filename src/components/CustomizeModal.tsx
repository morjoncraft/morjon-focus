import React from 'react';
import { Check, Palette, RotateCcw, X } from 'lucide-react';
import { ACCENT_SWATCHES, SURFACE_THEME_LIST } from '../lib/colors';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';
import type {
  CardDensity,
  CardVariant,
  CornerStyle,
  FontStyle,
  NavbarPosition,
  NavbarStyle,
  SidebarPosition,
  TimerStyle,
} from '../types';

interface CustomizeModalProps {
  open: boolean;
  onClose: () => void;
}

export const CustomizeModal: React.FC<CustomizeModalProps> = ({ open, onClose }) => {
  const settings = useFocusStore((s) => s.settings);
  const theme = useFocusStore((s) => s.theme);
  const setTheme = useFocusStore((s) => s.setTheme);
  const updateSettings = useFocusStore((s) => s.updateSettings);
  const resetAppearanceSettings = useFocusStore((s) => s.resetAppearanceSettings);

  if (!open) return null;

  const lang = settings.language;

  const timerStyles: Array<{ id: TimerStyle; label: string; icon: string }> = [
    { id: 'circle', label: t(lang, 'timerCircle'), icon: '⭕' },
    { id: 'pie', label: t(lang, 'timerPie'), icon: '🥧' },
    { id: 'digital', label: t(lang, 'timerDigital'), icon: '🔢' },
    { id: 'minimal', label: t(lang, 'timerMinimal'), icon: '✨' },
  ];

  const navPositions: Array<{ id: NavbarPosition; label: string }> = [
    { id: 'top', label: t(lang, 'posTop') },
    { id: 'bottom', label: t(lang, 'posBottom') },
    { id: 'left', label: t(lang, 'posLeft') },
    { id: 'right', label: t(lang, 'posRight') },
  ];

  const navStyles: Array<{ id: NavbarStyle; label: string }> = [
    { id: 'icons_text', label: t(lang, 'navIconsText') },
    { id: 'icons_only', label: t(lang, 'navIconsOnly') },
    { id: 'pills', label: t(lang, 'navPills') },
  ];

  const cardVariants: Array<{ id: CardVariant; label: string }> = [
    { id: 'tinted', label: t(lang, 'variantTinted') },
    { id: 'solid', label: t(lang, 'variantSolid') },
    { id: 'left-border', label: t(lang, 'variantLeftBorder') },
    { id: 'glass', label: t(lang, 'variantGlass') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1e212a] shadow-2xl animate-fade-slide">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: settings.accentColor }}
            >
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {t(lang, 'customizeTitle')}
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {t(lang, 'customizeSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetAppearanceSettings}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t(lang, 'resetDefaults')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* Dark/Light & Language Quick Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="mb-2 font-semibold text-zinc-700 dark:text-zinc-200">
                {t(lang, 'themeModeTitle')}
              </div>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`rounded-lg py-1.5 font-semibold transition ${
                    theme === 'dark'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-500'
                  }`}
                >
                  🌙 {t(lang, 'darkOption')}
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`rounded-lg py-1.5 font-semibold transition ${
                    theme === 'light'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-400'
                  }`}
                >
                  ☀️ {t(lang, 'lightOption')}
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 font-semibold text-zinc-700 dark:text-zinc-200">
                {t(lang, 'languageLabel')}
              </div>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1">
                <button
                  type="button"
                  onClick={() => updateSettings({ language: 'en' })}
                  className={`rounded-lg py-1.5 font-semibold transition ${
                    lang === 'en'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-500'
                  }`}
                >
                  🇺🇸 English
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings({ language: 'tr' })}
                  className={`rounded-lg py-1.5 font-semibold transition ${
                    lang === 'tr'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-500'
                  }`}
                >
                  🇹🇷 Türkçe
                </button>
              </div>
            </div>
          </div>

          {/* Theme Atmosphere */}
          <div>
            <div className="mb-2 font-semibold text-zinc-700 dark:text-zinc-200">
              {t(lang, 'surfaceThemeTitle')}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SURFACE_THEME_LIST.map((st) => {
                const selected = settings.surfaceTheme === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => updateSettings({ surfaceTheme: st.id })}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                      selected
                        ? 'border-violet-500 bg-violet-500/10 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <span
                      className="h-7 w-7 shrink-0 rounded-lg shadow-inner ring-1 ring-white/20"
                      style={{ backgroundImage: st.previewGradient }}
                    />
                    <span className="truncate">{lang === 'tr' ? st.nameTr : st.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 14 Swatches Accent Color */}
          <div>
            <div className="mb-2 font-semibold text-zinc-700 dark:text-zinc-200">
              {t(lang, 'accentColorTitle')}
            </div>
            <div className="inline-grid grid-cols-7 gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 p-3">
              {ACCENT_SWATCHES.map((hex) => {
                const active = settings.accentColor.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => updateSettings({ accentColor: hex })}
                    style={{ backgroundColor: hex }}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                      active
                        ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-white dark:ring-offset-zinc-900 scale-110'
                        : 'opacity-85 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    {active && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timer Style */}
          <div>
            <div className="mb-2 font-semibold text-zinc-700 dark:text-zinc-200">
              {t(lang, 'timerStyleTitle')}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {timerStyles.map((ts) => (
                <button
                  key={ts.id}
                  type="button"
                  onClick={() => updateSettings({ timerStyle: ts.id })}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition ${
                    settings.timerStyle === ts.id
                      ? 'border-violet-500 bg-violet-500/15 font-semibold text-zinc-950 dark:text-white'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <span className="text-xl">{ts.icon}</span>
                  <span>{ts.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Navbar Position & Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="mb-2 font-semibold text-zinc-700 dark:text-zinc-200">
                {t(lang, 'navbarPosTitle')}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {navPositions.map((np) => (
                  <button
                    key={np.id}
                    type="button"
                    onClick={() => updateSettings({ navbarPosition: np.id })}
                    className={`rounded-xl border py-2 font-semibold transition ${
                      settings.navbarPosition === np.id
                        ? 'border-violet-500 bg-violet-500/15 text-zinc-950 dark:text-white'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {np.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 font-semibold text-zinc-700 dark:text-zinc-200">
                {t(lang, 'navbarStyleTitle')}
              </div>
              <div className="space-y-1.5">
                {navStyles.map((ns) => (
                  <button
                    key={ns.id}
                    type="button"
                    onClick={() => updateSettings({ navbarStyle: ns.id })}
                    className={`w-full rounded-xl border px-3 py-1.5 text-left font-semibold transition ${
                      settings.navbarStyle === ns.id
                        ? 'border-violet-500 bg-violet-500/15 text-zinc-950 dark:text-white'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {ns.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Position & Collapse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="mb-2 font-semibold text-zinc-700 dark:text-zinc-200">
                {t(lang, 'sidebarPosTitle')}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['left', 'right'] as SidebarPosition[]).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => updateSettings({ sidebarPosition: pos })}
                    className={`rounded-xl border py-2 font-semibold transition ${
                      settings.sidebarPosition === pos
                        ? 'border-violet-500 bg-violet-500/15 text-zinc-950 dark:text-white'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {pos === 'left' ? t(lang, 'posLeft') : t(lang, 'posRight')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 font-semibold text-zinc-700 dark:text-zinc-200">
                {t(lang, 'sidebarCollapsedLabel')}
              </div>
              <button
                type="button"
                onClick={() =>
                  updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed })
                }
                className={`w-full rounded-xl border py-2 font-semibold transition ${
                  settings.sidebarCollapsed
                    ? 'border-violet-500 bg-violet-500/15 text-zinc-950 dark:text-white'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {settings.sidebarCollapsed
                  ? lang === 'tr'
                    ? 'Gizli (Açmak için tıkla)'
                    : 'Collapsed (Click to Show)'
                  : lang === 'tr'
                    ? 'Görünür (Ctrl+B)'
                    : 'Visible (Ctrl+B)'}
              </button>
            </div>
          </div>

          {/* Card Variant */}
          <div>
            <div className="mb-2 font-semibold text-zinc-700 dark:text-zinc-200">
              {t(lang, 'cardVariantTitle')}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {cardVariants.map((cv) => (
                <button
                  key={cv.id}
                  type="button"
                  onClick={() => updateSettings({ cardVariant: cv.id })}
                  className={`rounded-xl border py-2 font-semibold transition ${
                    settings.cardVariant === cv.id
                      ? 'border-violet-500 bg-violet-500/15 text-zinc-950 dark:text-white'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {cv.label}
                </button>
              ))}
            </div>
          </div>

          {/* Density, Corners, Font */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="mb-1.5 font-semibold text-zinc-700 dark:text-zinc-200">
                {t(lang, 'densityTitle')}
              </div>
              <div className="space-y-1">
                {(['comfortable', 'compact'] as CardDensity[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => updateSettings({ cardDensity: d })}
                    className={`w-full rounded-lg border py-1.5 font-medium ${
                      settings.cardDensity === d
                        ? 'border-violet-500 bg-violet-500/15 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    {d === 'comfortable' ? t(lang, 'densityComfort') : t(lang, 'densityCompact')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 font-semibold text-zinc-700 dark:text-zinc-200">
                {t(lang, 'cornersTitle')}
              </div>
              <div className="space-y-1">
                {(['rounded', 'pill', 'sharp'] as CornerStyle[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateSettings({ cornerStyle: c })}
                    className={`w-full rounded-lg border py-1.5 font-medium ${
                      settings.cornerStyle === c
                        ? 'border-violet-500 bg-violet-500/15 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    {c === 'rounded'
                      ? t(lang, 'cornerRounded')
                      : c === 'pill'
                        ? t(lang, 'cornerPill')
                        : t(lang, 'cornerSharp')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 font-semibold text-zinc-700 dark:text-zinc-200">
                {t(lang, 'fontTitle')}
              </div>
              <div className="space-y-1">
                {(['sans', 'rounded', 'mono'] as FontStyle[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => updateSettings({ fontStyle: f })}
                    className={`w-full rounded-lg border py-1.5 font-medium ${
                      settings.fontStyle === f
                        ? 'border-violet-500 bg-violet-500/15 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    {f === 'sans'
                      ? t(lang, 'fontSans')
                      : f === 'rounded'
                        ? t(lang, 'fontRounded')
                        : t(lang, 'fontMono')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Module Toggles */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-3.5 space-y-2.5">
            <div className="font-semibold text-zinc-700 dark:text-zinc-200">
              {t(lang, 'togglesTitle')}
            </div>

            {(
              [
                ['ambientGlow', t(lang, 'toggleAmbientGlow')],
                ['showFunToolbar', t(lang, 'toggleFunToolbar')],
                ['showSummaryInHeader', t(lang, 'toggleHeaderSummary')],
                ['showQuickMinuteChips', t(lang, 'toggleQuickChips')],
              ] as const
            ).map(([key, label]) => {
              const on = settings[key];
              return (
                <label
                  key={key}
                  className="flex items-center justify-between cursor-pointer py-0.5"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => updateSettings({ [key]: !on })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      on ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        on ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
