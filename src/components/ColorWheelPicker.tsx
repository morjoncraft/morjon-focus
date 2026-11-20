import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { hexToHsl, hslToHex, normalizeHex } from '../lib/colors';
import { t } from '../lib/i18n';
import { useFocusStore } from '../store/useFocusStore';

type ColorTarget = 'darkBg' | 'lightBg' | 'accent';

const WHEEL_SIZE = 172;
const WHEEL_RADIUS = WHEEL_SIZE / 2 - 4;

export const ColorWheelPicker: React.FC = () => {
  const settings = useFocusStore((s) => s.settings);
  const theme = useFocusStore((s) => s.theme);
  const setTheme = useFocusStore((s) => s.setTheme);
  const updateSettings = useFocusStore((s) => s.updateSettings);

  const [target, setTarget] = useState<ColorTarget>(() =>
    theme === 'light' ? 'lightBg' : 'darkBg',
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);

  const lang = settings.language;

  const currentHex = useMemo(() => {
    if (target === 'accent') return normalizeHex(settings.accentColor) ?? '#9364b8';
    if (target === 'lightBg') return normalizeHex(settings.customLightBg) ?? '#f5f3ef';
    return normalizeHex(settings.customDarkBg) ?? '#1c1f2b';
  }, [target, settings.accentColor, settings.customLightBg, settings.customDarkBg]);

  const [hexDraft, setHexDraft] = useState(currentHex);
  useEffect(() => {
    setHexDraft(currentHex);
  }, [currentHex]);

  const { h, s, l } = useMemo(() => hexToHsl(currentHex), [currentHex]);

  const commitColor = useCallback(
    (nextHex: string) => {
      if (target === 'accent') {
        updateSettings({ accentColor: nextHex });
      } else if (target === 'darkBg') {
        updateSettings({ customBgEnabled: true, customDarkBg: nextHex });
        if (theme !== 'dark') setTheme('dark');
      } else {
        updateSettings({ customBgEnabled: true, customLightBg: nextHex });
        if (theme !== 'light') setTheme('light');
      }
    },
    [setTheme, target, theme, updateSettings],
  );

  // Render crisp Hue x Saturation wheel onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = ctx.createImageData(WHEEL_SIZE, WHEEL_SIZE);
    const data = img.data;
    const cx = WHEEL_SIZE / 2;
    const cy = WHEEL_SIZE / 2;
    // Keep wheel vibrant enough to judge hues even when target is deep dark mode
    const previewL = target === 'darkBg' ? 42 : target === 'lightBg' ? 76 : 56;

    for (let y = 0; y < WHEEL_SIZE; y++) {
      for (let x = 0; x < WHEEL_SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);
        const offset = (y * WHEEL_SIZE + x) * 4;
        if (dist > WHEEL_RADIUS) {
          data[offset + 3] = 0;
          continue;
        }
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const hue = (angle + 360) % 360;
        const sat = Math.min(100, (dist / WHEEL_RADIUS) * 100);
        const hex = hslToHex(hue, sat, previewL);
        const n = Number.parseInt(hex.slice(1), 16);
        data[offset] = (n >> 16) & 255;
        data[offset + 1] = (n >> 8) & 255;
        data[offset + 2] = n & 255;
        data[offset + 3] = dist > WHEEL_RADIUS - 1.2 ? 180 : 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [target]);

  const updateFromPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const maxR = rect.width / 2 - 4;
    const dist = Math.min(maxR, Math.hypot(dx, dy));
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const nextH = (angle + 360) % 360;
    const nextS = Math.round((dist / maxR) * 100);
    const defaultL = target === 'darkBg' ? Math.min(34, Math.max(7, l)) : target === 'lightBg' ? Math.max(78, Math.min(97, l)) : Math.min(68, Math.max(35, l));
    commitColor(hslToHex(nextH, nextS, defaultL));
  };

  // Marker coordinates on wheel
  const rad = (h * Math.PI) / 180;
  const markerDist = (s / 100) * WHEEL_RADIUS;
  const markerX = WHEEL_SIZE / 2 + markerDist * Math.cos(rad);
  const markerY = WHEEL_SIZE / 2 + markerDist * Math.sin(rad);

  const minL = target === 'darkBg' ? 5 : target === 'lightBg' ? 75 : 28;
  const maxL = target === 'darkBg' ? 36 : target === 'lightBg' ? 98 : 74;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/70 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-zinc-800 dark:text-zinc-100">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span>{t(lang, 'colorWheelTitle')}</span>
        </div>

        {settings.customBgEnabled && (
          <button
            type="button"
            onClick={() => updateSettings({ customBgEnabled: false })}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{t(lang, 'colorWheelResetPreset')}</span>
          </button>
        )}
      </div>

      {/* Target selector pills */}
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-zinc-200/70 dark:bg-zinc-800 p-1 text-xs font-semibold">
        {(
          [
            { id: 'darkBg', label: t(lang, 'colorWheelDarkBg') },
            { id: 'lightBg', label: t(lang, 'colorWheelLightBg') },
            { id: 'accent', label: t(lang, 'colorWheelAccent') },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTarget(item.id)}
            className={`rounded-lg py-1.5 transition ${
              target === item.id
                ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Interactive Canvas Wheel */}
        <div className="relative shrink-0 select-none touch-none">
          <canvas
            ref={canvasRef}
            width={WHEEL_SIZE}
            height={WHEEL_SIZE}
            onPointerDown={(e) => {
              draggingRef.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              updateFromPointer(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!draggingRef.current) return;
              updateFromPointer(e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
              draggingRef.current = false;
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                // ignore
              }
            }}
            className="h-[172px] w-[172px] cursor-crosshair rounded-full"
          />
          <div
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-1 ring-black/40"
            style={{
              left: `${markerX}px`,
              top: `${markerY}px`,
              backgroundColor: currentHex,
            }}
          />
        </div>

        {/* Tone / Brightness + Hex Input */}
        <div className="flex-1 w-full space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-300">
              <span>{t(lang, 'colorWheelBrightness')}</span>
              <span className="font-mono tabular-nums">{l}%</span>
            </div>
            <input
              type="range"
              min={minL}
              max={maxL}
              step={1}
              value={Math.min(maxL, Math.max(minL, l))}
              onChange={(e) => commitColor(hslToHex(h, s, Number(e.target.value)))}
              style={{
                background: `linear-gradient(to right, ${hslToHex(h, s, minL)}, ${hslToHex(h, s, maxL)})`,
              }}
              className="h-3 w-full appearance-none rounded-full cursor-pointer accent-white"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className="h-10 w-10 shrink-0 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-inner"
              style={{ backgroundColor: currentHex }}
            />
            <input
              type="text"
              value={hexDraft}
              onChange={(e) => {
                const val = e.target.value;
                setHexDraft(val);
                const valid = normalizeHex(val);
                if (valid) commitColor(valid);
              }}
              className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 font-mono text-sm font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="#1C1F2B"
            />
          </div>

          {settings.customBgEnabled && target !== 'accent' && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t(lang, 'customBgActiveBadge')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
