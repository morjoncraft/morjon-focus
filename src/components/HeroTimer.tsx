import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Inbox,
  Maximize2,
  Minus,
  Pause,
  PictureInPicture2,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { hexToRgba, normalizeHex } from '../lib/colors';
import { fireTaskCompleteConfetti } from '../lib/confetti';
import { formatDurationBadge, formatTimer } from '../lib/formatters';
import { t } from '../lib/i18n';
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

  const toggleTimer = useFocusStore((s) => s.toggleTimer);
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
  const addSubtask = useFocusStore((s) => s.addSubtask);
  const toggleSubtask = useFocusStore((s) => s.toggleSubtask);
  const deleteSubtask = useFocusStore((s) => s.deleteSubtask);

  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const toolbarRef = useRef<HTMLDivElement | null>(null);

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

  if (!activeTask) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700/80 bg-white/75 dark:bg-zinc-900/55 p-6 sm:p-8 text-center">
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: hexToRgba(settings.accentColor, 0.16),
            color: settings.accentColor,
          }}
        >
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {t(lang, 'emptyTitle')}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          {t(lang, 'emptyDesc')}
        </p>
        {onQuickApplyPreset && (
          <button
            type="button"
            onClick={onQuickApplyPreset}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition"
            style={{ backgroundColor: settings.accentColor }}
          >
            <Sparkles className="h-3.5 w-3.5" />
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

  // Pie Timer uses a 60-minute analog clock wedge when <= 60 min (Llama Life behavior),
  // falling back smoothly to task fraction if > 60 min
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

  // Circle ring SVG metrics
  const circleRadius = 74;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleDashOffset = isOvertime
    ? 0
    : circleCircumference * (1 - remainingFraction);

  // Pie wedge SVG geometry
  const renderPieVisual = () => {
    const size = 166;
    const cx = size / 2;
    const cy = size / 2;
    const r = 72;
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
          {/* Outer subtle track */}
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
          {/* Inner glossy center pill for readability */}
          <circle
            cx={cx}
            cy={cy}
            r={44}
            fill={isDark ? 'rgba(24,26,32,0.88)' : 'rgba(255,255,255,0.92)'}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-mono text-2xl font-bold tracking-tight tabular-nums ${
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
    const size = 176;
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
            strokeWidth={9}
          />
          <circle
            cx={cx}
            cy={cy}
            r={circleRadius}
            fill="none"
            stroke={strokeHex}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={circleCircumference}
            strokeDashoffset={circleDashOffset}
            className={`transition-all duration-300 ${isOvertime ? 'animate-overtime-pulse' : ''}`}
          />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3">
          <span className="text-2xl mb-0.5">{activeTask.emoji}</span>
          <span
            className={`font-mono text-3xl font-bold tracking-tight tabular-nums ${
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
      <div className="p-4 sm:p-6">
        {/* Active task label + status pill */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl text-xl sm:text-2xl shadow-inner"
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-300 animate-overtime-pulse">
                    {t(lang, 'overtime')}
                  </span>
                ) : isTimerRunning ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t(lang, 'running')}
                  </span>
                ) : null}
              </div>
              <h1 className="truncate text-base sm:text-xl font-bold text-zinc-900 dark:text-zinc-50">
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

            <button
              type="button"
              onClick={() =>
                updateSettings({ pomodoroAutoBreak: !settings.pomodoroAutoBreak })
              }
              className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition ${
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
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200/80 dark:border-zinc-700/70 bg-white/75 dark:bg-zinc-800/75 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition"
              title={t(lang, 'miniPip')}
            >
              <PictureInPicture2 className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setZenModeOpen(true)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200/80 dark:border-zinc-700/70 bg-white/75 dark:bg-zinc-800/75 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition"
              title={`${t(lang, 'zenMode')} (Z)`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

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
        <div className="my-4 sm:my-5 flex flex-col items-center justify-center">
          {settings.timerStyle === 'pie' && renderPieVisual()}

          {settings.timerStyle === 'circle' && renderCircleVisual()}

          {settings.timerStyle === 'digital' && (
            <div
              className="rounded-2xl border px-7 py-4 shadow-inner"
              style={{
                borderColor: hexToRgba(ringHex, 0.35),
                backgroundColor: isDark ? 'rgba(15,17,22,0.55)' : 'rgba(255,255,255,0.75)',
              }}
            >
              <div
                className={`font-mono text-5xl sm:text-6xl font-bold tracking-tight tabular-nums select-none ${
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
              className={`font-mono text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight tabular-nums select-none ${
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
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-rose-400/50 bg-rose-500/15 px-3.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-200 hover:bg-rose-500/25 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              {t(lang, 'addOvertime')} ({formatTimer(overtimeSeconds)})
            </button>
          )}
        </div>

        {/* Primary Timer Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => adjustTaskMinutes(activeTask.id, -5)}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-800/80 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          >
            <Minus className="h-3.5 w-3.5" />
            <span>5{lang === 'tr' ? 'dk' : 'm'}</span>
          </button>

          <button
            type="button"
            onClick={toggleTimer}
            style={
              isTimerRunning
                ? undefined
                : { backgroundColor: ringHex }
            }
            className={`inline-flex h-11 min-w-[132px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-sm transition active:scale-[0.98] ${
              isTimerRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                : 'text-white hover:brightness-110'
            }`}
          >
            {isTimerRunning ? (
              <>
                <Pause className="h-4 w-4 fill-current" />
                <span>{t(lang, 'pause')}</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>{t(lang, 'start')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => adjustTaskMinutes(activeTask.id, 5)}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-800/80 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>5{lang === 'tr' ? 'dk' : 'm'}</span>
          </button>
        </div>

        {/* Secondary Task Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-zinc-200/70 dark:border-zinc-800/80 pt-3.5">
          <button
            type="button"
            onClick={handleComplete}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 text-xs font-semibold text-white shadow-sm transition active:scale-95"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{t(lang, 'complete')}</span>
          </button>

          <button
            type="button"
            onClick={() => resetTaskTimer(activeTask.id)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-800/70 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t(lang, 'reset')}</span>
          </button>

          <button
            type="button"
            onClick={() => moveToNotNow(activeTask.id)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-800/70 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>{t(lang, 'notNowShort')}</span>
          </button>

          {activeTask.is_break && (
            <button
              type="button"
              onClick={() => deleteTask(activeTask.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-300/60 dark:border-rose-700/60 bg-rose-500/10 px-3 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 transition"
            >
              <span>{t(lang, 'skipBreak')}</span>
            </button>
          )}
        </div>

        {/* Active Task Interactive Micro-Checklist (Sub-tasks) */}
        {(activeTask.subtasks?.length ?? 0) > 0 && (
          <div className="mt-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/50 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              <span>
                {t(lang, 'subtasksTitle')} (
                {activeTask.subtasks!.filter((st) => st.completed).length}/
                {activeTask.subtasks!.length})
              </span>
            </div>
            <div className="space-y-1">
              {activeTask.subtasks!.map((st) => (
                <div
                  key={st.id}
                  className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50"
                >
                  <label className="flex flex-1 items-center gap-2 min-w-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => toggleSubtask(activeTask.id, st.id)}
                      className="h-3.5 w-3.5 rounded accent-emerald-500 shrink-0"
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
                    <Trash2 className="h-3 w-3" />
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
                className="h-7 flex-1 min-w-0 rounded-lg bg-white/90 dark:bg-zinc-950/70 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="submit"
                disabled={!newSubtaskTitle.trim()}
                className="h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 px-2.5 text-[11px] font-semibold disabled:opacity-40"
              >
                +
              </button>
            </form>
          </div>
        )}

        {/* Playful Llama Life Bar: Emoji Me! | Color Me! | Random Task */}
        {settings.showFunToolbar && (
          <div
            ref={toolbarRef}
            className="mt-3.5 flex flex-wrap items-center justify-center gap-2 pt-1"
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setColorMenuOpen(false);
                  setEmojiMenuOpen((v) => !v);
                }}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
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
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
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
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/70 bg-white/80 dark:bg-[#2b2e39] px-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#343846] transition active:scale-95"
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
