import React, { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowUpToLine,
  Check,
  GripVertical,
  Inbox,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { resolveTaskCardStyle } from '../lib/colors';
import { fireTaskCompleteConfetti } from '../lib/confetti';
import { formatTimeRange, formatTimer } from '../lib/formatters';
import { t } from '../lib/i18n';
import { suggestEmojiForTitle } from '../lib/parseTaskInput';
import { useFocusStore } from '../store/useFocusStore';
import type { Task } from '../types';
import { EmojiColorPicker } from './EmojiColorPicker';

interface TaskCardProps {
  task: Task;
  isTopTask: boolean;
  startMs: number;
  endMs: number;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isTopTask,
  startMs,
  endMs,
}) => {
  const theme = useFocusStore((s) => s.theme);
  const settings = useFocusStore((s) => s.settings);
  const isTimerRunning = useFocusStore((s) => s.isTimerRunning);
  const updateTask = useFocusStore((s) => s.updateTask);
  const completeTask = useFocusStore((s) => s.completeTask);
  const resetTaskTimer = useFocusStore((s) => s.resetTaskTimer);
  const moveToNotNow = useFocusStore((s) => s.moveToNotNow);
  const deleteTask = useFocusStore((s) => s.deleteTask);
  const promoteTaskToTop = useFocusStore((s) => s.promoteTaskToTop);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [isEditingMinutes, setIsEditingMinutes] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState(
    String(Math.max(1, Math.round(task.remaining_seconds / 60))),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const pickerRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    if (!pickerOpen && !moreMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [pickerOpen, moreMenuOpen]);

  const lang = settings.language;
  const isDark = theme === 'dark';
  const isCompact = settings.cardDensity === 'compact';

  const resolvedColor = resolveTaskCardStyle(task.color, isDark, settings.cardVariant);
  const isOvertime = task.remaining_seconds < 0;

  const cornerClass =
    settings.cornerStyle === 'pill'
      ? 'rounded-3xl'
      : settings.cornerStyle === 'sharp'
        ? 'rounded-lg'
        : 'rounded-2xl';

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...resolvedColor.style,
    ...(isTopTask
      ? {
          boxShadow: `0 0 0 2px ${resolvedColor.isNeutral ? settings.accentColor : resolvedColor.accentHex}70`,
        }
      : {}),
  };

  const commitTitle = () => {
    setIsEditingTitle(false);
    const cleaned = draftTitle.trim();
    if (cleaned && cleaned !== task.title) {
      updateTask(task.id, { title: cleaned });
    } else {
      setDraftTitle(task.title);
    }
  };

  const commitMinutes = () => {
    setIsEditingMinutes(false);
    const mins = Number.parseInt(draftMinutes, 10);
    if (Number.isFinite(mins) && mins >= 1 && mins <= 720) {
      const secs = mins * 60;
      updateTask(task.id, {
        duration_seconds: secs,
        remaining_seconds: secs,
      });
    } else {
      setDraftMinutes(String(Math.max(1, Math.round(task.remaining_seconds / 60))));
    }
  };

  const handleComplete = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (settings.confettiOnComplete) {
      fireTaskCompleteConfetti(e.currentTarget);
    }
    completeTask(task.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-2 sm:gap-3 border px-2.5 sm:px-3.5 ${
        isCompact ? 'py-1.5' : 'py-2.5'
      } transition-shadow ${cornerClass} ${
        resolvedColor.isNeutral
          ? 'bg-white/95 dark:bg-zinc-800/75 border-zinc-200/90 dark:border-zinc-700/70'
          : ''
      } ${isDragging ? 'z-30 opacity-85 shadow-2xl scale-[1.01]' : 'shadow-sm hover:shadow'}`}
    >
      {/* Left accent stripe */}
      <div
        className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${
          isTopTask && isTimerRunning ? 'animate-pulse' : ''
        }`}
        style={{
          backgroundColor:
            isTopTask && isTimerRunning ? '#10b981' : resolvedColor.accentHex,
        }}
      />

      {/* Drag Handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="ml-1 flex h-8 w-5 shrink-0 cursor-grab active:cursor-grabbing items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 touch-none"
        title={t(lang, 'dragToReorder')}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Emoji & Color Picker Trigger */}
      <div className="relative shrink-0" ref={pickerRef}>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className={`flex ${
            isCompact ? 'h-8 w-8 text-base' : 'h-9 w-9 text-lg'
          } items-center justify-center rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-700/60 hover:scale-105 transition`}
        >
          {task.emoji}
        </button>

        {pickerOpen && (
          <EmojiColorPicker
            selectedEmoji={task.emoji}
            selectedColor={task.color}
            onSelectEmoji={(em) => updateTask(task.id, { emoji: em })}
            onSelectColor={(col) => updateTask(task.id, { color: col })}
            onAutoEmoji={() =>
              updateTask(task.id, { emoji: suggestEmojiForTitle(task.title) })
            }
          />
        )}
      </div>

      {/* Title & Optional Start–End Time */}
      <div className="flex-1 min-w-0">
        {isEditingTitle ? (
          <input
            type="text"
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
              if (e.key === 'Escape') {
                setDraftTitle(task.title);
                setIsEditingTitle(false);
              }
            }}
            className="w-full rounded-lg bg-white dark:bg-zinc-950 px-2 py-1 text-sm font-medium text-zinc-900 dark:text-zinc-100 ring-2 ring-violet-500 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingTitle(true)}
            className="w-full text-left"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {task.title}
              </span>
              {isTopTask && (
                <span
                  className="hidden sm:inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: `${settings.accentColor}28`,
                    color: isDark ? '#f4f4f5' : '#18181b',
                  }}
                >
                  {t(lang, 'activeBadge')}
                </span>
              )}
            </div>
            {settings.showStartEndTime && !isCompact && (
              <div className="mt-0.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                {formatTimeRange(startMs, endMs, settings.use24HourTime)}
              </div>
            )}
          </button>
        )}
      </div>

      {/* Remaining Duration */}
      <div className="shrink-0">
        {isEditingMinutes ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={720}
              autoFocus
              value={draftMinutes}
              onChange={(e) => setDraftMinutes(e.target.value)}
              onBlur={commitMinutes}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitMinutes();
                if (e.key === 'Escape') setIsEditingMinutes(false);
              }}
              className="w-14 rounded-lg bg-white dark:bg-zinc-950 px-1.5 py-1 text-right font-mono text-xs font-semibold ring-2 ring-violet-500 focus:outline-none"
            />
            <span className="text-[11px] text-zinc-500">m</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraftMinutes(String(Math.max(1, Math.round(task.remaining_seconds / 60))));
              setIsEditingMinutes(true);
            }}
            className={`rounded-lg px-2 py-1 font-mono text-xs font-semibold tabular-nums transition ${
              isOvertime
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                : 'bg-white/75 dark:bg-zinc-900/70 text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800'
            }`}
          >
            {formatTimer(task.remaining_seconds)}
          </button>
        )}
      </div>

      {/* Card Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        {!isTopTask && (
          <button
            type="button"
            onClick={() => promoteTaskToTop(task.id)}
            className="hidden sm:inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/80 hover:text-violet-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-violet-400 transition opacity-80 group-hover:opacity-100"
            title={t(lang, 'moveToTop')}
          >
            <ArrowUpToLine className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={handleComplete}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white transition"
          title={t(lang, 'complete')}
        >
          <Check className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => resetTaskTimer(task.id)}
          className="hidden sm:inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition"
          title={t(lang, 'reset')}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        {/* Per Screenshot 5 setting: either show Delete directly & move Not-Now into menu, or vice versa */}
        {settings.showDeleteButtonOnCard ? (
          <button
            type="button"
            onClick={() => deleteTask(task.id)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-rose-500/15 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 transition"
            title={t(lang, 'deleteTask')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => moveToNotNow(task.id)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/80 hover:text-amber-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-amber-300 transition"
            title={t(lang, 'notNowShort')}
          >
            <Inbox className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Overflow menu for secondary actions */}
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreMenuOpen((v) => !v)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/80 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
            title={t(lang, 'moreActions')}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          {moreMenuOpen && (
            <div className="absolute right-0 top-8 z-40 w-40 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1 shadow-xl text-xs animate-fade-slide">
              {!isTopTask && (
                <button
                  type="button"
                  onClick={() => {
                    promoteTaskToTop(task.id);
                    setMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <ArrowUpToLine className="h-3.5 w-3.5" />
                  <span>{t(lang, 'moveToTop')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  resetTaskTimer(task.id);
                  setMoreMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{t(lang, 'reset')}</span>
              </button>

              {settings.showDeleteButtonOnCard ? (
                <button
                  type="button"
                  onClick={() => {
                    moveToNotNow(task.id);
                    setMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-amber-600 dark:text-amber-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Inbox className="h-3.5 w-3.5" />
                  <span>{t(lang, 'notNowShort')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    deleteTask(task.id);
                    setMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{t(lang, 'deleteTask')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
