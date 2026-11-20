import React, { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Eye, EyeOff } from 'lucide-react';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';
import type { Task } from '../types';
import { TaskCard } from './TaskCard';

interface TaskListViewProps {
  tasks: Task[];
  nowMs: number;
}

export const TaskListView: React.FC<TaskListViewProps> = ({ tasks, nowMs }) => {
  const settings = useFocusStore((s) => s.settings);
  const isTimerRunning = useFocusStore((s) => s.isTimerRunning);
  const reorderActiveTasks = useFocusStore((s) => s.reorderActiveTasks);

  const [manualOverride, setManualOverride] = useState<boolean | null>(null);

  const lang = settings.language;
  const autoHide = settings.hideQueueWhileFocusing && isTimerRunning;
  const isCollapsed = manualOverride !== null ? manualOverride : autoHide;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Compute cascading start and end timestamps across the ordered list
  const timeSlots = useMemo(() => {
    let cursorMs = nowMs;
    return tasks.map((task) => {
      const startMs = cursorMs;
      const durMs = Math.max(0, task.remaining_seconds) * 1000;
      const endMs = startMs + durMs;
      cursorMs = endMs;
      return { startMs, endMs };
    });
  }, [tasks, nowMs]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderActiveTasks(String(active.id), String(over.id));
    }
  };

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t(lang, 'upNext')} ({tasks.length})
        </span>

        <div className="flex items-center gap-2">
          {settings.layoutMode === 'advanced' && (
            <span className="hidden sm:inline text-[11px] text-zinc-400 dark:text-zinc-500">
              {t(lang, 'topTaskHint')}
            </span>
          )}
          <button
            type="button"
            onClick={() => setManualOverride(!isCollapsed)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800/70 transition"
          >
            {isCollapsed ? (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>{t(lang, 'showQueueBtn')}</span>
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>{t(lang, 'hideQueueBtn')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2.5">
              {tasks.map((task, idx) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isTopTask={idx === 0}
                  startMs={timeSlots[idx]?.startMs ?? nowMs}
                  endMs={timeSlots[idx]?.endMs ?? nowMs}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};
