import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { ALL_LIBRARY_EMOJIS, EMOJI_CATEGORIES } from '../lib/emojiLibrary';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';
import type { EmojiThemePack } from '../types';

interface CustomEmojiThemeModalProps {
  open: boolean;
  initialMode: 'create' | 'edit';
  onClose: () => void;
}

export const CustomEmojiThemeModal: React.FC<CustomEmojiThemeModalProps> = ({
  open,
  initialMode,
  onClose,
}) => {
  const lang = useFocusStore((s) => s.settings.language);
  const customEmojiThemes = useFocusStore((s) => s.customEmojiThemes);
  const saveCustomEmojiTheme = useFocusStore((s) => s.saveCustomEmojiTheme);
  const deleteCustomEmojiTheme = useFocusStore((s) => s.deleteCustomEmojiTheme);
  const applyEmojiMeTheme = useFocusStore((s) => s.applyEmojiMeTheme);

  const [mode, setMode] = useState<'create' | 'edit'>(initialMode);
  const [editingId, setEditingId] = useState<string>('');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✨');
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>(['🚀', '⚡', '🎯', '💻', '☕']);
  const [activeCat, setActiveCat] = useState(EMOJI_CATEGORIES[0].id);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    if (initialMode === 'create') {
      setEditingId('');
      setName('');
      setIcon('✨');
      setSelectedEmojis(['🚀', '⚡', '🎯', '💻', '☕']);
    }
  }, [open, initialMode]);

  if (!open) return null;

  const startEditPack = (pack: EmojiThemePack) => {
    setEditingId(pack.id);
    setName(pack.name);
    setIcon(pack.icon);
    setSelectedEmojis(pack.emojis);
    setMode('create');
  };

  const toggleEmoji = (em: string) => {
    setSelectedEmojis((prev) =>
      prev.includes(em) ? prev.filter((x) => x !== em) : [...prev, em],
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const id = saveCustomEmojiTheme({
      id: editingId,
      name: name.trim() || (lang === 'tr' ? 'Özel Tema' : 'Custom Theme'),
      icon: icon.trim() || '✨',
      emojis: selectedEmojis.length > 0 ? selectedEmojis : ['⚡', '🎯'],
    });
    applyEmojiMeTheme(id);
    onClose();
  };

  const catItems =
    EMOJI_CATEGORIES.find((c) => c.id === activeCat)?.items ?? ALL_LIBRARY_EMOJIS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xl animate-fade-slide">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-lg">
              😎
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {mode === 'edit' ? t(lang, 'customThemeTitleEdit') : t(lang, 'customThemeTitleCreate')}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
          <button
            type="button"
            onClick={() => {
              setEditingId('');
              setMode('create');
            }}
            className={`rounded-lg py-1.5 text-xs font-semibold transition ${
              mode === 'create'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500'
            }`}
          >
            {t(lang, 'createTheme')}
          </button>
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`rounded-lg py-1.5 text-xs font-semibold transition ${
              mode === 'edit'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500'
            }`}
          >
            {t(lang, 'editThemes')} ({customEmojiThemes.length})
          </button>
        </div>

        {mode === 'edit' ? (
          <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
            {customEmojiThemes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center text-xs text-zinc-500">
                <p>{t(lang, 'noCustomThemes')}</p>
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className="mt-3 inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t(lang, 'createTheme')}
                </button>
              </div>
            ) : (
              customEmojiThemes.map((pack) => (
                <div
                  key={pack.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span>{pack.icon}</span>
                      <span className="truncate">{pack.name}</span>
                    </div>
                    <div className="mt-1 text-base tracking-wide truncate">
                      {pack.emojis.join(' ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => {
                        applyEmojiMeTheme(pack.id);
                        onClose();
                      }}
                      className="rounded-lg bg-violet-500/15 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-500/25"
                    >
                      {t(lang, 'applyPreset')}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditPack(pack)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCustomEmojiTheme(pack.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-500/15"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-4 space-y-3">
            <div className="flex gap-2">
              <div className="w-20">
                <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                  {t(lang, 'themeIconLabel')}
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="h-9 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-center text-lg"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                  {t(lang, 'themeNameLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Study Pack..."
                  className="h-9 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                {t(lang, 'themeEmojisLabel')}
              </label>
              <div className="flex flex-wrap gap-1.5 min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-2">
                {selectedEmojis.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => toggleEmoji(em)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-zinc-800 text-base shadow-sm hover:bg-rose-500/20 transition"
                    title="Click to remove"
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1 overflow-x-auto pb-1">
                {EMOJI_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCat(c.id)}
                    className={`rounded-lg px-2 py-1 text-sm transition ${
                      activeCat === c.id
                        ? 'bg-violet-500/20 ring-1 ring-violet-500'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {c.icon}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
                {catItems.map((item, idx) => {
                  const chosen = selectedEmojis.includes(item.emoji);
                  return (
                    <button
                      key={`${item.emoji}-${idx}`}
                      type="button"
                      onClick={() => toggleEmoji(item.emoji)}
                      className={`flex h-8 items-center justify-center rounded-lg text-base transition ${
                        chosen
                          ? 'bg-violet-500/25 ring-1 ring-violet-500'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {item.emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t(lang, 'saveTheme')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
