import React, { useEffect } from 'react';
import {
  Check,
  Maximize,
  Minimize2,
  Minus,
  Pause,
  Play,
  Plus,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { hexToRgba, normalizeHex } from '../lib/colors';
import { fireTaskCompleteConfetti } from '../lib/confetti';
import { formatTimer } from '../lib/formatters';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';
import type { Task } from '../types';

interface ZenModeOverlayProps {
  activeTask: Task | null;
}

export const ZenModeOverlay: React.FC<ZenModeOverlayProps> = ({ activeTask }) => {
  const zenModeOpen = useFocusStore((s) => s.zenModeOpen);
  const setZenModeOpen = useFocusStore((s) => s.setZenModeOpen);
  const theme = useFocusStore((s) => s.theme);
  const settings = useFocusStore((s) => s.settings);
  const isTimerRunning = useFocusStore((s) => s.isTimerRunning);
  const soundscape = useFocusStore((s) => s.soundscape);

  const toggleTimer = useFocusStore((s) => s.toggleTimer);
  const adjustTaskMinutes = useFocusStore((s) => s.adjustTaskMinutes);
  const completeTask = useFocusStore((s) => s.completeTask);
  const toggleSubtask = useFocusStore((s) => s.toggleSubtask);
  const setSoundscape = useFocusStore((s) => s.setSoundscape);

  useEffect(() => {
    if (!zenModeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZenModeOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zenModeOpen, setZenModeOpen]);

  if (!zenModeOpen) return null;

  const lang = settings.language;
  const isDark = theme === 'dark';
  const accentHex =
    (activeTask && normalizeHex(activeTask.color)) || settings.accentColor;
  const isOvertime = activeTask ? activeTask.remaining_seconds < 0 : false;
  const remainingClamped = activeTask ? Math.max(0, activeTask.remaining_seconds) : 0;
  const remainingFraction =
    activeTask && activeTask.duration_seconds > 0
      ? Math.max(0, Math.min(1, remainingClamped / activeTask.duration_seconds))
      : 0;

  const radius = 122;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = isOvertime ? 0 : circumference * (1 - remainingFraction);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore browser fullscreen restriction
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto p-5 sm:p-8 animate-fade-slide"
      style={{
        backgroundColor: isDark ? '#12141b' : '#f4f6fb',
        backgroundImage: `radial-gradient(680px circle at 50% 42%, ${hexToRgba(
          isOvertime ? '#f43f5e' : accentHex,
          isDark ? 0.24 : 0.16,
        )}, transparent 68%)`,
      }}
    >
      {/* Top Minimal Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300/60 dark:border-zinc-700/70 bg-white/70 dark:bg-zinc-900/70 px-3 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            🧘 {t(lang, 'zenMode')}
          </span>

          <button
            type="button"
            onClick={() => setSoundscape(soundscape === 'off' ? 'rain' : 'off')}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-300/60 dark:border-zinc-700/70 bg-white/70 dark:bg-zinc-900/70 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:opacity-90"
          >
            {soundscape === 'off' ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-emerald-500" />
            )}
            <span>{soundscape === 'off' ? t(lang, 'soundOff') : soundscape}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300/60 dark:border-zinc-700/70 bg-white/70 dark:bg-zinc-900/70 text-zinc-700 dark:text-zinc-200 hover:scale-105 transition"
            title="Fullscreen"
          >
            <Maximize className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setZenModeOpen(false)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-300/60 dark:border-zinc-700/70 bg-white/80 dark:bg-zinc-900/80 px-3.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:scale-105 transition"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            <span>{t(lang, 'exitZen')}</span>
          </button>
        </div>
      </div>

      {/* Center Breathing Focus Timer */}
      <div className="my-auto flex flex-col items-center justify-center py-6 text-center max-w-xl mx-auto w-full">
        {activeTask ? (
          <>
            <div className="text-4xl sm:text-5xl mb-2">{activeTask.emoji}</div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white px-4">
              {activeTask.title}
            </h1>

            {/* Breathing Circle Ring */}
            <div className="relative my-7 flex items-center justify-center">
              <div
                className={`absolute inset-4 rounded-full blur-2xl transition-opacity duration-1000 ${
                  isTimerRunning ? 'opacity-45 animate-pulse' : 'opacity-15'
                }`}
                style={{ backgroundColor: isOvertime ? '#f43f5e' : accentHex }}
              />

              <svg width={280} height={280} viewBox="0 0 280 280" className="-rotate-90 relative">
                <circle
                  cx={140}
                  cy={140}
                  r={radius}
                  fill="none"
                  stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
                  strokeWidth={10}
                />
                <circle
                  cx={140}
                  cy={140}
                  r={radius}
                  fill="none"
                  stroke={isOvertime ? '#f43f5e' : accentHex}
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-300"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div
                  className={`font-mono text-5xl sm:text-6xl font-bold tracking-tight tabular-nums ${
                    isOvertime
                      ? 'text-rose-500 animate-overtime-pulse'
                      : 'text-zinc-950 dark:text-white'
                  }`}
                >
                  {formatTimer(activeTask.remaining_seconds)}
                </div>
                <span className="mt-2 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  {isOvertime
                    ? t(lang, 'overtime')
                    : isTimerRunning
                      ? t(lang, 'running')
                      : t(lang, 'pause')}
                </span>
              </div>
            </div>

            {/* Zen Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => adjustTaskMinutes(activeTask.id, -5)}
                className="inline-flex h-11 items-center gap-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 px-4 text-xs font-semibold"
              >
                <Minus className="h-3.5 w-3.5" />
                5{lang === 'tr' ? 'dk' : 'm'}
              </button>

              <button
                type="button"
                onClick={toggleTimer}
                style={isTimerRunning ? undefined : { backgroundColor: accentHex }}
                className={`inline-flex h-12 min-w-[150px] items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold shadow-lg transition active:scale-95 ${
                  isTimerRunning
                    ? 'bg-amber-500 text-zinc-950'
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
                className="inline-flex h-11 items-center gap-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 px-4 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                5{lang === 'tr' ? 'dk' : 'm'}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  if (settings.confettiOnComplete) fireTaskCompleteConfetti(e.currentTarget);
                  completeTask(activeTask.id);
                }}
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 px-5 text-xs font-semibold text-white shadow-md transition"
              >
                <Check className="h-4 w-4" />
                <span>{t(lang, 'complete')}</span>
              </button>
            </div>

            {/* Interactive Micro-Checklist in Zen Mode */}
            {activeTask.subtasks && activeTask.subtasks.length > 0 && (
              <div className="mt-7 w-full max-w-sm rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3.5 text-left space-y-1.5">
                {activeTask.subtasks.map((st) => (
                  <label
                    key={st.id}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1 text-xs cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60"
                  >
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => toggleSubtask(activeTask.id, st.id)}
                      className="h-3.5 w-3.5 rounded accent-emerald-500"
                    />
                    <span
                      className={
                        st.completed
                          ? 'line-through text-zinc-400'
                          : 'text-zinc-800 dark:text-zinc-200 font-medium'
                      }
                    >
                      {st.title}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
              {t(lang, 'emptyTitle')}
            </p>
            <button
              type="button"
              onClick={() => setZenModeOpen(false)}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900"
            >
              <X className="h-3.5 w-3.5" />
              {t(lang, 'exitZen')}
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-zinc-400 dark:text-zinc-500">
        Space: {t(lang, 'start')} / {t(lang, 'pause')} • Esc: {t(lang, 'exitZen')}
      </div>
    </div>
  );
};
