import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getNodeCoordinates, DEFAULT_MAP_ZOOM } from '../config/nodeCoordinates.js';
import MapThemeToggle from './MapThemeToggle.jsx';
import { Move, ShieldAlert, ChevronDown, ChevronUp, Layers } from 'lucide-react';

const CHENNAI_CENTER = [13.0827, 80.2707];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer1 = setTimeout(() => map.invalidateSize(), 50);
    const timer2 = setTimeout(() => map.invalidateSize(), 200);
    const timer3 = setTimeout(() => map.invalidateSize(), 600);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [map]);
  return null;
}

function MapAutoBounds({ nodes, getNodePos }) {
  const map = useMap();
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;
    const points = nodes
      .map(n => getNodePos(n))
      .filter(p => Array.isArray(p) && p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]));
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14 });
    }
  }, [map, nodes]);
  return null;
}

const createCustomIcon = (bgColor, iconChar, size = 32, isDraggable = false) => {
  return L.divIcon({
    className: `custom-leaflet-marker ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`,
    html: `
      <div style="
        background-color: ${bgColor};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 13px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.6);
        border: ${isDraggable ? '3px solid #f59e0b' : '2px solid white'};
      ">
        ${iconChar}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createNodeBadgeIcon = (nodeId, isStart, isDest, isLight = false) => {
  let dotColor = '#0ea5e9';
  let badgeBorder = '#0284c7';
  let tagText = '';

  if (isStart) {
    dotColor = '#10b981';
    badgeBorder = '#10b981';
    tagText = ' (START)';
  } else if (isDest) {
    dotColor = '#a855f7';
    badgeBorder = '#a855f7';
    tagText = ' (SHELTER)';
  }

  return L.divIcon({
    className: 'node-permanent-label-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        gap: 5px;
        background-color: ${isLight ? 'rgba(255,255,255,0.96)' : 'rgba(7,14,27,0.94)'};
        border: 1.5px solid ${badgeBorder};
        border-radius: 8px;
        padding: 2px 7px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.7);
        pointer-events: auto;
        white-space: nowrap;
      ">
        <span style="width: 9px; height: 9px; border-radius: 50%; background-color: ${dotColor}; display: inline-block; box-shadow: 0 0 6px ${dotColor};"></span>
        <span style="font-weight: 800; font-size: 11px; color: ${isLight ? '#0f172a' : '#f8fafc'}; font-family: system-ui, sans-serif; letter-spacing: 0.3px;">
          Node ${nodeId}${tagText}
        </span>
      </div>
    `,
    iconSize: [110, 26],
    iconAnchor: [55, 13],
  });
};

