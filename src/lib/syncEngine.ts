import { isValidTaskColor } from './colors';
import { getSupabaseClient } from './supabase';
import type { SubTask, Task, TaskColor, TaskList, TaskStatus } from '../types';

export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function pruneExpiredTombstones<T extends { deleted_at: string | null }>(
  items: T[],
  nowMs = Date.now(),
): T[] {
  return items.filter((item) => {
    if (!item.deleted_at) return true;
    const deletedMs = Date.parse(item.deleted_at);
    if (!Number.isFinite(deletedMs)) return true;
    return nowMs - deletedMs < TOMBSTONE_TTL_MS;
  });
}

interface CloudListRow {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  is_preset: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface CloudTaskRow {
  id: string;
  user_id: string;
  list_id: string | null;
  title: string;
  emoji: string;
  color: string;
  duration_seconds: number;
  remaining_seconds: number;
  actual_focused_seconds: number;
  overtime_added_seconds: number;
  status: string;
  sort_order: number;
  subtasks?: SubTask[] | null;
  scheduled_start?: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function toTaskList(row: CloudListRow): TaskList {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    emoji: row.emoji || '🎯',
    is_preset: Boolean(row.is_preset),
    sort_order: Number(row.sort_order) || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? null,
    is_seed: false,
  };
}

function toTask(row: CloudTaskRow): Task {
  const status: TaskStatus =
    row.status === 'not_now' || row.status === 'completed' ? row.status : 'todo';
  const color: TaskColor = isValidTaskColor(row.color) ? row.color : 'none';

  return {
    id: row.id,
    user_id: row.user_id,
    list_id: row.list_id ?? null,
    title: row.title,
    emoji: row.emoji || '⚡',
    color,
    duration_seconds: Number(row.duration_seconds) || 0,
    remaining_seconds: Number(row.remaining_seconds) || 0,
    actual_focused_seconds: Number(row.actual_focused_seconds) || 0,
    overtime_added_seconds: Number(row.overtime_added_seconds) || 0,
    status,
    sort_order: Number(row.sort_order) || 0,
    subtasks: Array.isArray(row.subtasks) ? row.subtasks : [],
    scheduled_start: row.scheduled_start ?? null,
    completed_at: row.completed_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? null,
    is_seed: false,
  };
}

function toCloudListRow(list: TaskList, userId: string): CloudListRow {
  return {
    id: list.id,
    user_id: userId,
    name: list.name,
    emoji: list.emoji || '🎯',
    is_preset: list.is_preset,
    sort_order: list.sort_order,
    created_at: list.created_at,
    updated_at: list.updated_at,
    deleted_at: list.deleted_at ?? null,
  };
}

function toCloudTaskRow(task: Task, userId: string): CloudTaskRow {
  return {
    id: task.id,
    user_id: userId,
    list_id: task.list_id ?? null,
    title: task.title,
    emoji: task.emoji || '⚡',
    color: task.color,
    duration_seconds: task.duration_seconds,
    remaining_seconds: task.remaining_seconds,
    actual_focused_seconds: task.actual_focused_seconds,
    overtime_added_seconds: task.overtime_added_seconds,
    status: task.status,
    sort_order: task.sort_order,
    subtasks: task.subtasks ?? [],
    scheduled_start: task.scheduled_start ?? null,
    completed_at: task.completed_at ?? null,
    created_at: task.created_at,
    updated_at: task.updated_at,
    deleted_at: task.deleted_at ?? null,
  };
}

function pickNewer<T extends { updated_at: string }>(localItem: T, cloudItem: T): T {
  const localMs = Date.parse(localItem.updated_at) || 0;
  const cloudMs = Date.parse(cloudItem.updated_at) || 0;
  return localMs >= cloudMs ? localItem : cloudItem;
}

export async function pushLocalSnapshotToCloud(
  userId: string,
  lists: TaskList[],
  tasks: Task[],
): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  // Strict user ownership guard & 30-day tombstone pruning
  const ownedLists = pruneExpiredTombstones(lists).filter(
    (l) => !l.user_id || l.user_id === userId,
  );
  const ownedTasks = pruneExpiredTombstones(tasks).filter(
    (t) => !t.user_id || t.user_id === userId,
  );

