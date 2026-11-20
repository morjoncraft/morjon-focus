import type { Language } from '../types';
import { suggestEmojiForTitle } from './parseTaskInput';

export interface BreakdownPart {
  title: string;
  emoji: string;
  durationSeconds: number;
}

function distributeSeconds(totalSeconds: number, count: number): number[] {
  const safeTotal = Math.max(count * 60, Math.round(totalSeconds));
  const totalMinutes = Math.max(count, Math.round(safeTotal / 60));
  const rawBase = Math.floor(totalMinutes / count);
  // Snap base near 5-minute multiples when large enough
  const snappedBase = rawBase >= 15 ? Math.max(5, Math.round(rawBase / 5) * 5) : rawBase;

  const mins = Array.from({ length: count }, () => snappedBase);
  let assigned = mins.reduce((a, b) => a + b, 0);
  let idx = 0;

  while (assigned < totalMinutes) {
    const step = Math.min(5, totalMinutes - assigned);
    mins[idx % count] += step;
    assigned += step;
    idx++;
  }
  while (assigned > totalMinutes) {
    const pos = count - 1 - (idx % count);
    if (mins[pos] > 5) {
      const step = Math.min(5, assigned - totalMinutes, mins[pos] - 5);
      mins[pos] -= step;
      assigned -= step;
    } else if (mins[pos] > 1) {
      mins[pos] -= 1;
      assigned -= 1;
    }
    idx++;
  }

  // Exact second preservation on the last chunk if needed
  const resultSeconds = mins.map((m) => m * 60);
  const secDiff = safeTotal - resultSeconds.reduce((a, b) => a + b, 0);
  if (secDiff !== 0) {
    resultSeconds[resultSeconds.length - 1] = Math.max(
      60,
      resultSeconds[resultSeconds.length - 1] + secDiff,
    );
  }
  return resultSeconds;
}

function getPhaseLabels(cleanTitle: string, count: number, lang: Language): string[] {
  const lower = cleanTitle.toLowerCase();
  const isWriting =
    /tez|yaz|makale|rapor|doküman|belge|write|essay|thesis|draft|article|report|doc/i.test(
      lower,
    );
  const isCoding =
    /kod|junit|react|api|bug|code|build|dev|implement|feature|refactor|app|test/i.test(lower);
  const isStudy =
    /ders|izle|oku|sınav|çalış|kurs|study|watch|read|exam|lecture|course|chapter/i.test(
      lower,
    );

  if (lang === 'tr') {
    if (isWriting) {
      const phases = ['Taslak & Planlama', 'Ana Yazım', 'Derinleştirme', 'Düzenleme & Son Kontrol'];
      return Array.from({ length: count }, (_, i) => phases[Math.min(i, phases.length - 1)]);
    }
    if (isCoding) {
      const phases = ['Mimari & Hazırlık', 'Çekirdek Geliştirme', 'Entegrasyon & Edge Cases', 'Test & Temizlik'];
      return Array.from({ length: count }, (_, i) => phases[Math.min(i, phases.length - 1)]);
    }
    if (isStudy) {
      const phases = ['Ön İnceleme & Başlangıç', 'Derin Kavrama', 'Uygulama & Notlar', 'Tekrar & Özet'];
      return Array.from({ length: count }, (_, i) => phases[Math.min(i, phases.length - 1)]);
    }
    const generic = ['Başlangıç & Hazırlık', 'Ana Odak', 'İlerleme', 'Tamamlama'];
    return Array.from({ length: count }, (_, i) => generic[Math.min(i, generic.length - 1)]);
  }

  if (isWriting) {
    const phases = ['Outline & Setup', 'Core Drafting', 'Deep Expansion', 'Review & Polish'];
    return Array.from({ length: count }, (_, i) => phases[Math.min(i, phases.length - 1)]);
  }
  if (isCoding) {
    const phases = ['Architecture & Setup', 'Core Implementation', 'Edge Cases & Integration', 'Test & Polish'];
    return Array.from({ length: count }, (_, i) => phases[Math.min(i, phases.length - 1)]);
  }
  if (isStudy) {
    const phases = ['Overview & Warmup', 'Deep Focus', 'Practice & Notes', 'Recap & Summary'];
    return Array.from({ length: count }, (_, i) => phases[Math.min(i, phases.length - 1)]);
  }
  const generic = ['Kickoff & Prep', 'Core Focus', 'Momentum Block', 'Wrap-up & Review'];
  return Array.from({ length: count }, (_, i) => generic[Math.min(i, generic.length - 1)]);
}

export function generateSmartBreakdown(
  title: string,
  totalSeconds: number,
  preferredChunkMinutes = 30,
  lang: Language = 'en',
): BreakdownPart[] {
  const clean = title.trim() || (lang === 'tr' ? 'Görev' : 'Task');
  const safeChunkSec = Math.max(10, preferredChunkMinutes) * 60;
  const count = Math.max(2, Math.min(8, Math.round(totalSeconds / safeChunkSec) || 2));

  const durations = distributeSeconds(totalSeconds, count);
  const phases = getPhaseLabels(clean, count, lang);
  const baseEmoji = suggestEmojiForTitle(clean);

  return durations.map((dur, idx) => ({
    title: `${clean} — ${phases[idx]} (${idx + 1}/${count})`,
    emoji: idx === count - 1 ? '🏁' : baseEmoji,
    durationSeconds: dur,
  }));
}
