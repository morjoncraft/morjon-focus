import React, { useState } from 'react';
import {
  BookmarkPlus,
  CheckCircle2,
  Inbox,
  Layers,
  ListTodo,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { formatListDuration, getLocalDateKey } from '../lib/formatters';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';

interface SidebarListsProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  notNowCount: number;
  completedTodayCount: number;
}

export const SidebarLists: React.FC<SidebarListsProps> = ({
  mobileOpen,
  onCloseMobile,
  notNowCount,
  completedTodayCount,
}) => {
  const lists = useFocusStore((s) => s.lists);
  const tasks = useFocusStore((s) => s.tasks);
  const activeListId = useFocusStore((s) => s.activeListId);
  const activeTab = useFocusStore((s) => s.activeTab);
  const dailyFocusSeconds = useFocusStore((s) => s.dailyFocusSeconds);
  const settings = useFocusStore((s) => s.settings);

  const selectList = useFocusStore((s) => s.selectList);
  const setActiveTab = useFocusStore((s) => s.setActiveTab);
  const createList = useFocusStore((s) => s.createList);
  const deleteList = useFocusStore((s) => s.deleteList);
  const applyPresetToActiveList = useFocusStore((s) => s.applyPresetToActiveList);
  const saveActiveListAsPreset = useFocusStore((s) => s.saveActiveListAsPreset);

  const [newListName, setNewListName] = useState('');
  const [addingList, setAddingList] = useState(false);
  const [presetFeedback, setPresetFeedback] = useState<string | null>(null);

  const lang = settings.language;

  const regularLists = lists
    .filter((l) => !l.deleted_at && !l.is_preset)
    .sort((a, b) => a.sort_order - b.sort_order);

  const presets = lists
    .filter((l) => !l.deleted_at && l.is_preset)
    .sort((a, b) => a.sort_order - b.sort_order);

  const todaySeconds = dailyFocusSeconds[getLocalDateKey()] ?? 0;

  const getTodoCount = (listId: string) =>
    tasks.filter((t) => !t.deleted_at && t.list_id === listId && t.status === 'todo').length;

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newListName.trim();
    if (!cleaned) return;
    createList(cleaned, '📋', false);
    setNewListName('');
    setAddingList(false);
    onCloseMobile();
  };

  const handleApplyPreset = (presetId: string, presetName: string) => {
    const added = applyPresetToActiveList(presetId);
    setPresetFeedback(
      added > 0
        ? `${presetName} (${added}) — ${t(lang, 'presetAddedToast')}`
        : lang === 'tr'
          ? 'Şablonda görev yok'
          : 'No tasks in preset',
    );
    window.setTimeout(() => setPresetFeedback(null), 2400);
    onCloseMobile();
  };

  const handleSaveAsPreset = () => {
    const id = saveActiveListAsPreset();
    if (id) {
      setPresetFeedback(t(lang, 'presetSavedToast'));
      window.setTimeout(() => setPresetFeedback(null), 2400);
    }
  };

  const content = (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3 sm:p-4">
      {/* Today's Focus Mini Card */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/85 dark:bg-zinc-900/80 p-3.5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t(lang, 'todaysFocus')}
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatListDuration(todaySeconds, lang)}
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {completedTodayCount} {t(lang, 'completedToday')}
          </span>
        </div>
      </div>

      {/* Views: Not-Now & Completed */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab('not_now');
            onCloseMobile();
          }}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
            activeTab === 'not_now'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/70'
          }`}
        >
          <span className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            <span>{t(lang, 'notNowPool')}</span>
          </span>
          <span className="rounded-full bg-zinc-200/80 dark:bg-zinc-800 px-2 py-0.5 text-[11px] tabular-nums">
            {notNowCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('completed');
            onCloseMobile();
          }}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
            activeTab === 'completed'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/70'
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{t(lang, 'completedAndStats')}</span>
          </span>
        </button>
      </div>

      {/* Active Lists */}
      <div>
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <ListTodo className="h-3.5 w-3.5" />
            <span>{t(lang, 'lists')}</span>
          </span>
          <button
            type="button"
            onClick={() => setAddingList((v) => !v)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {addingList && (
          <form onSubmit={handleCreateList} className="mb-2 flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder={t(lang, 'newListPlaceholder')}
              className="h-8 flex-1 min-w-0 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="submit"
              style={{ backgroundColor: settings.accentColor }}
              className="h-8 rounded-lg px-2.5 text-xs font-semibold text-white"
            >
              {t(lang, 'add')}
            </button>
          </form>
        )}

        <div className="space-y-1">
          {regularLists.map((list) => {
            const isActive = activeTab === 'list' && activeListId === list.id;
            const count = getTodoCount(list.id);
            return (
              <div
                key={list.id}
                style={
                  isActive
                    ? { backgroundColor: `${settings.accentColor}24` }
                    : undefined
                }
                className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition ${
                  isActive
                    ? 'text-zinc-950 dark:text-white font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/70'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    selectList(list.id);
                    onCloseMobile();
                  }}
                  className="flex flex-1 items-center gap-2 min-w-0 text-left"
                >
                  <span>{list.emoji}</span>
                  <span className="truncate">{list.name}</span>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="rounded-full bg-zinc-200/80 dark:bg-zinc-800 px-2 py-0.5 text-[11px] tabular-nums">
                    {count}
                  </span>
                  {regularLists.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteList(list.id)}
                      className="hidden group-hover:inline-flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Routine Presets / Templates */}
      <div>
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <Layers className="h-3.5 w-3.5" />
            <span>{t(lang, 'presets')}</span>
          </span>
          <button
            type="button"
            onClick={handleSaveAsPreset}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition"
          >
            <BookmarkPlus className="h-3 w-3" />
            <span>{t(lang, 'saveAsPreset')}</span>
          </button>
        </div>

        {presetFeedback && (
          <div className="mb-2 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            {presetFeedback}
          </div>
        )}

        <div className="space-y-1.5">
          {presets.map((preset) => {
            const pCount = getTodoCount(preset.id);
            return (
              <div
                key={preset.id}
                className="group flex items-center justify-between rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-white/75 dark:bg-zinc-900/60 px-2.5 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span>{preset.emoji}</span>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {pCount} {t(lang, 'tasksSuffix')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(preset.id, preset.name)}
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-600/15 px-2 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white transition"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{t(lang, 'applyPreset')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteList(preset.id)}
                    className="hidden group-hover:inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-72 shrink-0 border-r border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/55 dark:bg-black/15 backdrop-blur-sm">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full bg-zinc-50 dark:bg-[#1e212a] border-r border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <img src="/favicon.svg" alt="" className="h-5 w-5 rounded" />
                <span className="text-sm font-semibold">Morjon Focus</span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{content}</div>
          </aside>
        </div>
      )}
    </>
  );
};
