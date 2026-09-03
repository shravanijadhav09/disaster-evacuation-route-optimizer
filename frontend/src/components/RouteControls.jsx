import React from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function RouteControls({
  availableNodes = [],
  availableShelters = [],
  selectedStart = 'A',
  selectedDest = 'Z',
  riskWeight = 10.0,
  isCalculating = false,
  isRouteBlocked = false,
  roads = [],
  onStartChange = () => {},
  onDestChange = () => {},
  onRiskWeightChange = () => {},
  onFindRoute = () => {},
  onBlockRoad = () => {},
  isBlockingRoadId = null,
}) {
  const [blockedRoadId, setBlockedRoadId] = React.useState('');
  const [showNotif, setShowNotif] = React.useState(false);
  const [lastBlocked, setLastBlocked] = React.useState(null);

  const [isSimulateOpen, setIsSimulateOpen] = React.useState(false);

  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    if (!blockedRoadId) return;
    setLastBlocked(blockedRoadId);
    setShowNotif(true);
    await onBlockRoad(blockedRoadId);
    setBlockedRoadId('');
    setTimeout(() => setShowNotif(false), 4000);
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xs sm:p-md shadow-sm shrink-0 mb-sm sm:mb-md">
      {/* Notification bar */}
      {showNotif && (
        <div className="mb-sm flex items-center justify-between bg-error-container border border-error rounded-xl px-md py-xs text-on-error-container font-label-sm text-label-sm">
          <div className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            Road {lastBlocked} blocked — route recalculated.
          </div>
          <button onClick={() => setShowNotif(false)} className="font-bold hover:opacity-80">×</button>
        </div>
      )}

      {/* Controls Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-sm items-end w-full">
        {/* Start Node */}
        <div className="flex flex-col gap-xs w-full">
          <label className="font-label-sm text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            Origin Node
          </label>
          <select
            value={selectedStart}
            onChange={(e) => onStartChange(e.target.value)}
            className="w-full border border-outline-variant rounded-xl px-sm py-2 text-body-sm text-on-surface bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[42px]"
          >
            {availableNodes.map((node) => (
              <option key={`start-${node}`} value={node}>
                Intersection {node} (Node {node})
              </option>
            ))}
          </select>
        </div>

        {/* Destination Shelter */}
        <div className="flex flex-col gap-xs w-full">
          <label className="font-label-sm text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            Destination Shelter
          </label>
          <select
            value={selectedDest}
            onChange={(e) => onDestChange(e.target.value)}
            className="w-full border border-outline-variant rounded-xl px-sm py-2 text-body-sm text-on-surface bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[42px]"
          >
            {availableShelters.map((shelter) => (
              <option key={`dest-${shelter.location_node}`} value={shelter.location_node}>
                {shelter.name} (Node {shelter.location_node})
              </option>
            ))}
          </select>
        </div>

        {/* Risk Weight Slider */}
        <div className="flex flex-col gap-xs w-full">
          <label className="font-label-sm text-[11px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-[14px]">tune</span>
              Risk Priority
            </span>
            <span className="font-mono font-bold text-error bg-error-container px-xs py-[2px] rounded text-[11px]">
              {parseFloat(riskWeight).toFixed(1)}
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="30"
            step="0.5"
            value={riskWeight}
            onChange={(e) => onRiskWeightChange(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between font-label-sm text-[10px] text-on-surface-variant">
            <span>0 — Shortest</span>
            <span>15 — Balanced</span>
            <span>30 — Safest</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-xs w-full">
          {/* Find Route Button */}
          <button
            onClick={onFindRoute}
            disabled={isCalculating}
            className={`flex-1 flex items-center justify-center gap-xs px-md py-2.5 rounded-xl font-label-md font-bold transition-all cursor-pointer disabled:opacity-50 min-h-[42px] active:scale-95 shadow-sm ${
              isRouteBlocked
                ? 'bg-error text-on-error hover:opacity-90'
                : 'bg-primary text-on-primary hover:opacity-90'
            }`}
          >
            {isCalculating ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">autorenew</span>
                <span className="text-xs truncate">{isRouteBlocked ? 'Rerouting…' : 'Calculating…'}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">
                  {isRouteBlocked ? 'sync' : 'alt_route'}
                </span>
                <span className="text-xs truncate">{isRouteBlocked ? 'Recalculate Route' : 'Find Safest Route'}</span>
              </>
            )}
          </button>

          {/* Toggle Simulation Tools */}
          <button
            type="button"
            onClick={() => setIsSimulateOpen(!isSimulateOpen)}
            className="flex items-center justify-center gap-xs px-sm py-2.5 border border-outline-variant rounded-xl font-label-sm text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer shrink-0 min-h-[42px]"
            title="Toggle Simulation Controls"
          >
            <span className="material-symbols-outlined text-base text-warning">report_problem</span>
            <span className="hidden sm:inline text-xs">Simulate</span>
            <span className="material-symbols-outlined text-base">
              {isSimulateOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>
      </div>

      {/* Collapsible Simulation Panel */}
      {isSimulateOpen && (
        <div className="mt-sm pt-sm border-t border-outline-variant flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-sm bg-surface-container-low/50 p-xs sm:p-sm rounded-xl">
          <div className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-warning text-base">construction</span>
            <span className="font-label-sm text-xs font-semibold text-on-surface">
              Simulate Instant Road Hazard Blockage:
            </span>
          </div>

          <form onSubmit={handleBlockSubmit} className="flex items-center gap-xs w-full sm:w-auto">
            <select
              value={blockedRoadId}
              onChange={(e) => setBlockedRoadId(e.target.value)}
              className="flex-1 sm:w-44 border border-outline-variant rounded-lg px-xs py-1 text-xs text-on-surface bg-surface-container-low outline-none"
            >
              <option value="">-- Select Road --</option>
              {roads.map((r) => (
                <option key={`sim-${r.road_id}`} value={r.road_id}>
                  Road {r.road_id} ({r.u} → {r.v}) {r.status === 'BLOCKED' ? '(BLOCKED)' : ''}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={!blockedRoadId || isBlockingRoadId === blockedRoadId}
              className="px-sm py-1 bg-warning text-on-warning font-bold text-xs rounded-lg hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shrink-0"
            >
              {isBlockingRoadId === blockedRoadId ? 'Blocking...' : 'Block Road'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
