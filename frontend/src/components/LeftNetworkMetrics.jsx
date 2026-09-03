import React from 'react';

export default function LeftNetworkMetrics({
  routeData = null,
  roads = [],
  shelters = [],
  onSelectShelter = () => {},
}) {
  const totalDistance = routeData?.total_distance_km
    ? routeData.total_distance_km.toFixed(1)
    : '12.4';

  const totalRiskWeight = routeData?.total_risk_score
    ? routeData.total_risk_score.toFixed(1)
    : '18.5';

  const estimatedMins = routeData?.total_distance_km
    ? Math.round(routeData.total_distance_km * 3.5)
    : 45;

  let blockedCount = 0;
  let highRiskCount = 0;

  roads.forEach((r) => {
    const isBlocked = r.status?.toUpperCase() === 'BLOCKED';
    if (isBlocked) blockedCount++;
    else if (r.blockage_probability > 0.5) highRiskCount++;
  });

  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-sm bg-surface-container border border-outline-variant p-xs px-sm rounded-2xl shrink-0">
      {/* Metric 1: Estimated Time */}
      <div className="flex items-center gap-xs px-sm py-xs bg-surface-container-low border border-outline-variant/60 rounded-xl">
        <div className="p-1.5 rounded-lg bg-secondary/15 text-secondary shrink-0">
          <span className="material-symbols-outlined text-base">schedule</span>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block leading-none">
            Estimated Time
          </span>
          <span className="text-sm font-extrabold text-primary leading-tight flex items-baseline gap-0.5 mt-0.5">
            {estimatedMins} <span className="text-xs font-semibold text-on-surface-variant">min</span>
          </span>
        </div>
      </div>

      {/* Metric 2: Total Distance */}
      <div className="flex items-center gap-xs px-sm py-xs bg-surface-container-low border border-outline-variant/60 rounded-xl">
        <div className="p-1.5 rounded-lg bg-primary/15 text-primary shrink-0">
          <span className="material-symbols-outlined text-base">route</span>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block leading-none">
            Total Distance
          </span>
          <span className="text-sm font-extrabold text-primary leading-tight flex items-baseline gap-0.5 mt-0.5">
            {totalDistance} <span className="text-xs font-semibold text-on-surface-variant">km</span>
          </span>
        </div>
      </div>

      {/* Metric 3: Total Risk Weight */}
      <div className="flex items-center gap-xs px-sm py-xs bg-surface-container-low border border-outline-variant/60 rounded-xl">
        <div className="p-1.5 rounded-lg bg-error/15 text-error shrink-0">
          <span className="material-symbols-outlined text-base">warning</span>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-error uppercase tracking-wider block leading-none">
            Risk Weight
          </span>
          <span className="text-sm font-extrabold text-error leading-tight flex items-baseline gap-0.5 mt-0.5">
            {totalRiskWeight} <span className="text-[11px] font-semibold text-on-surface-variant">/ 30</span>
          </span>
        </div>
      </div>

      {/* Metric 4: Active Shelters */}
      <div className="flex items-center gap-xs px-sm py-xs bg-surface-container-low border border-outline-variant/60 rounded-xl">
        <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
          <span className="material-symbols-outlined text-base">domain</span>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block leading-none">
            Active Shelters
          </span>
          <span className="text-sm font-extrabold text-emerald-400 leading-tight flex items-baseline gap-0.5 mt-0.5">
            {shelters.length} <span className="text-xs font-semibold text-on-surface-variant">Safe</span>
          </span>
        </div>
      </div>
    </div>
  );
}
