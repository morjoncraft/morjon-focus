import React, { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowUpToLine,
  CalendarClock,
  Check,
  GripVertical,
  Inbox,
  ListChecks,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Trash2,
  Wand2,
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
  const addSubtask = useFocusStore((s) => s.addSubtask);
  const toggleSubtask = useFocusStore((s) => s.toggleSubtask);
  const deleteSubtask = useFocusStore((s) => s.deleteSubtask);
  const breakDownTask = useFocusStore((s) => s.breakDownTask);

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
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  const [newStepText, setNewStepText] = useState('');

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
        setBreakdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [pickerOpen, moreMenuOpen]);

  const lang = settings.language;
  const isDark = theme === 'dark';
  const isCompact = settings.cardDensity === 'compact';
  const isSimplified = settings.layoutMode === 'simplified';

  const resolvedColor = resolveTaskCardStyle(task.color, isDark, settings.cardVariant);
  const isOvertime = task.remaining_seconds < 0;
  const subtasks = task.subtasks ?? [];
  const completedSubCount = subtasks.filter((st) => st.completed).length;
  const isLongTask = task.remaining_seconds >= 40 * 60;

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

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepText.trim()) return;
    addSubtask(task.id, newStepText);
    setNewStepText('');
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border px-3 sm:px-4 ${
        isCompact ? 'py-2' : 'py-3'
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

      {/* Primary Row */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Drag Handle (DnD list reorder) */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="ml-1 flex h-8 w-5 shrink-0 cursor-grab active:cursor-grabbing items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 touch-none"
          title={t(lang, 'dragToReorder')}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Emoji & Color Picker Trigger (also draggable onto Timeline in Split View!) */}
        <div
          className="relative shrink-0"
          ref={pickerRef}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/morjon-task-id', task.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
        >
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

        {/* Title, Time Range, Subtask Badge & Scheduled Slot */}
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
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100">
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
                  {task.scheduled_start && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-sky-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                      <CalendarClock className="h-2.5 w-2.5" />
                      {task.scheduled_start}
                    </span>
                  )}
                </div>
              </button>

              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                {settings.showStartEndTime && !isCompact && (
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    {formatTimeRange(startMs, endMs, settings.use24HourTime)}
                  </span>
                )}

                {subtasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSubtasksExpanded((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-md bg-zinc-200/70 dark:bg-zinc-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300/80 dark:hover:bg-zinc-800"
                  >
                    <ListChecks className="h-3 w-3 text-emerald-500" />
                    <span>
                      {completedSubCount}/{subtasks.length}
                    </span>
                  </button>
                )}
              </div>
            </div>
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
              className={`rounded-lg px-2.5 py-1 font-mono text-xs sm:text-sm font-semibold tabular-nums transition ${
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
        <div className="flex items-center gap-1 shrink-0">
          {!isSimplified && (
            <>
              <button
                type="button"
                onClick={() => setSubtasksExpanded((v) => !v)}
                className={`hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  subtasksExpanded || subtasks.length > 0
                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-white/80 dark:hover:bg-zinc-800'
                    : 'text-zinc-400 hover:bg-white/80 hover:text-zinc-700 dark:hover:bg-zinc-800 opacity-70 group-hover:opacity-100'
                }`}
                title={t(lang, 'subtasksTitle')}
              >
                <ListChecks className="h-4 w-4" />
              </button>

              {!isTopTask && (
                <button
                  type="button"
                  onClick={() => promoteTaskToTop(task.id)}
                  className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/80 hover:text-violet-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-violet-400 transition opacity-80 group-hover:opacity-100"
                  title={t(lang, 'moveToTop')}
                >
                  <ArrowUpToLine className="h-4 w-4" />
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={handleComplete}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white transition"
            title={t(lang, 'complete')}
          >
            <Check className="h-4 w-4" />
          </button>

          {!isSimplified && (
            <>
              <button
                type="button"
                onClick={() => resetTaskTimer(task.id)}
                className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition"
                title={t(lang, 'reset')}
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              {settings.showDeleteButtonOnCard ? (
                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-rose-500/15 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 transition"
                  title={t(lang, 'deleteTask')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => moveToNotNow(task.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/80 hover:text-amber-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-amber-300 transition"
                  title={t(lang, 'notNowShort')}
                >
                  <Inbox className="h-4 w-4" />
                </button>
              )}
            </>
          )}

          {/* Overflow menu (includes Subtasks toggle, Smart Breakdown, Move to Top, Reset, Not-Now & Delete) */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => {
                setMoreMenuOpen((v) => !v);
                setBreakdownOpen(false);
              }}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
                isLongTask
                  ? 'text-violet-500 hover:bg-violet-500/15'
                  : 'text-zinc-400 hover:bg-white/80 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
              }`}
              title={t(lang, 'moreActions')}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 top-9 z-40 w-48 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1 shadow-xl text-xs animate-fade-slide">
                <button
                  type="button"
                  onClick={() => {
                    setSubtasksExpanded((v) => !v);
                    setMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <ListChecks className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{t(lang, 'subtasksTitle')}</span>
                </button>

                {task.remaining_seconds >= 20 * 60 && (
                  <button
                    type="button"
                    onClick={() => setBreakdownOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-violet-600 dark:text-violet-300 hover:bg-violet-500/10 font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Wand2 className="h-3.5 w-3.5" />
                      <span>{t(lang, 'breakDownBtn')}</span>
                    </span>
                  </button>
                )}

                {breakdownOpen && (
                  <div className="mx-1 my-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 p-1.5 space-y-1">
                    <div className="px-1 text-[10px] font-semibold text-zinc-500">
                      {t(lang, 'breakDownSubtitle')}
                    </div>
                    {[
                      { mins: 20, label: t(lang, 'chunkSize20') },
                      { mins: 30, label: t(lang, 'chunkSize30') },
                      { mins: 45, label: t(lang, 'chunkSize45') },
                    ].map((opt) => (
                      <button
                        key={opt.mins}
                        type="button"
                        onClick={() => {
                          breakDownTask(task.id, opt.mins);
                          setMoreMenuOpen(false);
                          setBreakdownOpen(false);
                        }}
                        className="w-full rounded-md bg-white dark:bg-zinc-900 px-2 py-1 text-left text-[11px] font-medium hover:bg-violet-600 hover:text-white transition"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Micro-Checklist (Sub-tasks) */}
      {subtasksExpanded && (
        <div className="mt-2.5 ml-7 border-t border-zinc-200/70 dark:border-zinc-700/60 pt-2 space-y-1.5 animate-fade-slide">
          {subtasks.map((st) => (
            <div
              key={st.id}
              className="group/sub flex items-center justify-between gap-2 rounded-lg px-1.5 py-0.5 text-xs hover:bg-white/60 dark:hover:bg-zinc-900/50"
            >
              <label className="flex flex-1 items-center gap-2 min-w-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={st.completed}
                  onChange={() => toggleSubtask(task.id, st.id)}
                  className="h-3.5 w-3.5 rounded accent-emerald-500 shrink-0"
                />
                <span
                  className={`truncate ${
                    st.completed
                      ? 'line-through text-zinc-400'
                      : 'text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  {st.title}
                </span>
              </label>
              <button
                type="button"
                onClick={() => deleteSubtask(task.id, st.id)}
                className="opacity-0 group-hover/sub:opacity-100 text-zinc-400 hover:text-rose-500"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          <form onSubmit={handleAddSubtask} className="flex items-center gap-1.5 pt-0.5">
            <input
              type="text"
              value={newStepText}
              onChange={(e) => setNewStepText(e.target.value)}
              placeholder={t(lang, 'subtasksAddPlaceholder')}
              className="h-7 flex-1 min-w-0 rounded-lg bg-white/80 dark:bg-zinc-900/75 px-2.5 text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              type="submit"
              disabled={!newStepText.trim()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900/10 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
