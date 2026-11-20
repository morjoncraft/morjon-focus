import React from 'react';
import { CheckCircle2, Flame, RotateCcw, Trash2 } from 'lucide-react';
import { formatListDuration, getLocalDateKey } from '../lib/formatters';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';

export const CompletedStatsView: React.FC = () => {
  const tasks = useFocusStore((s) => s.tasks);
  const dailyFocusSeconds = useFocusStore((s) => s.dailyFocusSeconds);
  const settings = useFocusStore((s) => s.settings);
  const uncompleteTask = useFocusStore((s) => s.uncompleteTask);
  const deleteTask = useFocusStore((s) => s.deleteTask);
  const clearCompletedTasks = useFocusStore((s) => s.clearCompletedTasks);

  const lang = settings.language;
  const todayKey = getLocalDateKey();
  const todayFocusSec = dailyFocusSeconds[todayKey] ?? 0;

  const completedTasks = tasks
    .filter((t) => !t.deleted_at && t.status === 'completed')
    .sort((a, b) => {
      const aTime = a.completed_at ?? a.updated_at;
      const bTime = b.completed_at ?? b.updated_at;
      return settings.reverseCompletedOrder
        ? bTime.localeCompare(aTime)
        : aTime.localeCompare(bTime);
    });

  const completedToday = completedTasks.filter((t) => {
    if (!t.completed_at) return false;
    return getLocalDateKey(new Date(t.completed_at)) === todayKey;
  });

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = getLocalDateKey(d);
    const seconds = dailyFocusSeconds[key] ?? 0;
    const label = d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
      weekday: 'short',
    });
    return { key, label, minutes: Math.round(seconds / 60), isToday: key === todayKey };
  });

  const maxMinutes = Math.max(30, ...last7Days.map((d) => d.minutes));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Flame className="h-4 w-4 text-orange-500" />
            <span>{t(lang, 'todayFocusCard')}</span>
          </div>
          <div className="mt-1.5 text-2xl sm:text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatListDuration(todayFocusSec, lang)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>{t(lang, 'completedTodayCard')}</span>
          </div>
          <div className="mt-1.5 text-2xl sm:text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {completedToday.length} {t(lang, 'tasksSuffix')}
          </div>
        </div>
      </div>

      {/* 7-Day Focus Chart */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t(lang, 'last7DaysChart')}
          </h3>
        </div>
        <div className="grid grid-cols-7 gap-2 items-end h-28 pt-2">
          {last7Days.map((day) => {
            const pct = Math.max(6, Math.round((day.minutes / maxMinutes) * 100));
            return (
              <div key={day.key} className="flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-[10px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                  {day.minutes > 0 ? day.minutes : ''}
                </span>
                <div className="w-full max-w-[30px] flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all ${
                      day.isToday || day.minutes === 0
                        ? day.minutes === 0
                          ? 'bg-zinc-200 dark:bg-zinc-800'
                          : ''
                        : 'bg-emerald-500/75'
                    }`}
                    style={{
                      height: `${day.minutes > 0 ? pct : 10}%`,
                      ...(day.isToday && day.minutes > 0
                        ? { backgroundColor: settings.accentColor }
                        : {}),
                    }}
                  />
                </div>
                <span
                  className={`text-[10px] ${
                    day.isToday
                      ? 'font-bold text-zinc-900 dark:text-white'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed Tasks Archive */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t(lang, 'completedArchive')} ({completedTasks.length})
          </h3>
          {completedTasks.length > 0 && (
            <button
              type="button"
              onClick={clearCompletedTasks}
              className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
            >
              {t(lang, 'clearArchive')}
            </button>
          )}
        </div>

        {completedTasks.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {t(lang, 'noCompletedYet')}
          </p>
        ) : (
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 px-3 py-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base shrink-0">{task.emoji}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-600 dark:text-zinc-300 line-through">
                      {task.title}
                    </div>
                    <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {t(lang, 'focusLabel')}: {formatListDuration(task.actual_focused_seconds, lang)}
                      {task.completed_at
                        ? ` • ${new Date(task.completed_at).toLocaleTimeString(
                            lang === 'tr' ? 'tr-TR' : 'en-US',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: !settings.use24HourTime,
                            },
                          )}`
                        : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => uncompleteTask(task.id)}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span className="hidden sm:inline">{t(lang, 'restoreTask')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-500/15 hover:text-rose-500 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
