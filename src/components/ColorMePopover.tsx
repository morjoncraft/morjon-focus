import React from 'react';
import { COLOR_ME_PALETTES } from '../lib/colors';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';

interface ColorMePopoverProps {
  onClose: () => void;
}

export const ColorMePopover: React.FC<ColorMePopoverProps> = ({ onClose }) => {
  const lang = useFocusStore((s) => s.settings.language);
  const activeColorPaletteId = useFocusStore((s) => s.activeColorPaletteId);
  const applyColorMePalette = useFocusStore((s) => s.applyColorMePalette);

  const handleSelect = (id: string) => {
    applyColorMePalette(id);
    onClose();
  };

  return (
    <div
      className="w-60 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-[#23262f] py-1.5 shadow-2xl animate-fade-slide text-xs"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-h-[340px] overflow-y-auto px-1.5 space-y-0.5">
        {COLOR_ME_PALETTES.map((palette) => {
          const isActive = activeColorPaletteId === palette.id;
          const label = lang === 'tr' && palette.nameTr ? palette.nameTr : palette.name;
          return (
            <button
              key={palette.id}
              type="button"
              onClick={() => handleSelect(palette.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                isActive
                  ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-950 dark:text-white'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 flex justify-center shrink-0">
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />}
                </span>
                <span className="truncate">{label}</span>
              </span>

              {/* Mini palette dot preview */}
              <span className="flex items-center -space-x-1 shrink-0">
                {palette.colors.slice(0, 4).map((hex, i) => (
                  <span
                    key={i}
                    style={{ backgroundColor: hex }}
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-white/80 dark:ring-[#23262f]"
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="my-1.5 border-t border-zinc-200 dark:border-zinc-700/70" />

      <div className="px-1.5 space-y-0.5">
        <button
          type="button"
          onClick={() => handleSelect('surprise')}
          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition"
        >
          <span className="flex items-center gap-2">
            <span className="w-1.5" />
            <span>{t(lang, 'surpriseMe')}</span>
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <span>{t(lang, 'pressC')}</span>
            <kbd className="rounded bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-700 dark:text-zinc-200">
              C
            </kbd>
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelect('none')}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
            activeColorPaletteId === null
              ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-950 dark:text-white'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
          }`}
        >
          <span className="w-1.5 flex justify-center">
            {activeColorPaletteId === null && (
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
            )}
          </span>
          <span>{t(lang, 'none')}</span>
        </button>
      </div>
    </div>
  );
};
