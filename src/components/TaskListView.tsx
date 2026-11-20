import React, { useMemo } from 'react';
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
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';
import type { Task } from '../types';
import { TaskCard } from './TaskCard';

interface TaskListViewProps {
  tasks: Task[];
  nowMs: number;
}

export const TaskListView: React.FC<TaskListViewProps> = ({ tasks, nowMs }) => {
  const lang = useFocusStore((s) => s.settings.language);
  const reorderActiveTasks = useFocusStore((s) => s.reorderActiveTasks);

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
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t(lang, 'upNext')} ({tasks.length})
        </span>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {t(lang, 'topTaskHint')}
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
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
    </div>
  );
};
