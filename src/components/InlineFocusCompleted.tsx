import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, EyeOff, RotateCcw, Trash2 } from 'lucide-react';
import { hexToRgba } from '../lib/colors';
import { filterCompletedTasks, getEffectiveTaskSpentSeconds } from '../lib/focusAnalytics';
import { formatListDuration } from '../lib/formatters';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';

export const InlineFocusCompleted: React.FC = () => {
  const tasks = useFocusStore((s) => s.tasks);
  const projects = useFocusStore((s) => s.projects);
  const theme = useFocusStore((s) => s.theme);
  const settings = useFocusStore((s) => s.settings);
  const updateSettings = useFocusStore((s) => s.updateSettings);
  const uncompleteTask = useFocusStore((s) => s.uncompleteTask);
  const deleteTask = useFocusStore((s) => s.deleteTask);

  const [collapsed, setCollapsed] = useState(false);

  const lang = settings.language;
  const isDark = theme === 'dark';

  const completedToday = useMemo(
    () =>
      filterCompletedTasks({
        tasks,
        period: 'daily',
        projectFilter: 'all',
        reverseOrder: settings.reverseCompletedOrder,
      }),
    [tasks, settings.reverseCompletedOrder],
  );

  const totalTodaySec = useMemo(
    () => completedToday.reduce((sum, item) => sum + getEffectiveTaskSpentSeconds(item), 0),
    [completedToday],
  );

  const projectMap = useMemo(
    () => new Map(projects.filter((p) => !p.deleted_at).map((p) => [p.id, p])),
    [projects],
  );

  if (!settings.showCompletedInFocus) {
    if (completedToday.length === 0) return null;
    return (
      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={() => updateSettings({ showCompletedInFocus: true })}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/65 px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 shadow-xs transition"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>
            {completedToday.length} {t(lang, 'completedToday')} — {t(lang, 'showCompletedHereBtn')}
          </span>
        </button>
      </div>
    );
  }

  const cornerClass =
    settings.cornerStyle === 'pill'
      ? 'rounded-3xl'
      : settings.cornerStyle === 'sharp'
        ? 'rounded-lg'
        : 'rounded-2xl';

  return (
    <section
      className={`border border-zinc-200/80 dark:border-zinc-800/90 bg-white/80 dark:bg-zinc-900/75 p-3 sm:p-4 shadow-sm ${cornerClass}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>
            {t(lang, 'focusCompletedHeader')} ({completedToday.length})
          </span>
          {totalTodaySec > 0 && (
            <span className="font-mono text-[11px] font-medium normal-case text-zinc-500 dark:text-zinc-400">
              • {formatListDuration(totalTodaySec, lang)}
            </span>
          )}
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => updateSettings({ showCompletedInFocus: false })}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
        >
          <EyeOff className="h-3 w-3" />
          <span>{t(lang, 'hideFromFocusBtn')}</span>
        </button>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-1.5">
          {completedToday.length === 0 ? (
            <p className="py-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
              {t(lang, 'noCompletedYet')}
            </p>
          ) : (
            completedToday.map((task) => {
              const proj = task.project_id ? projectMap.get(task.project_id) : undefined;
              const spent = getEffectiveTaskSpentSeconds(task);
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-950/45 px-3 py-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{task.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="truncate text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300 line-through">
                          {task.title}
                        </span>
                        {proj && (
                          <span
                            style={{
                              backgroundColor: hexToRgba(proj.color, isDark ? 0.22 : 0.14),
                              color: isDark ? '#f4f4f5' : '#18181b',
                            }}
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                          >
                            <span>{proj.emoji}</span>
                            <span className="max-w-[100px] truncate">{proj.name}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {formatListDuration(spent, lang)}
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
                      title={t(lang, 'restoreTask')}
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span className="hidden sm:inline">{t(lang, 'restoreTask')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-500/15 hover:text-rose-500 transition"
                      title={t(lang, 'deleteTask')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
};
