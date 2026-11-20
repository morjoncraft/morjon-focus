import React, { useMemo, useState } from 'react';
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Flame,
  FolderKanban,
  PieChart,
  Plus,
  RotateCcw,
  Target,
  Trash2,
} from 'lucide-react';
import { ACCENT_SWATCHES, hexToRgba } from '../lib/colors';
import {
  buildYearlyHeatmap,
  computeFocusDistribution,
  computeProjectStats,
  computeStreakStats,
  filterCompletedTasks,
  getEffectiveTaskSpentSeconds,
  type HeatmapCell,
} from '../lib/focusAnalytics';
import { formatListDuration, getLocalDateKey } from '../lib/formatters';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';
import type { CompletedPeriod } from '../types';

const GOAL_PRESET_MINUTES = [60, 120, 180, 240];
const PROJECT_EMOJIS = ['📁', '🚀', '💻', '📚', '🎨', '💼', '🔬', '🏠'];

export const CompletedStatsView: React.FC = () => {
  const lists = useFocusStore((s) => s.lists);
  const tasks = useFocusStore((s) => s.tasks);
  const projects = useFocusStore((s) => s.projects);
  const theme = useFocusStore((s) => s.theme);
  const dailyFocusSeconds = useFocusStore((s) => s.dailyFocusSeconds);
  const dailyCategoryFocus = useFocusStore((s) => s.dailyCategoryFocus);
  const settings = useFocusStore((s) => s.settings);
  const updateSettings = useFocusStore((s) => s.updateSettings);
  const createProject = useFocusStore((s) => s.createProject);
  const deleteProject = useFocusStore((s) => s.deleteProject);
  const uncompleteTask = useFocusStore((s) => s.uncompleteTask);
  const deleteTask = useFocusStore((s) => s.deleteTask);
  const clearCompletedTasks = useFocusStore((s) => s.clearCompletedTasks);

  const [distMode, setDistMode] = useState<'list' | 'project' | 'color'>('list');
  const [distRange, setDistRange] = useState<'7d' | 'all'>('7d');
  const [inspectedCell, setInspectedCell] = useState<HeatmapCell | null>(null);

  const [archivePeriod, setArchivePeriod] = useState<CompletedPeriod>(() => {
    const dailyCount = filterCompletedTasks({
      tasks,
      period: 'daily',
      projectFilter: 'all',
      reverseOrder: true,
    }).length;
    if (dailyCount > 0) return 'daily';
    const weeklyCount = filterCompletedTasks({
      tasks,
      period: 'weekly',
      projectFilter: 'all',
      reverseOrder: true,
    }).length;
    return weeklyCount > 0 ? 'weekly' : 'all';
  });
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [newProjName, setNewProjName] = useState('');
  const [newProjEmoji, setNewProjEmoji] = useState('📁');
  const [newProjColor, setNewProjColor] = useState<string>(ACCENT_SWATCHES[0]);

  const lang = settings.language;
  const isDark = theme === 'dark';
  const todayKey = getLocalDateKey();
  const goalMinutes = Math.max(15, settings.dailyGoalMinutes || 120);

  const activeProjects = useMemo(
    () => projects.filter((p) => !p.deleted_at),
    [projects],
  );

  const projectMap = useMemo(
    () => new Map(activeProjects.map((p) => [p.id, p])),
    [activeProjects],
  );

  const listMap = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);

  const projectSummaries = useMemo(
    () => computeProjectStats(projects, tasks, 'all'),
    [projects, tasks],
  );

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
        projects,
        lang,
      }),
    [distMode, distRange, dailyCategoryFocus, tasks, lists, projects, lang],
  );

  const periodCounts = useMemo(
    () => ({
      daily: filterCompletedTasks({
        tasks,
        period: 'daily',
        projectFilter,
        reverseOrder: settings.reverseCompletedOrder,
      }).length,
      weekly: filterCompletedTasks({
        tasks,
        period: 'weekly',
        projectFilter,
        reverseOrder: settings.reverseCompletedOrder,
      }).length,
      monthly: filterCompletedTasks({
        tasks,
        period: 'monthly',
        projectFilter,
        reverseOrder: settings.reverseCompletedOrder,
      }).length,
      all: filterCompletedTasks({
        tasks,
        period: 'all',
        projectFilter,
        reverseOrder: settings.reverseCompletedOrder,
      }).length,
    }),
    [tasks, projectFilter, settings.reverseCompletedOrder],
  );

  const filteredCompleted = useMemo(
    () =>
      filterCompletedTasks({
        tasks,
        period: archivePeriod,
        projectFilter,
        reverseOrder: settings.reverseCompletedOrder,
      }),
    [tasks, archivePeriod, projectFilter, settings.reverseCompletedOrder],
  );

  const filteredTotalSeconds = useMemo(
    () =>
      filteredCompleted.reduce((sum, item) => sum + getEffectiveTaskSpentSeconds(item), 0),
    [filteredCompleted],
  );

  const completedTodayCount = useMemo(
    () =>
      filterCompletedTasks({
        tasks,
        period: 'daily',
        projectFilter: 'all',
        reverseOrder: true,
      }).length,
    [tasks],
  );

  const groupedByDay = useMemo(() => {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = getLocalDateKey(yesterdayDate);
    const locale = lang === 'tr' ? 'tr-TR' : 'en-US';

    const groups: Array<{
      dateKey: string;
      label: string;
      totalSeconds: number;
      items: typeof filteredCompleted;
    }> = [];
    const byKey = new Map<string, (typeof groups)[number]>();

    for (const item of filteredCompleted) {
      const stamp = item.completed_at ?? item.updated_at;
      const d = new Date(stamp);
      const dateKey = getLocalDateKey(d);
      let group = byKey.get(dateKey);
      if (!group) {
        const label =
          dateKey === todayKey
            ? t(lang, 'todayGroupLabel')
            : dateKey === yesterdayKey
              ? t(lang, 'yesterdayGroupLabel')
              : d.toLocaleDateString(locale, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });
        group = { dateKey, label, totalSeconds: 0, items: [] };
        byKey.set(dateKey, group);
        groups.push(group);
      }
      group.items.push(item);
      group.totalSeconds += getEffectiveTaskSpentSeconds(item);
    }

    return groups;
  }, [filteredCompleted, lang, todayKey]);

  const selectedProjectStat =
    projectFilter !== 'all' && projectFilter !== '__none__'
      ? projectSummaries.find((s) => s.project.id === projectFilter) ?? null
      : null;

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newProjName.trim();
    if (!cleaned) return;
    createProject(cleaned, newProjEmoji, newProjColor);
    setNewProjName('');
  };

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
            {completedTodayCount}{' '}
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
                onClick={() => setDistMode('project')}
                className={`rounded-md px-2.5 py-1 transition ${
                  distMode === 'project'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {t(lang, 'distByProjects')}
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

      {/* Row 5: Projects & Time Invested */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 shadow-sm space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-sky-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {t(lang, 'projectsSectionTitle')} ({activeProjects.length})
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {t(lang, 'projectsSectionDesc')}
          </p>
        </div>

        {/* Create New Project Bar */}
        <form onSubmit={handleCreateProject} className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-1">
            {PROJECT_EMOJIS.slice(0, 5).map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setNewProjEmoji(em)}
                className={`h-7 w-7 rounded-md text-sm transition ${
                  newProjEmoji === em
                    ? 'bg-violet-500/20 ring-1 ring-violet-500'
                    : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                {em}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-2 py-1.5">
            {ACCENT_SWATCHES.slice(0, 6).map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setNewProjColor(hex)}
                style={{ backgroundColor: hex }}
                className={`h-4 w-4 rounded-full transition ${
                  newProjColor === hex
                    ? 'ring-2 ring-offset-1 ring-zinc-900 dark:ring-white scale-110'
                    : 'opacity-80 hover:opacity-100'
                }`}
                aria-label={hex}
              />
            ))}
          </div>

          <div className="flex flex-1 min-w-[180px] items-center gap-2">
            <input
              type="text"
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              placeholder={t(lang, 'newProjectPlaceholder')}
              className="h-9 flex-1 min-w-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="submit"
              disabled={!newProjName.trim()}
              style={{ backgroundColor: settings.accentColor }}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold text-white disabled:opacity-40 hover:brightness-110 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t(lang, 'createProjectBtn')}</span>
            </button>
          </div>
        </form>

        {projectSummaries.length === 0 ? (
          <p className="py-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {t(lang, 'noProjectsYet')}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {projectSummaries.map((stat) => {
              const isSelected = projectFilter === stat.project.id;
              return (
                <div
                  key={stat.project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setProjectFilter((cur) => (cur === stat.project.id ? 'all' : stat.project.id))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setProjectFilter((cur) =>
                        cur === stat.project.id ? 'all' : stat.project.id,
                      );
                    }
                  }}
                  style={
                    isSelected
                      ? {
                          borderColor: stat.project.color,
                          backgroundColor: hexToRgba(stat.project.color, isDark ? 0.16 : 0.09),
                        }
                      : undefined
                  }
                  className={`group rounded-xl border p-3 transition cursor-pointer ${
                    isSelected
                      ? 'shadow-sm'
                      : 'border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-950/45 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
                        style={{
                          backgroundColor: hexToRgba(stat.project.color, isDark ? 0.24 : 0.16),
                        }}
                      >
                        {stat.project.emoji}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {stat.project.name}
                        </div>
                        <div className="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-200">
                          {formatListDuration(stat.totalSpentSeconds, lang)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (projectFilter === stat.project.id) {
                          setProjectFilter('all');
                        }
                        deleteProject(stat.project.id);
                      }}
                      className="opacity-70 sm:opacity-0 group-hover:opacity-100 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-500/15 hover:text-rose-500 transition"
                      title={t(lang, 'deleteTask')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span>
                      <strong className="text-zinc-800 dark:text-zinc-200">
                        {stat.allTimeCompletedParts}
                      </strong>{' '}
                      {t(lang, 'partsCompletedUnit')}
                    </span>
                    {stat.pendingParts > 0 && (
                      <span>
                        • {stat.pendingParts} {t(lang, 'partsPendingUnit')}
                      </span>
                    )}
                    {stat.avgPartSeconds > 0 && (
                      <span>
                        • {t(lang, 'avgPartLabel')}:{' '}
                        <strong className="text-zinc-800 dark:text-zinc-200">
                          {formatListDuration(stat.avgPartSeconds, lang)}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 6: Completed Tasks Archive (Daily / Weekly / Monthly + Project Filter) */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t(lang, 'completedArchive')} ({filteredCompleted.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* Project Filter Select */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              aria-label={t(lang, 'projectLabel')}
              className="h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="all">{t(lang, 'allProjectsFilter')}</option>
              <option value="__none__">{t(lang, 'unassignedProjectFilter')}</option>
              {activeProjects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.emoji} {proj.name}
                </option>
              ))}
            </select>

            {periodCounts.all > 0 && (
              <button
                type="button"
                onClick={clearCompletedTasks}
                className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline px-1"
              >
                {t(lang, 'clearArchive')}
              </button>
            )}
          </div>
        </div>

        {/* Period Tabs: Daily / Weekly / Monthly / All */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex flex-wrap rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 gap-1 text-xs font-semibold">
            {(
              [
                { id: 'daily', label: t(lang, 'periodDaily'), count: periodCounts.daily },
                { id: 'weekly', label: t(lang, 'periodWeekly'), count: periodCounts.weekly },
                { id: 'monthly', label: t(lang, 'periodMonthly'), count: periodCounts.monthly },
                { id: 'all', label: t(lang, 'periodAll'), count: periodCounts.all },
              ] as const
            ).map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => setArchivePeriod(tabItem.id)}
                className={`rounded-lg px-2.5 py-1 transition ${
                  archivePeriod === tabItem.id
                    ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tabItem.label}{' '}
                <span className="font-mono text-[11px] opacity-75">({tabItem.count})</span>
              </button>
            ))}
          </div>

          {/* Summary Pill for selected Period & Project */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/75 px-3 py-1.5 text-xs">
            <span>
              <strong className="font-mono text-zinc-900 dark:text-zinc-100">
                {filteredCompleted.length}
              </strong>{' '}
              <span className="text-zinc-500 dark:text-zinc-400">
                {t(lang, 'periodSummaryTasks')}
              </span>
            </span>
            <span className="text-zinc-400">•</span>
            <span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {t(lang, 'totalInvestedLabel')}:
              </span>{' '}
              <strong className="font-mono text-zinc-900 dark:text-zinc-100">
                {formatListDuration(filteredTotalSeconds, lang)}
              </strong>
            </span>
            {selectedProjectStat && filteredCompleted.length > 0 && (
              <>
                <span className="text-zinc-400">•</span>
                <span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {t(lang, 'avgPartLabel')}:
                  </span>{' '}
                  <strong className="font-mono text-zinc-900 dark:text-zinc-100">
                    {formatListDuration(
                      Math.round(filteredTotalSeconds / filteredCompleted.length),
                      lang,
                    )}
                  </strong>
                </span>
              </>
            )}
          </div>
        </div>

        {filteredCompleted.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {t(lang, 'noCompletedInPeriod')}
          </p>
        ) : (
          <div className="space-y-4">
            {groupedByDay.map((group) => (
              <div key={group.dateKey} className="space-y-1.5">
                <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  <span>{group.label}</span>
                  <span className="font-mono">
                    {group.items.length} {t(lang, 'tasksSuffix')} •{' '}
                    {formatListDuration(group.totalSeconds, lang)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {group.items.map((task) => {
                    const proj = task.project_id ? projectMap.get(task.project_id) : undefined;
                    const taskList = task.list_id ? listMap.get(task.list_id) : undefined;
                    const spentSec = getEffectiveTaskSpentSeconds(task);
                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 px-3 py-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base shrink-0">{task.emoji}</span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              <span className="truncate text-sm font-medium text-zinc-600 dark:text-zinc-300 line-through">
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
                                  <span className="max-w-[120px] truncate">{proj.name}</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                              {t(lang, 'focusLabel')}: {formatListDuration(spentSec, lang)}
                              {taskList ? ` • ${taskList.emoji} ${taskList.name}` : ''}
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
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
