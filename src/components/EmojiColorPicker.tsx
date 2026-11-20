import React, { useMemo, useState } from 'react';
import { Palette, Search, Sparkles } from 'lucide-react';
import { ACCENT_SWATCHES } from '../lib/colors';
import { ALL_LIBRARY_EMOJIS, EMOJI_CATEGORIES } from '../lib/emojiLibrary';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';
import type { TaskColor } from '../types';

interface EmojiColorPickerProps {
  selectedEmoji: string;
  selectedColor: TaskColor;
  onSelectEmoji: (emoji: string) => void;
  onSelectColor: (color: TaskColor) => void;
  onAutoEmoji?: () => void;
  showColorSection?: boolean;
  align?: 'left' | 'right';
}

export const EmojiColorPicker: React.FC<EmojiColorPickerProps> = ({
  selectedEmoji,
  selectedColor,
  onSelectEmoji,
  onSelectColor,
  onAutoEmoji,
  showColorSection = true,
  align = 'left',
}) => {
  const lang = useFocusStore((s) => s.settings.language);
  const [search, setSearch] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>(EMOJI_CATEGORIES[0].id);

  const visibleEmojis = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return ALL_LIBRARY_EMOJIS.filter(
        (item) => item.keywords.toLowerCase().includes(q) || item.emoji === q,
      );
    }
    const cat = EMOJI_CATEGORIES.find((c) => c.id === activeCategoryId) ?? EMOJI_CATEGORIES[0];
    return cat.items;
  }, [search, activeCategoryId]);

  return (
    <div
      className={`absolute ${
        align === 'right' ? 'right-0' : 'left-0'
      } top-11 z-50 w-72 sm:w-80 rounded-2xl border border-zinc-200 dark:border-zinc-700/90 bg-white dark:bg-zinc-900 p-3 shadow-2xl animate-fade-slide`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search + Auto */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'tr' ? 'Emoji ara...' : 'Search emojis...'}
            className="h-8 w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 pl-8 pr-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
          />
        </div>
        {onAutoEmoji && (
          <button
            type="button"
            onClick={onAutoEmoji}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-500/15 px-2 text-[11px] font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-500/25 transition shrink-0"
            title={t(lang, 'autoMatch')}
          >
            <Sparkles className="h-3 w-3" />
            <span>Auto</span>
          </button>
        )}
      </div>

      {/* Category tabs */}
      {!search.trim() && (
        <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-1">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryId(cat.id)}
              title={lang === 'tr' ? cat.labelTr : cat.label}
              className={`inline-flex h-7 shrink-0 items-center justify-center rounded-lg px-2 text-sm transition ${
                activeCategoryId === cat.id
                  ? 'bg-violet-500/20 ring-1 ring-violet-500/60'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-75 hover:opacity-100'
              }`}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-1 max-h-36 overflow-y-auto pr-0.5">
        {visibleEmojis.map((item, idx) => (
          <button
            key={`${item.emoji}-${idx}`}
            type="button"
            onClick={() => onSelectEmoji(item.emoji)}
            className={`flex h-8 w-full items-center justify-center rounded-lg text-base transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              selectedEmoji === item.emoji ? 'bg-violet-500/20 ring-1 ring-violet-500' : ''
            }`}
          >
            {item.emoji}
          </button>
        ))}
        {visibleEmojis.length === 0 && (
          <div className="col-span-8 py-4 text-center text-[11px] text-zinc-400">
            {lang === 'tr' ? 'Eşleşen emoji yok' : 'No matching emojis'}
          </div>
        )}
      </div>

      {/* Color Swatches */}
      {showColorSection && (
        <div className="mt-3 border-t border-zinc-200 dark:border-zinc-800 pt-2.5">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Palette className="h-3 w-3" />
              <span>{lang === 'tr' ? 'Kart Rengi' : 'Card Color'}</span>
            </span>
            <button
              type="button"
              onClick={() => onSelectColor('none')}
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                selectedColor === 'none'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {t(lang, 'none')}
            </button>
          </div>

          <div className="grid grid-cols-8 gap-1.5 items-center">
            {ACCENT_SWATCHES.map((hex) => {
              const isSelected = selectedColor.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => onSelectColor(hex)}
                  style={{ backgroundColor: hex }}
                  className={`h-6 w-6 rounded-md transition ${
                    isSelected
                      ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-white dark:ring-offset-zinc-900 scale-110'
                      : 'opacity-85 hover:opacity-100 hover:scale-105'
                  }`}
                  aria-label={hex}
                />
              );
            })}

            {/* Custom color input */}
            <label
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-dashed border-zinc-400 dark:border-zinc-600 text-[11px] font-bold text-zinc-500 hover:border-violet-500"
              title={lang === 'tr' ? 'Özel renk seç' : 'Custom color'}
            >
              +
              <input
                type="color"
                value={selectedColor.startsWith('#') ? selectedColor : '#9364b8'}
                onChange={(e) => onSelectColor(e.target.value)}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
