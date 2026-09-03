import React from 'react';

export function Sidebar({
  activeTab = 'analysis',
  onTabChange,
  pendingDisastersCount = 0,
  userRole = 'admin',
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile = () => { },
}) {
  const navItems = [
    { id: 'analysis', label: 'Route Analysis', icon: 'analytics' },
    { id: 'disasters', label: 'Disaster Manager', icon: 'warning', badge: pendingDisastersCount },
    { id: 'closures', label: 'Road Closures', icon: 'block' },
    { id: 'health', label: 'System Health', icon: 'health_metrics' },
  ];

  return (
    <>
      {/* Mobile Slide-Over Overlay Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={onCloseMobile} />
          <nav className="relative w-64 bg-surface-container border-r border-outline-variant flex flex-col h-full z-50 p-4 shadow-2xl animate-fade-in text-on-surface">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant mb-4">
              <div>
                <h2 className="text-sm font-bold text-on-surface">Command Center</h2>
                <p className="text-xs text-on-surface-variant">District 07 • Operational</p>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-full text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Nav Items */}
            <div className="flex-1 flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={`mobile-${item.id}`}
                    onClick={() => {
                      onTabChange(item.id);
                      onCloseMobile();
                    }}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-xs font-extrabold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Role Footer */}
            <div className="pt-4 border-t border-outline-variant mt-auto text-xs text-on-surface-variant">
              <span className="font-semibold block">Active Mode:</span>
              <span className="font-bold text-on-surface capitalize mt-0.5 block">
                {userRole === 'admin' ? 'Administrator' : 'Civilian / Responder'}
              </span>
            </div>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar Navigation */}
      <nav
        className={`bg-surface-container text-on-surface font-body-sm fixed left-0 top-0 h-full border-r border-outline-variant flex flex-col pt-14 pb-md z-30 hidden md:flex shadow-xs transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-56'
          }`}
      >
        {/* Brand Header & Toggle */}
        <div className={`py-3 border-b border-outline-variant flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-md'}`}>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h2 className="text-xs font-bold text-on-surface tracking-tight truncate">Command Center</h2>
              <p className="text-[10px] text-on-surface-variant mt-0.5 truncate">District 07 • Operational</p>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <span className="material-symbols-outlined text-base">
              {isCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        {/* Nav Links */}
        <div className="flex-1 px-2 py-md flex flex-col gap-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange && onTabChange(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center rounded-xl py-2 text-xs font-semibold transition-all cursor-pointer text-left active:scale-[0.98] duration-150 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                  } ${isActive
                    ? 'bg-secondary-container text-on-secondary-container font-bold shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
              >
                <div className="flex items-center gap-2.5 relative">
                  <span className="material-symbols-outlined text-lg shrink-0" data-icon={item.icon}>
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="text-xs truncate">{item.label}</span>}

                  {/* Badge for Collapsed View */}
                  {isCollapsed && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-surface-container animate-pulse" />
                  )}
                </div>

                {!isCollapsed && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black font-extrabold text-[10px] animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer / Active Role Indicator */}
        <div className={`pt-3 border-t border-outline-variant mt-auto ${isCollapsed ? 'px-1 text-center' : 'px-md'}`}>
          {!isCollapsed ? (
            <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface-variant">
              <span className="text-[10px] font-bold block text-on-surface-variant uppercase tracking-wider">Active Mode:</span>
              <span className="text-xs font-semibold text-on-surface capitalize mt-0.5 block truncate">
                {userRole === 'admin' ? 'Administrator (Full Access)' : 'Civilian / Responder'}
              </span>
            </div>
          ) : (
            <div className="p-1 rounded-lg bg-surface-container-low border border-outline-variant flex justify-center" title={`Active Mode: ${userRole === 'admin' ? 'Administrator' : 'Civilian'}`}>
              <span className="material-symbols-outlined text-sm text-primary">
                {userRole === 'admin' ? 'admin_panel_settings' : 'person'}
              </span>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

export default Sidebar;
