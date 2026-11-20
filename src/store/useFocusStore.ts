import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { arrayMove } from '@dnd-kit/sortable';
import { audioEngine } from '../lib/audioEngine';
import {
  ACCENT_SWATCHES,
  COLOR_ME_PALETTES,
  normalizeHex,
  samplePaletteForCount,
} from '../lib/colors';
import { BUILTIN_EMOJI_THEMES } from '../lib/emojiLibrary';
import { getLocalDateKey } from '../lib/formatters';
import { DEFAULT_SETTINGS } from '../lib/i18n';
import { sendTimerFinishedNotification } from '../lib/notifications';
import { suggestEmojiForTitle } from '../lib/parseTaskInput';
import {
  applySyncedWatermarks,
  formatSyncErrorMessage,
  mergeAndSyncWithCloud,
  pruneExpiredTombstones,
  syncScheduler,
} from '../lib/syncEngine';
import { generateSmartBreakdown } from '../lib/taskBreakdown';
import type {
  ActiveTab,
  BackupData,
  DailyCategoryFocusMap,
  DailyFocusMap,
  EmojiThemePack,
  FocusSettings,
  FocusUser,
  SharedListPayload,
  SoundscapeId,
  SubTask,
  SyncStatus,
  Task,
  TaskColor,
  TaskList,
  ThemeMode,
} from '../types';

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

function createInitialSeedData(): {
  lists: TaskList[];
  tasks: Task[];
  activeListId: string;
} {
  const now = new Date().toISOString();

  const todayId = createUuid();
  const studyId = createUuid();
  const workId = createUuid();

  const morningPresetId = createUuid();
  const deepFocusPresetId = createUuid();
  const shutdownPresetId = createUuid();

  const lists: TaskList[] = [
    {
      id: todayId,
      name: 'Today',
      emoji: '🎯',
      is_preset: false,
      sort_order: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      is_seed: true,
    },
    {
      id: studyId,
      name: 'Study Session',
      emoji: '📚',
      is_preset: false,
      sort_order: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      is_seed: true,
    },
    {
      id: workId,
      name: 'Work & Projects',
      emoji: '💼',
      is_preset: false,
      sort_order: 2,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      is_seed: true,
    },
    {
      id: morningPresetId,
      name: 'Morning Routine',
      emoji: '🌅',
      is_preset: true,
      sort_order: 3,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      is_seed: true,
    },
    {
      id: deepFocusPresetId,
      name: 'Deep Focus Block',
      emoji: '🍅',
      is_preset: true,
      sort_order: 4,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      is_seed: true,
    },
    {
      id: shutdownPresetId,
      name: 'Evening Shutdown',
      emoji: '🌙',
      is_preset: true,
      sort_order: 5,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      is_seed: true,
    },
  ];

  const makeSeedTask = (
    listId: string,
    title: string,
    emoji: string,
    color: TaskColor,
    minutes: number,
    sortOrder: number,
    subtasks: SubTask[] = [],
  ): Task => ({
    id: createUuid(),
    list_id: listId,
    title,
    emoji,
    color,
    duration_seconds: minutes * 60,
    remaining_seconds: minutes * 60,
    actual_focused_seconds: 0,
    overtime_added_seconds: 0,
    status: 'todo',
    sort_order: sortOrder,
    subtasks,
    scheduled_start: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    is_seed: true,
  });

  const tasks: Task[] = [
    // Today starter tasks with generic examples & sample subtasks
    makeSeedTask(todayId, 'Deep work on main project', '🎯', '#9364b8', 45, 0, [
      { id: createUuid(), title: 'Outline key steps', completed: false },
      { id: createUuid(), title: 'Work distraction-free', completed: false },
      { id: createUuid(), title: 'Quick review & wrap up', completed: false },
    ]),
    makeSeedTask(todayId, 'Read & take quick notes', '📖', '#3aa0b5', 20, 1),
    makeSeedTask(todayId, 'Coffee & stretch break', '☕', '#0fa988', 10, 2),
    makeSeedTask(todayId, 'Reply to messages & emails', '✉️', '#df7a57', 15, 3),

    // Study starter task
    makeSeedTask(studyId, 'Summarize key concepts & practice', '✍️', '#d89b48', 40, 0),

    // Work starter task
    makeSeedTask(workId, 'Priority email triage & daily plan', '✉️', '#1388ba', 15, 0),

    // Preset 1: Morning Routine
    makeSeedTask(morningPresetId, 'Drink water & quick stretch', '💧', '#3aa0b5', 10, 0),
    makeSeedTask(morningPresetId, 'Pick top 3 priorities for today', '🎯', '#d89b48', 10, 1),
    makeSeedTask(morningPresetId, 'Phone-free deep start', '⚡', '#9364b8', 30, 2),

    // Preset 2: Deep Focus Block
    makeSeedTask(deepFocusPresetId, 'Focus Sprint 1', '💻', '#9364b8', 45, 0),
    makeSeedTask(deepFocusPresetId, 'Screen-free recharge break', '☕', '#4caf6a', 10, 1),
    makeSeedTask(deepFocusPresetId, 'Focus Sprint 2', '💻', '#1388ba', 45, 2),

    // Preset 3: Evening Shutdown
    makeSeedTask(shutdownPresetId, "Prepare tomorrow's list", '🎯', '#d89b48', 10, 0),
    makeSeedTask(shutdownPresetId, 'Tidy up workspace', '🧹', '#0fa988', 5, 1),
  ];

  return { lists, tasks, activeListId: todayId };
}

const INITIAL_SEED = createInitialSeedData();

export interface FocusState {
  // Persisted core domain data
  lists: TaskList[];
  tasks: Task[];
  activeListId: string | null;
  dailyFocusSeconds: DailyFocusMap;
  dailyCategoryFocus: DailyCategoryFocusMap;

  // Persisted UI, settings & customization
  theme: ThemeMode;
  settings: FocusSettings;
  soundscape: SoundscapeId;
  soundVolume: number;
  activeColorPaletteId: string | null;
  activeEmojiThemeId: string;
  customEmojiThemes: EmojiThemePack[];

  // Persisted runtime timer state
  isTimerRunning: boolean;
  lastTickAt: number | null;
  overtimeNotifiedTaskId: string | null;
  completedPomodoroCount: number;

  // Transient UI, alarm & sync state
  isAlarmActive: boolean;
  lastNagMinuteNotified: number;
  focusedSinceLastChimeSec: number;
  longBreakSuggestionPending: boolean;
  zenModeOpen: boolean;
  activeTab: ActiveTab;
  user: FocusUser | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  lastSyncStats: { upsertedLists: number; upsertedTasks: number } | null;
  pendingSync: boolean;
  storagePersisted: boolean;

  // Settings & Customization Actions
  updateSettings: (patch: Partial<FocusSettings>) => void;
  resetAppearanceSettings: () => void;
  cycleAccentColor: () => void;
  applyColorMePalette: (paletteId: string | 'surprise' | 'none') => void;
  applyEmojiMeTheme: (themeId: string | 'surprise' | 'auto_match') => void;
  pickRandomTask: () => string | null;
  saveCustomEmojiTheme: (pack: Omit<EmojiThemePack, 'isCustom'>) => string;
  deleteCustomEmojiTheme: (packId: string) => void;
  dismissAlarm: () => void;
  playButtonClick: () => void;