  // Filter out dangling tasks pointing to nonexistent lists to preserve FK integrity
  const listIds = new Set(ownedLists.map((l) => l.id));
  const cleanLists = ownedLists.map((l) => toCloudListRow(l, userId));
  const cleanTasks = ownedTasks
    .filter((t) => t.list_id === null || listIds.has(t.list_id))
    .map((t) => toCloudTaskRow(t, userId));

  if (cleanLists.length > 0) {
    const { error: listsError } = await supabase
      .from('lists')
      .upsert(cleanLists, { onConflict: 'id' });
    if (listsError) throw listsError;
  }

  if (cleanTasks.length > 0) {
    const { error: tasksError } = await supabase
      .from('tasks')
      .upsert(cleanTasks, { onConflict: 'id' });
    if (tasksError) {
      const msg = tasksError.message ?? '';
      if (
        tasksError.code === 'PGRST204' ||
        /subtasks|scheduled_start|column/i.test(msg)
      ) {
        const legacyTasks = cleanTasks.map(({ subtasks: _s, scheduled_start: _sch, ...rest }) => rest);
        const { error: retryErr } = await supabase
          .from('tasks')
          .upsert(legacyTasks, { onConflict: 'id' });
        if (retryErr) throw retryErr;
      } else {
        throw tasksError;
      }
    }
  }

  return new Date().toISOString();
}

export async function mergeAndSyncWithCloud(
  userId: string,
  localLists: TaskList[],
  localTasks: Task[],
): Promise<{
  lists: TaskList[];
  tasks: Task[];
  syncedAt: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  // Strict user ownership guard on local items before merging
  const safeLocalLists = pruneExpiredTombstones(localLists).filter(
    (l) => !l.user_id || l.user_id === userId,
  );
  const safeLocalTasks = pruneExpiredTombstones(localTasks).filter(
    (t) => !t.user_id || t.user_id === userId,
  );

  const [{ data: cloudListRows, error: listsFetchError }, { data: cloudTaskRows, error: tasksFetchError }] =
    await Promise.all([
      supabase.from('lists').select('*').eq('user_id', userId),
      supabase.from('tasks').select('*').eq('user_id', userId),
    ]);

  if (listsFetchError) throw listsFetchError;
  if (tasksFetchError) throw tasksFetchError;

  const cloudLists = pruneExpiredTombstones(((cloudListRows ?? []) as CloudListRow[]).map(toTaskList));
  const cloudTasks = pruneExpiredTombstones(((cloudTaskRows ?? []) as CloudTaskRow[]).map(toTask));

  // Case A: First-time cloud user -> upload local state (strip seed flags so they become real cloud records)
  if (cloudLists.length === 0 && cloudTasks.length === 0) {
    const promotedLists = safeLocalLists.map((l) => ({ ...l, user_id: userId, is_seed: false }));
    const promotedTasks = safeLocalTasks.map((t) => ({ ...t, user_id: userId, is_seed: false }));
    const syncedAt = await pushLocalSnapshotToCloud(userId, promotedLists, promotedTasks);
    return { lists: promotedLists, tasks: promotedTasks, syncedAt };
  }

  // Case B: Returning user signing in on a device that might have initial seed items.
  const seedListRemap = new Map<string, string>();
  const activeCloudLists = cloudLists.filter((l) => !l.deleted_at);

  for (const localList of safeLocalLists) {
    if (!localList.is_seed) continue;
    const match = activeCloudLists.find(
      (c) =>
        c.name.trim().toLowerCase() === localList.name.trim().toLowerCase() &&
        c.is_preset === localList.is_preset,
    );
    if (match) {
      seedListRemap.set(localList.id, match.id);
    } else if (activeCloudLists.length > 0 && !localList.is_preset) {
      const firstRegular = activeCloudLists.find((c) => !c.is_preset);
      if (firstRegular) {
        seedListRemap.set(localList.id, firstRegular.id);
      }
    }
  }

  const nonSeedLocalLists = safeLocalLists
    .filter((l) => !l.is_seed)
    .map((l) => ({ ...l, user_id: userId }));

  const nonSeedLocalTasks = safeLocalTasks
    .filter((t) => !t.is_seed)
    .map((t) => ({
      ...t,
      user_id: userId,
      list_id: t.list_id && seedListRemap.has(t.list_id) ? seedListRemap.get(t.list_id)! : t.list_id,
    }));

  // Merge lists by ID using updated_at last-write-wins
  const mergedListMap = new Map<string, TaskList>();
  for (const cl of cloudLists) {
    mergedListMap.set(cl.id, cl);
  }
  for (const ll of nonSeedLocalLists) {
    const existing = mergedListMap.get(ll.id);
    mergedListMap.set(ll.id, existing ? pickNewer(ll, existing) : ll);
  }

  // Merge tasks by ID using updated_at last-write-wins
  const mergedTaskMap = new Map<string, Task>();
  for (const ct of cloudTasks) {
    mergedTaskMap.set(ct.id, ct);
  }
  for (const lt of nonSeedLocalTasks) {
    const existing = mergedTaskMap.get(lt.id);
    mergedTaskMap.set(lt.id, existing ? pickNewer(lt, existing) : lt);
  }

  const mergedLists = pruneExpiredTombstones(Array.from(mergedListMap.values())).sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const validListIds = new Set(mergedLists.map((l) => l.id));
  const mergedTasks = pruneExpiredTombstones(Array.from(mergedTaskMap.values()))
    .filter((t) => t.list_id === null || validListIds.has(t.list_id))
    .sort((a, b) => a.sort_order - b.sort_order);

  const syncedAt = await pushLocalSnapshotToCloud(userId, mergedLists, mergedTasks);

  // Best-effort non-blocking cleanup of >30 day soft-deleted rows on Supabase
  const cutoffIso = new Date(Date.now() - TOMBSTONE_TTL_MS).toISOString();
  void (async () => {
    try {
      await supabase.from('tasks').delete().eq('user_id', userId).lt('deleted_at', cutoffIso);
      await supabase.from('lists').delete().eq('user_id', userId).lt('deleted_at', cutoffIso);
    } catch {
      // non-fatal cleanup
    }
  })();

  return { lists: mergedLists, tasks: mergedTasks, syncedAt };
}

