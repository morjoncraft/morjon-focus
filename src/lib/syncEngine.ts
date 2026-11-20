import { isValidTaskColor } from './colors';
import { getSupabaseClient } from './supabase';
import type { SubTask, Task, TaskColor, TaskList, TaskStatus } from '../types';

export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const UPSERT_CHUNK_SIZE = 250;

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

function createUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface SyncErrorInfo {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

export function extractSyncError(err: unknown): SyncErrorInfo {
  if (err instanceof Error) {
    const anyErr = err as Error & { code?: unknown; details?: unknown; hint?: unknown };
    return {
      code: typeof anyErr.code === 'string' ? anyErr.code : undefined,
      message: err.message || 'Unknown sync error',
      details: typeof anyErr.details === 'string' ? anyErr.details : undefined,
      hint: typeof anyErr.hint === 'string' ? anyErr.hint : undefined,
    };
  }

  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    const code = typeof obj.code === 'string' ? obj.code : undefined;
    const message =
      typeof obj.message === 'string' && obj.message.trim()
        ? obj.message
        : typeof obj.error_description === 'string'
          ? obj.error_description
          : typeof obj.error === 'string'
            ? obj.error
            : JSON.stringify(obj);
    const details = typeof obj.details === 'string' && obj.details.trim() ? obj.details : undefined;
    const hint = typeof obj.hint === 'string' && obj.hint.trim() ? obj.hint : undefined;
    return { code, message, details, hint };
  }

  if (typeof err === 'string' && err.trim()) {
    return { message: err };
  }

  return { message: 'Unknown sync error' };
}

export function formatSyncErrorMessage(err: unknown): string {
  const info = extractSyncError(err);
  const parts = [info.code ? `[${info.code}] ${info.message}` : info.message];
  if (info.hint) parts.push(`Hint: ${info.hint}`);
  return parts.join(' — ');
}

export interface SyncDiagnostic {
  title: string;
  detail: string;
  needsSchemaSql: boolean;
}

