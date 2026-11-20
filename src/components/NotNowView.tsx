import React, { useState } from 'react';
import { ArrowUpRight, Inbox, Plus, Trash2 } from 'lucide-react';
import { resolveTaskCardStyle } from '../lib/colors';
import { formatTimer } from '../lib/formatters';
import { t } from '../lib/i18n';
import { parseTaskInput } from '../lib/parseTaskInput';
import { useFocusStore } from '../store/useFocusStore';

export const NotNowView: React.FC = () => {
  const tasks = useFocusStore((s) => s.tasks);
  const theme = useFocusStore((s) => s.theme);
  const settings = useFocusStore((s) => s.settings);
  const addTask = useFocusStore((s) => s.addTask);
  const recallFromNotNow = useFocusStore((s) => s.recallFromNotNow);
  const deleteTask = useFocusStore((s) => s.deleteTask);

  const [quickInput, setQuickInput] = useState('');

  const lang = settings.language;
  const isDark = theme === 'dark';

  const notNowTasks = tasks
    .filter((t) => !t.deleted_at && t.status === 'not_now')
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleAddToPool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    const parsed = parseTaskInput(
      quickInput,
      settings.defaultTaskMinutes,
      settings.smartTimeDetection,
    );
    addTask({
      title: parsed.title,
      durationSeconds: parsed.durationSeconds,
      emoji: parsed.suggestedEmoji,
      status: 'not_now',
      listId: null,
    });
    setQuickInput('');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {t(lang, 'notNowTitle')}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {t(lang, 'notNowDesc')}
            </p>
          </div>
        </div>

        <form onSubmit={handleAddToPool} className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder={t(lang, 'notNowInputPlaceholder')}
            className="h-9 flex-1 min-w-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60"
          />
          <button
            type="submit"
            disabled={!quickInput.trim()}
            className="inline-flex h-9 items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 px-3 text-xs font-semibold text-zinc-950 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t(lang, 'sendToPool')}</span>
          </button>
        </form>
      </div>

      {notNowTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 text-center text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          {t(lang, 'notNowEmpty')}
        </div>
      ) : (
        <div className="space-y-2">
          {notNowTasks.map((task) => {
            const resolved = resolveTaskCardStyle(task.color, isDark, settings.cardVariant);
            return (
              <div
                key={task.id}
                style={resolved.style}
                className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 ${
                  resolved.isNeutral
                    ? 'bg-white/95 dark:bg-zinc-800/75 border-zinc-200/90 dark:border-zinc-700/70'
                    : ''
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg shrink-0">{task.emoji}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {task.title}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      {formatTimer(task.remaining_seconds)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => recallFromNotNow(task.id, 'top')}
                    style={{ backgroundColor: settings.accentColor }}
                    className="inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-white hover:brightness-110 transition"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t(lang, 'recallTop')}</span>
                    <span className="sm:hidden">{t(lang, 'recallShort')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => recallFromNotNow(task.id, 'bottom')}
                    className="hidden sm:inline-flex h-8 items-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 px-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                  >
                    {t(lang, 'recallBottom')}
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-rose-500/15 hover:text-rose-500 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
