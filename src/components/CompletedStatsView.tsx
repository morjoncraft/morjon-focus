import React, { useMemo, useState } from 'react';
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Flame,
  PieChart,
  RotateCcw,
  Target,
  Trash2,
} from 'lucide-react';
import { hexToRgba } from '../lib/colors';
import {
  buildYearlyHeatmap,
  computeFocusDistribution,
  computeStreakStats,
  type HeatmapCell,
} from '../lib/focusAnalytics';
import { formatListDuration, getLocalDateKey } from '../lib/formatters';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';

const GOAL_PRESET_MINUTES = [60, 120, 180, 240];

export const CompletedStatsView: React.FC = () => {
  const lists = useFocusStore((s) => s.lists);
  const tasks = useFocusStore((s) => s.tasks);
  const dailyFocusSeconds = useFocusStore((s) => s.dailyFocusSeconds);
  const dailyCategoryFocus = useFocusStore((s) => s.dailyCategoryFocus);
  const settings = useFocusStore((s) => s.settings);
  const updateSettings = useFocusStore((s) => s.updateSettings);
  const uncompleteTask = useFocusStore((s) => s.uncompleteTask);
  const deleteTask = useFocusStore((s) => s.deleteTask);
  const clearCompletedTasks = useFocusStore((s) => s.clearCompletedTasks);

  const [distMode, setDistMode] = useState<'list' | 'color'>('list');
  const [distRange, setDistRange] = useState<'7d' | 'all'>('7d');
  const [inspectedCell, setInspectedCell] = useState<HeatmapCell | null>(null);

  const lang = settings.language;
  const todayKey = getLocalDateKey();
  const goalMinutes = Math.max(15, settings.dailyGoalMinutes || 120);

  const streakStats = useMemo(
    () => computeStreakStats(dailyFocusSeconds, goalMinutes),
    [dailyFocusSeconds, goalMinutes],
  );

  const yearlyHeatmap = useMemo(
    () => buildYearlyHeatmap(dailyFocusSeconds, goalMinutes, new Date(), lang),
    [dailyFocusSeconds, goalMinutes, lang],
  );

  const distribution = useMemo(
    () =>
      computeFocusDistribution({
        mode: distMode,
        range: distRange,
        dailyCategoryFocus,
        tasks,
        lists,
        lang,
      }),
    [distMode, distRange, dailyCategoryFocus, tasks, lists, lang],
  );

  const completedTasks = tasks
    .filter((item) => !item.deleted_at && item.status === 'completed')
    .sort((a, b) => {
      const aTime = a.completed_at ?? a.updated_at;
      const bTime = b.completed_at ?? b.updated_at;
      return settings.reverseCompletedOrder
        ? bTime.localeCompare(aTime)
        : aTime.localeCompare(bTime);
    });

  const completedToday = completedTasks.filter((item) => {
    if (!item.completed_at) return false;
    return getLocalDateKey(new Date(item.completed_at)) === todayKey;
  });

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = getLocalDateKey(d);
    const seconds = dailyFocusSeconds[key] ?? 0;
    const label = d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
      weekday: 'short',
    });
    const minutes = Math.round(seconds / 60);
    return {
      key,
      label,
      minutes,
      isToday: key === todayKey,
      goalMet: minutes >= goalMinutes,
    };
  });

  const maxMinutes = Math.max(goalMinutes, 30, ...last7Days.map((d) => d.minutes));

  // Donut Chart geometry
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let runningFraction = 0;
  const totalSliceSec = distribution.totalSeconds;
  const donutSegments = distribution.slices.map((slice) => {
    const fraction = totalSliceSec > 0 ? slice.seconds / totalSliceSec : 0;
    const dashArray = `${fraction * circumference} ${circumference}`;
    const dashOffset = -runningFraction * circumference;
    runningFraction += fraction;
    return { ...slice, dashArray, dashOffset };
  });

  const getHeatmapCellColor = (cell: HeatmapCell): React.CSSProperties => {
    if (cell.isFuture) return { opacity: 0.18 };
    if (cell.level === 0) return {};
    const alphas = [0, 0.25, 0.48, 0.74, 1] as const;
    return { backgroundColor: hexToRgba(settings.accentColor, alphas[cell.level]) };
  };

  return (
    <div className="space-y-4">
      {/* Row 1: KPI Cards + Daily Goal + Streak */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Today's Focus & Daily Goal Bar */}
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 shadow-sm sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <Target className="h-4 w-4 text-violet-500" />
              <span>{t(lang, 'todayFocusCard')}</span>
            </div>
            {streakStats.goalMetToday && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                {t(lang, 'goalMetBadge')}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatListDuration(streakStats.todaySeconds, lang)}
            </div>
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              / {formatListDuration(goalMinutes * 60, lang)} ({streakStats.goalProgressPct}%)
            </span>
          </div>

          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${streakStats.goalProgressPct}%`,
                backgroundColor: streakStats.goalMetToday ? '#10b981' : settings.accentColor,
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-zinc-500 dark:text-zinc-400">
              {t(lang, 'dailyGoalLabel')}:
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {GOAL_PRESET_MINUTES.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => updateSettings({ dailyGoalMinutes: mins })}
                  className={`rounded-md px-2 py-0.5 font-semibold transition ${
                    goalMinutes === mins
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {mins / 60}
                  {lang === 'tr' ? 's' : 'h'}
                </button>
              ))}
              <input
                type="number"
                min={15}
                max={720}
                step={15}
                value={goalMinutes}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  if (Number.isFinite(val) && val >= 15) {
                    updateSettings({ dailyGoalMinutes: Math.min(720, val) });
                  }
                }}
                aria-label={t(lang, 'dailyGoalLabel')}
                className="w-14 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold"
              />
              <span className="text-zinc-400">{lang === 'tr' ? 'dk' : 'm'}</span>
            </div>
          </div>
        </div>

        {/* Streak Card */}
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Flame className="h-4 w-4 text-orange-500" />
            <span>{t(lang, 'currentStreakLabel')}</span>
          </div>
          <div className="mt-1.5 text-2xl sm:text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {streakStats.currentStreak}{' '}
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {t(lang, 'daysUnit')}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <Award className="h-3.5 w-3.5 text-amber-500" />
            <span>
              {t(lang, 'longestStreakLabel')}: {streakStats.longestStreak} {t(lang, 'daysUnit')}
            </span>
          </div>
        </div>

        {/* Done Today & Active Year Card */}
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>{t(lang, 'completedTodayCard')}</span>
          </div>
          <div className="mt-1.5 text-2xl sm:text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {completedToday.length}{' '}
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {t(lang, 'tasksSuffix')}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <CalendarDays className="h-3.5 w-3.5 text-sky-500" />
            <span>
              {t(lang, 'activeDaysYearLabel')}: {streakStats.activeDaysYear}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Category / Color Focus Pie Chart */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-violet-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {t(lang, 'distributionTitle')}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 font-semibold">
              <button
                type="button"
                onClick={() => setDistMode('list')}
                className={`rounded-md px-2.5 py-1 transition ${
                  distMode === 'list'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {t(lang, 'distByLists')}
              </button>
              <button
                type="button"
                onClick={() => setDistMode('color')}
                className={`rounded-md px-2.5 py-1 transition ${
                  distMode === 'color'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {t(lang, 'distByColors')}
              </button>
            </div>

            <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 font-semibold">
              <button
                type="button"
                onClick={() => setDistRange('7d')}
                className={`rounded-md px-2 py-1 transition ${
                  distRange === '7d'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {t(lang, 'distRangeWeek')}
              </button>
              <button
                type="button"
                onClick={() => setDistRange('all')}
                className={`rounded-md px-2 py-1 transition ${
                  distRange === 'all'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {t(lang, 'distRangeAll')}
              </button>
            </div>
          </div>
        </div>

        {distribution.slices.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {t(lang, 'distEmpty')}
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* SVG Donut Chart */}
            <div className="relative shrink-0 flex items-center justify-center">
              <svg width={148} height={148} viewBox="0 0 148 148" className="-rotate-90">
                <circle
                  cx={74}
                  cy={74}
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  className="text-zinc-200/70 dark:text-zinc-800"
                  strokeWidth={22}
                />
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.id}
                    cx={74}
                    cy={74}
                    r={radius}
                    fill="none"
                    stroke={seg.colorHex}
                    strokeWidth={22}
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    className="transition-all duration-300"
                  />
                ))}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                  {distRange === '7d' ? '7G' : t(lang, 'focusLabel')}
                </span>
                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {formatListDuration(distribution.totalSeconds, lang)}
                </span>
              </div>
            </div>

            {/* Category Legend */}
            <div className="flex-1 w-full space-y-2.5">
              {distribution.slices.slice(0, 8).map((slice) => (
                <div key={slice.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 min-w-0 font-medium text-zinc-800 dark:text-zinc-200">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.colorHex }}
                      />
                      <span className="truncate">{slice.label}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {formatListDuration(slice.seconds, lang)} •{' '}
                      <strong className="text-zinc-900 dark:text-zinc-100">
                        %{slice.percentage}
                      </strong>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, slice.percentage)}%`,
                        backgroundColor: slice.colorHex,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Row 3: GitHub-Style Yearly Focus Heatmap */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {t(lang, 'yearlyHeatmapTitle')}
            </h3>
            <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-600 dark:text-zinc-300">
              {formatListDuration(yearlyHeatmap.totalSeconds, lang)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
            <span>{t(lang, 'heatmapLess')}</span>
            <span className="h-2.5 w-2.5 rounded-[2px] bg-zinc-200 dark:bg-zinc-800" />
            {[0.25, 0.48, 0.74, 1].map((a) => (
              <span
                key={a}
                className="h-2.5 w-2.5 rounded-[2px]"
                style={{ backgroundColor: hexToRgba(settings.accentColor, a) }}
              />
            ))}
            <span>{t(lang, 'heatmapMore')}</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="inline-block min-w-max">
            {/* Month Labels */}
            <div className="relative h-4 mb-1 ml-7 text-[10px] text-zinc-400">
              {yearlyHeatmap.monthLabels.map((m) => (
                <span
                  key={`${m.colIndex}-${m.label}`}
                  style={{ left: `${m.colIndex * 14}px` }}
                  className="absolute top-0"
                >
                  {m.label}
                </span>
              ))}
            </div>

            <div className="flex gap-1.5">
              {/* Weekday vertical labels */}
              <div className="grid grid-rows-7 gap-[3px] text-[9px] text-zinc-400 pr-1 select-none w-5 text-right">
                <span className="leading-[11px]">{lang === 'tr' ? 'Pt' : 'Mon'}</span>
                <span />
                <span className="leading-[11px]">{lang === 'tr' ? 'Ça' : 'Wed'}</span>
                <span />
                <span className="leading-[11px]">{lang === 'tr' ? 'Cu' : 'Fri'}</span>
                <span />
                <span />
              </div>

              {/* 53 Weeks x 7 Days Grid */}
              <div className="flex gap-[3px]">
                {yearlyHeatmap.weeks.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-rows-7 gap-[3px]">
                    {week.map((cell) => (
                      <button
                        key={cell.dateKey}
                        type="button"
                        disabled={cell.isFuture}
                        onMouseEnter={() => setInspectedCell(cell)}
                        onClick={() => setInspectedCell(cell)}
                        style={getHeatmapCellColor(cell)}
                        title={`${cell.label}: ${formatListDuration(cell.seconds, lang)}`}
                        className={`h-[11px] w-[11px] rounded-[2px] transition-transform hover:scale-125 focus:outline-none ${
                          cell.level === 0 ? 'bg-zinc-200/80 dark:bg-zinc-800/90' : ''
                        } ${cell.isToday ? 'ring-1 ring-zinc-900 dark:ring-white' : ''}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-200/60 dark:border-zinc-800/80 pt-2">
          {inspectedCell ? (
            <span className="font-medium text-zinc-700 dark:text-zinc-200">
              {inspectedCell.label}:{' '}
              <strong>{formatListDuration(inspectedCell.seconds, lang)}</strong>{' '}
              {inspectedCell.goalMet && (
                <span className="ml-1.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                  ✓ {t(lang, 'goalMetBadge')}
                </span>
              )}
            </span>
          ) : (
            <span>{t(lang, 'heatmapSelectHint')}</span>
          )}
        </div>
      </div>

      {/* Row 4: 7-Day Focus Bar Chart */}
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
                      day.minutes === 0
                        ? 'bg-zinc-200 dark:bg-zinc-800'
                        : day.goalMet
                          ? 'bg-emerald-500'
                          : 'bg-emerald-500/65'
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

      {/* Row 5: Completed Tasks Archive */}
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
                      {t(lang, 'focusLabel')}:{' '}
                      {formatListDuration(task.actual_focused_seconds, lang)}
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