export function diagnoseSyncError(
  rawError: string | null,
  lang: 'en' | 'tr' = 'en',
): SyncDiagnostic {
  const errText = rawError ?? '';
  const isTr = lang === 'tr';

  if (
    /PGRST205|42P01|schema cache|does not exist|relation\s+"?public\.(lists|tasks)"?/i.test(errText)
  ) {
    return {
      title: isTr
        ? 'Supabase veritabanı tabloları (lists / tasks) bulunamadı'
        : 'Supabase tables (lists / tasks) are missing',
      detail: isTr
        ? 'Giriş (Auth) aktif ancak Supabase projenin veritabanında henüz lists ve tasks tabloları oluşturulmamış. Aşağıdaki butondan SQL kurulum kodunu kopyalayıp Supabase Dashboard → SQL Editor içine yapıştır ve Run butonuna bas.'
        : 'Sign-in worked, but your Supabase project does not have the lists/tasks tables yet. Copy the setup SQL below and run it once inside Supabase Dashboard → SQL Editor.',
      needsSchemaSql: true,
    };
  }

  if (/42501|row-level security|permission denied/i.test(errText)) {
    return {
      title: isTr ? 'Yetkilendirme / RLS Politikası Hatası (42501)' : 'Row-Level Security Policy Error (42501)',
      detail: isTr
        ? 'Supabase RLS politikası bu yazma işlemini reddetti. Hesabından çıkıp tekrar giriş yapmayı dene veya RLS politikalarının güncel olduğundan emin ol (SQL kurulumunu tekrar çalıştırabilirsin).'
        : 'Supabase RLS rejected the write. Check that the RLS policies from supabase/schema.sql are applied and your session is active.',
      needsSchemaSql: true,
    };
  }

  if (/PGRST204|42703|column .* does not exist/i.test(errText)) {
    return {
      title: isTr ? 'Eksik Veritabanı Kolonu' : 'Missing Table Column',
      detail: isTr
        ? 'Uygulamanın yeni özellikleri (ör. subtasks veya scheduled_start) için Supabase SQL Editor üzerinden güncel kurulum SQL sorgusunu tekrar çalıştırman gerekiyor.'
        : 'Re-run the latest setup SQL in Supabase SQL Editor to add newer columns safely.',
      needsSchemaSql: true,
    };
  }

  if (/JWT|token|401|403|not authenticated|AuthSessionMissing/i.test(errText)) {
    return {
      title: isTr ? 'Oturum Süresi Dolmuş' : 'Session Expired',
      detail: isTr
        ? 'Güvenlik oturumun sona ermiş olabilir. Çıkış yapıp tekrar giriş yaparak yeni oturum al.'
        : 'Your auth session may have expired. Sign out and sign back in to refresh your token.',
      needsSchemaSql: false,
    };
  }

  if (/Failed to fetch|NetworkError|network|timeout|ECONN/i.test(errText)) {
    return {
      title: isTr ? 'Ağ veya Supabase Erişim Hatası' : 'Network / Supabase Connection Error',
      detail: isTr
        ? 'Supabase sunucusuna ulaşılamıyor. İnternet bağlantını veya tarayıcı eklentilerini (reklam/takip engelleyici) kontrol et.'
        : 'Could not reach Supabase. Check your internet connection or browser privacy blockers.',
      needsSchemaSql: false,
    };
  }

  return {
    title: isTr ? 'Bulut Senkronizasyon Hatası' : 'Cloud Sync Error',
    detail:
      errText ||
      (isTr ? 'Beklenmeyen bir hata oluştu.' : 'An unexpected sync error occurred.'),
    needsSchemaSql: false,
  };
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
    synced_updated_at: row.updated_at,
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
    synced_updated_at: row.updated_at,
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

function pickNewer<T extends { updated_at: string; synced_updated_at?: string }>(
  localItem: T,
  cloudItem: T,
): T {
  const localMs = Date.parse(localItem.updated_at) || 0;
  const cloudMs = Date.parse(cloudItem.updated_at) || 0;
  if (localMs > cloudMs) return localItem;
  if (localMs === cloudMs && localItem.synced_updated_at === localItem.updated_at) {
    return localItem;
  }
  return cloudItem;
}

export interface DeltaBatch {
  dirtyLists: TaskList[];
  dirtyTasks: Task[];
}

export function computeDeltaBatch(
  userId: string,
  lists: TaskList[],
  tasks: Task[],
): DeltaBatch {
  const ownedLists = pruneExpiredTombstones(lists).filter(
    (l) => !l.user_id || l.user_id === userId,
  );
  const ownedTasks = pruneExpiredTombstones(tasks).filter(
    (t) => !t.user_id || t.user_id === userId,
  );

  const listById = new Map<string, TaskList>();
  for (const l of ownedLists) listById.set(l.id, l);

  const dirtyListMap = new Map<string, TaskList>();
  for (const l of ownedLists) {
    if (l.synced_updated_at !== l.updated_at) {
      dirtyListMap.set(l.id, l);
    }
  }

  const dirtyTasks: Task[] = [];
  const prerequisiteLists: TaskList[] = [];

  for (const t of ownedTasks) {
    if (t.list_id !== null && !listById.has(t.list_id)) continue;
    if (t.synced_updated_at === t.updated_at) continue;

    // FK safety: ensure never-synced parent list is pushed before any child task
    if (t.list_id) {
      const parent = listById.get(t.list_id);
      if (parent && !parent.synced_updated_at && !dirtyListMap.has(parent.id)) {
        dirtyListMap.set(parent.id, parent);
        prerequisiteLists.push(parent);
      }
    }

    dirtyTasks.push(t);
  }

  const orderedDirtyLists = [
    ...prerequisiteLists,
    ...ownedLists.filter(
      (l) => dirtyListMap.has(l.id) && !prerequisiteLists.some((p) => p.id === l.id),
    ),
  ];

  return {
    dirtyLists: orderedDirtyLists,
    dirtyTasks,
  };
}

export interface PushDeltaResult {
  userId: string;
  syncedAt: string;
  pushedListVersions: Map<string, string>;
  pushedTaskVersions: Map<string, string>;
  upsertedLists: number;
  upsertedTasks: number;
  remappedLists?: Map<string, string>;
  remappedTasks?: Map<string, string>;
}

async function executeChunkedUpserts(
  userId: string,
  dirtyLists: TaskList[],
  dirtyTasks: Task[],
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const cleanLists = dirtyLists.map((l) => toCloudListRow(l, userId));
  for (let i = 0; i < cleanLists.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = cleanLists.slice(i, i + UPSERT_CHUNK_SIZE);
    const { error } = await supabase.from('lists').upsert(chunk, { onConflict: 'id' });
    if (error) throw error;
  }

  const cleanTasks = dirtyTasks.map((t) => toCloudTaskRow(t, userId));
  for (let i = 0; i < cleanTasks.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = cleanTasks.slice(i, i + UPSERT_CHUNK_SIZE);
    const { error } = await supabase.from('tasks').upsert(chunk, { onConflict: 'id' });
    if (error) {
      const info = extractSyncError(error);
      if (
        info.code === 'PGRST204' ||
        info.code === '42703' ||
        /subtasks|scheduled_start|column/i.test(info.message)
      ) {
        const legacyChunk = chunk.map(
          ({ subtasks: _s, scheduled_start: _sch, ...rest }) => rest,
        );
        const { error: retryErr } = await supabase
          .from('tasks')
          .upsert(legacyChunk, { onConflict: 'id' });
        if (retryErr) throw retryErr;
      } else {
        throw error;
      }
    }
  }
}

export async function pushDeltaToCloud(
  userId: string,
  lists: TaskList[],
  tasks: Task[],
): Promise<PushDeltaResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const batch = computeDeltaBatch(userId, lists, tasks);
  const pushedListVersions = new Map<string, string>();
  const pushedTaskVersions = new Map<string, string>();

  if (batch.dirtyLists.length === 0 && batch.dirtyTasks.length === 0) {
    return {
      userId,
      syncedAt: new Date().toISOString(),
      pushedListVersions,
      pushedTaskVersions,
      upsertedLists: 0,
      upsertedTasks: 0,
    };
  }

  try {
    await executeChunkedUpserts(userId, batch.dirtyLists, batch.dirtyTasks);

    for (const l of batch.dirtyLists) pushedListVersions.set(l.id, l.updated_at);
    for (const t of batch.dirtyTasks) pushedTaskVersions.set(t.id, t.updated_at);

    return {
      userId,
      syncedAt: new Date().toISOString(),
      pushedListVersions,
      pushedTaskVersions,
      upsertedLists: batch.dirtyLists.length,
      upsertedTasks: batch.dirtyTasks.length,
    };
  } catch (err) {
    const info = extractSyncError(err);
    const hasUnsyncedItems =
      batch.dirtyLists.some((l) => !l.synced_updated_at) ||
      batch.dirtyTasks.some((t) => !t.synced_updated_at);

    // RLS 42501 auto-recovery when a never-synced local UUID collides with another account
    if (info.code === '42501' && hasUnsyncedItems) {
      const remappedLists = new Map<string, string>();
      const remappedTasks = new Map<string, string>();

      const healedLists = batch.dirtyLists.map((l) => {
        if (!l.synced_updated_at) {
          const freshId = createUuid();
          remappedLists.set(l.id, freshId);
          return { ...l, id: freshId, user_id: userId };
        }
        return l;
      });

      const healedTasks = batch.dirtyTasks.map((t) => {
        const nextListId =
          t.list_id && remappedLists.has(t.list_id)
            ? remappedLists.get(t.list_id)!
            : t.list_id;
        if (!t.synced_updated_at) {
          const freshId = createUuid();
          remappedTasks.set(t.id, freshId);
          return { ...t, id: freshId, list_id: nextListId, user_id: userId };
        }
        return { ...t, list_id: nextListId };
      });

      await executeChunkedUpserts(userId, healedLists, healedTasks);

      for (const l of healedLists) pushedListVersions.set(l.id, l.updated_at);
      for (const t of healedTasks) pushedTaskVersions.set(t.id, t.updated_at);

      return {
        userId,
        syncedAt: new Date().toISOString(),
        pushedListVersions,
        pushedTaskVersions,
        upsertedLists: healedLists.length,
        upsertedTasks: healedTasks.length,
        remappedLists,
        remappedTasks,
      };
    }

    throw err;
  }
}

