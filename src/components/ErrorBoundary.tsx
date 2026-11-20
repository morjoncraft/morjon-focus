import React from 'react';
import { Download, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected application error.',
    };
  }

  private handleEmergencyBackup = () => {
    try {
      const raw = localStorage.getItem('morjon-focus-storage-v1') ?? '{}';
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `morjon-focus-emergency-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('morjon-focus-storage-v1');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e212a] text-zinc-100 p-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-700/80 bg-[#262a35] p-6 shadow-2xl space-y-4">
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-white">Something went wrong</h1>
            <p className="text-xs text-zinc-400">
              Your local tasks are still safe in browser storage. You can reload or export an emergency backup before resetting.
            </p>
          </div>

          <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-3 font-mono text-[11px] text-rose-300 break-words">
            {this.state.errorMessage}
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition"
            >
              <RefreshCw className="h-4 w-4" />
              Reload App
            </button>

            <button
              type="button"
              onClick={this.handleEmergencyBackup}
              className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-600 bg-zinc-800/80 hover:bg-zinc-700 text-xs font-semibold text-zinc-100 transition"
            >
              <Download className="h-4 w-4" />
              Download Emergency JSON Backup
            </button>

            <button
              type="button"
              onClick={this.handleResetCache}
              className="w-full inline-flex h-9 items-center justify-center gap-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Local Cache & Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