  // List & Preset Actions
  selectList: (listId: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
  createList: (name: string, emoji?: string, isPreset?: boolean) => string;
  updateList: (listId: string, patch: { name?: string; emoji?: string }) => void;
  deleteList: (listId: string) => void;
  applyPresetToActiveList: (presetId: string) => number;
  saveActiveListAsPreset: (presetName?: string) => string | null;

  // Task Actions
  addTask: (input: {
    title: string;
    durationSeconds: number;
    emoji?: string;
    color?: TaskColor;
    status?: 'todo' | 'not_now';
    listId?: string | null;
  }) => string;
  updateTask: (
    taskId: string,
    patch: {
      title?: string;
      emoji?: string;
      color?: TaskColor;
      duration_seconds?: number;
      remaining_seconds?: number;
    },
  ) => void;
  deleteTask: (taskId: string) => void;
  reorderActiveTasks: (activeId: string, overId: string) => void;
  promoteTaskToTop: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  uncompleteTask: (taskId: string) => void;
  resetTaskTimer: (taskId: string) => void;
  moveToNotNow: (taskId: string) => void;
  recallFromNotNow: (taskId: string, position?: 'top' | 'bottom') => void;
  adjustTaskMinutes: (taskId: string, deltaMinutes: number) => void;
  addOvertimeToTask: (taskId: string) => void;
  clearCompletedTasks: () => void;

  // Power Features: Subtasks, Breakdown, Timeline, Pomodoro, Zen, Sidebar
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  breakDownTask: (taskId: string, preferredChunkMinutes?: number) => number;
  scheduleTaskAt: (taskId: string, timeHHMM: string | null) => void;
  acceptLongBreak: () => void;
  dismissLongBreakSuggestion: () => void;
  setZenModeOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;

  // Timer Actions
  toggleTimer: () => void;
  pauseTimer: () => void;
  tickTimer: (nowMs: number) => void;

  // Theme & Audio Actions
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setSoundscape: (id: SoundscapeId) => void;
  setSoundVolume: (vol: number) => void;

  // Storage, Sync, Auth, Import/Export Actions
  setStoragePersisted: (persisted: boolean) => void;
  setNetworkOnline: (online: boolean) => void;
  handleAuthUserChange: (user: FocusUser | null) => Promise<void>;
  signOutUser: (clearLocalWorkspace?: boolean) => void;
  triggerManualSync: () => Promise<void>;
  exportBackupJson: () => BackupData;
  importBackupJson: (data: BackupData, mode: 'merge' | 'replace') => void;
  importSharedList: (
    payload: SharedListPayload,
    target: 'new_list' | 'active_list',
  ) => string | null;
}

function getTopTodoTaskForList(tasks: Task[], listId: string | null): Task | null {
  if (!listId) return null;
  const listTasks = tasks
    .filter((t) => !t.deleted_at && t.status === 'todo' && t.list_id === listId)
    .sort((a, b) => a.sort_order - b.sort_order);
  return listTasks[0] ?? null;
}

function syncAudioEnginePlayback(
  soundscape: SoundscapeId,
  volume: number,
  isRunning: boolean,
  onlyWhenRunning: boolean,
): void {
  if (soundscape === 'off') {
    audioEngine.setSoundscape('off', volume);
    return;
  }
  if (onlyWhenRunning && !isRunning) {
    audioEngine.setSoundscape('off', volume);
    return;
  }
  audioEngine.setSoundscape(soundscape, volume);
}

function triggerSyncIfLoggedIn(
  get: () => FocusState,
  set: (partial: Partial<FocusState> | ((s: FocusState) => Partial<FocusState>)) => void,
): void {
  const state = get();
  if (!state.user) return;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    set({ syncStatus: 'offline', pendingSync: true });
    return;
  }

  set({ pendingSync: true });
  syncScheduler.schedule(
    state.user.id,
    () => ({
      lists: get().lists,
      tasks: get().tasks,
    }),
    (status, pushResult, errMsg) => {
      if (status === 'synced' && pushResult) {
        const hasStampedUpdates =
          pushResult.upsertedLists > 0 ||
          pushResult.upsertedTasks > 0 ||
          Boolean(pushResult.remappedLists?.size) ||
          Boolean(pushResult.remappedTasks?.size);

        set((s) => {
          const stamped = hasStampedUpdates
            ? applySyncedWatermarks(s.lists, s.tasks, pushResult)
            : null;
          return {
            ...(stamped ? { lists: stamped.lists, tasks: stamped.tasks } : {}),
            syncStatus: 'synced',
            syncError: null,
            pendingSync: false,
            lastSyncedAt: pushResult.syncedAt,
            lastSyncStats: {
              upsertedLists: pushResult.upsertedLists,
              upsertedTasks: pushResult.upsertedTasks,
            },
          };
        });
        return;
      }

      set({
        syncStatus: status,
        syncError: errMsg ?? null,
        pendingSync: status === 'offline' || status === 'error',
      });
    },
  );
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      lists: INITIAL_SEED.lists,
      tasks: INITIAL_SEED.tasks,
      activeListId: INITIAL_SEED.activeListId,
      dailyFocusSeconds: {},
      dailyCategoryFocus: {},

      theme: 'dark',
      settings: DEFAULT_SETTINGS,
      soundscape: 'off',
      soundVolume: 0.5,
      activeColorPaletteId: 'rainbow-bliss',
      activeEmojiThemeId: 'default',
      customEmojiThemes: [],

      isTimerRunning: false,
      lastTickAt: null,
      overtimeNotifiedTaskId: null,
      completedPomodoroCount: 0,

      isAlarmActive: false,
      lastNagMinuteNotified: 0,
      focusedSinceLastChimeSec: 0,
      longBreakSuggestionPending: false,
      zenModeOpen: false,
      activeTab: 'list',
      user: null,
      syncStatus: 'guest',
      syncError: null,
      lastSyncedAt: null,
      lastSyncStats: null,
      pendingSync: false,
      storagePersisted: false,

      playButtonClick: () => {
        if (get().settings.buttonClicks) {
          audioEngine.playUiClick();
        }
      },

      updateSettings: (patch) => {
        const prev = get().settings;
        const next: FocusSettings = { ...prev, ...patch };

        // Keep pieTimer boolean and timerStyle cleanly synchronized
        if (patch.pieTimer !== undefined && patch.timerStyle === undefined) {
          next.timerStyle = patch.pieTimer ? 'pie' : 'circle';
        } else if (patch.timerStyle !== undefined) {
          next.pieTimer = patch.timerStyle === 'pie';
        }

        set({ settings: next });

        if (patch.soundscapeOnlyWhenRunning !== undefined) {
          syncAudioEnginePlayback(
            get().soundscape,
            get().soundVolume,
            get().isTimerRunning,
            next.soundscapeOnlyWhenRunning,
          );
        }
      },

      resetAppearanceSettings: () => {
        set((s) => ({
          settings: {
            ...s.settings,
            timerStyle: DEFAULT_SETTINGS.timerStyle,
            pieTimer: DEFAULT_SETTINGS.pieTimer,
            accentColor: DEFAULT_SETTINGS.accentColor,
            navbarPosition: DEFAULT_SETTINGS.navbarPosition,
            navbarStyle: DEFAULT_SETTINGS.navbarStyle,
            sidebarPosition: DEFAULT_SETTINGS.sidebarPosition,
            sidebarCollapsed: DEFAULT_SETTINGS.sidebarCollapsed,
            surfaceTheme: DEFAULT_SETTINGS.surfaceTheme,
            ambientGlow: DEFAULT_SETTINGS.ambientGlow,
            cardVariant: DEFAULT_SETTINGS.cardVariant,
            cardDensity: DEFAULT_SETTINGS.cardDensity,
            cornerStyle: DEFAULT_SETTINGS.cornerStyle,
            fontStyle: DEFAULT_SETTINGS.fontStyle,
            showFunToolbar: DEFAULT_SETTINGS.showFunToolbar,
            showSummaryInHeader: DEFAULT_SETTINGS.showSummaryInHeader,
            showQuickMinuteChips: DEFAULT_SETTINGS.showQuickMinuteChips,
          },
        }));
      },

      cycleAccentColor: () => {
        const current = get().settings.accentColor.toLowerCase();
        const idx = ACCENT_SWATCHES.findIndex((c) => c.toLowerCase() === current);
        const next = ACCENT_SWATCHES[(idx + 1) % ACCENT_SWATCHES.length];
        get().playButtonClick();
        set((s) => ({
          settings: { ...s.settings, accentColor: next },
        }));
      },