export function applySyncedWatermarks(
  lists: TaskList[],
  tasks: Task[],
  result: PushDeltaResult,
): { lists: TaskList[]; tasks: Task[] } {
  const listRemap = result.remappedLists;
  const taskRemap = result.remappedTasks;

  const nextLists = lists.map((l) => {
    const resolvedId = listRemap?.get(l.id) ?? l.id;
    const pushedVersion = result.pushedListVersions.get(resolvedId);
    if (!pushedVersion) return resolvedId !== l.id ? { ...l, id: resolvedId } : l;

    const base = resolvedId !== l.id ? { ...l, id: resolvedId, user_id: result.userId } : { ...l, user_id: result.userId };
    if (base.updated_at === pushedVersion) {
      return { ...base, synced_updated_at: pushedVersion, is_seed: false };
    }
    return base;
  });

  const nextTasks = tasks.map((t) => {
    const resolvedId = taskRemap?.get(t.id) ?? t.id;
    const resolvedListId =
      t.list_id && listRemap?.has(t.list_id) ? listRemap.get(t.list_id)! : t.list_id;
    const pushedVersion = result.pushedTaskVersions.get(resolvedId);

    if (!pushedVersion) {
      return resolvedId !== t.id || resolvedListId !== t.list_id
        ? { ...t, id: resolvedId, list_id: resolvedListId }
        : t;
    }

    const base = {
      ...t,
      id: resolvedId,
      list_id: resolvedListId,
      user_id: result.userId,
    };

    if (base.updated_at === pushedVersion) {
      return { ...base, synced_updated_at: pushedVersion, is_seed: false };
    }
    return base;
  });

  return { lists: nextLists, tasks: nextTasks };
}

