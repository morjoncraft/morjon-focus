import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Inbox,
  ListChecks,
  Maximize2,
  Minus,
  Pause,
  PictureInPicture2,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { hexToRgba, normalizeHex } from '../lib/colors';
import { fireTaskCompleteConfetti } from '../lib/confetti';
import { formatDurationBadge, formatTimer } from '../lib/formatters';
import { t } from '../lib/i18n';
import { parseTaskInput } from '../lib/parseTaskInput';
import { useFocusStore } from '../store/useFocusStore';
import type { Task } from '../types';
import { ColorMePopover } from './ColorMePopover';
import { EmojiMePopover } from './EmojiMePopover';

interface HeroTimerProps {
  activeTask: Task | null;
  onQuickApplyPreset?: () => void;
  onOpenCustomEmojiModal: (mode: 'create' | 'edit') => void;
  onOpenPip: () => void;
}

export const HeroTimer: React.FC<HeroTimerProps> = ({
  activeTask,
  onQuickApplyPreset,
  onOpenCustomEmojiModal,
  onOpenPip,
}) => {
  const settings = useFocusStore((s) => s.settings);
  const theme = useFocusStore((s) => s.theme);
  const isTimerRunning = useFocusStore((s) => s.isTimerRunning);
  const completedPomodoroCount = useFocusStore((s) => s.completedPomodoroCount);
  const longBreakSuggestionPending = useFocusStore((s) => s.longBreakSuggestionPending);
  const microSprintRemainingSec = useFocusStore((s) => s.microSprintRemainingSec);
  const microSprintCompletedBanner = useFocusStore((s) => s.microSprintCompletedBanner);

  const toggleTimer = useFocusStore((s) => s.toggleTimer);
  const startMicroSprint = useFocusStore((s) => s.startMicroSprint);
  const dismissMicroSprintBanner = useFocusStore((s) => s.dismissMicroSprintBanner);
  const adjustTaskMinutes = useFocusStore((s) => s.adjustTaskMinutes);
  const completeTask = useFocusStore((s) => s.completeTask);
  const resetTaskTimer = useFocusStore((s) => s.resetTaskTimer);
  const moveToNotNow = useFocusStore((s) => s.moveToNotNow);
  const deleteTask = useFocusStore((s) => s.deleteTask);
  const addOvertimeToTask = useFocusStore((s) => s.addOvertimeToTask);
  const cycleAccentColor = useFocusStore((s) => s.cycleAccentColor);
  const pickRandomTask = useFocusStore((s) => s.pickRandomTask);
  const updateSettings = useFocusStore((s) => s.updateSettings);
  const setZenModeOpen = useFocusStore((s) => s.setZenModeOpen);
  const acceptLongBreak = useFocusStore((s) => s.acceptLongBreak);
  const dismissLongBreakSuggestion = useFocusStore((s) => s.dismissLongBreakSuggestion);
  const addTask = useFocusStore((s) => s.addTask);
  const addSubtask = useFocusStore((s) => s.addSubtask);
  const toggleSubtask = useFocusStore((s) => s.toggleSubtask);
  const deleteSubtask = useFocusStore((s) => s.deleteSubtask);

  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  // Sub-tasks are ALWAYS collapsed by default when a task enters Current Focus
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const [brainDumpText, setBrainDumpText] = useState('');
  const [brainDumpToast, setBrainDumpToast] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSubtasksOpen(false);
  }, [activeTask?.id]);

  useEffect(() => {
    if (!emojiMenuOpen && !colorMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setEmojiMenuOpen(false);
        setColorMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [emojiMenuOpen, colorMenuOpen]);

  const lang = settings.language;
  const isDark = theme === 'dark';
  const isSimplified = settings.layoutMode === 'simplified';

  if (!activeTask) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700/80 bg-white/75 dark:bg-zinc-900/55 p-7 sm:p-9 text-center">
        <div
          className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: hexToRgba(settings.accentColor, 0.16),
            color: settings.accentColor,
          }}
        >
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t(lang, 'emptyTitle')}
        </h2>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          {t(lang, 'emptyDesc')}
        </p>
        {onQuickApplyPreset && (
          <button
            type="button"
            onClick={onQuickApplyPreset}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
            style={{ backgroundColor: settings.accentColor }}
          >
            <Sparkles className="h-4 w-4" />
            {t(lang, 'loadPresetCta')}
          </button>
        )}
      </section>
    );
  }

  const taskHex = normalizeHex(activeTask.color);
  const accentHex = taskHex ?? settings.accentColor;
  const ringHex = settings.accentColor;
  const isOvertime = activeTask.remaining_seconds < 0;
  const overtimeSeconds = isOvertime ? Math.abs(activeTask.remaining_seconds) : 0;

  const remainingClamped = Math.max(0, activeTask.remaining_seconds);
  const remainingFraction =
    activeTask.duration_seconds > 0
      ? Math.max(0, Math.min(1, remainingClamped / activeTask.duration_seconds))
      : 0;

  const pieFraction =
    activeTask.duration_seconds <= 3600
      ? Math.max(0, Math.min(1, remainingClamped / 3600))
      : remainingFraction;

  const cornerClass =
    settings.cornerStyle === 'pill'
      ? 'rounded-3xl'
      : settings.cornerStyle === 'sharp'
        ? 'rounded-xl'
        : 'rounded-2xl';

  const heroSurfaceStyle: React.CSSProperties = isOvertime
    ? {
        borderColor: 'rgba(244, 63, 94, 0.55)',
        backgroundColor: isDark ? 'rgba(136, 19, 55, 0.22)' : 'rgba(255, 228, 230, 0.78)',
      }
    : {
        borderColor: hexToRgba(accentHex, isDark ? 0.42 : 0.35),
        backgroundColor: isDark ? hexToRgba(accentHex, 0.11) : hexToRgba(accentHex, 0.08),
      };

  const handleComplete = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (settings.confettiOnComplete) {
      fireTaskCompleteConfetti(e.currentTarget);
    }
    completeTask(activeTask.id);
  };

  const handleBrainDumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brainDumpText.trim()) return;
    const parsed = parseTaskInput(
      brainDumpText,
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
    setBrainDumpText('');
    setBrainDumpOpen(false);
    setBrainDumpToast(true);
    window.setTimeout(() => setBrainDumpToast(false), 2600);
  };

  const subtasks = activeTask.subtasks ?? [];
  const completedSubCount = subtasks.filter((st) => st.completed).length;

  // Circle ring SVG metrics (bigger, clearer ADHD focal target)
  const circleRadius = 82;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleDashOffset = isOvertime
    ? 0
    : circleCircumference * (1 - remainingFraction);

  const renderPieVisual = () => {
    const size = 188;
    const cx = size / 2;
    const cy = size / 2;
    const r = 80;
    const fillFrac = isOvertime ? 1 : pieFraction;
    const activeFill = isOvertime ? '#f43f5e' : ringHex;

    let wedgePath = '';
    if (fillFrac >= 0.999) {
      wedgePath = `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
    } else if (fillFrac > 0.002) {
      const angleRad = (fillFrac * 360 - 90) * (Math.PI / 180);
      const ex = cx + r * Math.cos(angleRad);
      const ey = cy + r * Math.sin(angleRad);
      const largeArc = fillFrac > 0.5 ? 1 : 0;
      wedgePath = `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey} Z`;
    }

    return (
      <button
        type="button"
        onClick={cycleAccentColor}
        title={t(lang, 'clickToCycleColor')}
        className="group relative flex flex-col items-center justify-center focus:outline-none"
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
          <circle
            cx={cx}
            cy={cy}
            r={r + 4}
            fill="none"
            stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
            strokeWidth={2}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
          />
          {wedgePath && (
            <path
              d={wedgePath}
              fill={activeFill}
              fillOpacity={isOvertime ? 0.85 : 0.88}
              className="transition-all duration-300"
            />
          )}
          <circle
            cx={cx}
            cy={cy}
            r={49}
            fill={isDark ? 'rgba(24,26,32,0.9)' : 'rgba(255,255,255,0.94)'}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-mono text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${
              isOvertime ? 'text-rose-500' : 'text-zinc-900 dark:text-white'
            }`}
          >
            {formatTimer(activeTask.remaining_seconds)}
          </span>
        </div>
      </button>
    );
  };

  const renderCircleVisual = () => {
    const size = 196;
    const cx = size / 2;
    const cy = size / 2;
    const strokeHex = isOvertime ? '#f43f5e' : ringHex;

    return (
      <button
        type="button"
        onClick={cycleAccentColor}
        title={t(lang, 'clickToCycleColor')}
        className="relative flex items-center justify-center focus:outline-none group"
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 drop-shadow-sm"
        >
          <circle
            cx={cx}
            cy={cy}
            r={circleRadius}
            fill="none"
            stroke={isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)'}
            strokeWidth={10}
          />
          <circle
            cx={cx}
            cy={cy}
            r={circleRadius}
            fill="none"
            stroke={strokeHex}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circleCircumference}
            strokeDashoffset={circleDashOffset}
            className={`transition-all duration-300 ${isOvertime ? 'animate-overtime-pulse' : ''}`}
          />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3">
          <span className="text-2xl mb-1">{activeTask.emoji}</span>
          <span
            className={`font-mono text-3xl sm:text-4xl font-bold tracking-tight tabular-nums ${
              isOvertime
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-zinc-950 dark:text-white'
            }`}
          >
            {formatTimer(activeTask.remaining_seconds)}
          </span>
        </div>
      </button>
    );
  };

  return (
    <section
      style={heroSurfaceStyle}
      className={`relative border shadow-sm transition-colors duration-300 ${cornerClass}`}
    >
      <div className="p-5 sm:p-7">
        {/* Active task label + clean action triggers */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-inner"
              style={{
                backgroundColor: hexToRgba(accentHex, isDark ? 0.24 : 0.16),
              }}
              aria-hidden="true"
            >
              {activeTask.emoji}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {t(lang, 'currentFocus')}
                </span>
                {isOvertime ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-300 animate-overtime-pulse">
                    {t(lang, 'overtime')}
                  </span>
                ) : isTimerRunning ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t(lang, 'running')}
                  </span>
                ) : null}
              </div>
              <h1 className="truncate text-lg sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
                {activeTask.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 mr-1">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {t(lang, 'planned')}: {formatDurationBadge(activeTask.duration_seconds, lang)}
              </span>
            </div>

            {!isSimplified && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    updateSettings({ pomodoroAutoBreak: !settings.pomodoroAutoBreak })
                  }
                  className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-semibold transition ${
                    settings.pomodoroAutoBreak
                      ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-zinc-200/80 dark:border-zinc-700/70 bg-white/70 dark:bg-zinc-800/70 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                  title={t(lang, 'pomodoroAutoBreakTitle')}
                >
                  <span>🍅</span>
                  <span className="hidden sm:inline">{t(lang, 'pomodoroLabel')}</span>
                  {settings.pomodoroAutoBreak && (
                    <span className="font-mono text-[10px] opacity-80">
                      ({completedPomodoroCount % Math.max(2, settings.longBreakInterval)}/
                      {settings.longBreakInterval})
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onOpenPip}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200/80 dark:border-zinc-700/70 bg-white/75 dark:bg-zinc-800/75 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition"
                  title={t(lang, 'miniPip')}
                >
                  <PictureInPicture2 className="h-4 w-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setZenModeOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200/80 dark:border-zinc-700/70 bg-white/75 dark:bg-zinc-800/75 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition"
              title={`${t(lang, 'zenMode')} (Z)`}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 2-Minute Warmup Active Pill / Completion Banner */}
        {microSprintRemainingSec !== null && isTimerRunning && (
          <div className="mt-3 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-200 tabular-nums">
              <span>🌱</span>
              <span>
                {t(lang, 'microStartActive')}: {formatTimer(microSprintRemainingSec)}
              </span>
            </span>
          </div>
        )}

        {microSprintCompletedBanner && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            <span>🎉 {t(lang, 'microStartCompleteBanner')}</span>
            <button
              type="button"
              onClick={dismissMicroSprintBanner}
              className="rounded-md px-2 py-0.5 text-[11px] opacity-75 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Long Break Suggestion Banner */}
        {longBreakSuggestionPending && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/12 px-3 py-2 text-xs">
            <span className="font-semibold text-emerald-800 dark:text-emerald-200">
              🌿 {t(lang, 'longBreakSuggestion')} ({settings.longBreakMinutes}
              {lang === 'tr' ? 'dk' : 'm'})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={acceptLongBreak}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white"
              >
                {t(lang, 'takeLongBreak')}
              </button>
              <button
                type="button"
                onClick={dismissLongBreakSuggestion}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
              >
                {t(lang, 'skipBreak')}
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Timer Visual Area */}
        <div className="my-5 sm:my-6 flex flex-col items-center justify-center">
          {settings.timerStyle === 'pie' && renderPieVisual()}

          {settings.timerStyle === 'circle' && renderCircleVisual()}

          {settings.timerStyle === 'digital' && (
            <div
              className="rounded-2xl border px-8 py-5 shadow-inner"
              style={{
                borderColor: hexToRgba(ringHex, 0.35),
                backgroundColor: isDark ? 'rgba(15,17,22,0.55)' : 'rgba(255,255,255,0.75)',
              }}
            >
              <div
                className={`font-mono text-6xl font-bold tracking-tight tabular-nums select-none ${
                  isOvertime
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-zinc-950 dark:text-white'
                }`}
              >
                {formatTimer(activeTask.remaining_seconds)}
              </div>
            </div>
          )}

          {settings.timerStyle === 'minimal' && (
            <div
              className={`font-mono text-6xl sm:text-7xl font-bold tracking-tight tabular-nums select-none ${
                isOvertime
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-zinc-900 dark:text-zinc-50'
              }`}
            >
              {formatTimer(activeTask.remaining_seconds)}
            </div>
          )}

          {isOvertime && (
            <button
              type="button"
              onClick={() => addOvertimeToTask(activeTask.id)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-rose-400/50 bg-rose-500/15 px-4 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-200 hover:bg-rose-500/25 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              {t(lang, 'addOvertime')} ({formatTimer(overtimeSeconds)})
            </button>
          )}
        </div>

        {/* Primary Timer Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => adjustTaskMinutes(activeTask.id, -5)}
            className="inline-flex h-11 items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-800/80 px-3.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          >
            <Minus className="h-4 w-4" />
            <span>5{lang === 'tr' ? 'dk' : 'm'}</span>
          </button>

          <button
            type="button"
            onClick={toggleTimer}
            style={isTimerRunning ? undefined : { backgroundColor: ringHex }}
            className={`inline-flex h-12 min-w-[152px] items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold shadow-sm transition active:scale-[0.98] ${
              isTimerRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                : 'text-white hover:brightness-110'
            }`}
          >
            {isTimerRunning ? (
              <>
                <Pause className="h-5 w-5 fill-current" />
                <span>{t(lang, 'pause')}</span>
              </>
            ) : (
              <>
                <Play className="h-5 w-5 fill-current" />
                <span>{t(lang, 'start')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => adjustTaskMinutes(activeTask.id, 5)}
            className="inline-flex h-11 items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-800/80 px-3.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>5{lang === 'tr' ? 'dk' : 'm'}</span>
          </button>
        </div>

        {/* ADHD Friction-Breaker: Just 2m Start (only shown while paused on >2m tasks) */}
        {!isTimerRunning &&
          settings.enableMicroStart &&
          activeTask.remaining_seconds > 120 && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={startMicroSprint}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-500/20 transition"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>{t(lang, 'microStartBtn')}</span>
              </button>
            </div>
          )}

        {/* Secondary Task Actions */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-zinc-200/70 dark:border-zinc-800/80 pt-4">
          <button
            type="button"
            onClick={handleComplete}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm transition active:scale-95"
          >
            <Check className="h-4 w-4" />
            <span>{t(lang, 'complete')}</span>
          </button>

          <button
            type="button"
            onClick={() => resetTaskTimer(activeTask.id)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-800/70 px-3.5 text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t(lang, 'reset')}</span>
          </button>

          <button
            type="button"
            onClick={() => moveToNotNow(activeTask.id)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-800/70 px-3.5 text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          >
            <Inbox className="h-4 w-4" />
            <span>{t(lang, 'notNowShort')}</span>
          </button>

          <button
            type="button"
            onClick={() => setBrainDumpOpen((v) => !v)}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs sm:text-sm font-medium transition ${
              brainDumpOpen
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : 'border-zinc-200 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            <span>💭</span>
            <span>{t(lang, 'brainDumpBtn')}</span>
          </button>

          {activeTask.is_break && (
            <button
              type="button"
              onClick={() => deleteTask(activeTask.id)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-rose-300/60 dark:border-rose-700/60 bg-rose-500/10 px-3.5 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 transition"
            >
              <span>{t(lang, 'skipBreak')}</span>
            </button>
          )}
        </div>

        {/* Inline Brain Dump Quick Capture -> Parks safely in Not-Now */}
        {brainDumpOpen && (
          <form
            onSubmit={handleBrainDumpSubmit}
            className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 animate-fade-slide"
          >
            <input
              type="text"
              autoFocus
              value={brainDumpText}
              onChange={(e) => setBrainDumpText(e.target.value)}
              placeholder={t(lang, 'brainDumpPlaceholder')}
              className="h-9 flex-1 min-w-0 rounded-lg bg-white/95 dark:bg-zinc-900/90 px-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={!brainDumpText.trim()}
              className="h-9 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 px-3 text-xs font-semibold text-zinc-950"
            >
              {t(lang, 'sendToPool')}
            </button>
          </form>
        )}

        {brainDumpToast && (
          <div className="mt-2.5 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            ✓ {t(lang, 'brainDumpSaved')}
          </div>
        )}

        {/* Expandable Sub-tasks Toggle Pill (ALWAYS collapsed by default!) */}
        {subtasks.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setSubtasksOpen((v) => !v)}
              aria-expanded={subtasksOpen}
              className="flex w-full items-center justify-between rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-white/90 dark:hover:bg-zinc-800/70 transition"
            >
              <span className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-emerald-500" />
                <span>
                  {t(lang, 'subtasksTitle')} ({completedSubCount}/{subtasks.length})
                </span>
              </span>
              {subtasksOpen ? (
                <ChevronUp className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            {subtasksOpen && (
              <div className="mt-2 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 p-3 space-y-1.5 animate-fade-slide">
                <div className="space-y-1">
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs sm:text-sm hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50"
                    >
                      <label className="flex flex-1 items-center gap-2.5 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={() => toggleSubtask(activeTask.id, st.id)}
                          className="h-4 w-4 rounded accent-emerald-500 shrink-0"
                        />
                        <span
                          className={`truncate ${
                            st.completed
                              ? 'line-through text-zinc-400'
                              : 'text-zinc-800 dark:text-zinc-200 font-medium'
                          }`}
                        >
                          {st.title}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => deleteSubtask(activeTask.id, st.id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newSubtaskTitle.trim()) return;
                    addSubtask(activeTask.id, newSubtaskTitle);
                    setNewSubtaskTitle('');
                  }}
                  className="flex items-center gap-1.5 pt-1"
                >
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder={t(lang, 'subtasksAddPlaceholder')}
                    className="h-8 flex-1 min-w-0 rounded-lg bg-white/90 dark:bg-zinc-950/70 px-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <button
                    type="submit"
                    disabled={!newSubtaskTitle.trim()}
                    className="h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 px-3 text-xs font-semibold disabled:opacity-40"
                  >
                    +
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Playful Llama Life Bar: Emoji Me! | Color Me! | Random Task */}
        {settings.showFunToolbar && (
          <div
            ref={toolbarRef}
            className="mt-4 flex flex-wrap items-center justify-center gap-2 pt-1"
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setColorMenuOpen(false);
                  setEmojiMenuOpen((v) => !v);
                }}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
                  emojiMenuOpen
                    ? 'border-violet-500/60 bg-violet-500/15 text-violet-700 dark:text-violet-200'
                    : 'border-zinc-200/80 dark:border-zinc-700/70 bg-white/80 dark:bg-[#2b2e39] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#343846]'
                }`}
              >
                <span>😄</span>
                <span>{t(lang, 'emojiMe')}</span>
              </button>

              {emojiMenuOpen && (
                <div className="absolute left-0 top-10 z-50">
                  <EmojiMePopover
                    onClose={() => setEmojiMenuOpen(false)}
                    onOpenCustomModal={onOpenCustomEmojiModal}
                  />
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setEmojiMenuOpen(false);
                  setColorMenuOpen((v) => !v);
                }}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
                  colorMenuOpen
                    ? 'border-orange-400/60 bg-orange-500/15 text-orange-600 dark:text-orange-300'
                    : 'border-zinc-200/80 dark:border-zinc-700/70 bg-white/80 dark:bg-[#2b2e39] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#343846]'
                }`}
              >
                <span>🌈</span>
                <span>{t(lang, 'colorMe')}</span>
              </button>

              {colorMenuOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 top-10 z-50">
                  <ColorMePopover onClose={() => setColorMenuOpen(false)} />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={pickRandomTask}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/70 bg-white/80 dark:bg-[#2b2e39] px-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#343846] transition active:scale-95"
              title="Shortcut: R"
            >
              <span>🤞</span>
              <span>{t(lang, 'randomTask')}</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
