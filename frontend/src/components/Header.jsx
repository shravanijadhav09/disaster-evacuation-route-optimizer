import React, { useState, useEffect } from 'react';
import { checkBackendAvailability } from '../services/routingService.js';

export default function Header({
  lastSyncTimestamp = null,
  pendingChangesCount = 0,
  pendingDisastersCount = 0,
  activeRoutingMode = 'online',
  mapTheme = 'dark',
  isSyncing = false,
  onThemeChange = () => {},
  userRole = 'admin',
  onRoleToggle = () => {},
  onOpenReportModal = () => {},
  onToggleMobileMenu = () => {},
}) {
  const [apiConnected, setApiConnected] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const isReachable = await checkBackendAvailability();
      setApiConnected(isReachable);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-surface text-on-surface w-full border-b border-outline-variant flex justify-between items-center px-sm sm:px-md md:px-lg h-14 z-40 shrink-0 gap-xs sm:gap-md shadow-xs">
      {/* Left Section: Mobile Menu Toggle & Brand Title */}
      <div className="flex items-center gap-xs sm:gap-sm min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer shrink-0"
          title="Open Navigation Menu"
        >
          <span className="material-symbols-outlined text-xl">menu</span>
        </button>

        <div className="flex items-center gap-xs min-w-0">
          <span className="material-symbols-outlined text-primary text-lg sm:text-xl font-bold shrink-0">radar</span>
          <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-primary tracking-wide flex items-center gap-xs truncate">
            <span className="truncate">DISASTER OPERATIONS COMMAND</span>
            <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full border border-primary/25 font-bold tracking-normal hidden xl:inline-block">
              SIH 2026
            </span>
          </h1>
        </div>
      </div>

      {/* Right Section: Role Switcher, Report Button & Controls */}
      <div className="flex items-center gap-xs sm:gap-sm shrink-0">
        {/* Role Switcher */}
        <div className="flex items-center bg-surface-container-low rounded-full p-0.5 border border-outline-variant">
          <button
            onClick={() => onRoleToggle('user')}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              userRole === 'user'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            title="Switch to Civilian User Mode"
          >
            <span className="material-symbols-outlined text-xs">person</span>
            <span className="text-[11px] sm:text-xs">Civilian</span>
          </button>

          <button
            onClick={() => onRoleToggle('admin')}
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              userRole === 'admin'
                ? 'bg-error text-on-error shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            title="Switch to Emergency Admin Control Mode"
          >
            <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
            <span className="text-[11px] sm:text-xs">Admin</span>
          </button>
        </div>

        {/* Quick Report Button */}
        <button
          onClick={onOpenReportModal}
          className="px-2 py-1 sm:px-2.5 rounded-full bg-error/15 text-error font-semibold border border-error/30 hover:bg-error hover:text-on-error transition-all text-xs flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
          title="Report a Disaster Incident"
        >
          <span className="material-symbols-outlined text-xs">add_alert</span>
          <span className="hidden sm:inline text-xs">+ Report Disaster</span>
        </button>

        {/* Connection Status Badge */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            apiConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              apiConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-[11px]">{apiConnected ? 'API ONLINE' : 'OFFLINE'}</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => onThemeChange(mapTheme === 'dark' ? 'light' : 'dark')}
          className="p-1 sm:p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer active:opacity-80 flex items-center justify-center shrink-0"
          title="Toggle Map Theme"
        >
          <span className="material-symbols-outlined text-base sm:text-lg" data-icon="settings">
            {mapTheme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>
    </header>
  );
}