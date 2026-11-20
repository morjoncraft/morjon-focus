import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock, FolderKanban, Layers, Plus } from 'lucide-react';
import { ACCENT_SWATCHES, hexToRgba, normalizeHex } from '../lib/colors';
import { formatDurationBadge } from '../lib/formatters';
import { t } from '../lib/i18n';
import {
  normalizeMultiLinePaste,
  parseBulkTaskInput,
} from '../lib/parseTaskInput';
import { useFocusStore } from '../store/useFocusStore';
import type { TaskColor } from '../types';
import { EmojiColorPicker } from './EmojiColorPicker';

const QUICK_MINUTE_CHIPS = [10, 15, 25, 45, 60];
const PROJECT_EMOJIS = ['📁', '🚀', '💻', '📚', '🎨', '💼', '🔬', '🏠'];

interface QuickAddTaskProps {
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const QuickAddTask: React.FC<QuickAddTaskProps> = ({ inputRef: externalRef }) => {
  const settings = useFocusStore((s) => s.settings);
  const projects = useFocusStore((s) => s.projects);
  const updateSettings = useFocusStore((s) => s.updateSettings);
  const addTasksBulk = useFocusStore((s) => s.addTasksBulk);
  const createProject = useFocusStore((s) => s.createProject);

  const [input, setInput] = useState('');
  const [customEmoji, setCustomEmoji] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<TaskColor>('none');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  const [newProjName, setNewProjName] = useState('');
  const [newProjEmoji, setNewProjEmoji] = useState('📁');
  const [newProjColor, setNewProjColor] = useState<string>(ACCENT_SWATCHES[0]);

  const internalRef = useRef<HTMLInputElement | null>(null);
  const inputRef = externalRef ?? internalRef;
  const pickerWrapRef = useRef<HTMLDivElement | null>(null);
  const projectWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pickerOpen && !projectMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (pickerWrapRef.current && !pickerWrapRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
      if (projectWrapRef.current && !projectWrapRef.current.contains(e.target as Node)) {
        setProjectMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [pickerOpen, projectMenuOpen]);

  const lang = settings.language;
  const fallbackMinutes = settings.defaultTaskMinutes;
  const activeProjects = useMemo(
    () => projects.filter((p) => !p.deleted_at),
    [projects],
  );
  const selectedProject =
    activeProjects.find((p) => p.id === selectedProjectId) ?? null;

  const parsedTasks = useMemo(
    () => parseBulkTaskInput(input, fallbackMinutes, settings.smartTimeDetection),
    [input, fallbackMinutes, settings.smartTimeDetection],
  );

  const isBulk = parsedTasks.length > 1;
  const firstParsed = parsedTasks[0];
  const totalSeconds = parsedTasks.reduce((sum, item) => sum + item.durationSeconds, 0);
  const hasExplicitSingle = parsedTasks.some((p) => p.hasExplicitDuration);

  const activeEmoji = customEmoji ?? firstParsed?.suggestedEmoji ?? '⚡';
  const selectedHex = normalizeHex(selectedColor);

  const cornerClass =
    settings.cornerStyle === 'pill'
      ? 'rounded-3xl'
      : settings.cornerStyle === 'sharp'
        ? 'rounded-lg'
        : 'rounded-2xl';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || parsedTasks.length === 0) return;

    const resolvedProjectId = selectedProject?.id ?? null;

    addTasksBulk(
      parsedTasks.map((item) => ({
        title: item.title,
        durationSeconds: item.durationSeconds,
        emoji: parsedTasks.length === 1 ? activeEmoji : item.suggestedEmoji,
        color: selectedColor,
        project_id: resolvedProjectId,
        status: 'todo',
      })),
    );

    setInput('');
    setCustomEmoji(null);
    setPickerOpen(false);
    inputRef.current?.focus();
  };

