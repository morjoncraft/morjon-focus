import React from 'react';
import { BUILTIN_EMOJI_THEMES } from '../lib/emojiLibrary';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';

interface EmojiMePopoverProps {
  onClose: () => void;
  onOpenCustomModal: (mode: 'create' | 'edit') => void;
}

export const EmojiMePopover: React.FC<EmojiMePopoverProps> = ({
  onClose,
  onOpenCustomModal,
}) => {
  const lang = useFocusStore((s) => s.settings.language);
  const activeEmojiThemeId = useFocusStore((s) => s.activeEmojiThemeId);
  const customEmojiThemes = useFocusStore((s) => s.customEmojiThemes);
  const applyEmojiMeTheme = useFocusStore((s) => s.applyEmojiMeTheme);

  const selectTheme = (id: string) => {
    applyEmojiMeTheme(id);
    onClose();
  };

  return (
    <div
      className="w-60 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-[#23262f] py-1.5 shadow-2xl animate-fade-slide text-xs"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-h-[340px] overflow-y-auto px-1.5 space-y-0.5">
        {customEmojiThemes.length > 0 && (
          <>
            <div className="px-2.5 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              {t(lang, 'customPacks')}
            </div>
            {customEmojiThemes.map((pack) => {
              const isActive = activeEmojiThemeId === pack.id;
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => selectTheme(pack.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition ${
                    isActive
                      ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-950 dark:text-white'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 flex justify-center">
                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />}
                    </span>
                    <span>{pack.icon}</span>
                    <span className="truncate">{pack.name}</span>
                  </span>
                </button>
              );
            })}
            <div className="my-1 border-t border-zinc-200 dark:border-zinc-700/70" />
          </>
        )}

        {BUILTIN_EMOJI_THEMES.map((pack) => {
          const isActive = activeEmojiThemeId === pack.id;
          const label = lang === 'tr' && pack.nameTr ? pack.nameTr : pack.name;
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => selectTheme(pack.id)}
              className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition ${
                isActive
                  ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-950 dark:text-white'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 flex justify-center">
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />}
                </span>
                <span>{pack.icon}</span>
                <span className="truncate">{label}</span>
              </span>
              {pack.isNew && (
                <span className="rounded bg-[#f06e6e] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">
                  {t(lang, 'newBadge')}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => selectTheme('surprise')}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition"
        >
          <span className="w-1.5" />
          <span>🤷</span>
          <span>{t(lang, 'surpriseMe')}</span>
        </button>
      </div>

      <div className="my-1.5 border-t border-zinc-200 dark:border-zinc-700/70" />

      <div className="px-1.5">
        <button
          type="button"
          onClick={() => selectTheme('auto_match')}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
            activeEmojiThemeId === 'auto_match'
              ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-950 dark:text-white'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
          }`}
        >
          <span className="w-1.5 flex justify-center">
            {activeEmojiThemeId === 'auto_match' && (
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            )}
          </span>
          <span>🪄</span>
          <span>{t(lang, 'autoMatch')}</span>
        </button>
      </div>

      <div className="my-1.5 border-t border-zinc-200 dark:border-zinc-700/70" />

      <div className="px-1.5 space-y-0.5">
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenCustomModal('create');
          }}
          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition"
        >
          <span className="flex items-center gap-2">
            <span className="w-1.5" />
            <span>😎</span>
            <span>{t(lang, 'createTheme')}</span>
          </span>
          <span className="rounded bg-[#f06e6e] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">
            {t(lang, 'newBadge')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenCustomModal('edit');
          }}
          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition"
        >
          <span className="flex items-center gap-2">
            <span className="w-1.5" />
            <span>✏️</span>
            <span>{t(lang, 'editThemes')}</span>
          </span>
          <span className="rounded bg-[#f06e6e] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">
            {t(lang, 'newBadge')}
          </span>
        </button>
      </div>
    </div>
  );
};
