import React from 'react';
import { CheckCircle2, Laptop, MonitorDown, Sparkles, WifiOff, X } from 'lucide-react';
import { t } from '../lib/i18n';
import { usePwaInstall } from '../lib/pwa';
import { useFocusStore } from '../store/useFocusStore';

interface PwaInstallModalProps {
  open: boolean;
  onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ open, onClose }) => {
  const settings = useFocusStore((s) => s.settings);
  const { isStandalone, canInstallPrompt, swReady, promptInstall } = usePwaInstall();

  if (!open) return null;

  const lang = settings.language;
  const isTr = lang === 'tr';

  const handleInstallClick = async () => {
    const result = await promptInstall();
    if (result === 'accepted') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#23262f] p-5 sm:p-6 shadow-2xl animate-fade-slide">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: settings.accentColor }}
            >
              <MonitorDown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {t(lang, 'pwaTitle')}
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {t(lang, 'pwaSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live PWA Diagnostics */}
        <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
              <Laptop className="h-3.5 w-3.5 text-violet-500" />
              {isTr ? 'Pencere Modu:' : 'Window Mode:'}
            </span>
            <span
              className={`font-semibold ${
                isStandalone
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-800 dark:text-zinc-200'
              }`}
            >
              {isStandalone
                ? t(lang, 'appInstalledBadge')
                : isTr
                  ? 'Tarayıcı Sekmesi'
                  : 'Browser Tab'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
              <WifiOff className="h-3.5 w-3.5 text-emerald-500" />
              {isTr ? 'Çevrimdışı Önbellek (SW):' : 'Offline Cache (SW):'}
            </span>
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                swReady
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-300'
              }`}
            >
              {swReady && <CheckCircle2 className="h-3.5 w-3.5" />}
              {swReady
                ? isTr
                  ? 'Hazır'
                  : 'Ready'
                : isTr
                  ? 'Sayfayı Yenile'
                  : 'Refresh Page'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-300">
              {isTr ? 'URL Çubuksuz Görünüm:' : 'Frameless Window:'}
            </span>
            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
              standalone + WCO
            </span>
          </div>
        </div>

        {/* Direct 1-click Install CTA when browser exposes beforeinstallprompt */}
        {!isStandalone && canInstallPrompt && (
          <button
            type="button"
            onClick={() => void handleInstallClick()}
            style={{ backgroundColor: settings.accentColor }}
            className="mt-4 w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-md hover:brightness-110 transition"
          >
            <Sparkles className="h-4 w-4" />
            {isTr ? 'Morjon Focus Uygulamasını Şimdi Kur' : 'Install Morjon Focus Now'}
          </button>
        )}

        {/* Step-by-step Browser Guide */}
        <div className="mt-4 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-3">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              {isTr ? 'Chrome / Edge / Brave (Windows & Linux)' : 'Chrome / Edge / Brave (Windows & Linux)'}
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>
                {isTr
                  ? 'Adres çubuğunun sağındaki bilgisayar/indir simgesine ("Uygulamayı yükle") tıkla.'
                  : 'Click the Install icon on the right side of your browser address bar.'}
              </li>
              <li>
                {isTr
                  ? 'Veya menüden (⋮ / ⋯) → "Uygulamalar" / "Sayfayı uygulama olarak yükle" seçeneğini seç.'
                  : 'Or open the browser menu (⋮ / ⋯) → Apps / Save and share → "Install page as app".'}
              </li>
              <li>
                {isTr
                  ? 'Açılan bağımsız pencerede URL çubuğu görünmez. Üst sağdaki ⌃ okuna basarak başlık çubuğunu da gizleyebilirsin (Window Controls Overlay).'
                  : 'The installed window opens without a URL bar. Click the top-right ⌃ chevron to toggle Window Controls Overlay for a sleek integrated titlebar.'}
              </li>
            </ul>
          </div>

          {!canInstallPrompt && !isStandalone && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
              {isTr
                ? 'İpucu: Adres çubuğunda kurulum ikonu görünmüyorsa tarayıcı menüsünden (⋮ / ⋯) "Uygulama olarak yükle" seçeneğini kullanabilirsin.'
                : 'Tip: If the install icon does not appear in the address bar, use your browser menu (⋮ / ⋯) → "Install page as app".'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
