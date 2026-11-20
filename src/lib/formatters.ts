import type { Language } from '../types';

export function formatTimer(seconds: number): string {
  const isNegative = seconds < 0;
  const abs = Math.abs(Math.trunc(seconds));
  const hrs = Math.floor(abs / 3600);
  const mins = Math.floor((abs % 3600) / 60);
  const secs = abs % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const core =
    hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;

  return isNegative ? `-${core}` : core;
}

export function formatListDuration(totalSeconds: number, lang: Language = 'en'): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const totalMinutes = Math.ceil(safe / 60);
  const hUnit = lang === 'tr' ? 's' : 'h';
  const mUnit = lang === 'tr' ? 'dk' : 'm';

  if (totalMinutes <= 0) return `0${mUnit}`;

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}${hUnit} ${mins}${mUnit}`;
  }
  if (hours > 0) {
    return `${hours}${hUnit}`;
  }
  return `${mins}${mUnit}`;
}

export function formatClockTime(timestampMs: number, use24Hour = true): string {
  const target = new Date(timestampMs);
  if (use24Hour) {
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  let hours = target.getHours();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const mm = String(target.getMinutes()).padStart(2, '0');
  return `${hours}:${mm} ${suffix}`;
}

export function formatEndTime(
  nowMs: number,
  remainingPositiveSeconds: number,
  use24Hour = true,
): string {
  return formatClockTime(nowMs + Math.max(0, remainingPositiveSeconds) * 1000, use24Hour);
}

export function formatTimeRange(
  startMs: number,
  endMs: number,
  use24Hour = true,
): string {
  return `${formatClockTime(startMs, use24Hour)} – ${formatClockTime(endMs, use24Hour)}`;
}

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDurationBadge(seconds: number, lang: Language = 'en'): string {
  const isNeg = seconds < 0;
  const hUnit = lang === 'tr' ? 's' : 'h';
  const mUnit = lang === 'tr' ? 'dk' : 'm';
  const sUnit = lang === 'tr' ? 'sn' : 's';

  const absMins = Math.round(Math.abs(seconds) / 60);
  if (absMins === 0 && seconds !== 0) {
    return isNeg ? `-${Math.abs(seconds)}${sUnit}` : `${seconds}${sUnit}`;
  }
  const hours = Math.floor(absMins / 60);
  const mins = absMins % 60;
  const prefix = isNeg ? '-' : '';
  if (hours > 0 && mins > 0) return `${prefix}${hours}${hUnit} ${mins}${mUnit}`;
  if (hours > 0) return `${prefix}${hours}${hUnit}`;
  return `${prefix}${mins}${mUnit}`;
}
