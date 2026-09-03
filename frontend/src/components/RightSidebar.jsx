import React from 'react';
import { Navigation, ShieldCheck, RefreshCw, Sliders, Route, ArrowRight, ShieldAlert, AlertTriangle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function RightSidebar({
  availableNodes = [],
  availableShelters = [],
  selectedStart = 'A',
  selectedDest = 'Z',
  riskWeight = 10.0,
  activeRoute = null,
  isCalculating = false,
  isRouteBlocked = false,
  activeRoutingMode = 'online',
  onStartChange = () => {},
  onDestChange = () => {},
  onRiskWeightChange = () => {},
  onFindRoute = () => {},
  onRecalculateRoute = () => {},
}) {
  const isOffline = activeRoutingMode === 'offline' || activeRoute?.is_offline;

  return (
    <aside className="w-full h-full bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col justify-between space-y-2.5 overflow-y-auto text-xs">
      {/* Route Control Header & Inputs */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
            <Navigation className="w-3.5 h-3.5 text-indigo-400" /> Route Controls
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border shrink-0 ${
              !isOffline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {!isOffline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Offline Disclaimer Banner */}
        {isOffline && (
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[10px] text-amber-300 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-tight">
              ⚠ Offline routing uses last synchronized road-risk estimates.
            </div>
          </div>
        )}

        {/* Inputs */}
        <div className="space-y-2">
          {/* Start Origin Node Dropdown */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 mb-0.5 uppercase tracking-wide">
              Start (Origin Node)
            </label>
            <select
              value={selectedStart}
              onChange={e => onStartChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            >
              {availableNodes.map(node => (
                <option key={`start-${node}`} value={node}>
                  Node {node}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Shelter Dropdown */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 mb-0.5 uppercase tracking-wide">
              Destination (Shelter Node)
            </label>
            <select
              value={selectedDest}
              onChange={e => onDestChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            >
              {availableShelters.map(shelter => (
                <option key={`dest-${shelter.location_node}`} value={shelter.location_node}>
                  {shelter.name} (Node {shelter.location_node})
                </option>
              ))}
            </select>
          </div>

          {/* Risk Weight Slider */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1">
                <Sliders className="w-3 h-3 text-amber-400" /> Risk Weight
              </label>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                {parseFloat(riskWeight).toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="0.5"
              value={riskWeight}
              onChange={e => onRiskWeightChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-medium">
              <span>0 (Short)</span>
              <span>15 (Mid)</span>
              <span>30 (Safe)</span>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-0.5">
            {!isRouteBlocked ? (
              <button
                onClick={onFindRoute}
                disabled={isCalculating}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isCalculating ? (
                  <LoadingSpinner message="Calculating..." />
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" /> FIND SAFEST ROUTE
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onRecalculateRoute}
                disabled={isCalculating}
                className="w-full py-2 px-3 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 animate-pulse"
              >
                {isCalculating ? (
                  <LoadingSpinner message="Rerouting..." />
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" /> RECALCULATE ROUTE
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Route Summary Section */}
      {activeRoute ? (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-2 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <Route className="w-3 h-3 text-indigo-400" /> Active Route
            </span>
            <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              OPTIMAL
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 text-center">
            <div className="p-1 bg-slate-900/80 rounded-lg border border-slate-800">
              <div className="text-[8px] text-slate-400 uppercase font-semibold">Distance</div>
              <div className="text-xs font-bold text-white font-mono mt-0.5">
                {activeRoute.total_distance} <span className="text-[8px] text-slate-500 font-sans">km</span>
              </div>
            </div>

            <div className="p-1 bg-slate-900/80 rounded-lg border border-slate-800">
              <div className="text-[8px] text-slate-400 uppercase font-semibold">Risk</div>
              <div className="text-xs font-bold text-amber-400 font-mono mt-0.5">
                {activeRoute.total_risk_score}
              </div>
            </div>

            <div className="p-1 bg-slate-900/80 rounded-lg border border-slate-800">
              <div className="text-[8px] text-slate-400 uppercase font-semibold">Cost</div>
              <div className="text-xs font-bold text-indigo-400 font-mono mt-0.5">
                {activeRoute.total_cost}
              </div>
            </div>
          </div>

          {/* Node Path Sequence */}
          <div className="text-[10px]">
            <span className="text-slate-400 font-medium">Path: </span>
            <span className="text-slate-200 font-mono font-bold flex flex-wrap items-center gap-1 mt-0.5">
              {activeRoute.nodes.map((node, i) => (
                <React.Fragment key={`path-node-${node}-${i}`}>
                  <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30 text-[10px]">
                    {node}
                  </span>
                  {i < activeRoute.nodes.length - 1 && (
                    <ArrowRight className="w-2.5 h-2.5 text-slate-500 inline" />
                  )}
                </React.Fragment>
              ))}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-2 text-center text-[10px] text-slate-400">
          Select origin &amp; destination above to compute route.
        </div>
      )}
    </aside>
  );
}
