export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return false;
  }
  try {
    if (typeof navigator.storage.persisted === 'function') {
      const already = await navigator.storage.persisted();
      if (already) return true;
    }
    if (typeof navigator.storage.persist === 'function') {
      return await navigator.storage.persist();
    }
  } catch {
    return false;
  }
  return false;
}

export async function checkPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
    return false;
  }
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function sendTimerFinishedNotification(
  taskTitle: string,
  emoji: string,
  lang: 'en' | 'tr' = 'en',
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }
  if (Notification.permission !== 'granted') {
    return;
  }
  try {
    const title = lang === 'tr' ? `Süre Doldu! ${emoji}` : `Time's Up! ${emoji}`;
    const body =
      lang === 'tr'
        ? `"${taskTitle}" için ayrılan süre tamamlandı.`
        : `Your planned time for "${taskTitle}" is complete.`;
    const n = new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      tag: 'morjon-focus-timer-done',
    });
    window.setTimeout(() => n.close(), 7000);
  } catch {
    // Ignore browser notification errors in restricted contexts
  }
}
