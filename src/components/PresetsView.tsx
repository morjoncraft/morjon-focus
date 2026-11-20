import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  Check,
  LayoutGrid,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { formatListDuration } from '../lib/formatters';
import { t } from '../lib/i18n';
import { parseTaskInput } from '../lib/parseTaskInput';
import { suggestEmojiForTitle } from '../lib/parseTaskInput';
import { useFocusStore } from '../store/useFocusStore';
import { EmojiColorPicker } from './EmojiColorPicker';

const PRESET_EMOJIS = ['🌅', '🍅', '🌙', '⚡', '🎯', '📚', '💻', '🧘', '✨', '🧹', '💪', '🌿'];

export const PresetsView: React.FC = () => {
  const lists = useFocusStore((s) => s.lists);
  const tasks = useFocusStore((s) => s.tasks);
  const settings = useFocusStore((s) => s.settings);

  const createList = useFocusStore((s) => s.createList);
  const updateList = useFocusStore((s) => s.updateList);
  const deleteList = useFocusStore((s) => s.deleteList);
  const applyPresetToActiveList = useFocusStore((s) => s.applyPresetToActiveList);
  const saveActiveListAsPreset = useFocusStore((s) => s.saveActiveListAsPreset);
  const addTask = useFocusStore((s) => s.addTask);
  const updateTask = useFocusStore((s) => s.updateTask);
  const deleteTask = useFocusStore((s) => s.deleteTask);
  const moveTaskInList = useFocusStore((s) => s.moveTaskInList);

  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetEmoji, setNewPresetEmoji] = useState('🍅');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});
  const [pickerTaskId, setPickerTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const lang = settings.language;
  const presets = lists
    .filter((l) => !l.deleted_at && l.is_preset)
    .sort((a, b) => a.sort_order - b.sort_order);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const handleCreatePreset = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newPresetName.trim();
    if (!cleaned) return;
    const id = createList(cleaned, newPresetEmoji, true);
    setNewPresetName('');
    setEditingPresetId(id);
  };

  const handleSaveActive = () => {
    const id = saveActiveListAsPreset();
    if (id) {
      showToast(t(lang, 'presetSavedToast'));
      setEditingPresetId(id);
    }
  };

  const handleLoadPreset = (presetId: string, presetName: string) => {
    const added = applyPresetToActiveList(presetId);
    if (added > 0) {
      showToast(`${presetName} (${added}) — ${t(lang, 'presetAddedToast')}`);
    }
  };

  const handleAddStep = (presetId: string, e: React.FormEvent) => {
    e.preventDefault();
    const raw = (taskInputs[presetId] ?? '').trim();
    if (!raw) return;
    const parsed = parseTaskInput(
      raw,
      settings.defaultTaskMinutes,
      settings.smartTimeDetection,
    );
    addTask({
      title: parsed.title,
      durationSeconds: parsed.durationSeconds,
      emoji: parsed.suggestedEmoji,
      listId: presetId,
      status: 'todo',
    });
    setTaskInputs((prev) => ({ ...prev, [presetId]: '' }));
  };

  return (
    <div className="space-y-4">
      {/* Header + Create Preset Card */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: settings.accentColor }}
            >
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {t(lang, 'presets')}
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                {t(lang, 'presetsHubDesc')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveActive}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-500/35 bg-violet-500/10 px-3 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-500/20 transition"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            <span>{t(lang, 'saveActiveListBtn')}</span>
          </button>
        </div>

        <form onSubmit={handleCreatePreset} className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-1">
            {PRESET_EMOJIS.slice(0, 6).map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setNewPresetEmoji(em)}
                className={`h-8 w-8 rounded-lg text-base transition ${
                  newPresetEmoji === em
                    ? 'bg-violet-500/20 ring-1 ring-violet-500'
                    : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                {em}
              </button>
            ))}
          </div>

          <div className="flex flex-1 min-w-[180px] items-center gap-2">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder={t(lang, 'newPresetPlaceholder')}
              className="h-10 flex-1 min-w-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="submit"
              disabled={!newPresetName.trim()}
              style={{ backgroundColor: settings.accentColor }}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs sm:text-sm font-semibold text-white disabled:opacity-40 hover:brightness-110 transition"
            >
              <Plus className="h-4 w-4" />
              <span>{t(lang, 'add')}</span>
            </button>
          </div>
        </form>

        {toast && (
          <div className="mt-3 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            ✓ {toast}
          </div>
        )}
      </div>

      {/* Preset Cards */}
      <div className="space-y-3">
        {presets.map((preset) => {
          const presetTasks = tasks
            .filter(
              (task) =>
                !task.deleted_at && task.status !== 'completed' && task.list_id === preset.id,
            )
            .sort((a, b) => a.sort_order - b.sort_order);

          const totalSec = presetTasks.reduce(
            (sum, item) => sum + Math.max(0, item.duration_seconds),
            0,
          );
          const isEditing = editingPresetId === preset.id;

          return (
            <div
              key={preset.id}
              className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-4 sm:p-5 shadow-sm space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-2xl">
                    {preset.emoji}
                  </span>

                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          defaultValue={preset.name}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val && val !== preset.name) {
                              updateList(preset.id, { name: val });
                            }
                          }}
                          className="h-9 w-full max-w-xs rounded-lg border border-violet-500 bg-white dark:bg-zinc-950 px-2.5 text-sm font-bold focus:outline-none"
                        />
                        <div className="flex flex-wrap gap-1">
                          {PRESET_EMOJIS.map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => updateList(preset.id, { emoji: em })}
                              className={`h-7 w-7 rounded-md text-sm ${
                                preset.emoji === em
                                  ? 'bg-violet-500/25 ring-1 ring-violet-500'
                                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                              }`}
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="truncate text-base font-bold text-zinc-900 dark:text-zinc-100">
                          {preset.name}
                        </h3>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {presetTasks.length} {t(lang, 'tasksSuffix')} •{' '}
                          {formatListDuration(totalSec, lang)}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={presetTasks.length === 0}
                    onClick={() => handleLoadPreset(preset.id, preset.name)}
                    style={{ backgroundColor: settings.accentColor }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold text-white shadow-sm disabled:opacity-40 hover:brightness-110 transition"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{t(lang, 'applyPreset')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPickerTaskId(null);
                      setEditingPresetId(isEditing ? null : preset.id);
                    }}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
                      isEditing
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>{t(lang, 'doneEditing')}</span>
                      </>
                    ) : (
                      <>
                        <Pencil className="h-3.5 w-3.5" />
                        <span>{t(lang, 'editPreset')}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteList(preset.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 transition"
                    title={t(lang, 'deleteTask')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Compact Task Preview Chips when collapsed */}
              {!isEditing && presetTasks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {presetTasks.map((pt) => (
                    <span
                      key={pt.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300"
                    >
                      <span>{pt.emoji}</span>
                      <span className="max-w-[180px] truncate font-medium">{pt.title}</span>
                      <span className="font-mono text-[11px] text-zinc-400">
                        {Math.round(pt.duration_seconds / 60)}
                        {lang === 'tr' ? 'dk' : 'm'}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {/* Full Inline Preset Editor */}
              {isEditing && (
                <div className="border-t border-zinc-200/80 dark:border-zinc-800 pt-3 space-y-2.5 animate-fade-slide">
                  <form
                    onSubmit={(e) => handleAddStep(preset.id, e)}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={taskInputs[preset.id] ?? ''}
                      onChange={(e) =>
                        setTaskInputs((prev) => ({ ...prev, [preset.id]: e.target.value }))
                      }
                      placeholder={t(lang, 'addTaskToPresetPlaceholder')}
                      className="h-9 flex-1 min-w-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      type="submit"
                      disabled={!(taskInputs[preset.id] ?? '').trim()}
                      style={{ backgroundColor: settings.accentColor }}
                      className="h-9 rounded-xl px-3.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      + {t(lang, 'add')}
                    </button>
                  </form>

                  {presetTasks.length === 0 ? (
                    <p className="py-2 text-center text-xs text-zinc-400">
                      {lang === 'tr'
                        ? 'Şablona görev ekleyerek başla.'
                        : 'Add steps or tasks above to build this template.'}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {presetTasks.map((pt, idx) => (
                        <div
                          key={pt.id}
                          className="relative flex items-center gap-2 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 px-3 py-2"
                        >
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setPickerTaskId((cur) => (cur === pt.id ? null : pt.id))
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base hover:scale-105 transition"
                            >
                              {pt.emoji}
                            </button>

                            {pickerTaskId === pt.id && (
                              <EmojiColorPicker
                                selectedEmoji={pt.emoji}
                                selectedColor={pt.color}
                                onSelectEmoji={(em) => updateTask(pt.id, { emoji: em })}
                                onSelectColor={(col) => updateTask(pt.id, { color: col })}
                                onAutoEmoji={() =>
                                  updateTask(pt.id, { emoji: suggestEmojiForTitle(pt.title) })
                                }
                              />
                            )}
                          </div>

                          <input
                            type="text"
                            defaultValue={pt.title}
                            onBlur={(e) => {
                              const nextTitle = e.target.value.trim();
                              if (nextTitle && nextTitle !== pt.title) {
                                updateTask(pt.id, { title: nextTitle });
                              }
                            }}
                            className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:underline"
                          />

                          <input
                            type="number"
                            min={1}
                            max={720}
                            defaultValue={Math.max(1, Math.round(pt.duration_seconds / 60))}
                            onBlur={(e) => {
                              const mins = Number.parseInt(e.target.value, 10);
                              if (Number.isFinite(mins) && mins >= 1 && mins <= 720) {
                                const secs = mins * 60;
                                updateTask(pt.id, {
                                  duration_seconds: secs,
                                  remaining_seconds: secs,
                                });
                              }
                            }}
                            className="w-14 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-1.5 py-1 text-right font-mono text-xs font-semibold"
                          />
                          <span className="text-[11px] text-zinc-400">
                            {lang === 'tr' ? 'dk' : 'm'}
                          </span>

                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveTaskInList(pt.id, 'up')}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 disabled:opacity-25"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === presetTasks.length - 1}
                            onClick={() => moveTaskInList(pt.id, 'down')}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 disabled:opacity-25"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTask(pt.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-500/15 hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
