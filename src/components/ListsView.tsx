import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Inbox,
  ListTodo,
  Pencil,
  Play,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import { formatListDuration, formatTimer } from '../lib/formatters';
import { t } from '../lib/i18n';
import { normalizeMultiLinePaste, parseBulkTaskInput } from '../lib/parseTaskInput';
import { useFocusStore } from '../store/useFocusStore';
import { CompletedStatsView } from './CompletedStatsView';
import { NotNowView } from './NotNowView';

const LIST_EMOJIS = ['🎯', '📋', '📚', '💼', '🏠', '💡', '🧘', '⚡', '🌿', '🚀', '🎨', '✅'];

interface ListsViewProps {
  initialSection?: 'lists' | 'not_now' | 'stats';
  notNowCount: number;
  completedTodayCount: number;
  onOpenShareForList: (listId: string) => void;
}

export const ListsView: React.FC<ListsViewProps> = ({
  initialSection = 'lists',
  notNowCount,
  completedTodayCount,
  onOpenShareForList,
}) => {
  const lists = useFocusStore((s) => s.lists);
  const tasks = useFocusStore((s) => s.tasks);
  const activeListId = useFocusStore((s) => s.activeListId);
  const settings = useFocusStore((s) => s.settings);

  const selectList = useFocusStore((s) => s.selectList);
  const createList = useFocusStore((s) => s.createList);
  const updateList = useFocusStore((s) => s.updateList);
  const deleteList = useFocusStore((s) => s.deleteList);
  const addTasksBulk = useFocusStore((s) => s.addTasksBulk);
  const updateTask = useFocusStore((s) => s.updateTask);
  const deleteTask = useFocusStore((s) => s.deleteTask);
  const moveTaskInList = useFocusStore((s) => s.moveTaskInList);

  const [section, setSection] = useState<'lists' | 'not_now' | 'stats'>(initialSection);
  const [newListName, setNewListName] = useState('');
  const [newListEmoji, setNewListEmoji] = useState('📋');
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [draftListName, setDraftListName] = useState('');
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const lang = settings.language;
  const regularLists = lists
    .filter((l) => !l.deleted_at && !l.is_preset)
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newListName.trim();
    if (!cleaned) return;
    const id = createList(cleaned, newListEmoji, false);
    setNewListName('');
    setExpandedListId(id);
  };

  const handleAddTaskToList = (listId: string, e: React.FormEvent) => {
    e.preventDefault();
    const raw = (taskInputs[listId] ?? '').trim();
    if (!raw) return;
    const parsedItems = parseBulkTaskInput(
      raw,
      settings.defaultTaskMinutes,
      settings.smartTimeDetection,
    );
    if (parsedItems.length === 0) return;
    addTasksBulk(
      parsedItems.map((parsed) => ({
        title: parsed.title,
        durationSeconds: parsed.durationSeconds,
        emoji: parsed.suggestedEmoji,
        listId,
        status: 'todo',
      })),
    );
    setTaskInputs((prev) => ({ ...prev, [listId]: '' }));
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation Pills */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/85 dark:bg-zinc-900/85 p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setSection('lists')}
          style={
            section === 'lists'
              ? { backgroundColor: settings.accentColor, color: '#ffffff' }
              : undefined
          }
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs sm:text-sm font-semibold transition ${
            section === 'lists'
              ? 'shadow-sm'
              : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
          }`}
        >
          <ListTodo className="h-4 w-4 shrink-0" />
          <span className="truncate">{t(lang, 'lists')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('not_now')}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs sm:text-sm font-semibold transition ${
            section === 'not_now'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
          }`}
        >
          <Inbox className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {t(lang, 'notNowShort')} ({notNowCount})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSection('stats')}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs sm:text-sm font-semibold transition ${
            section === 'stats'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
          }`}
        >
          <BarChart3 className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {t(lang, 'archiveTab')} ({completedTodayCount})
          </span>
        </button>
      </div>

      {section === 'not_now' && <NotNowView />}
      {section === 'stats' && <CompletedStatsView />}

      {section === 'lists' && (
        <div className="space-y-4">
          {/* Header + Create New List */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/85 p-4 sm:p-5 shadow-sm">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {t(lang, 'lists')}
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              {t(lang, 'listsHubDesc')}
            </p>

            <form onSubmit={handleCreateList} className="mt-4 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-1">
                {LIST_EMOJIS.slice(0, 6).map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setNewListEmoji(em)}
                    className={`h-8 w-8 rounded-lg text-base transition ${
                      newListEmoji === em
                        ? 'bg-violet-500/20 ring-1 ring-violet-500'
                        : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>

              <div className="flex flex-1 min-w-[180px] items-center gap-2">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder={t(lang, 'newListPlaceholder')}
                  className="h-10 flex-1 min-w-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="submit"
                  disabled={!newListName.trim()}
                  style={{ backgroundColor: settings.accentColor }}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs sm:text-sm font-semibold text-white disabled:opacity-40 hover:brightness-110 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t(lang, 'add')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Regular List Cards */}
          <div className="space-y-3">
            {regularLists.map((list) => {
              const listTasks = tasks
                .filter(
                  (task) =>
                    !task.deleted_at && task.status === 'todo' && task.list_id === list.id,
                )
                .sort((a, b) => a.sort_order - b.sort_order);
              const totalSec = listTasks.reduce(
                (acc, item) => acc + Math.max(0, item.remaining_seconds),
                0,
              );
              const isActive = activeListId === list.id;
              const isExpanded = expandedListId === list.id;
              const isEditing = editingListId === list.id;

              return (
                <div
                  key={list.id}
                  style={
                    isActive
                      ? { borderColor: `${settings.accentColor}75` }
                      : undefined
                  }
                  className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-2xl">
                        {list.emoji}
                      </span>

                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                autoFocus
                                value={draftListName}
                                onChange={(e) => setDraftListName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (draftListName.trim()) {
                                      updateList(list.id, { name: draftListName.trim() });
                                    }
                                    setEditingListId(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingListId(null);
                                  }
                                }}
                                className="h-9 flex-1 rounded-lg border border-violet-500 bg-white dark:bg-zinc-950 px-2.5 text-sm font-bold focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (draftListName.trim()) {
                                    updateList(list.id, { name: draftListName.trim() });
                                  }
                                  setEditingListId(null);
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {LIST_EMOJIS.map((em) => (
                                <button
                                  key={em}
                                  type="button"
                                  onClick={() => updateList(list.id, { emoji: em })}
                                  className={`h-7 w-7 rounded-md text-sm ${
                                    list.emoji === em
                                      ? 'bg-violet-500/25 ring-1 ring-violet-500'
                                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                  }`}
                                >
                                  {em}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="truncate text-base font-bold text-zinc-900 dark:text-zinc-100">
                                {list.name}
                              </h3>
                              {isActive && (
                                <span
                                  style={{ backgroundColor: `${settings.accentColor}26` }}
                                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-zinc-900 dark:text-zinc-100"
                                >
                                  {t(lang, 'activeInFocus')}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {listTasks.length} {t(lang, 'tasksSuffix')} •{' '}
                              {formatListDuration(totalSec, lang)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => selectList(list.id)}
                        style={{ backgroundColor: settings.accentColor }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>{t(lang, 'openInFocus')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedListId((cur) => (cur === list.id ? null : list.id))
                        }
                        className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                      >
                        <span>{t(lang, 'manageTasks')}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDraftListName(list.name);
                          setEditingListId(isEditing ? null : list.id);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenShareForList(list.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        title={t(lang, 'share')}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>

                      {regularLists.length > 1 && (
                        <button
                          type="button"
                          onClick={() => deleteList(list.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 transition"
                          title={t(lang, 'deleteTask')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Inline Task Manager for this List */}
                  {isExpanded && (
                    <div className="border-t border-zinc-200/80 dark:border-zinc-800 pt-3 space-y-2.5 animate-fade-slide">
                      <form
                        onSubmit={(e) => handleAddTaskToList(list.id, e)}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={taskInputs[list.id] ?? ''}
                          onChange={(e) =>
                            setTaskInputs((prev) => ({ ...prev, [list.id]: e.target.value }))
                          }
                          onPaste={(e) => {
                            const clip = e.clipboardData.getData('text');
                            if (clip.includes('\n')) {
                              e.preventDefault();
                              const normalized = normalizeMultiLinePaste(clip);
                              const current = taskInputs[list.id] ?? '';
                              setTaskInputs((prev) => ({
                                ...prev,
                                [list.id]: current.trim() ? `${current.trim()} ; ${normalized}` : normalized,
                              }));
                            }
                          }}
                          placeholder={t(lang, 'quickAddPlaceholder')}
                          className="h-9 flex-1 min-w-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <button
                          type="submit"
                          disabled={!(taskInputs[list.id] ?? '').trim()}
                          style={{ backgroundColor: settings.accentColor }}
                          className="h-9 rounded-xl px-3.5 text-xs font-semibold text-white disabled:opacity-40"
                        >
                          + {t(lang, 'add')}
                        </button>
                      </form>

                      {listTasks.length === 0 ? (
                        <p className="py-2 text-center text-xs text-zinc-400">
                          {t(lang, 'emptyTitle')}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {listTasks.map((task, idx) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-2 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 px-3 py-2"
                            >
                              <span className="text-base shrink-0">{task.emoji}</span>
                              <input
                                type="text"
                                defaultValue={task.title}
                                onBlur={(e) => {
                                  const nextTitle = e.target.value.trim();
                                  if (nextTitle && nextTitle !== task.title) {
                                    updateTask(task.id, { title: nextTitle });
                                  }
                                }}
                                className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:underline"
                              />
                              <input
                                type="number"
                                min={1}
                                max={720}
                                defaultValue={Math.max(1, Math.round(task.remaining_seconds / 60))}
                                onBlur={(e) => {
                                  const mins = Number.parseInt(e.target.value, 10);
                                  if (Number.isFinite(mins) && mins >= 1 && mins <= 720) {
                                    const secs = mins * 60;
                                    updateTask(task.id, {
                                      duration_seconds: secs,
                                      remaining_seconds: secs,
                                    });
                                  }
                                }}
                                className="w-14 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-1.5 py-1 text-right font-mono text-xs font-semibold"
                              />
                              <span className="text-[11px] text-zinc-400">
                                {lang === 'tr' ? 'dk' : 'm'}
                              </span>

                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveTaskInList(task.id, 'up')}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 disabled:opacity-25"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === listTasks.length - 1}
                                onClick={() => moveTaskInList(task.id, 'down')}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 disabled:opacity-25"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteTask(task.id)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-500/15 hover:text-rose-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-1 text-right text-[11px] font-mono text-zinc-400">
                        {formatTimer(totalSec)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
