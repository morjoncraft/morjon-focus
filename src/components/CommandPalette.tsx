import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Columns2,
  Inbox,
  ListTodo,
  Moon,
  Palette,
  PanelLeft,
  PictureInPicture2,
  Play,
  Search,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';
import type { SoundscapeId } from '../types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenPip: () => void;
  onOpenCustomize: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: React.ReactNode;
  keywords: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  onOpenPip,
  onOpenCustomize,
}) => {
  const lists = useFocusStore((s) => s.lists);
  const theme = useFocusStore((s) => s.theme);
  const settings = useFocusStore((s) => s.settings);
  const isTimerRunning = useFocusStore((s) => s.isTimerRunning);

  const selectList = useFocusStore((s) => s.selectList);
  const applyPresetToActiveList = useFocusStore((s) => s.applyPresetToActiveList);
  const setActiveTab = useFocusStore((s) => s.setActiveTab);
  const toggleTimer = useFocusStore((s) => s.toggleTimer);
  const setZenModeOpen = useFocusStore((s) => s.setZenModeOpen);
  const setSoundscape = useFocusStore((s) => s.setSoundscape);
  const toggleTheme = useFocusStore((s) => s.toggleTheme);
  const updateSettings = useFocusStore((s) => s.updateSettings);
  const toggleSidebarCollapsed = useFocusStore((s) => s.toggleSidebarCollapsed);
  const applyColorMePalette = useFocusStore((s) => s.applyColorMePalette);
  const applyEmojiMeTheme = useFocusStore((s) => s.applyEmojiMeTheme);
  const pickRandomTask = useFocusStore((s) => s.pickRandomTask);

  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const lang = settings.language;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      {
        id: 'timer-toggle',
        label: isTimerRunning ? t(lang, 'pause') : t(lang, 'start'),
        category: lang === 'tr' ? 'Sayaç' : 'Timer',
        icon: <Play className="h-4 w-4 text-emerald-500" />,
        keywords: 'start pause play timer başlat duraklat',
        action: () => toggleTimer(),
      },
      {
        id: 'zen-mode',
        label: t(lang, 'zenMode'),
        category: lang === 'tr' ? 'Odak' : 'Focus',
        icon: <Sparkles className="h-4 w-4 text-violet-500" />,
        keywords: 'zen monk focus fullscreen odak',
        action: () => setZenModeOpen(true),
      },
      {
        id: 'mini-pip',
        label: t(lang, 'miniPip'),
        category: lang === 'tr' ? 'Odak' : 'Focus',
        icon: <PictureInPicture2 className="h-4 w-4 text-sky-500" />,
        keywords: 'pip mini floating timer pencere',
        action: () => onOpenPip(),
      },
      {
        id: 'random-task',
        label: t(lang, 'randomTask'),
        category: lang === 'tr' ? 'Görevler' : 'Tasks',
        icon: <span className="text-sm">🤞</span>,
        keywords: 'random task rastgele görev',
        action: () => pickRandomTask(),
      },
      {
        id: 'color-me-surprise',
        label: `${t(lang, 'colorMe')} — ${t(lang, 'surpriseMe')}`,
        category: lang === 'tr' ? 'Görünüm' : 'Appearance',
        icon: <span className="text-sm">🌈</span>,
        keywords: 'color me rainbow palette renk',
        action: () => applyColorMePalette('surprise'),
      },
      {
        id: 'emoji-me-surprise',
        label: `${t(lang, 'emojiMe')} — ${t(lang, 'surpriseMe')}`,
        category: lang === 'tr' ? 'Görünüm' : 'Appearance',
        icon: <span className="text-sm">😄</span>,
        keywords: 'emoji me pack tema',
        action: () => applyEmojiMeTheme('surprise'),
      },
      {
        id: 'view-list',
        label: t(lang, 'viewList'),
        category: lang === 'tr' ? 'Görünüm' : 'Views',
        icon: <ListTodo className="h-4 w-4" />,
        keywords: 'list tasks view liste',
        action: () => setActiveTab('list'),
      },
      {
        id: 'view-split',
        label: `${t(lang, 'viewSplit')} (${t(lang, 'viewList')} + ${t(lang, 'viewTimeline')})`,
        category: lang === 'tr' ? 'Görünüm' : 'Views',
        icon: <Columns2 className="h-4 w-4 text-violet-500" />,
        keywords: 'split timeline side by side bölünmüş çizelge',
        action: () => setActiveTab('split'),
      },
      {
        id: 'view-timeline',
        label: t(lang, 'viewTimeline'),
        category: lang === 'tr' ? 'Görünüm' : 'Views',
        icon: <CalendarClock className="h-4 w-4 text-sky-500" />,
        keywords: 'timeline schedule hours saat çizelge',
        action: () => setActiveTab('timeline'),
      },
      {
        id: 'view-not-now',
        label: t(lang, 'notNowPool'),
        category: lang === 'tr' ? 'Görünüm' : 'Views',
        icon: <Inbox className="h-4 w-4 text-amber-500" />,
        keywords: 'not now pool bekleme',
        action: () => setActiveTab('not_now'),
      },
      {
        id: 'view-completed',
        label: t(lang, 'completedAndStats'),
        category: lang === 'tr' ? 'Görünüm' : 'Views',
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        keywords: 'completed stats archive arşiv istatistik',
        action: () => setActiveTab('completed'),
      },
      {
        id: 'toggle-sidebar',
        label: t(lang, 'sidebarToggleTitle'),
        category: lang === 'tr' ? 'Arayüz' : 'Interface',
        icon: <PanelLeft className="h-4 w-4" />,
        keywords: 'sidebar collapse hide show kenar çubuğu',
        action: () => toggleSidebarCollapsed(),
      },
      {
        id: 'toggle-pomodoro',
        label: `${t(lang, 'pomodoroAutoBreakTitle')}: ${
          settings.pomodoroAutoBreak ? 'OFF' : 'ON'
        }`,
        category: lang === 'tr' ? 'Sayaç' : 'Timer',
        icon: <span className="text-sm">🍅</span>,
        keywords: 'pomodoro break mola',
        action: () =>
          updateSettings({ pomodoroAutoBreak: !settings.pomodoroAutoBreak }),
      },
      {
        id: 'toggle-theme',
        label: `${t(lang, 'themeToggle')} (${theme === 'dark' ? 'Light' : 'Dark'})`,
        category: lang === 'tr' ? 'Görünüm' : 'Appearance',
        icon: <Moon className="h-4 w-4" />,
        keywords: 'dark light theme mode tema koyu açık',
        action: () => toggleTheme(),
      },
      {
        id: 'toggle-lang',
        label: `${t(lang, 'languageLabel')}: ${lang === 'en' ? 'Türkçe' : 'English'}`,
        category: lang === 'tr' ? 'Arayüz' : 'Interface',
        icon: <span className="text-xs font-bold">{lang === 'en' ? 'TR' : 'EN'}</span>,
        keywords: 'language english turkish dil türkçe',
        action: () => updateSettings({ language: lang === 'en' ? 'tr' : 'en' }),
      },
      {
        id: 'open-customize',
        label: t(lang, 'customizeTitle'),
        category: lang === 'tr' ? 'Görünüm' : 'Appearance',
        icon: <Palette className="h-4 w-4 text-fuchsia-500" />,
        keywords: 'customize studio colors navbar layout özelleştir',
        action: () => onOpenCustomize(),
      },
    ];

    // Lists
    lists
      .filter((l) => !l.deleted_at && !l.is_preset)
      .forEach((l) => {
        items.push({
          id: `list-${l.id}`,
          label: `${l.emoji} ${l.name}`,
          category: t(lang, 'lists'),
          icon: <span className="text-sm">{l.emoji}</span>,
          keywords: `list ${l.name}`,
          action: () => selectList(l.id),
        });
      });

    // Routine Presets
    lists
      .filter((l) => !l.deleted_at && l.is_preset)
      .forEach((p) => {
        items.push({
          id: `preset-${p.id}`,
          label: `${t(lang, 'applyPreset')}: ${p.emoji} ${p.name}`,
          category: t(lang, 'presets'),
          icon: <Sparkles className="h-3.5 w-3.5 text-violet-400" />,
          keywords: `preset template rutin şablon ${p.name}`,
          action: () => applyPresetToActiveList(p.id),
        });
      });

    // Soundscapes
    const sounds: Array<{ id: SoundscapeId; label: string }> = [
      { id: 'off', label: t(lang, 'soundOff') },
      { id: 'rain', label: t(lang, 'soundRain') },
      { id: 'cafe', label: t(lang, 'soundCafe') },
      { id: 'beach', label: t(lang, 'soundBeach') },
      { id: 'forest', label: t(lang, 'soundForest') },
      { id: 'white', label: t(lang, 'soundWhite') },
      { id: 'brown', label: t(lang, 'soundBrown') },
    ];
    sounds.forEach((s) => {
      items.push({
        id: `sound-${s.id}`,
        label: `${t(lang, 'soundscapes')}: ${s.label}`,
        category: t(lang, 'soundscapes'),
        icon: <Volume2 className="h-3.5 w-3.5 text-sky-400" />,
        keywords: `sound audio noise rain cafe ${s.label}`,
        action: () => setSoundscape(s.id),
      });
    });

    return items;
  }, [
    applyColorMePalette,
    applyEmojiMeTheme,
    applyPresetToActiveList,
    isTimerRunning,
    lang,
    lists,
    onOpenCustomize,
    onOpenPip,
    pickRandomTask,
    selectList,
    setActiveTab,
    setSoundscape,
    setZenModeOpen,
    settings.pomodoroAutoBreak,
    theme,
    toggleSidebarCollapsed,
    toggleTheme,
    toggleTimer,
    updateSettings,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.keywords.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  if (!open) return null;

  const runCommand = (cmd: CommandItem | undefined) => {
    if (!cmd) return;
    cmd.action();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => (filtered.length > 0 ? (i + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) =>
        filtered.length > 0 ? (i - 1 + filtered.length) % filtered.length : 0,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runCommand(filtered[selectedIdx]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        onKeyDown={handleKeyDown}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-[#1e212a] shadow-2xl animate-fade-slide"
      >
        <div className="flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
          <Search className="h-4 w-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(lang, 'cmdPalettePlaceholder')}
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
          />
          <kbd className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              {t(lang, 'cmdNoResults')}
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const selected = idx === selectedIdx;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onMouseEnter={() => setSelectedIdx(idx)}
                  onClick={() => runCommand(cmd)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition ${
                    selected
                      ? 'bg-violet-500/15 text-zinc-950 dark:text-white font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0">{cmd.icon}</span>
                    <span className="truncate">{cmd.label}</span>
                  </span>
                  <span className="shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    {cmd.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
