import type { CustomSoundMeta, Language } from '../types';

export const MAX_CUSTOM_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_CUSTOM_AUDIO_SECONDS = 600; // 10 minutes

const DB_NAME = 'morjon-focus-audio-db';
const STORE_NAME = 'tracks';
const TRACK_KEY = 'custom-loop';

function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this environment.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open audio DB.'));
  });
}

export async function saveCustomAudioBlob(blob: Blob): Promise<void> {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, TRACK_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to save custom audio.'));
    };
  });
}

export async function loadCustomAudioBlob(): Promise<Blob | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(TRACK_KEY);
    req.onsuccess = () => {
      db.close();
      resolve(req.result instanceof Blob ? req.result : null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error ?? new Error('Failed to load custom audio.'));
    };
  });
}

export async function deleteCustomAudioBlob(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(TRACK_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to delete custom audio.'));
    };
  });
}

const AUDIO_EXT_REGEX = /\.(mp3|wav|ogg|m4a|aac|webm|flac|opus)$/i;

export function probeAudioDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';

    let settled = false;
    const cleanup = () => {
      window.clearTimeout(timer);
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.src = '';
      URL.revokeObjectURL(url);
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Audio metadata timeout'));
    }, 8000);

    audio.onloadedmetadata = () => {
      if (settled) return;
      settled = true;
      const dur = audio.duration;
      cleanup();
      if (!Number.isFinite(dur) || dur <= 0) {
        reject(new Error('Invalid audio duration'));
        return;
      }
      resolve(dur);
    };

    audio.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Unreadable audio format'));
    };

    audio.src = url;
  });
}

export async function validateAndSaveCustomAudio(
  file: File,
  lang: Language = 'en',
): Promise<CustomSoundMeta> {
  const isTr = lang === 'tr';

  const isAudioType =
    file.type.startsWith('audio/') || AUDIO_EXT_REGEX.test(file.name);
  if (!isAudioType) {
    throw new Error(
      isTr
        ? 'Lütfen geçerli bir ses dosyası seç (MP3, WAV, OGG, M4A vb.).'
        : 'Please select a valid audio file (MP3, WAV, OGG, M4A, etc.).',
    );
  }

  if (file.size > MAX_CUSTOM_AUDIO_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      isTr
        ? `Dosya boyutu çok büyük (${mb} MB). Maksimum sınır 15 MB.`
        : `File is too large (${mb} MB). Maximum size limit is 15 MB.`,
    );
  }

  let durationSec = 0;
  try {
    durationSec = await probeAudioDuration(file);
  } catch {
    throw new Error(
      isTr
        ? 'Ses dosyası okunamadı veya süresi belirlenemedi.'
        : 'Could not read this audio file or inspect its duration.',
    );
  }

  if (durationSec > MAX_CUSTOM_AUDIO_SECONDS) {
    const mins = (durationSec / 60).toFixed(1);
    throw new Error(
      isTr
        ? `Ses süresi çok uzun (${mins} dk). Maksimum sınır 10 dakika.`
        : `Audio is too long (${mins} min). Maximum duration limit is 10 minutes.`,
    );
  }

  await saveCustomAudioBlob(file);
  return {
    fileName: file.name,
    sizeBytes: file.size,
    durationSec: Math.round(durationSec),
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
