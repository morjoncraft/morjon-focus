import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { hexToRgba, normalizeHex } from '../lib/colors';
import { formatDurationBadge } from '../lib/formatters';
import { t } from '../lib/i18n';
import { parseTaskInput } from '../lib/parseTaskInput';
import { useFocusStore } from '../store/useFocusStore';
import type { TaskColor } from '../types';
import { EmojiColorPicker } from './EmojiColorPicker';

const QUICK_MINUTE_CHIPS = [10, 15, 25, 45, 60];

interface QuickAddTaskProps {
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const QuickAddTask: React.FC<QuickAddTaskProps> = ({ inputRef: externalRef }) => {
  const settings = useFocusStore((s) => s.settings);
  const updateSettings = useFocusStore((s) => s.updateSettings);
  const addTask = useFocusStore((s) => s.addTask);

  const [input, setInput] = useState('');
  const [customEmoji, setCustomEmoji] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<TaskColor>('none');
  const [pickerOpen, setPickerOpen] = useState(false);

  const internalRef = useRef<HTMLInputElement | null>(null);
  const inputRef = externalRef ?? internalRef;
  const pickerWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (pickerWrapRef.current && !pickerWrapRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [pickerOpen]);

  const lang = settings.language;
  const fallbackMinutes = settings.defaultTaskMinutes;

  const parsed = useMemo(
    () => parseTaskInput(input, fallbackMinutes, settings.smartTimeDetection),
    [input, fallbackMinutes, settings.smartTimeDetection],
  );

  const activeEmoji = customEmoji ?? parsed.suggestedEmoji;
  const selectedHex = normalizeHex(selectedColor);

  const cornerClass =
    settings.cornerStyle === 'pill'
      ? 'rounded-3xl'
      : settings.cornerStyle === 'sharp'
        ? 'rounded-lg'
        : 'rounded-2xl';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    addTask({
      title: parsed.title,
      durationSeconds: parsed.durationSeconds,
      emoji: activeEmoji,
      color: selectedColor,
      status: 'todo',
    });

    setInput('');
    setCustomEmoji(null);
    setPickerOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div
      className={`border border-zinc-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-2.5 sm:p-3 shadow-sm ${cornerClass}`}
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Emoji & Color picker trigger */}
        <div className="relative" ref={pickerWrapRef}>
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            style={
              selectedHex
                ? {
                    backgroundColor: hexToRgba(selectedHex, 0.2),
                    borderColor: hexToRgba(selectedHex, 0.55),
                  }
                : undefined
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-lg hover:scale-105 transition"
            title={lang === 'tr' ? 'Emoji ve renk etiketi seç' : 'Pick emoji & color'}
          >
            {activeEmoji}
          </button>

          {pickerOpen && (
            <EmojiColorPicker
              selectedEmoji={activeEmoji}
              selectedColor={selectedColor}
              onSelectEmoji={(em) => setCustomEmoji(em)}
              onSelectColor={(col) => setSelectedColor(col)}
              onAutoEmoji={() => setCustomEmoji(null)}
            />
          )}
        </div>

        {/* Text input with live NLP duration detection */}
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t(lang, 'quickAddPlaceholder')}
            className="h-10 w-full rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 pl-3 pr-20 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition"
          />

          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                parsed.hasExplicitDuration
                  ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300'
                  : 'bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              <Clock className="h-3 w-3" />
              {formatDurationBadge(parsed.durationSeconds, lang)}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!input.trim()}
          style={{ backgroundColor: settings.accentColor }}
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none px-3.5 text-xs font-semibold text-white shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t(lang, 'add')}</span>
        </button>
      </form>

      {/* Quick duration chips */}
      {settings.showQuickMinuteChips && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mr-1">
              {t(lang, 'defaultTimeShort')}
            </span>
            {QUICK_MINUTE_CHIPS.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => updateSettings({ defaultTaskMinutes: mins })}
                className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                  !parsed.hasExplicitDuration && fallbackMinutes === mins
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {mins === 60
                  ? lang === 'tr'
                    ? '1s'
                    : '1h'
                  : `${mins}${lang === 'tr' ? 'dk' : 'm'}`}
              </button>
            ))}
          </div>
          <span className="hidden sm:inline text-[11px] text-zinc-400 dark:text-zinc-500">
            {t(lang, 'quickAddTip')}
          </span>
        </div>
      )}
    </div>
  );
};