export async function mergeAndSyncWithCloud(
  userId: string,
  localLists: TaskList[],
  localTasks: Task[],
): Promise<{
  lists: TaskList[];
  tasks: Task[];
  syncedAt: string;
  upsertedLists: number;
  upsertedTasks: number;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const safeLocalLists = pruneExpiredTombstones(localLists).filter(
    (l) => !l.user_id || l.user_id === userId,
  );
  const safeLocalTasks = pruneExpiredTombstones(localTasks).filter(
    (t) => !t.user_id || t.user_id === userId,
  );

  const [
    { data: cloudListRows, error: listsFetchError },
    { data: cloudTaskRows, error: tasksFetchError },
  ] = await Promise.all([
    supabase.from('lists').select('*').eq('user_id', userId),
    supabase.from('tasks').select('*').eq('user_id', userId),
  ]);

  if (listsFetchError) throw listsFetchError;
  if (tasksFetchError) throw tasksFetchError;

  const cloudLists = pruneExpiredTombstones(
    ((cloudListRows ?? []) as CloudListRow[]).map(toTaskList),
  );
  const cloudTasks = pruneExpiredTombstones(
    ((cloudTaskRows ?? []) as CloudTaskRow[]).map(toTask),
  );

  // Case A: First-time cloud user -> promote guest workspace & delta push everything once
  if (cloudLists.length === 0 && cloudTasks.length === 0) {
    const promotedLists = safeLocalLists.map((l) => ({
      ...l,
      user_id: userId,
      is_seed: false,
      synced_updated_at: undefined,
    }));
    const promotedTasks = safeLocalTasks.map((t) => ({
      ...t,
      user_id: userId,
      is_seed: false,
      synced_updated_at: undefined,
    }));
    const pushRes = await pushDeltaToCloud(userId, promotedLists, promotedTasks);
    const stamped = applySyncedWatermarks(promotedLists, promotedTasks, pushRes);
    return {
      lists: stamped.lists,
      tasks: stamped.tasks,
      syncedAt: pushRes.syncedAt,
      upsertedLists: pushRes.upsertedLists,
      upsertedTasks: pushRes.upsertedTasks,
    };
  }

  // Case B: Returning user signing in -> discard untouched seed duplicates, keep & merge real items
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
      list_id:
        t.list_id && seedListRemap.has(t.list_id) ? seedListRemap.get(t.list_id)! : t.list_id,
    }));

  const mergedListMap = new Map<string, TaskList>();
  for (const cl of cloudLists) {
    mergedListMap.set(cl.id, cl);
  }
  for (const ll of nonSeedLocalLists) {
    const existing = mergedListMap.get(ll.id);
    mergedListMap.set(ll.id, existing ? pickNewer(ll, existing) : ll);
  }

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

  // Delta push ONLY lists/tasks that differ from what came down from cloud
  const pushRes = await pushDeltaToCloud(userId, mergedLists, mergedTasks);
  const stamped = applySyncedWatermarks(mergedLists, mergedTasks, pushRes);

  // Non-blocking cleanup of >30 day soft-deleted rows
  const cutoffIso = new Date(Date.now() - TOMBSTONE_TTL_MS).toISOString();
  void (async () => {
    try {
      await supabase.from('tasks').delete().eq('user_id', userId).lt('deleted_at', cutoffIso);
      await supabase.from('lists').delete().eq('user_id', userId).lt('deleted_at', cutoffIso);
    } catch {
      // non-fatal cleanup
    }
  })();

  return {
    lists: stamped.lists,
    tasks: stamped.tasks,
    syncedAt: pushRes.syncedAt,
    upsertedLists: pushRes.upsertedLists,
    upsertedTasks: pushRes.upsertedTasks,
  };
}

type StatusCallback = (
  status: 'syncing' | 'synced' | 'offline' | 'error',
  result?: PushDeltaResult,
  errMsg?: string,
) => void;

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

    const { lists, tasks } = getData();
    const pending = computeDeltaBatch(userId, lists, tasks);
    if (pending.dirtyLists.length === 0 && pending.dirtyTasks.length === 0) {
      onStatus('synced', {
        userId,
        syncedAt: new Date().toISOString(),
        pushedListVersions: new Map(),
        pushedTaskVersions: new Map(),
        upsertedLists: 0,
        upsertedTasks: 0,
      });
      return;
    }

    this.inFlight = true;
    onStatus('syncing');

    try {
      const result = await pushDeltaToCloud(userId, lists, tasks);
      onStatus('synced', result);
    } catch (err) {
      onStatus('error', undefined, formatSyncErrorMessage(err));
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
