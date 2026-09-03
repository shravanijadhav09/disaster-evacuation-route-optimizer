import React, { useState } from 'react';
import { Shield, CheckCircle2, AlertTriangle, Ban, Lock } from 'lucide-react';

export default function RoadNetworkBar({
  roads = [],
  activeRouteRoadIds = [],
  onBlockRoad = () => {},
  isBlockingRoadId = null,
}) {
  const [filter, setFilter] = useState('ALL');

  const filteredRoads = roads.filter(road => {
    const isBlocked = road.status?.toUpperCase() === 'BLOCKED';
    const isHighRisk = !isBlocked && road.blockage_probability > 0.5;

    if (filter === 'OPEN') return !isBlocked;
    if (filter === 'HIGH_RISK') return isHighRisk;
    if (filter === 'BLOCKED') return isBlocked;
    return true;
  });

  return (
    <div className="bg-slate-900/95 backdrop-blur border-t border-slate-800 p-2 shadow-xl h-[105px] min-h-[105px] max-h-[105px] flex flex-col justify-between overflow-hidden text-xs shrink-0">
      {/* Header & Filter Controls Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-white text-[11px] uppercase tracking-wider">
            Road Network Controls
          </span>
        </div>

        {/* Compact Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2 py-0.2 rounded font-medium transition-colors ${
              filter === 'ALL' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({roads.length})
          </button>
          <button
            onClick={() => setFilter('OPEN')}
            className={`px-2 py-0.2 rounded font-medium transition-colors ${
              filter === 'OPEN' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setFilter('HIGH_RISK')}
            className={`px-2 py-0.2 rounded font-medium transition-colors ${
              filter === 'HIGH_RISK' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Risk (&gt;50%)
          </button>
          <button
            onClick={() => setFilter('BLOCKED')}
            className={`px-2 py-0.2 rounded font-medium transition-colors ${
              filter === 'BLOCKED' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Blocked
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Road Cards Area */}
      <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden py-0.5 flex-1 scrollbar-thin scrollbar-thumb-slate-800">
        {filteredRoads.map(road => {
          const isBlocked = road.status?.toUpperCase() === 'BLOCKED';
          const isHighRisk = !isBlocked && road.blockage_probability > 0.5;
          const isPartOfActiveRoute = activeRouteRoadIds.includes(road.road_id);

          return (
            <div
              key={`bar-road-${road.road_id}`}
              className={`shrink-0 min-w-[150px] max-w-[170px] p-1.5 rounded-lg border flex flex-col justify-between space-y-1 transition-all ${
                isPartOfActiveRoute
                  ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30'
                  : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-white">{road.road_id}</span>
                  <span className="font-mono text-slate-400 text-[9px]">{road.u}&rarr;{road.v}</span>
                </div>

                {isBlocked ? (
                  <span className="text-[9px] font-extrabold text-rose-400 flex items-center gap-0.5">
                    <Ban className="w-2.5 h-2.5" /> BLOCKED
                  </span>
                ) : isHighRisk ? (
                  <span className="text-[9px] font-extrabold text-amber-400 flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" /> HIGH
                  </span>
                ) : (
                  <span className="text-[9px] font-extrabold text-cyan-400 flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> OPEN
                  </span>
                )}
              </div>

              {/* Risk & Action */}
              <div className="flex items-center justify-between text-[9px] text-slate-400 gap-1">
                <span className="font-mono text-slate-300">
                  Risk: {(road.blockage_probability * 100).toFixed(0)}%
                </span>

                {!isBlocked ? (
                  <button
                    onClick={() => onBlockRoad(road.road_id)}
                    disabled={isBlockingRoadId === road.road_id}
                    className="px-1.5 py-0.2 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded font-bold border border-rose-500/40 transition-all disabled:opacity-50 text-[9px]"
                  >
                    {isBlockingRoadId === road.road_id ? '...' : 'Block'}
                  </button>
                ) : (
                  <span className="text-slate-500 text-[9px] flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> Closed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
