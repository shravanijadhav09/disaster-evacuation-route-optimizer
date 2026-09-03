import React from 'react';

export default function DisasterCard({
  disaster,
  userRole = 'user',
  roads = [],
  onApprove,
  onReject,
  onResolve,
  onDelete,
  onEdit,
}) {
  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return { label: 'PENDING APPROVAL', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: 'hourglass_top' };
      case 'APPROVED':
        return { label: 'ACTIVE / APPROVED', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: 'warning' };
      case 'RESOLVED':
        return { label: 'RESOLVED', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: 'task_alt' };
      case 'REJECTED':
        return { label: 'REJECTED', bg: 'bg-slate-700/40 text-slate-300 border-slate-600', icon: 'cancel' };
      default:
        return { label: status, bg: 'bg-surface-container-highest text-on-surface-variant border-outline-variant', icon: 'info' };
    }
  };

  const getDisasterIcon = (type) => {
    switch (type?.toUpperCase()) {
      case 'FLOOD': return 'water_damage';
      case 'CYCLONE': return 'cyclone';
      case 'LANDSLIDE': return 'landscape';
      case 'HEAVY_RAINFALL': return 'rainy';
      case 'FIRE': return 'local_fire_department';
      case 'ROAD_DAMAGE': return 'minor_crash';
      case 'EARTHQUAKE': return 'tsunami';
      default: return 'warning';
    }
  };

  const statusBadge = getStatusBadge(disaster.status);
  const iconName = getDisasterIcon(disaster.disaster_type);

  // Derive actual network operational state for affected roads from roads list
  const affectedRoadsInfo = (disaster.affected_roads || []).map(rId => {
    const found = roads.find(r => r.road_id === rId);
    return {
      road_id: rId,
      status: found?.status || 'UNKNOWN',
      blockage_prob: found?.blockage_probability || 0,
    };
  });

  const hasBlockedRoad = affectedRoadsInfo.some(r => r.status?.toUpperCase() === 'BLOCKED');
  const primaryRoadState = hasBlockedRoad
    ? 'BLOCKED'
    : (affectedRoadsInfo.some(r => r.blockage_prob > 0.4) ? 'HIGH_RISK' : 'OPEN');

  return (
    <div className="bg-surface-container border border-outline-variant hover:border-primary/50 transition-all rounded-2xl p-md shadow-sm flex flex-col justify-between space-y-md">
      {/* Top Bar: Icon, Title & Status */}
      <div className="flex items-start gap-md">
        <div className="p-sm rounded-xl bg-error/15 text-error border border-error/30 shrink-0">
          <span className="material-symbols-outlined text-2xl">{iconName}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-xs mb-xs">
            <span className={`px-sm py-0.5 rounded-full text-label-xs font-bold border flex items-center gap-xs ${statusBadge.bg}`}>
              <span className="material-symbols-outlined text-sm">{statusBadge.icon}</span>
              {statusBadge.label}
            </span>
            <span className="text-label-xs text-on-surface-variant font-medium">
              {new Date(disaster.created_at || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <h4 className="font-headline-xs text-headline-xs font-bold text-on-surface line-clamp-1">
            {disaster.title}
          </h4>

          <p className="font-body-sm text-on-surface-variant mt-xs line-clamp-2">
            {disaster.description}
          </p>
        </div>
      </div>

      {/* Details Grid: Affected Nodes/Roads, Severity, Reporter */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-xs bg-surface-container-low p-sm rounded-xl border border-outline-variant text-label-sm">
        <div>
          <span className="text-on-surface-variant block text-label-xs font-semibold">Affected Nodes:</span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {disaster.affected_nodes && disaster.affected_nodes.length > 0 ? (
              disaster.affected_nodes.map(n => (
                <span key={n} className="px-xs py-0.5 rounded bg-primary/20 text-primary font-bold text-label-xs">
                  Node {n}
                </span>
              ))
            ) : (
              <span className="text-on-surface-variant italic">None</span>
            )}
          </div>
        </div>

        <div>
          <span className="text-on-surface-variant block text-label-xs font-semibold">Affected Roads:</span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {disaster.affected_roads && disaster.affected_roads.length > 0 ? (
              disaster.affected_roads.map(r => (
                <span key={r} className="px-xs py-0.5 rounded bg-error/20 text-error font-bold text-label-xs">
                  Road {r}
                </span>
              ))
            ) : (
              <span className="text-on-surface-variant italic">None</span>
            )}
          </div>
        </div>

        <div className="col-span-2 md:col-span-1">
          <span className="text-on-surface-variant block text-label-xs font-semibold">Severity & Reporter:</span>
          <div className="mt-0.5 text-on-surface font-semibold text-label-xs flex items-center justify-between">
            <span className="text-error font-bold">{Math.round((disaster.severity || 0.7) * 100)}% Severity</span>
            <span className="text-on-surface-variant truncate max-w-[100px]" title={disaster.reported_by}>
              By: {disaster.reported_by || 'User'}
            </span>
          </div>
        </div>
      </div>

      {/* Operational Impact Section for APPROVED / ACTIVE incidents */}
      {disaster.status === 'APPROVED' && (
        <div className="bg-surface-container-low p-sm rounded-xl border border-error/40 space-y-xs">
          <div className="text-label-xs font-bold text-error uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-sm">shield_alert</span>
              Operational Impact
            </span>
            <span className="px-xs py-0.5 rounded text-[10px] font-extrabold bg-error/20 text-error border border-error/30">
              ACTIVE HAZARD
            </span>
          </div>

          <div className="grid grid-cols-2 gap-xs text-label-xs">
            <div>
              <span className="text-on-surface-variant block font-medium">Road Network Status:</span>
              <span className={`font-bold flex items-center gap-1 mt-0.5 ${
                primaryRoadState === 'BLOCKED' ? 'text-rose-400 font-extrabold' : (primaryRoadState === 'HIGH_RISK' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold')
              }`}>
                {primaryRoadState === 'BLOCKED' ? '🔴 BLOCKED' : (primaryRoadState === 'HIGH_RISK' ? '🟠 HIGH RISK' : '🟢 OPEN')}
              </span>
            </div>

            <div>
              <span className="text-on-surface-variant block font-medium">Affected Roads:</span>
              <span className="font-bold text-on-surface mt-0.5 block">
                {disaster.affected_roads?.join(', ') || 'N/A'}
              </span>
            </div>
          </div>

          <div className="text-label-xs text-emerald-400 font-semibold flex items-center gap-xs pt-xs border-t border-outline-variant/40">
            <span className="material-symbols-outlined text-xs text-emerald-400">check_circle</span>
            <span>Routing: ✓ Route recalculated & NetworkX graph risk applied</span>
          </div>
        </div>
      )}

      {/* Operational Impact Section for RESOLVED incidents */}
      {disaster.status === 'RESOLVED' && (
        <div className="bg-surface-container-low p-sm rounded-xl border border-emerald-500/40 space-y-xs">
          <div className="text-label-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-sm">task_alt</span>
              Operational Impact
            </span>
            <span className="px-xs py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              CLEARED
            </span>
          </div>

          <div className="grid grid-cols-2 gap-xs text-label-xs">
            <div>
              <span className="text-on-surface-variant block font-medium">Road Network Status:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                🟢 OPEN (Restored)
              </span>
            </div>

            <div>
              <span className="text-on-surface-variant block font-medium">Restored Roads:</span>
              <span className="font-bold text-on-surface mt-0.5 block">
                {disaster.affected_roads?.join(', ') || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Notes */}
      {disaster.admin_notes && (
        <div className="p-xs px-sm rounded-lg bg-surface-container-high text-body-xs text-on-surface-variant border border-outline-variant flex items-center gap-xs">
          <span className="material-symbols-outlined text-sm text-primary">admin_panel_settings</span>
          <span className="truncate"><strong>Admin Note:</strong> {disaster.admin_notes}</span>
        </div>
      )}

      {/* Admin Management Action Bar */}
      {userRole === 'admin' && (
        <div className="pt-xs border-t border-outline-variant flex flex-wrap items-center justify-between gap-xs">
          <div className="flex items-center gap-xs">
            {disaster.status === 'PENDING' && (
              <>
                <button
                  onClick={() => onApprove && onApprove(disaster.id)}
                  className="px-sm py-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-label-xs flex items-center gap-xs cursor-pointer shadow-sm active:scale-95 transition-all"
                  title="Approve disaster & update routing graph"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Approve
                </button>
                <button
                  onClick={() => onReject && onReject(disaster.id)}
                  className="px-sm py-xs rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-label-xs flex items-center gap-xs cursor-pointer active:scale-95 transition-all"
                  title="Reject disaster report"
                >
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  Reject
                </button>
              </>
            )}

            {disaster.status === 'APPROVED' && (
              <button
                onClick={() => onResolve && onResolve(disaster.id)}
                className="px-sm py-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-label-xs flex items-center gap-xs cursor-pointer active:scale-95 transition-all shadow-md"
                title="Mark disaster as resolved & reopen affected road(s)"
              >
                <span className="material-symbols-outlined text-sm">task_alt</span>
                ✓ Resolve & Reopen Road
              </button>
            )}

            {disaster.status === 'RESOLVED' && (
              <span className="px-sm py-xs rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-label-xs flex items-center gap-xs">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                ✓ RESOLVED
              </span>
            )}
          </div>

          <div className="flex items-center gap-xs ml-auto">
            {onEdit && (
              <button
                onClick={() => onEdit(disaster)}
                className="p-xs text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container-highest cursor-pointer"
                title="Edit disaster details"
              >
                <span className="material-symbols-outlined text-body-md">edit</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(disaster.id)}
                className="p-xs text-on-surface-variant hover:text-error rounded-lg hover:bg-surface-container-highest cursor-pointer"
                title="Delete disaster record"
              >
                <span className="material-symbols-outlined text-body-md">delete</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
