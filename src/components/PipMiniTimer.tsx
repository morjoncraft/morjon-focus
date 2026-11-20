import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Minus, Pause, PictureInPicture2, Play, Plus, X } from 'lucide-react';
import { hexToRgba, normalizeHex } from '../lib/colors';
import { fireTaskCompleteConfetti } from '../lib/confetti';
import { formatTimer } from '../lib/formatters';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';
import type { Task } from '../types';

interface DocumentPictureInPictureApi {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
  window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureApi;
  }
}

interface PipControllerProps {
  activeTask: Task | null;
  triggerRef?: React.MutableRefObject<(() => void) | null>;
}

export const PipMiniTimerController: React.FC<PipControllerProps> = ({
  activeTask,
  triggerRef,
}) => {
  const theme = useFocusStore((s) => s.theme);
  const settings = useFocusStore((s) => s.settings);
  const isTimerRunning = useFocusStore((s) => s.isTimerRunning);
  const toggleTimer = useFocusStore((s) => s.toggleTimer);
  const adjustTaskMinutes = useFocusStore((s) => s.adjustTaskMinutes);
  const completeTask = useFocusStore((s) => s.completeTask);

  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [videoPipActive, setVideoPipActive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const lang = settings.language;
  const isDark = theme === 'dark';

  const closePip = useCallback(() => {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }
    setPipWindow(null);
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture().catch(() => {});
    }
    setVideoPipActive(false);
  }, [pipWindow]);

  const drawFallbackCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = isDark ? '#1a1d26' : '#f4f6fb';
    ctx.fillRect(0, 0, w, h);

    if (!activeTask) {
      ctx.fillStyle = isDark ? '#e4e4e7' : '#27272a';
      ctx.font = '600 18px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Morjon Focus', w / 2, h / 2);
      return;
    }

    const isOvertime = activeTask.remaining_seconds < 0;

    // Task title
    ctx.fillStyle = isDark ? '#a1a1aa' : '#52525b';
    ctx.font = '600 15px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const label = `${activeTask.emoji} ${activeTask.title}`;
    ctx.fillText(label.length > 34 ? `${label.slice(0, 32)}…` : label, w / 2, 54);

    // Giant countdown
    ctx.fillStyle = isOvertime
      ? '#f43f5e'
      : isDark
        ? '#ffffff'
        : '#18181b';
    ctx.font = '700 58px JetBrains Mono, monospace';
    ctx.fillText(formatTimer(activeTask.remaining_seconds), w / 2, 128);

    // Status pill
    ctx.fillStyle = isTimerRunning ? '#10b981' : isDark ? '#71717a' : '#a1a1aa';
    ctx.font = '600 13px Inter, system-ui, sans-serif';
    ctx.fillText(
      isTimerRunning ? `● ${t(lang, 'running')}` : `❚❚ ${t(lang, 'pause')}`,
      w / 2,
      166,
    );
  }, [activeTask, isDark, isTimerRunning, lang, settings.accentColor]);

  // Keep canvas updated while Video PiP fallback is active
  useEffect(() => {
    if (!videoPipActive) return;
    drawFallbackCanvas();
    const id = window.setInterval(drawFallbackCanvas, 350);
    return () => window.clearInterval(id);
  }, [videoPipActive, drawFallbackCanvas]);

  // Sync dark/light class to Document PiP window when theme changes
  useEffect(() => {
    if (!pipWindow || pipWindow.closed) return;
    const docEl = pipWindow.document.documentElement;
    if (isDark) docEl.classList.add('dark');
    else docEl.classList.remove('dark');
  }, [isDark, pipWindow]);

  const openPip = useCallback(async () => {
    if (pipWindow && !pipWindow.closed) {
      closePip();
      return;
    }

    // 1. Primary: Modern Document Picture-in-Picture (Chrome 116+ / Edge 116+)
    if (window.documentPictureInPicture?.requestWindow) {
      try {
        const win = await window.documentPictureInPicture.requestWindow({
          width: 340,
          height: 210,
        });

        // Copy styles from main document into PiP document
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
          win.document.head.appendChild(node.cloneNode(true));
        });

        if (isDark) win.document.documentElement.classList.add('dark');
        win.document.title = 'Morjon Focus — Mini';
        win.document.body.className =
          'm-0 overflow-hidden bg-zinc-100 dark:bg-[#1a1d26] text-zinc-900 dark:text-zinc-100';

        win.addEventListener('pagehide', () => {
          setPipWindow(null);
        });

        setPipWindow(win);
        return;
      } catch {
        // Fallback below if Document PiP denied
      }
    }

    // 2. Fallback: Canvas Stream + Standard Video Picture-in-Picture
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video && typeof canvas.captureStream === 'function') {
      try {
        drawFallbackCanvas();
        const stream = canvas.captureStream(15);
        video.srcObject = stream;
        await video.play();
        if (typeof video.requestPictureInPicture === 'function') {
          await video.requestPictureInPicture();
          setVideoPipActive(true);
        }
      } catch {
        // Ignore if browser blocks PiP
      }
    }
  }, [closePip, drawFallbackCanvas, isDark, pipWindow]);

  useEffect(() => {
    if (triggerRef) {
      triggerRef.current = () => {
        void openPip();
      };
    }
  }, [openPip, triggerRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLeave = () => setVideoPipActive(false);
    video.addEventListener('leavepictureinpicture', onLeave);
    return () => video.removeEventListener('leavepictureinpicture', onLeave);
  }, []);

  const taskHex = activeTask ? normalizeHex(activeTask.color) : null;
  const accentHex = taskHex ?? settings.accentColor;
  const isOvertime = activeTask ? activeTask.remaining_seconds < 0 : false;

  return (
    <>
      {/* Hidden elements for Canvas Video PiP fallback */}
      <canvas ref={canvasRef} width={360} height={200} className="hidden" />
      <video ref={videoRef} muted playsInline className="hidden" />

      {/* Interactive Document PiP Portal */}
      {pipWindow &&
        !pipWindow.closed &&
        createPortal(
          <div
            className="flex h-screen w-screen flex-col justify-between p-3.5 select-none"
            style={{
              backgroundColor: isDark
                ? hexToRgba(accentHex, 0.12)
                : hexToRgba(accentHex, 0.08),
            }}
          >
            {activeTask ? (
              <>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{activeTask.emoji}</span>
                    <span className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      {activeTask.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={closePip}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="text-center">
                  <div
                    className={`font-mono text-4xl font-bold tracking-tight tabular-nums ${
                      isOvertime
                        ? 'text-rose-500 animate-overtime-pulse'
                        : 'text-zinc-950 dark:text-white'
                    }`}
                  >
                    {formatTimer(activeTask.remaining_seconds)}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustTaskMinutes(activeTask.id, -5)}
                    className="inline-flex h-8 items-center gap-0.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 px-2 text-[11px] font-semibold"
                  >
                    <Minus className="h-3 w-3" />
                    5
                  </button>

                  <button
                    type="button"
                    onClick={toggleTimer}
                    style={
                      isTimerRunning ? undefined : { backgroundColor: settings.accentColor }
                    }
                    className={`inline-flex h-8 min-w-[84px] items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${
                      isTimerRunning
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-white'
                    }`}
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="h-3.5 w-3.5 fill-current" />
                        <span>{t(lang, 'pause')}</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>{t(lang, 'start')}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => adjustTaskMinutes(activeTask.id, 5)}
                    className="inline-flex h-8 items-center gap-0.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 px-2 text-[11px] font-semibold"
                  >
                    <Plus className="h-3 w-3" />
                    5
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (settings.confettiOnComplete) fireTaskCompleteConfetti(null);
                      completeTask(activeTask.id);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                    title={t(lang, 'complete')}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center text-xs text-zinc-500">
                <PictureInPicture2 className="h-6 w-6 mb-1.5 opacity-60" />
                <span>{t(lang, 'emptyTitle')}</span>
              </div>
            )}
          </div>,
          pipWindow.document.body,
        )}
    </>
  );
};
