import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, Link2, Share2, X } from 'lucide-react';
import { formatDurationBadge } from '../lib/formatters';
import {
  buildShareUrl,
  decodeShareInput,
  encodeSharePayload,
  exportShareJson,
} from '../lib/shareCodec';
import { useFocusStore } from '../store/useFocusStore';
import type { SharedListPayload } from '../types';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  incomingPayload: SharedListPayload | null;
  onClearIncoming: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onClose,
  incomingPayload,
  onClearIncoming,
}) => {
  const lists = useFocusStore((s) => s.lists);
  const tasks = useFocusStore((s) => s.tasks);
  const activeListId = useFocusStore((s) => s.activeListId);
  const lang = useFocusStore((s) => s.settings.language);
  const importSharedList = useFocusStore((s) => s.importSharedList);

  const [tab, setTab] = useState<'share' | 'import'>(incomingPayload ? 'import' : 'share');
  const [shareUrl, setShareUrl] = useState('');
  const [shareJson, setShareJson] = useState('');
  const [copiedType, setCopiedType] = useState<'url' | 'json' | null>(null);

  const [importInput, setImportInput] = useState('');
  const [previewPayload, setPreviewPayload] = useState<SharedListPayload | null>(
    incomingPayload,
  );
  const [importError, setImportError] = useState<string | null>(null);

  const isTr = lang === 'tr';

  const activeList =
    lists.find((l) => l.id === activeListId && !l.deleted_at) ??
    lists.find((l) => !l.deleted_at && !l.is_preset);

  useEffect(() => {
    if (incomingPayload) {
      setTab('import');
      setPreviewPayload(incomingPayload);
      setImportError(null);
    }
  }, [incomingPayload]);

  useEffect(() => {
    if (!open || !activeList) return;
    const listTasks = tasks.filter(
      (t) => !t.deleted_at && t.list_id === activeList.id && t.status !== 'completed',
    );
    setShareJson(exportShareJson(activeList, listTasks));
    void encodeSharePayload(activeList, listTasks).then((code) => {
      setShareUrl(buildShareUrl(code));
    });
  }, [open, activeList, tasks]);

  if (!open) return null;

  const copyText = async (text: string, kind: 'url' | 'json') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(kind);
      window.setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const handleParseImport = async (raw: string) => {
    setImportInput(raw);
    if (!raw.trim()) {
      setPreviewPayload(null);
      setImportError(null);
      return;
    }
    try {
      const decoded = await decodeShareInput(raw);
      setPreviewPayload(decoded);
      setImportError(null);
    } catch (err) {
      setPreviewPayload(null);
      setImportError(err instanceof Error ? err.message : 'Invalid share data.');
    }
  };

  const handleConfirmImport = (target: 'new_list' | 'active_list') => {
    if (!previewPayload) return;
    importSharedList(previewPayload, target);
    setImportInput('');
    setPreviewPayload(null);
    onClearIncoming();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl animate-fade-slide">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {isTr ? 'Liste Paylaş & İçe Aktar' : 'Share & Import List'}
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {isTr
                  ? 'Sıkıştırılmış link veya JSON ile tek tıkla paylaş'
                  : 'Share via compressed URL or raw JSON'}
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

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
          <button
            type="button"
            onClick={() => setTab('share')}
            className={`rounded-lg py-1.5 text-xs font-semibold transition ${
              tab === 'share'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {isTr ? 'Aktif Listeyi Paylaş' : 'Share Active List'}
          </button>
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`rounded-lg py-1.5 text-xs font-semibold transition ${
              tab === 'import'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {isTr ? 'Link / JSON İçe Aktar' : 'Import Link / JSON'}
          </button>
        </div>

        {tab === 'share' ? (
          <div className="mt-4 space-y-4">
            {activeList ? (
              <>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3 text-xs">
                  {isTr ? 'Paylaşılacak liste: ' : 'Sharing list: '}
                  <span className="font-semibold">
                    {activeList.emoji} {activeList.name}
                  </span>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {isTr ? 'Paylaşım Bağlantısı (URL)' : 'Share URL'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.target.select()}
                      className="h-10 flex-1 min-w-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 font-mono text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void copyText(shareUrl, 'url')}
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-3.5 text-xs font-semibold text-white transition"
                    >
                      {copiedType === 'url' ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          {isTr ? 'Kopyalandı' : 'Copied'}
                        </>
                      ) : (
                        <>
                          <Link2 className="h-3.5 w-3.5" />
                          {isTr ? 'Kopyala' : 'Copy Link'}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      JSON
                    </label>
                    <button
                      type="button"
                      onClick={() => void copyText(shareJson, 'json')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      {copiedType === 'json' ? (
                        <>
                          <Check className="h-3 w-3" />
                          {isTr ? 'Kopyalandı' : 'Copied'}
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          {isTr ? 'JSON Kopyala' : 'Copy JSON'}
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    rows={5}
                    value={shareJson}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-3 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-xs text-zinc-500">
                {isTr ? 'Aktif liste bulunamadı.' : 'No active list available.'}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {!incomingPayload && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {isTr
                    ? 'Paylaşım linkini, kodunu veya JSON verisini yapıştır:'
                    : 'Paste a share URL, code, or JSON payload:'}
                </label>
                <textarea
                  rows={4}
                  value={importInput}
                  onChange={(e) => void handleParseImport(e.target.value)}
                  placeholder="https://.../?share=v1... or {...}"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            )}

            {importError && (
              <div className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-300">
                {importError}
              </div>
            )}

            {previewPayload && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {previewPayload.emoji} {previewPayload.name}
                  </span>
                  <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-600 dark:text-violet-300">
                    {previewPayload.tasks.length} {isTr ? 'görev' : 'tasks'}
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {previewPayload.tasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs"
                    >
                      <span className="truncate">
                        {task.emoji} {task.title}
                      </span>
                      <span className="ml-2 shrink-0 font-mono text-[11px] text-zinc-500">
                        {formatDurationBadge(task.duration_seconds, lang)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleConfirmImport('new_list')}
                    className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-3 text-xs font-semibold text-white transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {isTr ? 'Yeni Liste Olarak Ekle' : 'Import as New List'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmImport('active_list')}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  >
                    {isTr ? 'Aktif Listeye Ekle' : 'Add to Active List'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
