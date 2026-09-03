import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading data...' }) {
  return (
    <div className="flex items-center justify-center p-6 gap-3 text-slate-300">
      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