const createRoadBadgeIcon = (roadId, u, v, status, riskProb, isLight = false) => {
  const isBlocked = status?.toUpperCase() === 'BLOCKED';
  const isHighRisk = !isBlocked && riskProb > 0.5;

  let borderColor = '#10b981';
  let statusText = 'OPEN';
  let badgeTextColor = '#10b981';

  if (isBlocked) {
    borderColor = '#ef4444';
    statusText = 'BLOCKED';
    badgeTextColor = '#ef4444';
  } else if (isHighRisk) {
    borderColor = '#f59e0b';
    statusText = 'HIGH RISK';
    badgeTextColor = '#f59e0b';
  }

  return L.divIcon({
    className: 'road-midpoint-badge-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        gap: 4px;
        background-color: ${isLight ? '#ffffff' : '#070e1b'};
        border: 1.5px solid ${borderColor};
        border-radius: 6px;
        padding: 2px 6px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.8);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-weight: 800;
        font-size: 10px;
        white-space: nowrap;
        cursor: pointer;
      ">
        <span style="color: ${isLight ? '#0f172a' : '#ffffff'}; font-weight: 800;">${roadId} (${u}→${v})</span>
        <span style="color: ${badgeTextColor}; font-size: 9px; text-transform: uppercase;">[${statusText}]</span>
      </div>
    `,
    iconSize: [125, 22],
    iconAnchor: [62, 11],
  });
};

const shelterIcon = createCustomIcon('#a855f7', '🏰', 36);

const createDisasterMarkerIcon = (disasterType = 'FLOOD', isApproved = true) => {
  const iconChar = disasterType === 'FLOOD' ? '🌊' : disasterType === 'LANDSLIDE' ? '🪨' : disasterType === 'FIRE' ? '🔥' : '⚠️';
  const bgColor = isApproved ? '#ef4444' : '#f59e0b';
  return L.divIcon({
    className: 'disaster-map-marker animate-bounce',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 0 16px ${bgColor};
        border: 2px solid white;
      ">
        ${iconChar}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

export default function EvacuationMap({
  roads = [],
  shelters = [],
  disasters = [],
  activeRoute = null,
  selectedStartNode = 'A',
  selectedDestNode = 'Z',
  mapTheme = 'dark',
  nodeCoordinatesState = {},
  isEditMode = false,
  onNodePositionChange = () => {},
  onThemeChange = () => {},
  onSelectRoad = () => {},
  onSelectShelter = () => {},
  onSelectDisaster = () => {},
}) {

  const isLight = mapTheme === 'light';
  const [isLegendOpen, setIsLegendOpen] = React.useState(true);

  const getNodePos = (nodeId) => {
    if (nodeCoordinatesState && nodeCoordinatesState[nodeId]) {
      return nodeCoordinatesState[nodeId];
    }
    return getNodeCoordinates(nodeId);
  };

  const allNodes = useMemo(() => {
    const set = new Set();
    roads.forEach(r => {
      if (r.u) set.add(r.u);
      if (r.v) set.add(r.v);
    });
    shelters.forEach(s => {
      if (s.location_node) set.add(s.location_node);
    });
    return Array.from(set);
  }, [roads, shelters]);

  const activeRoutePolylineCoords = useMemo(() => {
    if (!activeRoute || !activeRoute.nodes || activeRoute.nodes.length < 2) return null;
    return activeRoute.nodes.map(nodeId => getNodePos(nodeId));
  }, [activeRoute, nodeCoordinatesState]);

  let openCount = 0;
  let highRiskCount = 0;
  let blockedCount = 0;
  roads.forEach(r => {
    const s = r.status?.toUpperCase();
    if (s === 'BLOCKED') blockedCount++;
    else {
      openCount++;
      if (r.blockage_probability > 0.5) highRiskCount++;
    }
  });
  return (
    <div className="col-span-12 lg:col-span-7 xl:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col overflow-hidden relative shadow-md h-[380px] sm:h-[450px] lg:h-full min-h-[350px] lg:min-h-[500px]">
      {/* Live Telemetry Banner Overlay */}
      <div className="absolute top-md left-md right-md flex justify-between items-start z-[450] pointer-events-none">
        <div className="pointer-events-auto bg-surface-container-lowest bg-opacity-85 backdrop-blur-sm border border-outline-variant p-sm rounded shadow-sm">
          <span className="font-label-sm text-label-sm text-primary font-bold tracking-wider">
            LIVE TELEMETRY
          </span>
        </div>
      </div>

      {/* Edit Mode Banner */}
      {isEditMode && (
        <div className="absolute top-16 left-md z-[450] bg-amber-500/95 text-slate-950 px-3.5 py-1.5 rounded-lg shadow-md backdrop-blur flex items-center gap-2 text-xs font-bold border border-amber-400 pointer-events-auto">
          <Move className="w-4 h-4 shrink-0" />
          Edit Mode — Drag markers to reposition
        </div>
      )}

      <MapContainer
        center={CHENNAI_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="w-full h-full"
      >
        <MapInvalidateSize />
        <MapAutoBounds nodes={allNodes} getNodePos={getNodePos} />

        {isLight ? (
          <TileLayer
            key="osm-light"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            key="carto-dark"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        )}

        {/* Two-Layer Road Polylines */}
        {roads.map(road => {
          const uPos = getNodePos(road.u);
          const vPos = getNodePos(road.v);
          const polylineCoords = [uPos, vPos];
          const isBlocked = road.status?.toUpperCase() === 'BLOCKED';
          const isHighRisk = !isBlocked && road.blockage_probability > 0.5;

          let innerColor = isLight ? '#16a34a' : '#10b981';
          let dashArray = null;

          if (isBlocked) {
            innerColor = isLight ? '#dc2626' : '#ef4444';
            dashArray = '8, 8';
          } else if (isHighRisk) {
            innerColor = isLight ? '#d97706' : '#f59e0b';
          }

          const midpoint = [
            (uPos[0] + vPos[0]) / 2,
            (uPos[1] + vPos[1]) / 2,
          ];
          const roadBadgeIcon = createRoadBadgeIcon(road.road_id, road.u, road.v, road.status, road.blockage_probability, isLight);

          const isDisasterImpacted = disasters.some(d => d.status === 'APPROVED' && d.affected_roads?.includes(road.road_id));

          return (
            <React.Fragment key={`road-group-${road.road_id}`}>
              {/* Active Disaster Impact Highlight Aura */}
              {isDisasterImpacted && (
                <Polyline
                  positions={polylineCoords}
                  pathOptions={{
                    color: '#f43f5e',
                    weight: 15,
                    opacity: 0.45,
                  }}
                />
              )}

              {/* Outer Casing Polyline */}
              <Polyline
                positions={polylineCoords}
                pathOptions={{
                  color: isLight ? '#ffffff' : '#040812',
                  weight: 9,
                  opacity: 0.95,
                }}
              />

              {/* Inner Road Polyline */}
              <Polyline
                positions={polylineCoords}
                pathOptions={{
                  color: innerColor,
                  dashArray: dashArray,
                  weight: 5,
                  opacity: 1.0,
                }}
                eventHandlers={{
                  click: () => !isEditMode && onSelectRoad(road),
                }}
              >
                {/* Road Click Popup with full actual road data */}
                <Popup>
                  <div className="text-xs font-sans p-1 leading-snug">
                    <div className="font-extrabold text-sm text-slate-900 border-b pb-1 mb-1">
                      ROAD {road.road_id}
                    </div>
                    <div className="font-bold text-slate-700 mb-1">{road.u} → {road.v}</div>
                    <div className="font-medium text-slate-800">
                      Status:{' '}
                      <span className={isBlocked ? 'text-red-600 font-bold' : isHighRisk ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                        {road.status}
                      </span>
                    </div>
                    <div className="font-medium text-slate-800">
                      Blockage Risk: {(road.blockage_probability * 100).toFixed(0)}%
                    </div>
                    <div className="font-medium text-slate-800">
                      Distance: {road.distance} km
                    </div>
                  </div>
                </Popup>
              </Polyline>

              {/* Road Midpoint Badge */}
              <Marker
                position={midpoint}
                icon={roadBadgeIcon}
                eventHandlers={{
                  click: () => !isEditMode && onSelectRoad(road),
                }}
              >
                <Popup>
                  <div className="text-xs font-sans p-1 leading-snug">
                    <div className="font-extrabold text-sm text-slate-900 border-b pb-1 mb-1">
                      ROAD {road.road_id}
                    </div>
                    <div className="font-bold text-slate-700 mb-1">{road.u} → {road.v}</div>
                    <div className="font-medium text-slate-800">
                      Status:{' '}
                      <span className={isBlocked ? 'text-red-600 font-bold' : isHighRisk ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                        {road.status}
                      </span>
                    </div>
                    <div className="font-medium text-slate-800">
                      Blockage Risk: {(road.blockage_probability * 100).toFixed(0)}%
                    </div>
                    <div className="font-medium text-slate-800">
                      Distance: {road.distance} km
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Recommended Route */}
        {activeRoutePolylineCoords && (
          <>
            {/* Outer Cyan Glow */}
            <Polyline
              positions={activeRoutePolylineCoords}
              pathOptions={{
                color: '#0284c7',
                weight: 16,
                opacity: 0.4,
              }}
            />
            {/* Inner Bright Cyan Line */}
            <Polyline
              positions={activeRoutePolylineCoords}
              pathOptions={{
                color: '#06b6d4',
                weight: 7,
                opacity: 0.98,
              }}
            >
              <Popup>
                <div className="text-xs font-sans p-1">
                  <div className="font-bold text-cyan-700">Optimal Evacuation Path</div>
                  <div>Distance: {activeRoute.total_distance} km</div>
                  <div>Total Risk: {activeRoute.total_risk_score}</div>
                  <div>Total Cost: {activeRoute.total_cost}</div>
                </div>
              </Popup>
            </Polyline>
          </>
        )}

        {/* Permanent Node Markers & Labels */}
        {allNodes.map(nodeId => {
          const coords = getNodePos(nodeId);
          const isStart = nodeId === selectedStartNode;
          const isDest = nodeId === selectedDestNode;

          if (isEditMode) {
            const dragIcon = createCustomIcon(
              isStart ? '#10b981' : isDest ? '#a855f7' : '#0ea5e9',
              nodeId,
              32,
              true
            );

            return (
              <Marker
                key={`drag-node-${nodeId}`}
                position={coords}
                draggable={true}
                icon={dragIcon}
                eventHandlers={{
                  dragend: (e) => {
                    const marker = e.target;
                    const pos = marker.getLatLng();
                    onNodePositionChange(nodeId, [pos.lat, pos.lng]);
                  },
                }}
              >
                <Tooltip permanent={true} direction="top">
                  <span className="font-bold text-xs text-amber-700">Drag Node {nodeId}</span>
                </Tooltip>
              </Marker>
            );
          }

          const nodeBadgeIcon = createNodeBadgeIcon(nodeId, isStart, isDest, isLight);

          return (
            <Marker
              key={`node-badge-${nodeId}`}
              position={coords}
              icon={nodeBadgeIcon}
            >
              <Popup>
                <div className="text-xs font-sans p-1">
                  <div className="font-bold text-cyan-600">Graph Node {nodeId}</div>
                  <div>Coordinates: {coords[0].toFixed(4)}, {coords[1].toFixed(4)}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Shelter Markers */}
        {!isEditMode && shelters.map(shelter => {
          const coords = getNodePos(shelter.location_node);

          return (
            <Marker
              key={shelter.shelter_id}
              position={coords}
              icon={shelterIcon}
              eventHandlers={{
                click: () => onSelectShelter(shelter),
              }}
            >
              <Popup>
                <div className="text-xs font-sans p-1">
                  <div className="font-bold text-purple-700 text-sm">{shelter.name}</div>
                  <div className="text-slate-600 mt-1">Location Node: <strong>{shelter.location_node}</strong></div>
                  <div>Capacity: {shelter.current_occupancy} / {shelter.capacity}</div>
                  <div className="mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                      shelter.status === 'OPERATIONAL' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}>
                      {shelter.status}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Disaster Incident Markers */}
        {!isEditMode && disasters.map(disaster => {
          if (disaster.status === 'REJECTED' || disaster.status === 'RESOLVED') return null;
          const affectedNodes = disaster.affected_nodes || [];
          if (affectedNodes.length === 0) return null;

          return affectedNodes.map(nodeId => {
            const pos = getNodePos(nodeId);
            if (!pos) return null;
            const markerIcon = createDisasterMarkerIcon(disaster.disaster_type, disaster.status === 'APPROVED');

            return (
              <Marker
                key={`disaster-${disaster.id}-${nodeId}`}
                position={pos}
                icon={markerIcon}
                eventHandlers={{
                  click: () => onSelectDisaster(disaster),
                }}
              >
                <Popup>
                  <div className="text-xs font-sans p-1 max-w-xs">
                    <div className="flex items-center gap-1 font-bold text-rose-700 text-sm">
                      <span>⚠️ {disaster.title}</span>
                    </div>
                    <div className="mt-1 text-slate-700">{disaster.description}</div>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-500">Status: {disaster.status}</span>
                      <span className="font-bold text-rose-600">{Math.round((disaster.severity || 0.7) * 100)}% Severity</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          });
        })}
      </MapContainer>


      {/* Map Legend (Collapsible by user necessity) */}
      <div className={`absolute bottom-4 right-4 z-[400] backdrop-blur-md border rounded-xl shadow-2xl text-xs pointer-events-auto transition-all duration-200 ${
        isLight
          ? 'bg-white/95 text-slate-900 border-slate-300'
          : 'bg-[#070e1b]/95 text-slate-100 border-slate-800'
      }`}>
        {isLegendOpen ? (
          <div className="p-3 space-y-1.5 min-w-[210px]">
            <div className="flex items-center justify-between border-b pb-1 font-bold text-slate-400 gap-3 text-[10px] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Evacuation GIS Legend
              </span>
              <button
                onClick={() => setIsLegendOpen(false)}
                className="hover:text-white p-0.5 rounded hover:bg-slate-700/50 transition-colors"
                title="Hide Legend"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block border border-white" />
              <span className={`${isLight ? 'text-slate-700' : 'text-slate-200'} font-semibold`}>● NODE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block border border-white" />
              <span className={`${isLight ? 'text-slate-700' : 'text-slate-200'} font-semibold`}>▣ SHELTER</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-4 h-1.5 rounded-full ${isLight ? 'bg-green-600' : 'bg-emerald-500'}`} />
              <span className={`${isLight ? 'text-slate-700' : 'text-slate-200'} font-semibold`}>━━ OPEN ROAD</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1.5 rounded-full bg-amber-500" />
              <span className={`${isLight ? 'text-slate-700' : 'text-slate-200'} font-semibold`}>━━ HIGH RISK ROAD</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 rounded-full border-b-2 border-dashed border-rose-500" />
              <span className={`${isLight ? 'text-slate-700' : 'text-slate-200'} font-semibold`}>╌╌ BLOCKED ROAD</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
              <span className="font-extrabold text-cyan-400">━━ RECOMMENDED ROUTE</span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsLegendOpen(true)}
            className="flex items-center gap-2 px-3 py-2 font-bold text-xs hover:opacity-90 transition-opacity"
            title="Show GIS Legend"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>GIS Legend</span>
            <ChevronUp className="w-4 h-4 text-slate-400 ml-1" />
          </button>
        )}
      </div>
    </div>
  );
}