      applyColorMePalette: (paletteId) => {
        const state = get();
        const activeListId = state.activeListId;
        if (!activeListId) return;

        const todoTasks = state.tasks
          .filter((t) => !t.deleted_at && t.status === 'todo' && t.list_id === activeListId)
          .sort((a, b) => a.sort_order - b.sort_order);

        const now = new Date().toISOString();
        get().playButtonClick();

        if (paletteId === 'none') {
          const idSet = new Set(todoTasks.map((t) => t.id));
          set((s) => ({
            activeColorPaletteId: null,
            tasks: s.tasks.map((t) =>
              idSet.has(t.id) ? { ...t, color: 'none', updated_at: now, is_seed: false } : t,
            ),
          }));
          triggerSyncIfLoggedIn(get, set);
          return;
        }

        let targetPalette = COLOR_ME_PALETTES.find((p) => p.id === paletteId);
        if (paletteId === 'surprise' || !targetPalette) {
          const candidates = COLOR_ME_PALETTES.filter(
            (p) => p.id !== state.activeColorPaletteId,
          );
          targetPalette =
            candidates[Math.floor(Math.random() * candidates.length)] ?? COLOR_ME_PALETTES[0];
        }

        const sampled = samplePaletteForCount(targetPalette.colors, todoTasks.length);
        const colorMap = new Map<string, string>();
        todoTasks.forEach((t, i) => colorMap.set(t.id, sampled[i]));

        set((s) => ({
          activeColorPaletteId: targetPalette!.id,
          tasks: s.tasks.map((t) =>
            colorMap.has(t.id)
              ? { ...t, color: colorMap.get(t.id)!, updated_at: now, is_seed: false }
              : t,
          ),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      applyEmojiMeTheme: (themeId) => {
        const state = get();
        const activeListId = state.activeListId;
        if (!activeListId) return;

        const todoTasks = state.tasks
          .filter((t) => !t.deleted_at && t.status === 'todo' && t.list_id === activeListId)
          .sort((a, b) => a.sort_order - b.sort_order);

        const now = new Date().toISOString();
        get().playButtonClick();

        if (themeId === 'auto_match') {
          const emojiMap = new Map<string, string>();
          todoTasks.forEach((t) => emojiMap.set(t.id, suggestEmojiForTitle(t.title)));

          set((s) => ({
            activeEmojiThemeId: 'auto_match',
            tasks: s.tasks.map((t) =>
              emojiMap.has(t.id)
                ? { ...t, emoji: emojiMap.get(t.id)!, updated_at: now, is_seed: false }
                : t,
            ),
          }));
          triggerSyncIfLoggedIn(get, set);
          return;
        }

        const allThemes = [...BUILTIN_EMOJI_THEMES, ...state.customEmojiThemes];
        let targetPack = allThemes.find((p) => p.id === themeId);

        if (themeId === 'surprise' || !targetPack) {
          const candidates = allThemes.filter(
            (p) => p.id !== state.activeEmojiThemeId && p.emojis.length > 0,
          );
          targetPack =
            candidates[Math.floor(Math.random() * candidates.length)] ?? BUILTIN_EMOJI_THEMES[0];
        }

        const emojiMap = new Map<string, string>();
        todoTasks.forEach((t, idx) => {
          const em = targetPack!.emojis[idx % targetPack!.emojis.length] ?? '⚡';
          emojiMap.set(t.id, em);
        });

        set((s) => ({
          activeEmojiThemeId: targetPack!.id,
          tasks: s.tasks.map((t) =>
            emojiMap.has(t.id)
              ? { ...t, emoji: emojiMap.get(t.id)!, updated_at: now, is_seed: false }
              : t,
          ),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      pickRandomTask: () => {
        const state = get();
        const activeListId = state.activeListId;
        if (!activeListId) return null;

        const todoTasks = state.tasks
          .filter((t) => !t.deleted_at && t.status === 'todo' && t.list_id === activeListId)
          .sort((a, b) => a.sort_order - b.sort_order);

        if (todoTasks.length === 0) return null;
        get().playButtonClick();

        if (todoTasks.length === 1) return todoTasks[0].id;

        const pool = todoTasks.slice(1);
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        get().promoteTaskToTop(chosen.id);
        return chosen.id;
      },

      saveCustomEmojiTheme: (pack) => {
        const id = pack.id || `custom-${createUuid().slice(0, 8)}`;
        const cleanPack: EmojiThemePack = {
          ...pack,
          id,
          isCustom: true,
          emojis: pack.emojis.length > 0 ? pack.emojis : ['⚡', '🎯', '💻'],
        };

        set((s) => {
          const exists = s.customEmojiThemes.some((p) => p.id === id);
          return {
            customEmojiThemes: exists
              ? s.customEmojiThemes.map((p) => (p.id === id ? cleanPack : p))
              : [...s.customEmojiThemes, cleanPack],
          };
        });
        return id;
      },

      deleteCustomEmojiTheme: (packId) => {
        set((s) => ({
          customEmojiThemes: s.customEmojiThemes.filter((p) => p.id !== packId),
          ...(s.activeEmojiThemeId === packId ? { activeEmojiThemeId: 'default' } : {}),
        }));
      },

      dismissAlarm: () => {
        audioEngine.stopContinuousAlarm();
        set({ isAlarmActive: false });
      },

      selectList: (listId) => {
        get().dismissAlarm();
        get().playButtonClick();
        set({
          activeListId: listId,
          activeTab: 'list',
          isTimerRunning: false,
          lastTickAt: null,
        });
        syncAudioEnginePlayback(
          get().soundscape,
          get().soundVolume,
          false,
          get().settings.soundscapeOnlyWhenRunning,
        );
      },

      setActiveTab: (tab) => {
        get().playButtonClick();
        set({ activeTab: tab });
      },

      createList: (name, emoji = '🎯', isPreset = false) => {
        const now = new Date().toISOString();
        const id = createUuid();
        const currentLists = get().lists;
        const maxOrder = currentLists.reduce((m, l) => Math.max(m, l.sort_order), -1);

        const newList: TaskList = {
          id,
          user_id: get().user?.id,
          name: name.trim() || 'New List',
          emoji: emoji || '🎯',
          is_preset: isPreset,
          sort_order: maxOrder + 1,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          is_seed: false,
        };

        set((s) => ({
          lists: [...s.lists, newList],
          ...(!isPreset
            ? {
                activeListId: id,
                activeTab: 'list',
                isTimerRunning: false,
                lastTickAt: null,
              }
            : {}),
        }));
        triggerSyncIfLoggedIn(get, set);
        return id;
      },

      updateList: (listId, patch) => {
        const now = new Date().toISOString();
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  ...(patch.name !== undefined ? { name: patch.name.trim() || l.name } : {}),
                  ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
                  updated_at: now,
                  is_seed: false,
                }
              : l,
          ),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      deleteList: (listId) => {
        const now = new Date().toISOString();
        const state = get();
        const remainingRegular = state.lists.filter(
          (l) => !l.deleted_at && !l.is_preset && l.id !== listId,
        );
        const wasActive = state.activeListId === listId;
        const nextActiveId = wasActive ? (remainingRegular[0]?.id ?? null) : state.activeListId;

        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? { ...l, deleted_at: now, updated_at: now, is_seed: false }
              : l,
          ),
          tasks: s.tasks.map((t) =>
            t.list_id === listId && t.status !== 'not_now'
              ? { ...t, deleted_at: now, updated_at: now, is_seed: false }
              : t.list_id === listId && t.status === 'not_now'
                ? { ...t, list_id: null, updated_at: now, is_seed: false }
                : t,
          ),
          activeListId: nextActiveId,
          ...(wasActive ? { isTimerRunning: false, lastTickAt: null } : {}),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      applyPresetToActiveList: (presetId) => {
        const state = get();
        let targetListId = state.activeListId;
        const now = new Date().toISOString();

        const activeListExists = state.lists.some(
          (l) => l.id === targetListId && !l.deleted_at && !l.is_preset,
        );
        if (!activeListExists) {
          const firstRegular = state.lists.find((l) => !l.deleted_at && !l.is_preset);
          targetListId = firstRegular?.id ?? state.createList('Today', '🎯', false);
        }

        const presetTasks = get()
          .tasks.filter((t) => !t.deleted_at && t.list_id === presetId && t.status !== 'completed')
          .sort((a, b) => a.sort_order - b.sort_order);

        if (presetTasks.length === 0) return 0;

        const existingTargetTasks = get().tasks.filter(
          (t) => !t.deleted_at && t.list_id === targetListId && t.status === 'todo',
        );

        const loadToTop = get().settings.loadPresetsToTop;
        let nextOrder = loadToTop
          ? existingTargetTasks.reduce((m, t) => Math.min(m, t.sort_order), 0) -
            presetTasks.length
          : existingTargetTasks.reduce((m, t) => Math.max(m, t.sort_order), -1) + 1;

        const cloned: Task[] = presetTasks.map((pt) => ({
          id: createUuid(),
          user_id: state.user?.id,
          list_id: targetListId,
          title: pt.title,
          emoji: pt.emoji,
          color: pt.color,
          duration_seconds: pt.duration_seconds,
          remaining_seconds: pt.duration_seconds,
          actual_focused_seconds: 0,
          overtime_added_seconds: 0,
          status: 'todo',
          sort_order: nextOrder++,
          completed_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          is_seed: false,
        }));

        get().playButtonClick();

        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === targetListId ? { ...l, is_seed: false, updated_at: now } : l,
          ),
          tasks: [...s.tasks, ...cloned],
          activeListId: targetListId,
          activeTab: 'list',
          ...(loadToTop ? { isTimerRunning: false, lastTickAt: null } : {}),
        }));

        triggerSyncIfLoggedIn(get, set);
        return cloned.length;
      },

      saveActiveListAsPreset: (presetName) => {
        const state = get();
        const activeList = state.lists.find((l) => l.id === state.activeListId && !l.deleted_at);
        if (!activeList) return null;

        const activeTasks = state.tasks
          .filter((t) => !t.deleted_at && t.list_id === activeList.id && t.status === 'todo')
          .sort((a, b) => a.sort_order - b.sort_order);

        if (activeTasks.length === 0) return null;

        const now = new Date().toISOString();
        const presetId = createUuid();
        const maxOrder = state.lists.reduce((m, l) => Math.max(m, l.sort_order), -1);

        const newPreset: TaskList = {
          id: presetId,
          user_id: state.user?.id,
          name:
            presetName?.trim() ||
            `${activeList.name} ${state.settings.language === 'tr' ? 'Şablonu' : 'Preset'}`,
          emoji: activeList.emoji || '📋',
          is_preset: true,
          sort_order: maxOrder + 1,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          is_seed: false,
        };

        const clonedTasks: Task[] = activeTasks.map((t, index) => ({
          id: createUuid(),
          user_id: state.user?.id,
          list_id: presetId,
          title: t.title,
          emoji: t.emoji,
          color: t.color,
          duration_seconds: t.duration_seconds,
          remaining_seconds: t.duration_seconds,
          actual_focused_seconds: 0,
          overtime_added_seconds: 0,
          status: 'todo',
          sort_order: index,
          completed_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          is_seed: false,
        }));

        get().playButtonClick();

        set((s) => ({
          lists: [...s.lists, newPreset],
          tasks: [...s.tasks, ...clonedTasks],
        }));

        triggerSyncIfLoggedIn(get, set);
        return presetId;
      },

      addTask: ({
        title,
        durationSeconds,
        emoji = '⚡',
        color = 'none',
        status = 'todo',
        listId,
      }) => {
        const state = get();
        const now = new Date().toISOString();
        let resolvedListId: string | null = listId !== undefined ? listId : state.activeListId;

        if (status === 'todo' && !resolvedListId) {
          const firstRegular = state.lists.find((l) => !l.deleted_at && !l.is_preset);
          resolvedListId = firstRegular?.id ?? state.createList('Today', '🎯', false);
        }

        const relevantTasks = get().tasks.filter(
          (t) =>
            !t.deleted_at &&
            t.status === status &&
            (status === 'not_now' ? true : t.list_id === resolvedListId),
        );
        const maxOrder = relevantTasks.reduce((m, t) => Math.max(m, t.sort_order), -1);

        const safeDuration = Math.max(60, Math.round(durationSeconds));
        const id = createUuid();
        const newTask: Task = {
          id,
          user_id: get().user?.id,
          list_id: status === 'not_now' ? null : resolvedListId,
          title: title.trim() || 'Untitled Task',
          emoji: emoji || '⚡',
          color,
          duration_seconds: safeDuration,
          remaining_seconds: safeDuration,
          actual_focused_seconds: 0,
          overtime_added_seconds: 0,
          status,
          sort_order: maxOrder + 1,
          completed_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          is_seed: false,
        };

        get().playButtonClick();

        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === resolvedListId ? { ...l, is_seed: false, updated_at: now } : l,
          ),
          tasks: [...s.tasks, newTask],
        }));