type StatusCallback = (status: 'syncing' | 'synced' | 'offline' | 'error', syncedAt?: string, errMsg?: string) => void;

class SyncScheduler {
  private timer: number | null = null;
  private inFlight = false;
  private queued = false;
  private latestArgs: {
    userId: string;
    getData: () => { lists: TaskList[]; tasks: Task[] };
    onStatus: StatusCallback;
  } | null = null;

  public schedule(
    userId: string,
    getData: () => { lists: TaskList[]; tasks: Task[] },
    onStatus: StatusCallback,
    delayMs = 800,
  ): void {
    this.latestArgs = { userId, getData, onStatus };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      onStatus('offline');
      return;
    }

    if (this.timer !== null) {
      window.clearTimeout(this.timer);
    }

    this.timer = window.setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, delayMs);
  }

  public async flush(): Promise<void> {
    if (!this.latestArgs) return;
    const { userId, getData, onStatus } = this.latestArgs;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      onStatus('offline');
      return;
    }

    if (this.inFlight) {
      this.queued = true;
      return;
    }

    this.inFlight = true;
    onStatus('syncing');

    try {
      const { lists, tasks } = getData();
      const syncedAt = await pushLocalSnapshotToCloud(userId, lists, tasks);
      onStatus('synced', syncedAt);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Senkronizasyon hatası';
      onStatus('error', undefined, message);
    } finally {
      this.inFlight = false;
      if (this.queued) {
        this.queued = false;
        void this.flush();
      }
    }
  }

  public cancel(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.latestArgs = null;
  }
}

export const syncScheduler = new SyncScheduler();
