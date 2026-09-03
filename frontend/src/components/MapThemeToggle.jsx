import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function MapThemeToggle({ mapTheme = 'light', onThemeChange = () => {} }) {
  const isLight = mapTheme === 'light';

  return (
    <div
      className="inline-flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 shadow-inner text-xs"
      role="group"
      aria-label="Map theme controls"
    >
      {/* Light Map Button */}
      <button
        onClick={() => onThemeChange('light')}
        aria-label="Switch to light map theme"
        title="Switch to Light OpenStreetMap Theme"
        className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all duration-200 ${
          isLight
            ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
        }`}
      >
        <Sun className={`w-3.5 h-3.5 ${isLight ? 'text-slate-950 fill-slate-950' : 'text-amber-400'}`} />
        <span>Light</span>
      </button>

      {/* Dark Map Button */}
      <button
        onClick={() => onThemeChange('dark')}
        aria-label="Switch to dark map theme"
        title="Switch to Dark CartoDB Theme"
        className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all duration-200 ${
          !isLight
            ? 'bg-indigo-600 text-white shadow-md font-bold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
        }`}
      >
        <Moon className={`w-3.5 h-3.5 ${!isLight ? 'text-indigo-200 fill-indigo-200' : 'text-indigo-400'}`} />
        <span>Dark</span>
      </button>
    </div>
  );
}