  const handleCreateProjectInline = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newProjName.trim();
    if (!cleaned) return;
    const pid = createProject(cleaned, newProjEmoji, newProjColor);
    setSelectedProjectId(pid);
    setNewProjName('');
    setProjectMenuOpen(false);
  };

  return (
    <div
      className={`relative ${
        pickerOpen || projectMenuOpen ? 'z-30' : 'z-10'
      } border border-zinc-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-2.5 sm:p-3 shadow-sm ${cornerClass}`}
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Emoji & Color picker trigger */}
        <div className="relative" ref={pickerWrapRef}>
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            style={
              selectedHex
                ? {
                    backgroundColor: hexToRgba(selectedHex, 0.2),
                    borderColor: hexToRgba(selectedHex, 0.55),
                  }
                : undefined
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-lg hover:scale-105 transition"
            title={lang === 'tr' ? 'Emoji ve renk etiketi seç' : 'Pick emoji & color'}
          >
            {activeEmoji}
          </button>

          {pickerOpen && (
            <EmojiColorPicker
              selectedEmoji={activeEmoji}
              selectedColor={selectedColor}
              onSelectEmoji={(em) => setCustomEmoji(em)}
              onSelectColor={(col) => setSelectedColor(col)}
              onAutoEmoji={() => setCustomEmoji(null)}
            />
          )}
        </div>

        {/* Text input with live single & bulk NLP duration detection */}
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={(e) => {
              const clip = e.clipboardData.getData('text');
              if (clip.includes('\n')) {
                e.preventDefault();
                const normalized = normalizeMultiLinePaste(clip);
                setInput((prev) =>
                  prev.trim() ? `${prev.trim()} ; ${normalized}` : normalized,
                );
              }
            }}
            placeholder={t(lang, 'quickAddPlaceholder')}
            className={`h-10 w-full rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 pl-3 ${
              isBulk ? 'pr-28' : 'pr-20'
            } text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition`}
          />

          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                isBulk
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : hasExplicitSingle
                    ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300'
                    : 'bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              {isBulk ? (
                <>
                  <Layers className="h-3 w-3" />
                  <span>
                    {parsedTasks.length}× · {formatDurationBadge(totalSeconds, lang)}
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDurationBadge(
                      firstParsed ? firstParsed.durationSeconds : fallbackMinutes * 60,
                      lang,
                    )}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!input.trim() || parsedTasks.length === 0}
          style={{ backgroundColor: settings.accentColor }}
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none px-3.5 text-xs font-semibold text-white shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">
            {isBulk ? `${t(lang, 'addBulkBtn')} (${parsedTasks.length})` : t(lang, 'add')}
          </span>
        </button>
      </form>

      {/* Live Multi-Task Preview Strip */}
      {isBulk && (
        <div className="mt-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-2 animate-fade-slide">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <Layers className="h-3.5 w-3.5" />
            <span>
              {parsedTasks.length} {t(lang, 'bulkDetectedBadge')} (
              {formatDurationBadge(totalSeconds, lang)})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {parsedTasks.map((item, idx) => (
              <span
                key={`${item.title}-${idx}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/90 px-2 py-1 text-[11px] text-zinc-800 dark:text-zinc-200 shadow-xs"
              >
                <span>{item.suggestedEmoji}</span>
                <span className="max-w-[150px] truncate font-medium">{item.title}</span>
                <span className="font-mono text-[10px] font-semibold text-violet-600 dark:text-violet-300">
                  {formatDurationBadge(item.durationSeconds, lang)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick duration chips & Project Picker Row */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {settings.showQuickMinuteChips && (
            <>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mr-0.5">
                {t(lang, 'defaultTimeShort')}
              </span>
              {QUICK_MINUTE_CHIPS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => updateSettings({ defaultTaskMinutes: mins })}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                    !hasExplicitSingle && fallbackMinutes === mins
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {mins === 60
                    ? lang === 'tr'
                      ? '1s'
                      : '1h'
                    : `${mins}${lang === 'tr' ? 'dk' : 'm'}`}
                </button>
              ))}
            </>
          )}

          {/* Optional Project Selector Pill */}
          <div className="relative" ref={projectWrapRef}>
            <button
              type="button"
              onClick={() => setProjectMenuOpen((v) => !v)}
              style={
                selectedProject
                  ? {
                      backgroundColor: hexToRgba(selectedProject.color, 0.16),
                      borderColor: hexToRgba(selectedProject.color, 0.45),
                    }
                  : undefined
              }
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition ${
                selectedProject
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title={t(lang, 'assignProject')}
            >
              {selectedProject ? (
                <>
                  <span>{selectedProject.emoji}</span>
                  <span className="max-w-[110px] truncate">{selectedProject.name}</span>
                </>
              ) : (
                <>
                  <FolderKanban className="h-3 w-3 text-sky-500" />
                  <span>{t(lang, 'projectLabel')}</span>
                </>
              )}
            </button>

            {projectMenuOpen && (
              <div className="absolute left-0 bottom-8 z-40 w-64 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 shadow-2xl space-y-2 animate-fade-slide">
                <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 px-1">
                  {t(lang, 'assignProject')}
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(null);
                      setProjectMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                      !selectedProject
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span>{t(lang, 'projectNone')}</span>
                    {!selectedProject && <Check className="h-3.5 w-3.5" />}
                  </button>

                  {activeProjects.map((proj) => {
                    const active = selectedProject?.id === proj.id;
                    return (
                      <button
                        key={proj.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(proj.id);
                          setProjectMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                          active
                            ? 'bg-violet-600 text-white'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span>{proj.emoji}</span>
                          <span className="truncate">{proj.name}</span>
                        </span>
                        {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Inline New Project Form */}
                <form
                  onSubmit={handleCreateProjectInline}
                  className="border-t border-zinc-200 dark:border-zinc-800 pt-2 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    {PROJECT_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setNewProjEmoji(em)}
                        className={`h-6 w-6 rounded text-xs transition ${
                          newProjEmoji === em
                            ? 'bg-violet-500/20 ring-1 ring-violet-500'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    {ACCENT_SWATCHES.slice(0, 8).map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setNewProjColor(hex)}
                        style={{ backgroundColor: hex }}
                        className={`h-4 w-4 rounded-full transition ${
                          newProjColor === hex
                            ? 'ring-2 ring-offset-1 ring-zinc-900 dark:ring-white scale-110'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                        aria-label={hex}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newProjName}
                      onChange={(e) => setNewProjName(e.target.value)}
                      placeholder={t(lang, 'newProjectPlaceholder')}
                      className="h-7 flex-1 min-w-0 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                    <button
                      type="submit"
                      disabled={!newProjName.trim()}
                      style={{ backgroundColor: settings.accentColor }}
                      className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-white disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{t(lang, 'add')}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {settings.showQuickMinuteChips && (
          <span className="hidden sm:inline text-[11px] text-zinc-400 dark:text-zinc-500">
            {t(lang, 'quickAddTip')}
          </span>
        )}
      </div>
    </div>
  );
};