        triggerSyncIfLoggedIn(get, set);
        return id;
      },

      updateTask: (taskId, patch) => {
        if (get().isTimerRunning) {
          get().tickTimer(Date.now());
        }
        const now = new Date().toISOString();
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const rawDuration =
              patch.duration_seconds !== undefined
                ? Math.max(60, Math.round(patch.duration_seconds))
                : t.duration_seconds;
            const nextRemaining =
              patch.remaining_seconds !== undefined
                ? Math.round(patch.remaining_seconds)
                : patch.duration_seconds !== undefined
                  ? Math.max(60, Math.round(patch.duration_seconds))
                  : t.remaining_seconds;
            const nextDuration = Math.max(rawDuration, Math.max(0, nextRemaining));

            return {
              ...t,
              ...(patch.title !== undefined ? { title: patch.title.trim() || t.title } : {}),
              ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
              ...(patch.color !== undefined ? { color: patch.color } : {}),
              duration_seconds: nextDuration,
              remaining_seconds: nextRemaining,
              updated_at: now,
              is_seed: false,
            };
          }),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      deleteTask: (taskId) => {
        const now = new Date().toISOString();
        const state = get();
        const topTask = getTopTodoTaskForList(state.tasks, state.activeListId);
        const deletingTop = topTask?.id === taskId;
        if (deletingTop) get().dismissAlarm();

        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, deleted_at: now, updated_at: now, is_seed: false } : t,
          ),
          ...(deletingTop ? { isTimerRunning: false, lastTickAt: null } : {}),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      reorderActiveTasks: (activeId, overId) => {
        if (activeId === overId) return;
        const state = get();
        const listId = state.activeListId;
        if (!listId) return;

        const currentListTasks = state.tasks
          .filter((t) => !t.deleted_at && t.status === 'todo' && t.list_id === listId)
          .sort((a, b) => a.sort_order - b.sort_order);

        const oldIndex = currentListTasks.findIndex((t) => t.id === activeId);
        const newIndex = currentListTasks.findIndex((t) => t.id === overId);
        if (oldIndex === -1 || newIndex === -1) return;

        const previousTopId = currentListTasks[0]?.id;
        const reordered = arrayMove(currentListTasks, oldIndex, newIndex);
        const newTopId = reordered[0]?.id;
        const orderMap = new Map<string, number>();
        reordered.forEach((t, idx) => orderMap.set(t.id, idx));

        const now = new Date().toISOString();
        const topChanged = previousTopId !== newTopId;
        if (topChanged) get().dismissAlarm();

        set((s) => ({
          tasks: s.tasks.map((t) =>
            orderMap.has(t.id)
              ? { ...t, sort_order: orderMap.get(t.id)!, updated_at: now, is_seed: false }
              : t,
          ),
          ...(topChanged
            ? { isTimerRunning: false, lastTickAt: null, overtimeNotifiedTaskId: null }
            : {}),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      promoteTaskToTop: (taskId) => {
        const state = get();
        const target = state.tasks.find((t) => t.id === taskId && !t.deleted_at);
        if (!target || !target.list_id) return;

        const listTasks = state.tasks
          .filter((t) => !t.deleted_at && t.status === 'todo' && t.list_id === target.list_id)
          .sort((a, b) => a.sort_order - b.sort_order);

        const idx = listTasks.findIndex((t) => t.id === taskId);
        if (idx <= 0) return;

        get().dismissAlarm();
        const reordered = arrayMove(listTasks, idx, 0);
        const orderMap = new Map<string, number>();
        reordered.forEach((t, i) => orderMap.set(t.id, i));
        const now = new Date().toISOString();

        set((s) => ({
          tasks: s.tasks.map((t) =>
            orderMap.has(t.id)
              ? { ...t, sort_order: orderMap.get(t.id)!, updated_at: now, is_seed: false }
              : t,
          ),
          isTimerRunning: false,
          lastTickAt: null,
          overtimeNotifiedTaskId: null,
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      completeTask: (taskId) => {
        const now = new Date().toISOString();
        const state = get();
        const completedTarget = state.tasks.find((t) => t.id === taskId);
        const topTask = getTopTodoTaskForList(state.tasks, state.activeListId);
        const completingTop = topTask?.id === taskId;

        if (completingTop) {
          get().dismissAlarm();
        }

        if (state.settings.buttonClicks) {
          audioEngine.playCompleteSound();
        }

        // Smart Pomodoro Auto-Break Cycle
        let breakTaskToInsert: Task | null = null;
        let nextPomodoroCount = state.completedPomodoroCount;
        let suggestLongBreak = false;

        if (
          state.settings.pomodoroAutoBreak &&
          completedTarget &&
          !completedTarget.is_break &&
          completedTarget.list_id === state.activeListId
        ) {
          nextPomodoroCount += 1;
          const interval = Math.max(2, state.settings.longBreakInterval);
          if (nextPomodoroCount % interval === 0) {
            suggestLongBreak = true;
          } else {
            const activeTodos = state.tasks.filter(
              (t) =>
                !t.deleted_at &&
                t.status === 'todo' &&
                t.list_id === state.activeListId &&
                t.id !== taskId,
            );
            const minOrder = activeTodos.reduce((m, t) => Math.min(m, t.sort_order), 0);
            const breakSecs = Math.max(1, state.settings.shortBreakMinutes) * 60;
            breakTaskToInsert = {
              id: createUuid(),
              user_id: state.user?.id,
              list_id: state.activeListId,
              title:
                state.settings.language === 'tr' ? 'Kısa Mola' : 'Short Break',
              emoji: '☕',
              color: '#0fa988',
              duration_seconds: breakSecs,
              remaining_seconds: breakSecs,
              actual_focused_seconds: 0,
              overtime_added_seconds: 0,
              status: 'todo',
              sort_order: minOrder - 1,
              subtasks: [],
              scheduled_start: null,
              is_break: true,
              completed_at: null,
              created_at: now,
              updated_at: now,
              deleted_at: null,
              is_seed: false,
            };
          }
        }

        const remainingActiveCount =
          state.tasks.filter(
            (t) =>
              !t.deleted_at &&
              t.status === 'todo' &&
              t.list_id === state.activeListId &&
              t.id !== taskId,
          ).length + (breakTaskToInsert ? 1 : 0);

        const shouldAutoStart =
          completingTop && state.settings.autoStartNextTask && remainingActiveCount > 0;

        set((s) => ({
          tasks: [
            ...s.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status: 'completed' as const,
                    completed_at: now,
                    updated_at: now,
                    is_seed: false,
                  }
                : t,
            ),
            ...(breakTaskToInsert ? [breakTaskToInsert] : []),
          ],
          completedPomodoroCount: nextPomodoroCount,
          longBreakSuggestionPending: suggestLongBreak ? true : s.longBreakSuggestionPending,
          ...(completingTop
            ? {
                isTimerRunning: shouldAutoStart,
                lastTickAt: shouldAutoStart ? Date.now() : null,
                overtimeNotifiedTaskId: null,
                lastNagMinuteNotified: 0,
              }
            : {}),
        }));

        syncAudioEnginePlayback(
          get().soundscape,
          get().soundVolume,
          get().isTimerRunning,
          get().settings.soundscapeOnlyWhenRunning,
        );

        triggerSyncIfLoggedIn(get, set);
      },

      addSubtask: (taskId, title) => {
        const clean = title.trim();
        if (!clean) return;
        const now = new Date().toISOString();
        const sub: SubTask = { id: createUuid(), title: clean, completed: false };
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: [...(t.subtasks ?? []), sub],
                  updated_at: now,
                  is_seed: false,
                }
              : t,
          ),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      toggleSubtask: (taskId, subtaskId) => {
        const now = new Date().toISOString();
        get().playButtonClick();
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: (t.subtasks ?? []).map((st) =>
                    st.id === subtaskId ? { ...st, completed: !st.completed } : st,
                  ),
                  updated_at: now,
                  is_seed: false,
                }
              : t,
          ),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      deleteSubtask: (taskId, subtaskId) => {
        const now = new Date().toISOString();
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: (t.subtasks ?? []).filter((st) => st.id !== subtaskId),
                  updated_at: now,
                  is_seed: false,
                }
              : t,
          ),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      breakDownTask: (taskId, preferredChunkMinutes = 30) => {
        const state = get();
        const target = state.tasks.find((t) => t.id === taskId && !t.deleted_at);
        if (!target || target.status !== 'todo') return 0;

        const baseSeconds =
          target.remaining_seconds > 60 ? target.remaining_seconds : target.duration_seconds;
        const parts = generateSmartBreakdown(
          target.title,
          baseSeconds,
          preferredChunkMinutes,
          state.settings.language,
        );
        if (parts.length <= 1) return 0;

        const now = new Date().toISOString();
        const topTask = getTopTodoTaskForList(state.tasks, state.activeListId);
        const breakingTop = topTask?.id === taskId;
        if (breakingTop) get().dismissAlarm();
        get().playButtonClick();

        const siblings = state.tasks
          .filter(
            (t) =>
              !t.deleted_at &&
              t.status === 'todo' &&
              t.list_id === target.list_id &&
              t.id !== taskId,
          )
          .sort((a, b) => a.sort_order - b.sort_order);

        const newTasks: Task[] = parts.map((p, idx) => ({
          id: createUuid(),
          user_id: state.user?.id,
          list_id: target.list_id,
          title: p.title,
          emoji: p.emoji,
          color: target.color,
          duration_seconds: p.durationSeconds,
          remaining_seconds: p.durationSeconds,
          actual_focused_seconds: 0,
          overtime_added_seconds: 0,
          status: 'todo',
          sort_order: target.sort_order + idx,
          subtasks: [],
          scheduled_start: idx === 0 ? target.scheduled_start ?? null : null,
          completed_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          is_seed: false,
        }));

        // Shift siblings that had sort_order >= target.sort_order
        const shiftBy = newTasks.length - 1;
        const shiftIds = new Set(
          siblings.filter((t) => t.sort_order >= target.sort_order).map((t) => t.id),
        );

        set((s) => ({
          tasks: [
            ...s.tasks.map((t) => {
              if (t.id === taskId) {
                return { ...t, deleted_at: now, updated_at: now, is_seed: false };
              }
              if (shiftIds.has(t.id)) {
                return {
                  ...t,
                  sort_order: t.sort_order + shiftBy,
                  updated_at: now,
                  is_seed: false,
                };
              }
              return t;
            }),
            ...newTasks,
          ],
          ...(breakingTop
            ? { isTimerRunning: false, lastTickAt: null, overtimeNotifiedTaskId: null }
            : {}),
        }));

        triggerSyncIfLoggedIn(get, set);
        return newTasks.length;
      },

      scheduleTaskAt: (taskId, timeHHMM) => {
        const now = new Date().toISOString();
        get().playButtonClick();
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, scheduled_start: timeHHMM, updated_at: now, is_seed: false }
              : t,
          ),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      acceptLongBreak: () => {
        const state = get();
        const activeListId = state.activeListId;
        if (!activeListId) {
          set({ longBreakSuggestionPending: false });
          return;
        }
        const now = new Date().toISOString();
        const activeTodos = state.tasks.filter(
          (t) => !t.deleted_at && t.status === 'todo' && t.list_id === activeListId,
        );
        const minOrder = activeTodos.reduce((m, t) => Math.min(m, t.sort_order), 0);
        const breakSecs = Math.max(1, state.settings.longBreakMinutes) * 60;

        const longBreakTask: Task = {
          id: createUuid(),
          user_id: state.user?.id,
          list_id: activeListId,
          title:
            state.settings.language === 'tr' ? 'Uzun Mola' : 'Long Recharge Break',
          emoji: '🌿',
          color: '#4caf6a',
          duration_seconds: breakSecs,
          remaining_seconds: breakSecs,
          actual_focused_seconds: 0,
          overtime_added_seconds: 0,
          status: 'todo',
          sort_order: minOrder - 1,
          subtasks: [],
          scheduled_start: null,
          is_break: true,
          completed_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          is_seed: false,
        };

        get().playButtonClick();
        set((s) => ({
          tasks: [...s.tasks, longBreakTask],
          longBreakSuggestionPending: false,
          isTimerRunning: false,
          lastTickAt: null,
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      dismissLongBreakSuggestion: () => set({ longBreakSuggestionPending: false }),

      setZenModeOpen: (open) => set({ zenModeOpen: open }),

      toggleSidebarCollapsed: () => {
        get().playButtonClick();
        set((s) => ({
          settings: {
            ...s.settings,
            sidebarCollapsed: !s.settings.sidebarCollapsed,
          },
        }));
      },

      uncompleteTask: (taskId) => {
        const now = new Date().toISOString();
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task) return;

        let targetListId = task.list_id;
        const listAlive =
          targetListId && state.lists.some((l) => l.id === targetListId && !l.deleted_at);
        if (!listAlive) {
          targetListId =
            state.activeListId ??
            state.lists.find((l) => !l.deleted_at && !l.is_preset)?.id ??
            null;
        }

        const listTodos = state.tasks.filter(
          (t) => !t.deleted_at && t.status === 'todo' && t.list_id === targetListId,
        );
        const maxOrder = listTodos.reduce((m, t) => Math.max(m, t.sort_order), -1);

        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'todo',
                  list_id: targetListId,
                  completed_at: null,
                  remaining_seconds:
                    t.remaining_seconds <= 0 ? t.duration_seconds : t.remaining_seconds,
                  sort_order: maxOrder + 1,
                  updated_at: now,
                  is_seed: false,
                }
              : t,
          ),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      resetTaskTimer: (taskId) => {
        const now = new Date().toISOString();
        const state = get();
        const topTask = getTopTodoTaskForList(state.tasks, state.activeListId);
        const resettingTop = topTask?.id === taskId;
        if (resettingTop) get().dismissAlarm();

        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  remaining_seconds: t.duration_seconds,
                  updated_at: now,
                  is_seed: false,
                }
              : t,
          ),
          ...(resettingTop
            ? {
                isTimerRunning: false,
                lastTickAt: null,
                overtimeNotifiedTaskId: null,
                lastNagMinuteNotified: 0,
              }
            : {}),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      moveToNotNow: (taskId) => {
        const now = new Date().toISOString();
        const state = get();
        const topTask = getTopTodoTaskForList(state.tasks, state.activeListId);
        const movingTop = topTask?.id === taskId;
        if (movingTop) get().dismissAlarm();

        const notNowTasks = state.tasks.filter((t) => !t.deleted_at && t.status === 'not_now');
        const maxOrder = notNowTasks.reduce((m, t) => Math.max(m, t.sort_order), -1);

        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'not_now',
                  list_id: null,
                  sort_order: maxOrder + 1,
                  updated_at: now,
                  is_seed: false,
                }
              : t,
          ),
          ...(movingTop
            ? { isTimerRunning: false, lastTickAt: null, overtimeNotifiedTaskId: null }
            : {}),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      recallFromNotNow: (taskId, position = 'bottom') => {
        const now = new Date().toISOString();
        const state = get();
        let targetListId = state.activeListId;
        if (
          !targetListId ||
          !state.lists.some((l) => l.id === targetListId && !l.deleted_at && !l.is_preset)
        ) {
          targetListId =
            state.lists.find((l) => !l.deleted_at && !l.is_preset)?.id ??
            state.createList('Today', '🎯', false);
        }

        const currentTodos = get()
          .tasks.filter((t) => !t.deleted_at && t.status === 'todo' && t.list_id === targetListId)
          .sort((a, b) => a.sort_order - b.sort_order);

        const minOrder = currentTodos.reduce((m, t) => Math.min(m, t.sort_order), 0);
        const maxOrder = currentTodos.reduce((m, t) => Math.max(m, t.sort_order), -1);
        const nextOrder = position === 'top' ? minOrder - 1 : maxOrder + 1;

        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'todo',
                  list_id: targetListId,
                  sort_order: nextOrder,
                  updated_at: now,
                  is_seed: false,
                }
              : t,
          ),
          activeListId: targetListId,
          activeTab: 'list',
          ...(position === 'top'
            ? { isTimerRunning: false, lastTickAt: null, overtimeNotifiedTaskId: null }
            : {}),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      adjustTaskMinutes: (taskId, deltaMinutes) => {
        if (get().isTimerRunning) {
          get().tickTimer(Date.now());
        }
        const now = new Date().toISOString();
        const deltaSec = deltaMinutes * 60;
        if (deltaSec > 0) get().dismissAlarm();
        get().playButtonClick();

        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const nextRemaining =
              deltaSec < 0
                ? Math.max(60, t.remaining_seconds + deltaSec)
                : t.remaining_seconds + deltaSec;
            const appliedDelta = nextRemaining - t.remaining_seconds;
            const nextDuration = Math.max(
              60,
              Math.max(nextRemaining, t.duration_seconds + appliedDelta),
            );
            return {
              ...t,
              duration_seconds: nextDuration,
              remaining_seconds: nextRemaining,
              updated_at: now,
              is_seed: false,
            };
          }),
          ...(deltaSec > 0 ? { overtimeNotifiedTaskId: null, lastNagMinuteNotified: 0 } : {}),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      addOvertimeToTask: (taskId) => {
        const now = new Date().toISOString();
        get().dismissAlarm();
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== taskId || t.remaining_seconds >= 0) return t;
            const overtimeSec = Math.abs(t.remaining_seconds);
            return {
              ...t,
              duration_seconds: t.duration_seconds + overtimeSec,
              overtime_added_seconds: t.overtime_added_seconds + overtimeSec,
              remaining_seconds: 0,
              updated_at: now,
              is_seed: false,
            };
          }),
          isTimerRunning: false,
          lastTickAt: null,
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      clearCompletedTasks: () => {
        const now = new Date().toISOString();
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.status === 'completed' && !t.deleted_at
              ? { ...t, deleted_at: now, updated_at: now, is_seed: false }
              : t,
          ),
        }));
        triggerSyncIfLoggedIn(get, set);
      },

      toggleTimer: () => {
        const state = get();
        const topTask = getTopTodoTaskForList(state.tasks, state.activeListId);
        if (!topTask) return;

        get().playButtonClick();

        if (state.isTimerRunning) {
          get().pauseTimer();
        } else {
          set({
            isTimerRunning: true,
            lastTickAt: Date.now(),
            overtimeNotifiedTaskId: topTask.remaining_seconds <= 0 ? topTask.id : null,
          });
          syncAudioEnginePlayback(
            state.soundscape,
            state.soundVolume,
            true,
            state.settings.soundscapeOnlyWhenRunning,
          );
        }
      },

      pauseTimer: () => {
        const state = get();
        if (!state.isTimerRunning) return;
        get().tickTimer(Date.now());
        set({ isTimerRunning: false, lastTickAt: null });
        syncAudioEnginePlayback(
          get().soundscape,
          get().soundVolume,
          false,
          get().settings.soundscapeOnlyWhenRunning,
        );
        triggerSyncIfLoggedIn(get, set);
      },

      tickTimer: (nowMs) => {
        const state = get();
        if (!state.isTimerRunning || !state.lastTickAt) return;

        const deltaSec = Math.floor((nowMs - state.lastTickAt) / 1000);
        if (deltaSec <= 0) return;

        const topTask = getTopTodoTaskForList(state.tasks, state.activeListId);
        if (!topTask) {
          set({ isTimerRunning: false, lastTickAt: null });
          return;
        }

        const { settings } = state;
        const prevRemaining = topTask.remaining_seconds;
        let nextRemaining = prevRemaining - deltaSec;
        let shouldStopAtZero = false;

        if (!settings.enableOvertime && nextRemaining <= 0) {
          nextRemaining = 0;
          shouldStopAtZero = true;
        }

        const effectiveFocusedDelta = shouldStopAtZero
          ? Math.max(0, prevRemaining)
          : deltaSec;

        const todayKey = getLocalDateKey(new Date(nowMs));
        const nextLastTick = state.lastTickAt + deltaSec * 1000;
        const nowIso = new Date(nowMs).toISOString();

        const crossedZero =
          prevRemaining > 0 &&
          nextRemaining <= 0 &&
          state.overtimeNotifiedTaskId !== topTask.id;

        if (crossedZero) {
          sendTimerFinishedNotification(topTask.title, topTask.emoji, settings.language);
          if (settings.audioAlarm) {
            if (settings.audioAlarmContinuous) {
              audioEngine.startContinuousAlarm();
            } else {
              audioEngine.playTimerDoneChime();
            }
          }
        }

        // Periodic Nag alarm once per minute in overtime
        let nextNagMinute = state.lastNagMinuteNotified;
        if (
          !crossedZero &&
          settings.enableOvertime &&
          settings.audioAlarm &&
          settings.audioAlarmNag &&
          !settings.audioAlarmContinuous &&
          state.isAlarmActive &&
          nextRemaining < 0
        ) {
          const overtimeMin = Math.floor(Math.abs(nextRemaining) / 60);
          if (overtimeMin > 0 && overtimeMin > state.lastNagMinuteNotified) {
            audioEngine.playTimerDoneChime();
            nextNagMinute = overtimeMin;
          }
        }

        // Periodic mindfulness interval Chimes
        let nextChimeElapsed = state.focusedSinceLastChimeSec + effectiveFocusedDelta;
        const chimeIntervalSec = Math.max(1, settings.chimeIntervalMinutes) * 60;
        if (settings.chimesEnabled && nextChimeElapsed >= chimeIntervalSec) {
          audioEngine.playIntervalChime(settings.chimeVolume);
          nextChimeElapsed = nextChimeElapsed % chimeIntervalSec;
        }

        const activateAlarm =
          crossedZero &&
          (settings.visualAlarm ||
            (settings.audioAlarm &&
              (settings.audioAlarmContinuous || settings.audioAlarmNag)));

        set((s) => {
          const prevBucket = s.dailyCategoryFocus[todayKey] ?? { byList: {}, byColor: {} };
          const listKey = topTask.list_id ?? '__none__';
          const colorKey = normalizeHex(topTask.color) ?? '__none__';

          return {
            tasks: s.tasks.map((t) =>
              t.id === topTask.id
                ? {
                    ...t,
                    remaining_seconds: nextRemaining,
                    actual_focused_seconds: t.actual_focused_seconds + effectiveFocusedDelta,
                    updated_at: nowIso,
                    is_seed: false,
                  }
                : t,
            ),
            dailyFocusSeconds: {
              ...s.dailyFocusSeconds,
              [todayKey]: (s.dailyFocusSeconds[todayKey] ?? 0) + effectiveFocusedDelta,
            },
            dailyCategoryFocus:
              effectiveFocusedDelta > 0
                ? {
                    ...s.dailyCategoryFocus,
                    [todayKey]: {
                      byList: {
                        ...prevBucket.byList,
                        [listKey]: (prevBucket.byList[listKey] ?? 0) + effectiveFocusedDelta,
                      },
                      byColor: {
                        ...prevBucket.byColor,
                        [colorKey]: (prevBucket.byColor[colorKey] ?? 0) + effectiveFocusedDelta,
                      },
                    },
                  }
                : s.dailyCategoryFocus,
            lastTickAt: shouldStopAtZero ? null : nextLastTick,
            isTimerRunning: shouldStopAtZero ? false : s.isTimerRunning,
            focusedSinceLastChimeSec: nextChimeElapsed,
            lastNagMinuteNotified: nextNagMinute,
            ...(crossedZero ? { overtimeNotifiedTaskId: topTask.id } : {}),
            ...(activateAlarm ? { isAlarmActive: true } : {}),
          };
        });
      },

      toggleTheme: () => {
        get().playButtonClick();
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' }));
      },

      setTheme: (theme) => set({ theme }),

      setSoundscape: (id) => {
        const state = get();
        syncAudioEnginePlayback(
          id,
          state.soundVolume,
          state.isTimerRunning,
          state.settings.soundscapeOnlyWhenRunning,
        );
        set({ soundscape: id });
      },

      setSoundVolume: (vol) => {
        const clamped = Math.max(0, Math.min(1, vol));
        audioEngine.setVolume(clamped);
        set({ soundVolume: clamped });
      },

      setStoragePersisted: (persisted) => set({ storagePersisted: persisted }),

      setNetworkOnline: (online) => {
        const state = get();
        if (!state.user) {
          set({ syncStatus: 'guest' });
          return;
        }
        if (!online) {
          set({ syncStatus: 'offline' });
        } else if (
          state.pendingSync ||
          state.syncStatus === 'offline' ||
          state.syncStatus === 'error'
        ) {
          void state.triggerManualSync();
        } else {
          set({ syncStatus: 'synced' });
        }
      },

      handleAuthUserChange: async (user) => {
        if (!user) {
          syncScheduler.cancel();
          set({ user: null, syncStatus: 'guest', syncError: null, pendingSync: false });
          return;
        }

        const currentUser = get().user;
        if (currentUser?.id === user.id && get().syncStatus === 'synced') {
          return;
        }

        set({ user, syncStatus: 'syncing', syncError: null });

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          set({ syncStatus: 'offline', pendingSync: true });
          return;
        }

        try {
          // Strict isolation: only merge local records belonging to guest (!user_id) or this user
          const state = get();
          const eligibleLists = state.lists.filter((l) => !l.user_id || l.user_id === user.id);
          const eligibleTasks = state.tasks.filter((t) => !t.user_id || t.user_id === user.id);
          const merged = await mergeAndSyncWithCloud(user.id, eligibleLists, eligibleTasks);

          const currentActive = get().activeListId;
          const regularLists = merged.lists.filter((l) => !l.deleted_at && !l.is_preset);
          const nextActiveId = regularLists.some((l) => l.id === currentActive)
            ? currentActive
            : (regularLists[0]?.id ?? null);

          set({
            lists: merged.lists,
            tasks: merged.tasks,
            activeListId: nextActiveId,
            syncStatus: 'synced',
            lastSyncedAt: merged.syncedAt,
            lastSyncStats: {
              upsertedLists: merged.upsertedLists,
              upsertedTasks: merged.upsertedTasks,
            },
            pendingSync: false,
            syncError: null,
          });
        } catch (err) {
          set({
            syncStatus: 'error',
            syncError: formatSyncErrorMessage(err),
            pendingSync: true,
          });
        }
      },

      signOutUser: (clearLocalWorkspace = true) => {
        syncScheduler.cancel();
        get().dismissAlarm();

        if (clearLocalWorkspace) {
          const freshSeed = createInitialSeedData();
          set({
            lists: freshSeed.lists,
            tasks: freshSeed.tasks,
            activeListId: freshSeed.activeListId,
            dailyFocusSeconds: {},
            dailyCategoryFocus: {},
            activeTab: 'list',
            isTimerRunning: false,
            lastTickAt: null,
            overtimeNotifiedTaskId: null,
            user: null,
            syncStatus: 'guest',
            syncError: null,
            lastSyncedAt: null,
            lastSyncStats: null,
            pendingSync: false,
          });
        } else {
          // Detach an offline guest copy with brand new UUIDs so it never collides with the cloud account
          const state = get();
          const now = new Date().toISOString();
          const listIdMap = new Map<string, string>();
          const detachedLists: TaskList[] = state.lists
            .filter((l) => !l.deleted_at)
            .map((l) => {
              const newId = createUuid();
              listIdMap.set(l.id, newId);
              return {
                ...l,
                id: newId,
                user_id: undefined,
                synced_updated_at: undefined,
                updated_at: now,
                is_seed: false,
              };
            });

          const detachedTasks: Task[] = state.tasks
            .filter((t) => !t.deleted_at)
            .map((t) => ({
              ...t,
              id: createUuid(),
              user_id: undefined,
              synced_updated_at: undefined,
              list_id: t.list_id ? (listIdMap.get(t.list_id) ?? null) : null,
              updated_at: now,
              is_seed: false,
            }));

          const nextActive =
            (state.activeListId && listIdMap.get(state.activeListId)) ??
            detachedLists.find((l) => !l.is_preset)?.id ??
            null;

          set({
            lists: detachedLists,
            tasks: detachedTasks,
            activeListId: nextActive,
            isTimerRunning: false,
            lastTickAt: null,
            user: null,
            syncStatus: 'guest',
            syncError: null,
            lastSyncedAt: null,
            lastSyncStats: null,
            pendingSync: false,
          });
        }

        syncAudioEnginePlayback(
          get().soundscape,
          get().soundVolume,
          false,
          get().settings.soundscapeOnlyWhenRunning,
        );
      },

      triggerManualSync: async () => {
        const state = get();
        if (!state.user) return;
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          set({ syncStatus: 'offline', pendingSync: true });
          return;
        }

        set({ syncStatus: 'syncing', syncError: null });
        try {
          const merged = await mergeAndSyncWithCloud(state.user.id, state.lists, state.tasks);
          const regularLists = merged.lists.filter((l) => !l.deleted_at && !l.is_preset);
          const nextActiveId = regularLists.some((l) => l.id === get().activeListId)
            ? get().activeListId
            : (regularLists[0]?.id ?? null);

          set({
            lists: merged.lists,
            tasks: merged.tasks,
            activeListId: nextActiveId,
            syncStatus: 'synced',
            lastSyncedAt: merged.syncedAt,
            lastSyncStats: {
              upsertedLists: merged.upsertedLists,
              upsertedTasks: merged.upsertedTasks,
            },
            pendingSync: false,
            syncError: null,
          });
        } catch (err) {
          set({ syncStatus: 'error', syncError: formatSyncErrorMessage(err), pendingSync: true });
        }
      },

      exportBackupJson: () => {
        const state = get();
        return {
          version: 3,
          exportedAt: new Date().toISOString(),
          lists: state.lists.filter((l) => !l.deleted_at),
          tasks: state.tasks.filter((t) => !t.deleted_at),
          dailyFocusSeconds: state.dailyFocusSeconds,
          dailyCategoryFocus: state.dailyCategoryFocus,
          activeListId: state.activeListId,
          settings: state.settings,
          customEmojiThemes: state.customEmojiThemes,
        };
      },

      importBackupJson: (data, mode) => {
        if (!Array.isArray(data.lists) || !Array.isArray(data.tasks)) {
          throw new Error('Invalid JSON backup file.');
        }

        const now = new Date().toISOString();
        const userId = get().user?.id;

        const cleanLists: TaskList[] = data.lists.map((l, idx) => ({
          id: l.id || createUuid(),
          user_id: userId,
          name: String(l.name || 'List').trim() || 'List',
          emoji: l.emoji || '🎯',
          is_preset: Boolean(l.is_preset),
          sort_order: Number.isFinite(l.sort_order) ? l.sort_order : idx,
          created_at: l.created_at || now,
          updated_at: now,
          deleted_at: null,
          is_seed: false,
        }));

        const validListIds = new Set(cleanLists.map((l) => l.id));
        const cleanTasks: Task[] = data.tasks.map((t, idx) => ({
          id: t.id || createUuid(),
          user_id: userId,
          list_id: t.list_id && validListIds.has(t.list_id) ? t.list_id : null,
          title: String(t.title || 'Task').trim() || 'Task',
          emoji: t.emoji || '⚡',
          color: t.color || 'none',
          duration_seconds: Math.max(60, Number(t.duration_seconds) || 1500),
          remaining_seconds: Number.isFinite(t.remaining_seconds)
            ? t.remaining_seconds
            : Math.max(60, Number(t.duration_seconds) || 1500),
          actual_focused_seconds: Math.max(0, Number(t.actual_focused_seconds) || 0),
          overtime_added_seconds: Math.max(0, Number(t.overtime_added_seconds) || 0),
          status: t.status === 'not_now' || t.status === 'completed' ? t.status : 'todo',
          sort_order: Number.isFinite(t.sort_order) ? t.sort_order : idx,
          completed_at: t.completed_at ?? null,
          created_at: t.created_at || now,
          updated_at: now,
          deleted_at: null,
          is_seed: false,
        }));

        if (mode === 'replace') {
          const firstRegular = cleanLists.find((l) => !l.is_preset);
          const nextActive =
            data.activeListId && validListIds.has(data.activeListId)
              ? data.activeListId
              : (firstRegular?.id ?? null);

          set((s) => ({
            lists: cleanLists,
            tasks: cleanTasks,
            dailyFocusSeconds: data.dailyFocusSeconds ?? {},
            dailyCategoryFocus: data.dailyCategoryFocus ?? {},
            activeListId: nextActive,
            isTimerRunning: false,
            lastTickAt: null,
            activeTab: 'list',
            settings: data.settings ? { ...DEFAULT_SETTINGS, ...data.settings, ambientGlow: false } : s.settings,
            customEmojiThemes: Array.isArray(data.customEmojiThemes)
              ? data.customEmojiThemes
              : s.customEmojiThemes,
          }));
        } else {
          const state = get();
          const listMap = new Map(state.lists.map((l) => [l.id, l]));
          for (const l of cleanLists) listMap.set(l.id, l);

          const taskMap = new Map(state.tasks.map((t) => [t.id, t]));
          for (const t of cleanTasks) taskMap.set(t.id, t);

          const mergedDaily: DailyFocusMap = { ...state.dailyFocusSeconds };
          for (const [k, v] of Object.entries(data.dailyFocusSeconds ?? {})) {
            mergedDaily[k] = Math.max(mergedDaily[k] ?? 0, Number(v) || 0);
          }

          const mergedCategory: DailyCategoryFocusMap = { ...state.dailyCategoryFocus };
          for (const [dateKey, bucket] of Object.entries(data.dailyCategoryFocus ?? {})) {
            const cur = mergedCategory[dateKey] ?? { byList: {}, byColor: {} };
            const byList = { ...cur.byList };
            const byColor = { ...cur.byColor };
            for (const [lk, lv] of Object.entries(bucket.byList ?? {})) {
              byList[lk] = Math.max(byList[lk] ?? 0, Number(lv) || 0);
            }
            for (const [ck, cv] of Object.entries(bucket.byColor ?? {})) {
              byColor[ck] = Math.max(byColor[ck] ?? 0, Number(cv) || 0);
            }
            mergedCategory[dateKey] = { byList, byColor };
          }

          set({
            lists: Array.from(listMap.values()),
            tasks: Array.from(taskMap.values()),
            dailyFocusSeconds: mergedDaily,
            dailyCategoryFocus: mergedCategory,
          });
        }

        triggerSyncIfLoggedIn(get, set);
      },

      importSharedList: (payload, target) => {
        const state = get();
        const now = new Date().toISOString();
        let targetListId: string;

        if (target === 'new_list') {
          targetListId = state.createList(payload.name, payload.emoji, payload.isPreset);
        } else {
          const activeExists = state.lists.some(
            (l) => l.id === state.activeListId && !l.deleted_at && !l.is_preset,
          );
          targetListId = activeExists
            ? state.activeListId!
            : state.createList(payload.name, payload.emoji, false);
        }

        const existing = get().tasks.filter(
          (t) => !t.deleted_at && t.list_id === targetListId && t.status === 'todo',
        );
        let order = existing.reduce((m, t) => Math.max(m, t.sort_order), -1) + 1;

        const newTasks: Task[] = payload.tasks.map((item) => ({
          id: createUuid(),
          user_id: state.user?.id,
          list_id: targetListId,
          title: item.title,
          emoji: item.emoji || '⚡',
          color: item.color || 'none',
          duration_seconds: Math.max(60, item.duration_seconds),
          remaining_seconds: Math.max(60, item.duration_seconds),
          actual_focused_seconds: 0,
          overtime_added_seconds: 0,
          status: 'todo',
          sort_order: order++,
          subtasks: Array.isArray(item.subtasks) ? item.subtasks : [],
          scheduled_start: null,
          completed_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          is_seed: false,
        }));

        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === targetListId ? { ...l, is_seed: false, updated_at: now } : l,
          ),
          tasks: [...s.tasks, ...newTasks],
          ...(!payload.isPreset ? { activeListId: targetListId, activeTab: 'list' } : {}),
        }));

        triggerSyncIfLoggedIn(get, set);
        return targetListId;
      },
    }),
    {
      name: 'morjon-focus-storage-v1',
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<FocusState>;
        const rawTasks = Array.isArray(persisted.tasks)
          ? pruneExpiredTombstones(persisted.tasks)
          : currentState.tasks;
        const migratedTasks = rawTasks.map((t) =>
          t.is_seed && t.title === 'Study JUnit lesson 14'
            ? { ...t, title: 'Deep work on main project', emoji: '🎯' }
            : t,
        );

        return {
          ...currentState,
          ...persisted,
          lists: Array.isArray(persisted.lists)
            ? pruneExpiredTombstones(persisted.lists)
            : currentState.lists,
          tasks: migratedTasks,
          dailyCategoryFocus:
            persisted.dailyCategoryFocus && typeof persisted.dailyCategoryFocus === 'object'
              ? persisted.dailyCategoryFocus
              : currentState.dailyCategoryFocus,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(persisted.settings ?? {}),
            ambientGlow: false,
            dailyGoalMinutes:
              persisted.settings?.dailyGoalMinutes ?? DEFAULT_SETTINGS.dailyGoalMinutes,
          },
          customEmojiThemes: Array.isArray(persisted.customEmojiThemes)
            ? persisted.customEmojiThemes
            : currentState.customEmojiThemes,
        };
      },
      partialize: (state) => ({
        lists: state.lists,
        tasks: state.tasks,
        activeListId: state.activeListId,
        dailyFocusSeconds: state.dailyFocusSeconds,
        dailyCategoryFocus: state.dailyCategoryFocus,
        theme: state.theme,
        settings: state.settings,
        soundscape: state.soundscape,
        soundVolume: state.soundVolume,
        activeColorPaletteId: state.activeColorPaletteId,
        activeEmojiThemeId: state.activeEmojiThemeId,
        customEmojiThemes: state.customEmojiThemes,
        isTimerRunning: state.isTimerRunning,
        lastTickAt: state.lastTickAt,
        overtimeNotifiedTaskId: state.overtimeNotifiedTaskId,
        completedPomodoroCount: state.completedPomodoroCount,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
);
