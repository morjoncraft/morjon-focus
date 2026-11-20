import { ACCENT_SWATCHES, getFriendlyColorLabel, normalizeHex } from './colors';
import { getLocalDateKey } from './formatters';
import type {
  DailyCategoryFocusMap,
  DailyFocusMap,
  Language,
  Task,
  TaskList,
} from '../types';

export interface StreakStats {
  goalSeconds: number;
  todaySeconds: number;
  todayMinutes: number;
  goalProgressPct: number;
  goalMetToday: boolean;
  currentStreak: number;
  longestStreak: number;
  activeDaysYear: number;
  totalYearSeconds: number;
}

export interface HeatmapCell {
  dateKey: string;
  label: string;
  seconds: number;
  minutes: number;
  level: 0 | 1 | 2 | 3 | 4;
  goalMet: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface YearlyHeatmapData {
  weeks: HeatmapCell[][];
  monthLabels: Array<{ colIndex: number; label: string }>;
  totalSeconds: number;
  activeDays: number;
}

export interface DistributionSlice {
  id: string;
  label: string;
  colorHex: string;
  seconds: number;
  percentage: number;
}

export interface FocusDistributionData {
  totalSeconds: number;
  slices: DistributionSlice[];
}

function addDaysLocal(base: Date, deltaDays: number): Date {
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + deltaDays);
  return next;
}

