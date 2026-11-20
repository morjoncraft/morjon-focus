import React, { useEffect, useRef, useState } from 'react';
import { Music2, Trash2, Upload, Volume2, VolumeX } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';
import {
  deleteCustomAudioBlob,
  formatFileSize,
  validateAndSaveCustomAudio,
} from '../lib/customAudioStorage';
import { formatTimer } from '../lib/formatters';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';
import type { SoundscapeId } from '../types';

interface SoundscapeMenuProps {
  direction?: 'down' | 'up' | 'right' | 'left';
  compactLabel?: boolean;
  shapeClass?: string;
}

export const SoundscapeMenu: React.FC<SoundscapeMenuProps> = ({
  direction = 'down',
  compactLabel = false,
  shapeClass = 'rounded-xl',
}) => {
  const settings = useFocusStore((s) => s.settings);
  const soundscape = useFocusStore((s) => s.soundscape);
  const soundVolume = useFocusStore((s) => s.soundVolume);
  const customSoundMeta = useFocusStore((s) => s.customSoundMeta);
  const setSoundscape = useFocusStore((s) => s.setSoundscape);
  const setSoundVolume = useFocusStore((s) => s.setSoundVolume);
  const setCustomSoundMeta = useFocusStore((s) => s.setCustomSoundMeta);

  const [open, setOpen] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const lang = settings.language;

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const soundscapeOptions: Array<{ id: SoundscapeId; label: string; emoji: string }> = [
    { id: 'off', label: t(lang, 'soundOff'), emoji: '🔇' },
    { id: 'campfire', label: t(lang, 'soundCampfire'), emoji: '🔥' },
    { id: 'winter', label: t(lang, 'soundWinter'), emoji: '❄️' },
    { id: 'rain', label: t(lang, 'soundRain'), emoji: '🌧️' },
    { id: 'cafe', label: t(lang, 'soundCafe'), emoji: '☕' },
    { id: 'brown', label: t(lang, 'soundBrown'), emoji: '🌊' },
    { id: 'white', label: t(lang, 'soundWhite'), emoji: '🌬️' },
    { id: 'beach', label: t(lang, 'soundBeach'), emoji: '🏖️' },
    { id: 'forest', label: t(lang, 'soundForest'), emoji: '🌲' },
  ];

  const activeLabel =
    soundscape === 'off'
      ? t(lang, 'sound')
      : soundscape === 'custom'
        ? customSoundMeta?.fileName ?? t(lang, 'soundCustom')
        : soundscapeOptions.find((o) => o.id === soundscape)?.label ?? t(lang, 'sound');

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setUploadErr(null);
    try {
      const meta = await validateAndSaveCustomAudio(file, lang);
      setCustomSoundMeta(meta);
      if (soundscape === 'custom') {
        audioEngine.reloadCustomSound();
      } else {
        setSoundscape('custom');
      }
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCustom = async () => {
    if (soundscape === 'custom') {
      setSoundscape('off');
    }
    setCustomSoundMeta(null);
    setUploadErr(null);
    await deleteCustomAudioBlob().catch(() => {});
  };

  const popoverPosition =
    direction === 'up'
      ? 'right-0 bottom-11'
      : direction === 'right'
        ? 'top-0 left-12'
        : direction === 'left'
          ? 'top-0 right-12'
          : 'right-0 mt-2';

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-9 items-center justify-center gap-1.5 border px-3 text-xs font-medium transition ${shapeClass} ${
          soundscape !== 'off'
            ? 'border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300'
            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
        title={t(lang, 'soundscapes')}
      >
        {soundscape === 'off' ? (
          <VolumeX className="h-4 w-4 shrink-0" />
        ) : (
          <Volume2 className="h-4 w-4 shrink-0" />
        )}
        {!compactLabel && <span className="max-w-[110px] truncate">{activeLabel}</span>}
      </button>

      {open && (
        <div
          className={`absolute ${popoverPosition} w-64 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-[#1e212a] p-3 shadow-2xl z-50 animate-fade-slide`}
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              {t(lang, 'soundscapes')}
            </span>
            <span className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
              {Math.round(soundVolume * 100)}%
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
            {soundscapeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSoundscape(opt.id)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                  soundscape === opt.id
                    ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300 font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </span>
                {soundscape === opt.id && (
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                )}
              </button>
            ))}

            {/* Custom Audio Option */}
            <div className="mt-1.5 pt-1.5 border-t border-zinc-200/80 dark:border-zinc-800">
              {customSoundMeta ? (
                <div
                  className={`flex items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 text-xs ${
                    soundscape === 'custom'
                      ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSoundscape('custom')}
                    className="flex flex-1 items-center gap-2 min-w-0 text-left"
                  >
                    <Music2 className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate">{customSoundMeta.fileName}</div>
                      <div className="text-[10px] opacity-70 font-mono">
                        {formatTimer(customSoundMeta.durationSec)} •{' '}
                        {formatFileSize(customSoundMeta.sizeBytes)}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemoveCustom()}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-rose-500/15 hover:text-rose-500"
                    title={t(lang, 'customSoundRemove')}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="px-2 py-1 text-[10px] text-zinc-400">
                  🎵 {t(lang, 'customSoundNone')}
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                onChange={(e) => void handleFilePick(e)}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/70 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <Upload className="h-3 w-3 text-violet-500" />
                <span>{t(lang, 'customSoundUpload')}</span>
              </button>
              <div className="mt-1 text-center text-[10px] text-zinc-400">
                {t(lang, 'customSoundLimits')}
              </div>

              {uploadErr && (
                <div className="mt-1.5 rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-medium text-rose-600 dark:text-rose-300">
                  {uploadErr}
                </div>
              )}
            </div>
          </div>

          <div className="mt-2.5 border-t border-zinc-200 dark:border-zinc-800 pt-2.5 px-1">
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={soundVolume}
              onChange={(e) => setSoundVolume(Number(e.target.value))}
              className="w-full accent-violet-500 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
