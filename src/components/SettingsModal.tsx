import React, { useRef, useState } from 'react';
import {
  Bell,
  Check,
  Clock,
  Database,
  Download,
  HardDrive,
  ListChecks,
  MonitorDown,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';
import { ACCENT_SWATCHES } from '../lib/colors';
import { getLocalDateKey } from '../lib/formatters';
import { t } from '../lib/i18n';
import {
  getNotificationPermission,
  requestNotificationPermission,
  requestPersistentStorage,
  sendTimerFinishedNotification,
} from '../lib/notifications';
import { usePwaInstall } from '../lib/pwa';
import { useFocusStore } from '../store/useFocusStore';
import type { BackupData } from '../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onOpenPwa: () => void;
}

type SettingsTab = 'timer' | 'tasks' | 'alarms' | 'backup';

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
}> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className={`relative inline-flex h-6 w-12 shrink-0 items-center rounded-full transition-colors ${
      checked ? 'bg-[#10b981]' : 'bg-zinc-300 dark:bg-zinc-600'
    }`}
  >
    <span
      className={`text-[9px] font-bold tracking-tight text-white transition-opacity ${
        checked ? 'ml-1.5 opacity-100' : 'opacity-0'
      }`}
    >
      ON
    </span>
    <span
      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-7' : 'translate-x-1'
      }`}
    />
    <span
      className={`ml-auto mr-1.5 text-[9px] font-bold tracking-tight text-zinc-700 dark:text-zinc-200 transition-opacity ${
        checked ? 'opacity-0' : 'opacity-100'
      }`}
    >
      OFF
    </span>
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  onOpenPwa,
}) => {
  const { isStandalone } = usePwaInstall();
  const theme = useFocusStore((s) => s.theme);
  const setTheme = useFocusStore((s) => s.setTheme);
  const settings = useFocusStore((s) => s.settings);
  const updateSettings = useFocusStore((s) => s.updateSettings);
  const soundVolume = useFocusStore((s) => s.soundVolume);
  const setSoundVolume = useFocusStore((s) => s.setSoundVolume);
  const storagePersisted = useFocusStore((s) => s.storagePersisted);
  const setStoragePersisted = useFocusStore((s) => s.setStoragePersisted);
  const exportBackupJson = useFocusStore((s) => s.exportBackupJson);
  const importBackupJson = useFocusStore((s) => s.importBackupJson);

  const [tab, setTab] = useState<SettingsTab>('timer');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!open) return null;

  const lang = settings.language;

  const handleDownloadJson = () => {
    const data = exportBackupJson();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `morjon-focus-backup-${getLocalDateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setFeedback({
      type: 'ok',
      text:
        lang === 'tr'
          ? 'Tüm verilerin JSON olarak indirildi.'
          : 'All data exported as JSON.',
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupData;
      importBackupJson(parsed, restoreMode);
      setFeedback({
        type: 'ok',
        text:
          lang === 'tr'
            ? 'JSON yedeği başarıyla geri yüklendi.'
            : 'JSON backup restored successfully.',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to parse JSON file.',
      });
    }
  };

  const handleRequestPersist = async () => {
    const granted = await requestPersistentStorage();
    setStoragePersisted(granted);
    setFeedback({
      type: granted ? 'ok' : 'err',
      text: granted
        ? lang === 'tr'
          ? 'Kalıcı depolama izni aktif.'
          : 'Persistent storage granted.'
        : lang === 'tr'
          ? 'Tarayıcı otomatik onaylamadı; PWA olarak kurulduğunda genellikle aktif olur.'
          : 'Browser did not auto-grant; installing as a PWA usually grants it automatically.',
    });
  };

  const handleRequestNotif = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  };

  const handleTestSoundAndNotif = () => {
    audioEngine.playTimerDoneChime();
    sendTimerFinishedNotification('Test Alarm', '🔔', lang);
  };

  const renderSettingRow = (
    title: string,
    desc: string,
    control: React.ReactNode,
  ) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-zinc-200/70 dark:border-zinc-800/80 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{desc}</p>
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#23262f] shadow-2xl animate-fade-slide">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {t(lang, 'settingsTitle')}
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {t(lang, 'settingsSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 bg-zinc-50/70 dark:bg-zinc-900/50 text-xs">
          {(
            [
              { id: 'timer', label: t(lang, 'tabTimer'), icon: Clock },
              { id: 'tasks', label: t(lang, 'tabTasks'), icon: ListChecks },
              { id: 'alarms', label: t(lang, 'tabAlarmsSounds'), icon: Volume2 },
              { id: 'backup', label: t(lang, 'tabBackup'), icon: HardDrive },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 font-semibold transition ${
                  tab === item.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {tab === 'timer' && (
            <div>
              {renderSettingRow(
                t(lang, 'pieTimerTitle'),
                t(lang, 'pieTimerDesc'),
                <ToggleSwitch
                  checked={settings.pieTimer}
                  onChange={() => updateSettings({ pieTimer: !settings.pieTimer })}
                />,
              )}

              {/* Accent Color 7x2 Swatch Grid */}
              <div className="py-3 border-b border-zinc-200/70 dark:border-zinc-800/80">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t(lang, 'accentColorTitle')}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {t(lang, 'accentColorSettingsDesc')}
                </p>
                <div className="mt-3 inline-grid grid-cols-7 gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700/70 bg-zinc-50 dark:bg-[#1a1d24] p-2.5">
                  {ACCENT_SWATCHES.map((hex) => {
                    const active = settings.accentColor.toLowerCase() === hex.toLowerCase();
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => updateSettings({ accentColor: hex })}
                        style={{ backgroundColor: hex }}
                        className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
                          active
                            ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-white dark:ring-offset-[#1a1d24] scale-110'
                            : 'opacity-90 hover:opacity-100'
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {renderSettingRow(
                t(lang, 'themeModeTitle'),
                t(lang, 'themeModeDesc'),
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
                  className="h-9 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold focus:outline-none"
                >
                  <option value="dark">{t(lang, 'darkOption')}</option>
                  <option value="light">{t(lang, 'lightOption')}</option>
                </select>,
              )}

              {renderSettingRow(
                t(lang, 'smartTimeTitle'),
                t(lang, 'smartTimeDesc'),
                <ToggleSwitch
                  checked={settings.smartTimeDetection}
                  onChange={() =>
                    updateSettings({ smartTimeDetection: !settings.smartTimeDetection })
                  }
                />,
              )}

              {/* Default Time */}
              <div className="py-3 border-b border-zinc-200/70 dark:border-zinc-800/80">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t(lang, 'defaultTimeTitle')}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {t(lang, 'defaultTimeDesc')}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <span>{t(lang, 'defaultTimeInline')}</span>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={settings.defaultTaskMinutes}
                    onChange={(e) =>
                      updateSettings({
                        defaultTaskMinutes: Math.max(1, Math.min(360, Number(e.target.value) || 25)),
                      })
                    }
                    className="h-8 w-16 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-center font-mono font-semibold"
                  />
                  <span>{t(lang, 'minsLabel')}</span>
                </div>
              </div>

              {renderSettingRow(
                t(lang, 'startEndTitle'),
                t(lang, 'startEndDesc'),
                <ToggleSwitch
                  checked={settings.showStartEndTime}
                  onChange={() =>
                    updateSettings({ showStartEndTime: !settings.showStartEndTime })
                  }
                />,
              )}

              {renderSettingRow(
                t(lang, 'hour24Title'),
                t(lang, 'hour24Desc'),
                <ToggleSwitch
                  checked={settings.use24HourTime}
                  onChange={() => updateSettings({ use24HourTime: !settings.use24HourTime })}
                />,
              )}

              {renderSettingRow(
                t(lang, 'overtimeTitle'),
                t(lang, 'overtimeDesc'),
                <ToggleSwitch
                  checked={settings.enableOvertime}
                  onChange={() => updateSettings({ enableOvertime: !settings.enableOvertime })}
                />,
              )}

              {/* Pomodoro Auto-Break Cycle */}
              <div className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      🍅 {t(lang, 'pomodoroAutoBreakTitle')}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {t(lang, 'pomodoroAutoBreakDesc')}
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={settings.pomodoroAutoBreak}
                    onChange={() =>
                      updateSettings({ pomodoroAutoBreak: !settings.pomodoroAutoBreak })
                    }
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <label className="flex flex-col gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-2.5">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {t(lang, 'shortBreakLabel')}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={settings.shortBreakMinutes}
                      onChange={(e) =>
                        updateSettings({
                          shortBreakMinutes: Math.max(1, Math.min(60, Number(e.target.value) || 5)),
                        })
                      }
                      className="h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 font-mono font-semibold"
                    />
                  </label>

                  <label className="flex flex-col gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-2.5">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {t(lang, 'longBreakLabel')}
                    </span>
                    <input
                      type="number"
                      min={5}
                      max={90}
                      value={settings.longBreakMinutes}
                      onChange={(e) =>
                        updateSettings({
                          longBreakMinutes: Math.max(5, Math.min(90, Number(e.target.value) || 15)),
                        })
                      }
                      className="h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 font-mono font-semibold"
                    />
                  </label>

                  <label className="flex flex-col gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-2.5">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {t(lang, 'longBreakEveryLabel')}
                    </span>
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={settings.longBreakInterval}
                      onChange={(e) =>
                        updateSettings({
                          longBreakInterval: Math.max(2, Math.min(10, Number(e.target.value) || 4)),
                        })
                      }
                      className="h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 font-mono font-semibold"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {tab === 'tasks' && (
            <div>
              {renderSettingRow(
                t(lang, 'showDeleteTitle'),
                t(lang, 'showDeleteDesc'),
                <ToggleSwitch
                  checked={settings.showDeleteButtonOnCard}
                  onChange={() =>
                    updateSettings({ showDeleteButtonOnCard: !settings.showDeleteButtonOnCard })
                  }
                />,
              )}

              {renderSettingRow(
                t(lang, 'autoStartTitle'),
                t(lang, 'autoStartDesc'),
                <ToggleSwitch
                  checked={settings.autoStartNextTask}
                  onChange={() =>
                    updateSettings({ autoStartNextTask: !settings.autoStartNextTask })
                  }
                />,
              )}

              {renderSettingRow(
                t(lang, 'confettiTitle'),
                t(lang, 'confettiDesc'),
                <ToggleSwitch
                  checked={settings.confettiOnComplete}
                  onChange={() =>
                    updateSettings({ confettiOnComplete: !settings.confettiOnComplete })
                  }
                />,
              )}

              {renderSettingRow(
                t(lang, 'reverseOrderTitle'),
                t(lang, 'reverseOrderDesc'),
                <ToggleSwitch
                  checked={settings.reverseCompletedOrder}
                  onChange={() =>
                    updateSettings({ reverseCompletedOrder: !settings.reverseCompletedOrder })
                  }
                />,
              )}

              {renderSettingRow(
                t(lang, 'loadPresetsTopTitle'),
                t(lang, 'loadPresetsTopDesc'),
                <ToggleSwitch
                  checked={settings.loadPresetsToTop}
                  onChange={() =>
                    updateSettings({ loadPresetsToTop: !settings.loadPresetsToTop })
                  }
                />,
              )}

              {renderSettingRow(
                t(lang, 'showFabTitle'),
                t(lang, 'showFabDesc'),
                <ToggleSwitch
                  checked={settings.showFabButton}
                  onChange={() => updateSettings({ showFabButton: !settings.showFabButton })}
                />,
              )}
            </div>
          )}

          {tab === 'alarms' && (
            <div>
              {renderSettingRow(
                t(lang, 'visualAlarmTitle'),
                t(lang, 'visualAlarmDesc'),
                <ToggleSwitch
                  checked={settings.visualAlarm}
                  onChange={() => updateSettings({ visualAlarm: !settings.visualAlarm })}
                />,
              )}

              {renderSettingRow(
                t(lang, 'audioAlarmTitle'),
                t(lang, 'audioAlarmDesc'),
                <ToggleSwitch
                  checked={settings.audioAlarm}
                  onChange={() => updateSettings({ audioAlarm: !settings.audioAlarm })}
                />,
              )}

              {renderSettingRow(
                t(lang, 'audioContinuousTitle'),
                t(lang, 'audioContinuousDesc'),
                <ToggleSwitch
                  checked={settings.audioAlarmContinuous}
                  onChange={() =>
                    updateSettings({ audioAlarmContinuous: !settings.audioAlarmContinuous })
                  }
                />,
              )}

              {renderSettingRow(
                t(lang, 'audioNagTitle'),
                t(lang, 'audioNagDesc'),
                <ToggleSwitch
                  checked={settings.audioAlarmNag}
                  onChange={() => updateSettings({ audioAlarmNag: !settings.audioAlarmNag })}
                />,
              )}

              {/* Soundscapes Volume 1..10 */}
              <div className="py-3 border-b border-zinc-200/70 dark:border-zinc-800/80">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t(lang, 'soundscapesVolTitle')}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {t(lang, 'soundscapesVolDesc')}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">{t(lang, 'volumeLabel')}</span>
                  <select
                    value={Math.max(1, Math.min(10, Math.round(soundVolume * 10)))}
                    onChange={(e) => setSoundVolume(Number(e.target.value) / 10)}
                    className="h-8 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2.5 font-mono font-semibold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {renderSettingRow(
                t(lang, 'soundscapesRunOnlyTitle'),
                t(lang, 'soundscapesRunOnlyDesc'),
                <ToggleSwitch
                  checked={settings.soundscapeOnlyWhenRunning}
                  onChange={() =>
                    updateSettings({
                      soundscapeOnlyWhenRunning: !settings.soundscapeOnlyWhenRunning,
                    })
                  }
                />,
              )}

              {/* Chimes */}
              <div className="py-3 border-b border-zinc-200/70 dark:border-zinc-800/80">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {t(lang, 'chimesTitle')}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {t(lang, 'chimesDesc')}
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={settings.chimesEnabled}
                    onChange={() => updateSettings({ chimesEnabled: !settings.chimesEnabled })}
                  />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <span>{t(lang, 'playChimeEvery')}</span>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={settings.chimeIntervalMinutes}
                      onChange={(e) =>
                        updateSettings({
                          chimeIntervalMinutes: Math.max(1, Number(e.target.value) || 25),
                        })
                      }
                      className="h-8 w-14 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-center font-mono font-semibold"
                    />
                    <span>{t(lang, 'minsLabel')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{t(lang, 'volumeLabel')}</span>
                    <select
                      value={settings.chimeVolume}
                      onChange={(e) => updateSettings({ chimeVolume: Number(e.target.value) })}
                      className="h-8 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 font-mono font-semibold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {renderSettingRow(
                t(lang, 'buttonClicksTitle'),
                t(lang, 'buttonClicksDesc'),
                <ToggleSwitch
                  checked={settings.buttonClicks}
                  onChange={() => updateSettings({ buttonClicks: !settings.buttonClicks })}
                />,
              )}
            </div>
          )}

          {tab === 'backup' && (
            <div className="space-y-4 py-1">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 p-3.5 space-y-3">
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {t(lang, 'backupJsonTitle')}
                </div>

                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-xs font-semibold text-white dark:text-zinc-900 hover:opacity-90 transition"
                >
                  <Download className="h-4 w-4" />
                  {t(lang, 'downloadJson')}
                </button>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {t(lang, 'restoreModeLabel')}
                    </span>
                    <div className="inline-flex rounded-lg bg-zinc-200/80 dark:bg-zinc-800 p-0.5">
                      <button
                        type="button"
                        onClick={() => setRestoreMode('merge')}
                        className={`rounded-md px-2 py-0.5 font-semibold ${
                          restoreMode === 'merge'
                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                            : 'text-zinc-500'
                        }`}
                      >
                        {t(lang, 'mergeMode')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRestoreMode('replace')}
                        className={`rounded-md px-2 py-0.5 font-semibold ${
                          restoreMode === 'replace'
                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                            : 'text-zinc-500'
                        }`}
                      >
                        {t(lang, 'replaceMode')}
                      </button>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => void handleFileChange(e)}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {t(lang, 'restoreJson')}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 p-3.5 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200 font-medium">
                    <HardDrive className="h-4 w-4 text-emerald-500" />
                    {t(lang, 'persistentStorage')}
                  </span>
                  {storagePersisted ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      {t(lang, 'activeLabel')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleRequestPersist()}
                      className="rounded-lg bg-zinc-200 dark:bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700"
                    >
                      {t(lang, 'requestGrant')}
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3">
                  <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200 font-medium">
                    <Bell className="h-4 w-4 text-violet-500" />
                    {t(lang, 'desktopNotifications')}
                  </span>
                  {notifPermission === 'granted' ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      {t(lang, 'grantedLabel')}
                    </span>
                  ) : notifPermission === 'unsupported' ? (
                    <span className="text-[11px] text-zinc-400">{t(lang, 'unsupportedLabel')}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleRequestNotif()}
                      className="rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-violet-500"
                    >
                      {t(lang, 'allowNotifications')}
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3">
                  <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200 font-medium">
                    <MonitorDown className="h-4 w-4 text-sky-500" />
                    {lang === 'tr' ? 'Masaüstü Uygulaması (PWA)' : 'Desktop App (PWA)'}
                  </span>
                  {isStandalone ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      {t(lang, 'activeLabel')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenPwa();
                      }}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500"
                    >
                      {t(lang, 'installApp')}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleTestSoundAndNotif}
                  className="w-full inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  {t(lang, 'testAlarmBtn')}
                </button>
              </div>

              {feedback && (
                <div
                  className={`rounded-xl px-3 py-2 text-xs font-medium ${
                    feedback.type === 'ok'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {feedback.text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
