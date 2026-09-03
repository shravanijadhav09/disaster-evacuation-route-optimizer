import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ErrorBanner({ error, onClose }) {
  if (!error) return null;

  return (
    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start justify-between gap-3 text-rose-300 shadow-lg animate-in fade-in duration-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-rose-200">Error Occurred</h4>
          <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">{typeof error === 'string' ? error : error.message}</p>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
