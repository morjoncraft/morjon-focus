export type TaskColor = string;

export type TaskStatus = 'todo' | 'not_now' | 'completed';

export type SyncStatus = 'guest' | 'synced' | 'syncing' | 'offline' | 'error';

export type SoundscapeId =
  | 'off'
  | 'white'
  | 'rain'
  | 'cafe'
  | 'brown'
  | 'beach'
  | 'forest'
  | 'campfire'
  | 'winter'
  | 'custom';

export interface CustomSoundMeta {
  fileName: string;
  sizeBytes: number;
  durationSec: number;
}

export type ActiveTab =
  | 'list'
  | 'lists_hub'
  | 'presets_hub'
  | 'split'
  | 'timeline'
  | 'not_now'
  | 'completed';

export type LayoutMode = 'simplified' | 'advanced';

export type UiScale = 'compact' | 'comfortable' | 'large';

export type ThemeMode = 'dark' | 'light';

export type Language = 'en' | 'tr';

export type TimerStyle = 'circle' | 'pie' | 'digital' | 'minimal';

export type NavbarPosition = 'top' | 'bottom' | 'left' | 'right';

export type NavbarStyle = 'icons_text' | 'icons_only' | 'pills';

export type SidebarPosition = 'left' | 'right';

export type SurfaceTheme =
  | 'llama-slate'
  | 'aurora-night'
  | 'midnight-ocean'
  | 'sunset-glow'
  | 'forest-mist'
  | 'pure-minimal'
  | 'espresso-warm'
  | 'nordic-fjord'
  | 'matcha-zen'
  | 'rose-clay'
  | 'deep-cosmos'
  | 'sand-dune'
  | 'storm-harbor'
  | 'terracotta-earth'
  | 'obsidian-oled'
  | 'oat-milk';

export type CardVariant = 'tinted' | 'solid' | 'left-border' | 'glass';

export type CardDensity = 'comfortable' | 'compact';

export type CornerStyle = 'rounded' | 'pill' | 'sharp';

export type FontStyle = 'sans' | 'rounded' | 'mono';

export type AlarmSoundId =
  | 'crystal_chime'
  | 'soft_harp'
  | 'singing_bowl'
  | 'warm_marimba'
  | 'gentle_piano'
  | 'digital_pulse'
  | 'classic_bell';

export type CompletedPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

export interface Project {
  id: string;
  name: string;
  emoji: string;
  color: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface EmojiThemePack {
  id: string;
  name: string;
  nameTr?: string;
  icon: string;
  emojis: string[];
  isNew?: boolean;
  isCustom?: boolean;
}

export interface ColorPaletteTheme {
  id: string;
  name: string;
  nameTr?: string;
  colors: string[];
}

export interface FocusSettings {
  language: Language;

  // Timer & Pomodoro
  timerStyle: TimerStyle;
  pieTimer: boolean;
  accentColor: string;
  smartTimeDetection: boolean;
  defaultTaskMinutes: number;
  showStartEndTime: boolean;
  use24HourTime: boolean;
  enableOvertime: boolean;
  pomodoroAutoBreak: boolean;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;

  // Tasks
  showDeleteButtonOnCard: boolean;
  autoStartNextTask: boolean;
  confettiOnComplete: boolean;
  reverseCompletedOrder: boolean;
  loadPresetsToTop: boolean;
  showFabButton: boolean;
  showCompletedInFocus: boolean;

  // Alarms & Sounds
  visualAlarm: boolean;
  audioAlarm: boolean;
  alarmSound: AlarmSoundId;
  audioAlarmContinuous: boolean;
  audioAlarmNag: boolean;
  soundscapeOnlyWhenRunning: boolean;
  chimesEnabled: boolean;
  chimeIntervalMinutes: number;
  chimeVolume: number;
  buttonClicks: boolean;

  // Stats & Streak Goal
  dailyGoalMinutes: number;

  // Navbar, Sidebar & UI Appearance
  layoutMode: LayoutMode;
  uiScale: UiScale;
  navbarPosition: NavbarPosition;
  navbarStyle: NavbarStyle;
  sidebarPosition: SidebarPosition;
  sidebarCollapsed: boolean;
  surfaceTheme: SurfaceTheme;
  customBgEnabled: boolean;
  customDarkBg: string;
  customLightBg: string;
  enableMicroStart: boolean;
  hideQueueWhileFocusing: boolean;
  ambientGlow: boolean;
  cardVariant: CardVariant;
  cardDensity: CardDensity;
  cornerStyle: CornerStyle;
  fontStyle: FontStyle;
  showFunToolbar: boolean;
  showSummaryInHeader: boolean;
  showQuickMinuteChips: boolean;
}

export interface TaskList {
  id: string;
  user_id?: string;
  name: string;
  emoji: string;
  is_preset: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** Local-only flag indicating untouched initial sample data for smart login merge */
  is_seed?: boolean;
  /** Local-only delta sync watermark matching updated_at at last successful cloud push/pull */
  synced_updated_at?: string;
}

export interface Task {
  id: string;
  user_id?: string;
  list_id: string | null;
  project_id?: string | null;
  title: string;
  emoji: string;
  color: TaskColor;
  duration_seconds: number;
  remaining_seconds: number;
  actual_focused_seconds: number;
  overtime_added_seconds: number;
  status: TaskStatus;
  sort_order: number;
  subtasks?: SubTask[];
  scheduled_start?: string | null;
  is_break?: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** Local-only flag indicating untouched initial sample data for smart login merge */
  is_seed?: boolean;
  /** Local-only delta sync watermark matching updated_at at last successful cloud push/pull */
  synced_updated_at?: string;
}

export type DailyFocusMap = Record<string, number>;

export interface DailyCategoryBucket {
  byList: Record<string, number>;
  byColor: Record<string, number>;
  byProject?: Record<string, number>;
}

export type DailyCategoryFocusMap = Record<string, DailyCategoryBucket>;

export interface FocusUser {
  id: string;
  email?: string;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  lists: TaskList[];
  tasks: Task[];
  projects?: Project[];
  dailyFocusSeconds: DailyFocusMap;
  dailyCategoryFocus?: DailyCategoryFocusMap;
  activeListId: string | null;
  settings?: Partial<FocusSettings>;
  customEmojiThemes?: EmojiThemePack[];
}

export interface SharedListPayload {
  name: string;
  emoji: string;
  isPreset: boolean;
  tasks: Array<{
    title: string;
    emoji: string;
    duration_seconds: number;
    color: TaskColor;
    subtasks?: SubTask[];
  }>;
}
