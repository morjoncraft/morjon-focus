import { isValidTaskColor } from './colors';
import type { SharedListPayload, SubTask, Task, TaskColor, TaskList } from '../types';

interface CompactShareV1 {
  v: 1;
  n: string;
  e: string;
  p?: boolean;
  t: Array<[string, string, number, TaskColor, SubTask[]?]>;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLen));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function compressDeflateRaw(text: string): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

async function decompressDeflateRaw(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Bu tarayıcı sıkıştırılmış paylaşım kodunu desteklemiyor.');
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return await new Response(stream).text();
}

export async function encodeSharePayload(list: TaskList, tasks: Task[]): Promise<string> {
  const compact: CompactShareV1 = {
    v: 1,
    n: list.name,
    e: list.emoji || '🎯',
    p: list.is_preset || undefined,
    t: tasks
      .filter((t) => !t.deleted_at && t.status !== 'completed')
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((t): CompactShareV1['t'][number] =>
        t.subtasks && t.subtasks.length > 0
          ? [t.title, t.emoji || '⚡', t.duration_seconds, t.color, t.subtasks]
          : [t.title, t.emoji || '⚡', t.duration_seconds, t.color],
      ),
  };

  const json = JSON.stringify(compact);
  const deflated = await compressDeflateRaw(json);
  if (deflated) {
    return `v1.${bytesToBase64Url(deflated)}`;
  }

  const utf8 = new TextEncoder().encode(json);
  return `u1.${bytesToBase64Url(utf8)}`;
}

export function buildShareUrl(code: string): string {
  if (typeof window === 'undefined') return `?share=${encodeURIComponent(code)}`;
  return `${window.location.origin}${window.location.pathname}?share=${encodeURIComponent(code)}`;
}

export function exportShareJson(list: TaskList, tasks: Task[]): string {
  const payload: SharedListPayload = {
    name: list.name,
    emoji: list.emoji || '🎯',
    isPreset: list.is_preset,
    tasks: tasks
      .filter((t) => !t.deleted_at && t.status !== 'completed')
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((t) => ({
        title: t.title,
        emoji: t.emoji || '⚡',
        duration_seconds: t.duration_seconds,
        color: t.color,
        ...(t.subtasks && t.subtasks.length > 0 ? { subtasks: t.subtasks } : {}),
      })),
  };
  return JSON.stringify(payload, null, 2);
}

function normalizeParsedObject(raw: unknown): SharedListPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Geçersiz paylaşım verisi.');
  }
  const obj = raw as Record<string, unknown>;

  // Compact v1 shape
  if (obj.v === 1 && typeof obj.n === 'string' && Array.isArray(obj.t)) {
    return {
      name: obj.n.trim() || 'Paylaşılan Liste',
      emoji: typeof obj.e === 'string' && obj.e ? obj.e : '🎯',
      isPreset: Boolean(obj.p),
      tasks: obj.t
        .filter((item): item is unknown[] => Array.isArray(item) && item.length >= 3)
        .map((item) => ({
          title: String(item[0] ?? 'Görev').trim() || 'Görev',
          emoji: typeof item[1] === 'string' && item[1] ? item[1] : '⚡',
          duration_seconds: Math.max(60, Number(item[2]) || 1500),
          color:
            typeof item[3] === 'string' && isValidTaskColor(item[3])
              ? item[3]
              : 'none',
          ...(Array.isArray(item[4]) ? { subtasks: item[4] as SubTask[] } : {}),
        })),
    };
  }

  // Standard JSON shape
  if (typeof obj.name === 'string' && Array.isArray(obj.tasks)) {
    return {
      name: obj.name.trim() || 'Paylaşılan Liste',
      emoji: typeof obj.emoji === 'string' && obj.emoji ? obj.emoji : '🎯',
      isPreset: Boolean(obj.isPreset),
      tasks: obj.tasks
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          title: String(item.title ?? 'Görev').trim() || 'Görev',
          emoji: typeof item.emoji === 'string' && item.emoji ? item.emoji : '⚡',
          duration_seconds: Math.max(60, Number(item.duration_seconds) || 1500),
          color:
            typeof item.color === 'string' && isValidTaskColor(item.color)
              ? item.color
              : 'none',
          ...(Array.isArray(item.subtasks) ? { subtasks: item.subtasks as SubTask[] } : {}),
        })),
    };
  }

  throw new Error('Paylaşım formatı tanınamadı.');
}

export async function decodeShareInput(input: string): Promise<SharedListPayload> {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Lütfen bir paylaşım linki, kodu veya JSON yapıştırın.');
  }

  // Extract ?share= param if user pasted a full URL
  let candidate = trimmed;
  if (trimmed.includes('share=')) {
    try {
      const url = trimmed.startsWith('http')
        ? new URL(trimmed)
        : new URL(trimmed, 'https://morjon.local');
      const param = url.searchParams.get('share');
      if (param) candidate = param;
    } catch {
      const match = trimmed.match(/[?&]share=([^&\s]+)/);
      if (match) candidate = decodeURIComponent(match[1]);
    }
  }

  if (candidate.startsWith('v1.')) {
    const jsonText = await decompressDeflateRaw(base64UrlToBytes(candidate.slice(3)));
    return normalizeParsedObject(JSON.parse(jsonText));
  }

  if (candidate.startsWith('u1.')) {
    const bytes = base64UrlToBytes(candidate.slice(3));
    const jsonText = new TextDecoder().decode(bytes);
    return normalizeParsedObject(JSON.parse(jsonText));
  }

  // Fallback raw JSON
  return normalizeParsedObject(JSON.parse(candidate));
}
