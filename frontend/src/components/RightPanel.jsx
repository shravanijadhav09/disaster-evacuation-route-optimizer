import React, { useState } from 'react';

export default function RightPanel({
  activeRoute = null,
  roads = [],
  disasters = [],
  selectedStart = 'A',
  selectedDest = 'Z',
  onBlockRoad = () => {},
  isBlockingRoadId = null,
  onRecalculateRoute = () => {},
}) {
  const [blockedRoadId, setBlockedRoadId] = useState('');

  // Extract path nodes from activeRoute or fallback default
  const routeNodes = activeRoute?.nodes || ['A', 'D', 'E', 'Z'];

  // Identify active disasters whose affected roads are avoided by the calculated route
  const activeDisasters = (disasters || []).filter(d => d.status === 'APPROVED');
  const avoidedDisasters = activeDisasters.filter(d => {
    const affected = d.affected_roads || [];
    if (affected.length === 0) return false;
    return affected.some(rId => {
      const road = roads.find(r => r.road_id === rId);
      if (!road) return false;
      const isUsedInRoute = routeNodes.some((node, idx) => {
        if (idx === routeNodes.length - 1) return false;
        const nextNode = routeNodes[idx + 1];
        return (road.u === node && road.v === nextNode) || (road.u === nextNode && road.v === node);
      });
      return !isUsedInRoute;
    });
  });

  // Map route segments from consecutive node pairs
  const segments = [];
  for (let i = 0; i < routeNodes.length - 1; i++) {
    const u = routeNodes[i];
    const v = routeNodes[i + 1];
    const road = roads.find(
      (r) =>
        (r.u === u && r.v === v) ||
        (r.u === v && r.v === u) ||
        r.road_id === `R_${u}_${v}` ||
        r.road_id === `R_${v}_${u}`
    );

    const distance = road?.distance_km ? road.distance_km.toFixed(1) : (3.0 + i * 2).toFixed(1);
    const risk = road?.blockage_probability || 0.1;
    const isHighRisk = risk > 0.4;
    const roadId = road?.road_id || `R_${u}_${v}`;

    segments.push({
      step: i + 1,
      fromNode: u,
      toNode: v,
      title: i === 0 ? `Intersection ${u}` : `Node ${u} to ${v}`,
      distance: `${distance} km`,
      timer: `${Math.round(parseFloat(distance) * 2.5)} mins`,
      description: isHighRisk
        ? `Severe risk detected on segment ${u} -> ${v}. ML blockage probability: ${(risk * 100).toFixed(0)}%.`
        : `Normal operating conditions on segment ${u} -> ${v}. No major hazards.`,
      isHighRisk,
      roadId,
    });
  }

  // Add final destination item
  const destNode = routeNodes[routeNodes.length - 1] || 'Z';
  segments.push({
    step: segments.length + 1,
    fromNode: destNode,
    toNode: destNode,
    title: `Destination Shelter (Node ${destNode})`,
    distance: activeRoute?.total_distance ? `${activeRoute.total_distance.toFixed(1)} km` : '12.4 km',
    timer: 'Target',
    description: 'Final evacuation shelter staging area. Perimeter established.',
    isHighRisk: false,
    isFinal: true,
  });

  const handleQuickBlock = (roadId) => {
    if (roadId) {
      onBlockRoad(roadId);
    }
  };

  return (
    <div className="col-span-12 lg:col-span-5 xl:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col overflow-hidden shadow-sm">
      {/* Panel Header */}
      <div className="px-lg py-md border-b border-outline-variant bg-surface-container flex flex-col gap-xs">
        <div className="flex justify-between items-center">
          <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
            Segment Breakdown
          </h3>
          <span className="px-sm py-xs bg-surface-variant text-on-surface-variant font-label-sm text-label-sm rounded uppercase font-semibold">
            {segments.length} Segments
          </span>
        </div>

        {/* Avoided Hazard Summary Banner */}
        {avoidedDisasters.length > 0 ? (
          <div className="mt-xs p-sm rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-label-xs space-y-1">
            <div className="font-bold text-amber-400 flex items-center gap-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm">shield</span>
              <span>⚠ ROUTE AVOIDED ACTIVE DISASTER ROAD(S)</span>
            </div>
            {avoidedDisasters.map(d => (
              <div key={`avoided-${d.id}`} className="text-[11px] leading-tight">
                Avoided Road <strong>{d.affected_roads?.join(', ')}</strong> due to <em>{d.title}</em>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-xs mt-0.5">
            <span className="material-symbols-outlined text-xs">verified</span>
            <span>✓ Current route clear of active disaster blockages</span>
          </div>
        )}
      </div>

      {/* Vertical Stepper Container */}
      <div className="flex-1 overflow-y-auto p-lg relative custom-scrollbar">
        {/* Timeline Connecting Line */}
        <div className="absolute left-[39px] top-lg bottom-lg w-[2px] bg-outline-variant z-0" />

        <div className="flex flex-col gap-xl relative z-10">
          {segments.map((seg) => {
            if (seg.isFinal) {
              return (
                <div key="final-dest" className="flex gap-md group">
                  <div className="w-8 h-8 rounded-full border-2 border-outline-variant bg-surface-container-lowest text-on-surface-variant flex items-center justify-center shrink-0 border-4 border-surface-container-lowest z-10">
                    <span className="font-label-sm text-label-sm font-bold">{seg.step}</span>
                  </div>
                  <div className="flex-1 bg-surface border border-outline-variant rounded p-md transition-shadow hover:shadow-md">
                    <div className="flex justify-between items-start mb-sm">
                      <h4 className="font-headline-sm text-headline-sm text-primary font-bold">
                        {seg.title}
                      </h4>
                      <span className="font-label-sm text-label-sm text-secondary bg-surface-container px-xs py-[2px] rounded">
                        {seg.distance}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
                      {seg.description}
                    </p>
                    <div className="flex gap-sm">
                      <div className="px-sm py-xs bg-surface-container-high rounded text-secondary font-label-sm text-label-sm flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[14px]" data-icon="flag">
                          flag
                        </span>
                        {seg.timer}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (seg.isHighRisk) {
              return (
                <div key={`seg-${seg.step}`} className="flex gap-md group">
                  <div className="w-8 h-8 rounded-full bg-error text-on-error flex items-center justify-center shrink-0 border-4 border-surface-container-lowest z-10 ring-2 ring-error ring-offset-2">
                    <span
                      className="material-symbols-outlined text-[16px]"
                      data-icon="priority_high"
                    >
                      priority_high
                    </span>
                  </div>
                  <div className="flex-1 bg-error-container border border-error rounded p-md shadow-md">
                    <div className="flex justify-between items-start mb-sm">
                      <h4 className="font-headline-sm text-headline-sm text-on-error-container font-bold flex items-center gap-xs">
                        {seg.title}
                        <span className="px-xs py-[2px] bg-error text-on-error font-label-sm text-[10px] rounded uppercase tracking-widest">
                          High Risk
                        </span>
                      </h4>
                      <span className="font-label-sm text-label-sm text-on-error-container bg-surface-container-lowest px-xs py-[2px] rounded bg-opacity-50">
                        {seg.distance}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-error-container mb-md">
                      {seg.description}
                    </p>
                    <div className="flex gap-sm flex-wrap items-center">
                      <div className="px-sm py-xs bg-surface-container-lowest bg-opacity-50 rounded text-on-error-container font-label-sm text-label-sm flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[14px]" data-icon="timer">
                          timer
                        </span>
                        {seg.timer}
                      </div>
                      <button
                        onClick={() => handleQuickBlock(seg.roadId)}
                        disabled={isBlockingRoadId === seg.roadId}
                        className="px-sm py-xs border border-error rounded text-on-error-container font-label-sm text-label-sm hover:bg-error hover:text-on-error transition-colors cursor-pointer"
                      >
                        {isBlockingRoadId === seg.roadId ? 'Blocking...' : 'Simulate Blockage'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={`seg-${seg.step}`} className="flex gap-md group">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 border-4 border-surface-container-lowest z-10 font-bold">
                  <span className="font-label-sm text-label-sm">{seg.step}</span>
                </div>
                <div className="flex-1 bg-surface border border-outline-variant rounded p-md transition-shadow hover:shadow-md">
                  <div className="flex justify-between items-start mb-sm">
                    <h4 className="font-headline-sm text-headline-sm text-primary font-bold">
                      {seg.title}
                    </h4>
                    <span className="font-label-sm text-label-sm text-secondary bg-surface-container px-xs py-[2px] rounded">
                      {seg.distance}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
                    {seg.description}
                  </p>
                  <div className="flex gap-sm">
                    <div className="px-sm py-xs bg-surface-container-high rounded text-secondary font-label-sm text-label-sm flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[14px]" data-icon="timer">
                        timer
                      </span>
                      {seg.timer}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

