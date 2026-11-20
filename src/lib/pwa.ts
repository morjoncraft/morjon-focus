import { useCallback, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneMatch = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const wcoMatch = window.matchMedia?.('(display-mode: window-controls-overlay)')?.matches;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return Boolean(standaloneMatch || wcoMatch || iosStandalone);
}

export function usePwaInstall() {
  const [isStandalone, setIsStandalone] = useState<boolean>(() => checkIsStandalone());
  const [canInstallPrompt, setCanInstallPrompt] = useState<boolean>(() =>
    typeof window !== 'undefined' ? Boolean(window.__deferredPwaPrompt) : false,
  );
  const [swReady, setSwReady] = useState<boolean>(false);

  useEffect(() => {
    const syncPromptState = () => {
      setCanInstallPrompt(Boolean(window.__deferredPwaPrompt));
      setIsStandalone(checkIsStandalone());
    };

    const onReady = () => syncPromptState();
    const onInstalled = () => {
      window.__deferredPwaPrompt = null;
      setCanInstallPrompt(false);
      setIsStandalone(true);
    };

    window.addEventListener('morjon-pwa-ready', onReady);
    window.addEventListener('morjon-pwa-installed', onInstalled);

    const mqStandalone = window.matchMedia?.('(display-mode: standalone)');
    const mqWco = window.matchMedia?.('(display-mode: window-controls-overlay)');
    mqStandalone?.addEventListener?.('change', syncPromptState);
    mqWco?.addEventListener?.('change', syncPromptState);

    if ('serviceWorker' in navigator) {
      if (navigator.serviceWorker.controller) {
        setSwReady(true);
      }
      void navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg) setSwReady(true);
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('morjon-pwa-ready', onReady);
      window.removeEventListener('morjon-pwa-installed', onInstalled);
      mqStandalone?.removeEventListener?.('change', syncPromptState);
      mqWco?.removeEventListener?.('change', syncPromptState);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const evt = window.__deferredPwaPrompt;
    if (!evt) return 'unavailable';
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === 'accepted') {
        window.__deferredPwaPrompt = null;
        setCanInstallPrompt(false);
        setIsStandalone(true);
      }
      return choice.outcome;
    } catch {
      return 'unavailable';
    }
  }, []);

  return {
    isStandalone,
    canInstallPrompt,
    swReady,
    promptInstall,
  };
}