function parseLocalDateKey(key: string): Date | null {
  const parts = key.split('-').map((n) => Number.parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function computeStreakStats(
  dailyFocusSeconds: DailyFocusMap,
  dailyGoalMinutes: number,
  today: Date = new Date(),
): StreakStats {
  const goalSeconds = Math.max(1, Math.round(dailyGoalMinutes)) * 60;
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayKey = getLocalDateKey(todayMidnight);
  const todaySeconds = Math.max(0, dailyFocusSeconds[todayKey] ?? 0);
  const todayMinutes = Math.round(todaySeconds / 60);
  const goalProgressPct = Math.min(100, Math.round((todaySeconds / goalSeconds) * 100));
  const goalMetToday = todaySeconds >= goalSeconds;

  // Current streak: consecutive days meeting goal up to today (or up to yesterday if today is in progress)
  let currentStreak = 0;
  let cursorOffset = goalMetToday ? 0 : -1;
  for (let i = 0; i < 3650; i++) {
    const d = addDaysLocal(todayMidnight, cursorOffset - i);
    const key = getLocalDateKey(d);
    if ((dailyFocusSeconds[key] ?? 0) >= goalSeconds) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  // Longest streak across all recorded dates
  const qualifiedDates = Object.entries(dailyFocusSeconds)
    .filter(([, sec]) => sec >= goalSeconds)
    .map(([key]) => parseLocalDateKey(key))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  let longestStreak = 0;
  let run = 0;
  let prevDayMs: number | null = null;

  for (const d of qualifiedDates) {
    const expectedPrev = addDaysLocal(d, -1).getTime();
    if (prevDayMs !== null && prevDayMs === expectedPrev) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prevDayMs = d.getTime();
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  // Active days & total focus in last 365 days
  let activeDaysYear = 0;
  let totalYearSeconds = 0;
  for (let i = 0; i < 365; i++) {
    const key = getLocalDateKey(addDaysLocal(todayMidnight, -i));
    const sec = dailyFocusSeconds[key] ?? 0;
    if (sec > 0) {
      activeDaysYear += 1;
      totalYearSeconds += sec;
    }
  }

  return {
    goalSeconds,
    todaySeconds,
    todayMinutes,
    goalProgressPct,
    goalMetToday,
    currentStreak,
    longestStreak,
    activeDaysYear,
    totalYearSeconds,
  };
}

export function buildYearlyHeatmap(
  dailyFocusSeconds: DailyFocusMap,
  dailyGoalMinutes: number,
  today: Date = new Date(),
  lang: Language = 'en',
): YearlyHeatmapData {
  const goalSeconds = Math.max(1, Math.round(dailyGoalMinutes)) * 60;
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayKey = getLocalDateKey(todayMidnight);

  // Align columns to Monday..Sunday (53 weeks covering 365+ days ending with today's week)
  const dayOfWeekMon = (todayMidnight.getDay() + 6) % 7; // Mon=0..Sun=6
  const currentWeekMonday = addDaysLocal(todayMidnight, -dayOfWeekMon);
  const startMonday = addDaysLocal(currentWeekMonday, -52 * 7);

  const weeks: HeatmapCell[][] = [];
  const monthLabels: Array<{ colIndex: number; label: string }> = [];
  let lastMonth = -1;
  let totalSeconds = 0;
  let activeDays = 0;

  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';

  for (let w = 0; w < 53; w++) {
    const col: HeatmapCell[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = addDaysLocal(startMonday, w * 7 + d);
      const isFuture = cellDate.getTime() > todayMidnight.getTime();
      const dateKey = getLocalDateKey(cellDate);
      const sec = isFuture ? 0 : Math.max(0, dailyFocusSeconds[dateKey] ?? 0);

      if (!isFuture && sec > 0) {
        totalSeconds += sec;
        activeDays += 1;
      }

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (sec > 0) {
        const ratio = sec / goalSeconds;
        if (ratio >= 1.5) level = 4;
        else if (ratio >= 1) level = 3;
        else if (ratio >= 0.45) level = 2;
        else level = 1;
      }

      if (d === 0 && !isFuture) {
        const m = cellDate.getMonth();
        if (m !== lastMonth) {
          const prevCol = monthLabels[monthLabels.length - 1]?.colIndex ?? -10;
          if (w - prevCol >= 3) {
            monthLabels.push({
              colIndex: w,
              label: cellDate.toLocaleDateString(locale, { month: 'short' }),
            });
          }
          lastMonth = m;
        }
      }

      col.push({
        dateKey,
        label: cellDate.toLocaleDateString(locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        seconds: sec,
        minutes: Math.round(sec / 60),
        level,
        goalMet: sec >= goalSeconds,
        isToday: dateKey === todayKey,
        isFuture,
      });
    }
    weeks.push(col);
  }

  return { weeks, monthLabels, totalSeconds, activeDays };
}

const LIST_CHART_COLORS = [
  '#9364b8',
  '#3aa0b5',
  '#0fa988',
  '#df7a57',
  '#d89b48',
  '#1388ba',
  '#d56aa6',
  '#4caf6a',
  '#e05a5a',
];

export function computeFocusDistribution(params: {
  mode: 'list' | 'color';
  range: '7d' | 'all';
  dailyCategoryFocus: DailyCategoryFocusMap;
  tasks: Task[];
  lists: TaskList[];
  lang: Language;
  today?: Date;
}): FocusDistributionData {
  const {
    mode,
    range,
    dailyCategoryFocus,
    tasks,
    lists,
    lang,
    today = new Date(),
  } = params;
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const allowedDateKeys = new Set<string>();
  if (range === '7d') {
    for (let i = 0; i < 7; i++) {
      allowedDateKeys.add(getLocalDateKey(addDaysLocal(todayMidnight, -i)));
    }
  }

  const bucketTotals = new Map<string, number>();
  const recordedDateKeys = new Set<string>();

  for (const [dateKey, bucket] of Object.entries(dailyCategoryFocus ?? {})) {
    if (range === '7d' && !allowedDateKeys.has(dateKey)) continue;
    recordedDateKeys.add(dateKey);
    const source = mode === 'list' ? bucket.byList : bucket.byColor;
    for (const [k, sec] of Object.entries(source ?? {})) {
      if (sec <= 0) continue;
      bucketTotals.set(k, (bucketTotals.get(k) ?? 0) + sec);
    }
  }

  // Fallback for tasks focused before dailyCategoryFocus was recorded
  for (const task of tasks) {
    if (task.deleted_at || task.actual_focused_seconds <= 0) continue;
    const stamp = task.completed_at ?? task.updated_at;
    const taskDate = stamp ? new Date(stamp) : todayMidnight;
    const dateKey = getLocalDateKey(taskDate);

    if (range === '7d' && !allowedDateKeys.has(dateKey)) continue;
    if (recordedDateKeys.has(dateKey)) continue;

    const rawKey =
      mode === 'list'
        ? (task.list_id ?? '__none__')
        : (normalizeHex(task.color) ?? '__none__');
    bucketTotals.set(rawKey, (bucketTotals.get(rawKey) ?? 0) + task.actual_focused_seconds);
  }

  const listMap = new Map(lists.map((l) => [l.id, l]));
  const totalSeconds = Array.from(bucketTotals.values()).reduce((sum, s) => sum + s, 0);

  if (totalSeconds <= 0) {
    return { totalSeconds: 0, slices: [] };
  }

  // Merge entries sharing identical display key/label
  const mergedDisplay = new Map<
    string,
    { id: string; label: string; colorHex: string; seconds: number }
  >();

  let colorIdx = 0;
  for (const [key, seconds] of bucketTotals.entries()) {
    if (seconds <= 0) continue;

    if (mode === 'list') {
      const list = key !== '__none__' ? listMap.get(key) : undefined;
      const label = list
        ? `${list.emoji} ${list.name}`
        : lang === 'tr'
          ? 'Diğer / Silinmiş Liste'
          : 'Other / Unassigned';
      const stableHex = list
        ? LIST_CHART_COLORS[colorIdx++ % LIST_CHART_COLORS.length]
        : '#71717a';
      const existing = mergedDisplay.get(label);
      if (existing) {
        existing.seconds += seconds;
      } else {
        mergedDisplay.set(label, { id: key, label, colorHex: stableHex, seconds });
      }
    } else {
      const info = getFriendlyColorLabel(key, lang);
      const existing = mergedDisplay.get(info.label);
      if (existing) {
        existing.seconds += seconds;
      } else {
        mergedDisplay.set(info.label, {
          id: info.key,
          label: info.label,
          colorHex: info.hex || ACCENT_SWATCHES[0],
          seconds,
        });
      }
    }
  }

  const sorted = Array.from(mergedDisplay.values()).sort((a, b) => b.seconds - a.seconds);
  const rawPcts = sorted.map((item) => (item.seconds / totalSeconds) * 100);
  const floored = rawPcts.map((p) => Math.floor(p));
  let remainder = 100 - floored.reduce((a, b) => a + b, 0);
  const orderByFrac = rawPcts
    .map((p, idx) => ({ idx, frac: p - floored[idx] }))
    .sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < orderByFrac.length && remainder > 0; i++) {
    floored[orderByFrac[i].idx] += 1;
    remainder -= 1;
  }

  const slices: DistributionSlice[] = sorted.map((item, idx) => ({
    ...item,
    percentage: floored[idx],
  }));

  return { totalSeconds, slices };
}
