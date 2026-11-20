import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Check, Plus, X } from 'lucide-react';
import { hexToRgba, normalizeHex, resolveTaskCardStyle } from '../lib/colors';
import { fireTaskCompleteConfetti } from '../lib/confetti';
import { formatClockTime, formatDurationBadge } from '../lib/formatters';
import { t } from '../lib/i18n';
import { parseTaskInput } from '../lib/parseTaskInput';
import { useFocusStore } from '../store/useFocusStore';
import type { Task } from '../types';

interface TimelineViewProps {
  tasks: Task[];
  nowMs: number;
  compactHeader?: boolean;
}

const START_HOUR = 6;
const END_HOUR = 23;
const SLOT_HEIGHT_PX = 34; // each 30-min slot = 34px (1 hour = 68px)

const TIME_SLOTS: string[] = [];
for (let h = START_HOUR; h <= END_HOUR; h++) {
  const hh = String(h).padStart(2, '0');
  TIME_SLOTS.push(`${hh}:00`);
  TIME_SLOTS.push(`${hh}:30`);
}

function parseSlotMinutes(hhmm: string): number | null {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr, 10);
  const m = Number.parseInt(mStr, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function formatSlotLabel(hhmm: string, use24Hour: boolean): string {
  const mins = parseSlotMinutes(hhmm);
  if (mins === null) return hhmm;
  const d = new Date();
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return formatClockTime(d.getTime(), use24Hour);
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  tasks,
  nowMs,
  compactHeader = false,
}) => {
  const theme = useFocusStore((s) => s.theme);
  const settings = useFocusStore((s) => s.settings);
  const scheduleTaskAt = useFocusStore((s) => s.scheduleTaskAt);
  const addTask = useFocusStore((s) => s.addTask);
  const completeTask = useFocusStore((s) => s.completeTask);

  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [quickSlot, setQuickSlot] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const lang = settings.language;
  const isDark = theme === 'dark';

  const scheduledTasks = useMemo(
    () => tasks.filter((item) => Boolean(item.scheduled_start)),
    [tasks],
  );
  const unscheduledTasks = useMemo(
    () => tasks.filter((item) => !item.scheduled_start),
    [tasks],
  );

  // Current time indicator offset
  const nowDate = new Date(nowMs);
  const nowTotalMins = nowDate.getHours() * 60 + nowDate.getMinutes();
  const minGridMins = START_HOUR * 60;
  const maxGridMins = (END_HOUR + 1) * 60;
  const nowOffsetPx =
    nowTotalMins >= minGridMins && nowTotalMins <= maxGridMins
      ? ((nowTotalMins - minGridMins) / 30) * SLOT_HEIGHT_PX
      : null;

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const targetPx = Math.max(0, (nowOffsetPx ?? 180) - 120);
    container.scrollTop = targetPx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDropOnSlot = (e: React.DragEvent, slot: string) => {
    e.preventDefault();
    setDragOverSlot(null);
    const taskId = e.dataTransfer.getData('text/morjon-task-id');
    if (taskId) {
      scheduleTaskAt(taskId, slot);
    }
  };

  const handleQuickAddAtSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSlot || !quickTitle.trim()) return;
    const parsed = parseTaskInput(
      quickTitle,
      settings.defaultTaskMinutes,
      settings.smartTimeDetection,
    );
    const newId = addTask({
      title: parsed.title,
      durationSeconds: parsed.durationSeconds,
      emoji: parsed.suggestedEmoji,
      color: settings.accentColor,
      status: 'todo',
    });
    scheduleTaskAt(newId, quickSlot);
    setQuickTitle('');
    setQuickSlot(null);
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/85 shadow-sm overflow-hidden flex flex-col">
      {/* Timeline Header */}
      <div className="border-b border-zinc-200/80 dark:border-zinc-800 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: settings.accentColor }}
          >
            <CalendarClock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {t(lang, 'timelineTitle')}
            </h3>
            {!compactHeader && (
              <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                {t(lang, 'timelineDesc')}
              </p>
            )}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
          {scheduledTasks.length} / {tasks.length}
        </span>
      </div>

      {/* Draggable Unscheduled Pool Chips */}
      {unscheduledTasks.length > 0 && (
        <div className="border-b border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/35 px-3 py-2">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            {t(lang, 'unscheduledPool')} ({unscheduledTasks.length})
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {unscheduledTasks.map((task) => {
              const resolved = resolveTaskCardStyle(task.color, isDark, 'tinted');
              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/morjon-task-id', task.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  style={resolved.style}
                  className="inline-flex shrink-0 cursor-grab active:cursor-grabbing items-center gap-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/70 bg-white dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium shadow-sm hover:scale-[1.02] transition"
                >
                  <span>{task.emoji}</span>
                  <span className="max-w-[140px] truncate">{task.title}</span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {formatDurationBadge(task.remaining_seconds, lang)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hourly Grid */}
      <div
        ref={scrollContainerRef}
        className="relative max-h-[540px] overflow-y-auto px-2 py-2"
      >
        <div
          className="relative"
          style={{ height: `${TIME_SLOTS.length * SLOT_HEIGHT_PX}px` }}
        >
          {/* Grid Rows */}
          {TIME_SLOTS.map((slot, idx) => {
            const isHourMark = slot.endsWith(':00');
            const isDragTarget = dragOverSlot === slot;
            return (
              <div
                key={slot}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverSlot !== slot) setDragOverSlot(slot);
                }}
                onDragLeave={() => {
                  if (dragOverSlot === slot) setDragOverSlot(null);
                }}
                onDrop={(e) => handleDropOnSlot(e, slot)}
                style={{ top: `${idx * SLOT_HEIGHT_PX}px`, height: `${SLOT_HEIGHT_PX}px` }}
                className={`group absolute left-0 right-0 flex items-center border-t ${
                  isHourMark
                    ? 'border-zinc-200 dark:border-zinc-800'
                    : 'border-dashed border-zinc-100 dark:border-zinc-800/50'
                } ${
                  isDragTarget
                    ? 'bg-violet-500/15 ring-1 ring-inset ring-violet-500/60'
                    : ''
                }`}
              >
                <span className="w-14 shrink-0 pr-2 text-right font-mono text-[10px] text-zinc-400 dark:text-zinc-500 select-none">
                  {isHourMark ? formatSlotLabel(slot, settings.use24HourTime) : ''}
                </span>

                <div className="flex-1 h-full flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {unscheduledTasks[0] && (
                    <button
                      type="button"
                      onClick={() => scheduleTaskAt(unscheduledTasks[0].id, slot)}
                      className="mr-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-violet-500/15 hover:text-violet-600 dark:hover:text-violet-300"
                    >
                      {unscheduledTasks[0].emoji} {t(lang, 'assignTopHere')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setQuickSlot(slot);
                      setQuickTitle('');
                    }}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    title={t(lang, 'add')}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Inline quick-add bar at clicked hour slot */}
          {quickSlot && (
            <div
              style={{
                top: `${
                  (((parseSlotMinutes(quickSlot) ?? minGridMins) - minGridMins) / 30) *
                  SLOT_HEIGHT_PX
                }px`,
              }}
              className="absolute left-14 right-2 z-30 rounded-xl border border-violet-500 bg-white dark:bg-zinc-900 p-1.5 shadow-xl"
            >
              <form onSubmit={handleQuickAddAtSlot} className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold text-violet-500 px-1">
                  {quickSlot}
                </span>
                <input
                  type="text"
                  autoFocus
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder={t(lang, 'quickAddPlaceholder')}
                  className="h-7 flex-1 min-w-0 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  style={{ backgroundColor: settings.accentColor }}
                  className="h-7 rounded-lg px-2.5 text-[11px] font-semibold text-white"
                >
                  {t(lang, 'add')}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSlot(null)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Live Current Time Line */}
          {nowOffsetPx !== null && (
            <div
              style={{ top: `${nowOffsetPx}px` }}
              className="pointer-events-none absolute left-12 right-0 z-20 flex items-center"
            >
              <span className="h-2.5 w-2.5 -ml-1 rounded-full bg-rose-500 shadow" />
              <div className="h-[1.5px] flex-1 bg-rose-500/80" />
            </div>
          )}

          {/* Scheduled Task Time-Blocks */}
          {scheduledTasks.map((task) => {
            if (!task.scheduled_start) return null;
            const startMins = parseSlotMinutes(task.scheduled_start);
            if (startMins === null) return null;

            const topPx = Math.max(0, ((startMins - minGridMins) / 30) * SLOT_HEIGHT_PX);
            const durationMins = Math.max(15, Math.round(task.remaining_seconds / 60));
            const heightPx = Math.max(28, (durationMins / 30) * SLOT_HEIGHT_PX - 2);
            const hex = normalizeHex(task.color) ?? settings.accentColor;

            const startDate = new Date();
            startDate.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);
            const endDate = new Date(startDate.getTime() + durationMins * 60000);

            return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/morjon-task-id', task.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                style={{
                  top: `${topPx + 1}px`,
                  height: `${heightPx}px`,
                  backgroundColor: hexToRgba(hex, isDark ? 0.28 : 0.18),
                  borderColor: hexToRgba(hex, isDark ? 0.65 : 0.55),
                }}
                className="group absolute left-14 right-2 z-10 flex items-start justify-between gap-2 rounded-xl border-l-4 border px-2.5 py-1 cursor-grab active:cursor-grabbing shadow-sm overflow-hidden"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm shrink-0">{task.emoji}</span>
                    <span className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                      {task.title}
                    </span>
                  </div>
                  {heightPx >= 42 && (
                    <div className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
                      {formatClockTime(startDate.getTime(), settings.use24HourTime)} –{' '}
                      {formatClockTime(endDate.getTime(), settings.use24HourTime)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      if (settings.confettiOnComplete) fireTaskCompleteConfetti(e.currentTarget);
                      completeTask(task.id);
                    }}
                    className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white transition"
                    title={t(lang, 'complete')}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scheduleTaskAt(task.id, null)}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
                    title="Unschedule"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
