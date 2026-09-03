import React, { useState } from 'react';

export default function ReportDisasterModal({
  availableNodes = ['A', 'B', 'C', 'D', 'E', 'Z'],
  availableRoads = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'],
  userRole = 'user',
  onSubmit,
  onClose,
}) {
  const [title, setTitle] = useState('');
  const [disasterType, setDisasterType] = useState('FLOOD');
  const [severity, setSeverity] = useState(0.75);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedRoads, setSelectedRoads] = useState([]);
  const [description, setDescription] = useState('');
  const [reportedBy, setReportedBy] = useState(userRole === 'admin' ? 'EOC Controller' : 'Civilian User');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const disasterTypes = [
    { value: 'FLOOD', label: 'Flood / Inundation', icon: 'water_damage' },
    { value: 'CYCLONE', label: 'Cyclone / Storm', icon: 'cyclone' },
    { value: 'LANDSLIDE', label: 'Landslide / Debris', icon: 'landscape' },
    { value: 'HEAVY_RAINFALL', label: 'Heavy Rainfall', icon: 'rainy' },
    { value: 'FIRE', label: 'Fire / Explosion', icon: 'local_fire_department' },
    { value: 'ROAD_DAMAGE', label: 'Road Damage', icon: 'minor_crash' },
    { value: 'EARTHQUAKE', label: 'Earthquake', icon: 'tsunami' },
    { value: 'OTHER', label: 'Other Emergency', icon: 'warning' },
  ];

  // Auto-derive connected endpoint nodes from selected road IDs using availableRoads graph data
  const deriveNodesFromRoads = (roadIds) => {
    const nodeSet = new Set();
    roadIds.forEach(id => {
      const found = availableRoads.find(r => (typeof r === 'object' ? r.road_id : r) === id);
      if (found && typeof found === 'object') {
        if (found.u) nodeSet.add(found.u);
        if (found.v) nodeSet.add(found.v);
      }
    });
    return Array.from(nodeSet);
  };

  const toggleNode = (node) => {
    setSelectedNodes(prev =>
      prev.includes(node) ? prev.filter(n => n !== node) : [...prev, node]
    );
  };

  const toggleRoad = (roadId) => {
    setSelectedRoads(prev => {
      const nextRoads = prev.includes(roadId) ? prev.filter(r => r !== roadId) : [...prev, roadId];
      const derived = deriveNodesFromRoads(nextRoads);
      setSelectedNodes(derived);
      return nextRoads;
    });
  };

  const handleClearSelection = () => {
    setSelectedRoads([]);
    setSelectedNodes([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Please enter a disaster title.');
      return;
    }

    if (!description.trim() || description.length < 5) {
      setFormError('Please enter a description (at least 5 characters).');
      return;
    }

    if (selectedNodes.length === 0 && selectedRoads.length === 0) {
      setFormError('Location required: Please select an affected road segment on the map or from the list below.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        disaster_type: disasterType,
        severity: parseFloat(severity),
        affected_nodes: selectedNodes,
        affected_roads: selectedRoads,
        description,
        reported_by: reportedBy,
      });
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to submit disaster report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityBadge = (val) => {
    if (val >= 0.85) return { label: 'CRITICAL (Severe Blockage)', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    if (val >= 0.6) return { label: 'HIGH (Significant Hazard)', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    if (val >= 0.35) return { label: 'MODERATE (Use Caution)', bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' };
    return { label: 'LOW (Minor Risk)', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
  };

  const severityBadge = getSeverityBadge(severity);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-md overflow-y-auto animate-fade-in">
      <div className="bg-surface-container-high border border-outline-variant rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="px-lg py-md border-b border-outline-variant bg-surface-container flex items-center justify-between shrink-0">
          <div className="flex items-center gap-md">
            <div className="p-2 rounded-xl bg-error/20 text-error border border-error/30">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {userRole === 'admin' ? 'Create Admin Disaster Incident' : 'Report Disaster Incident'}
              </h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {userRole === 'admin'
                  ? 'Submitting as Admin will automatically approve & update evacuation routing.'
                  : 'Submit a new disaster report for Admin verification & EOC dispatch.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-sm text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-lg flex-1 overflow-y-auto space-y-md">
          {formError && (
            <div className="p-md rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-body-sm flex items-center gap-sm">
              <span className="material-symbols-outlined text-rose-400">error</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-label-md font-semibold text-on-surface mb-xs">
              Incident Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Landslide Hazard on Rural Route R7"
              className="w-full px-md py-sm rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:border-primary outline-none text-body-md"
            />
          </div>

          {/* Disaster Type & Reporter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-xs">
                Disaster Type
              </label>
              <select
                value={disasterType}
                onChange={(e) => setDisasterType(e.target.value)}
                className="w-full px-md py-sm rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:border-primary outline-none text-body-md cursor-pointer"
              >
                {disasterTypes.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-xs">
                Reporter Name / Unit
              </label>
              <input
                type="text"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                placeholder="e.g. Civilian Scout Mark"
                className="w-full px-md py-sm rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:border-primary outline-none text-body-md"
              />
            </div>
          </div>

          {/* Severity Slider */}
          <div>
            <div className="flex justify-between items-center mb-xs">
              <label className="text-label-md font-semibold text-on-surface">
                Severity Index: <span className="text-primary font-bold">{Math.round(severity * 100)}%</span>
              </label>
              <span className={`px-sm py-0.5 rounded-full text-label-sm font-bold border ${severityBadge.bg}`}>
                {severityBadge.label}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Location Selection & Summary Banner */}
          <div className="p-md rounded-2xl bg-surface-container-low border border-outline-variant space-y-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-md font-bold text-on-surface uppercase tracking-wider flex items-center gap-xs">
                <span className="material-symbols-outlined text-amber-400 text-sm">map</span>
                Affected Location Selection
              </span>
              {(selectedRoads.length > 0 || selectedNodes.length > 0) && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-sm py-0.5 rounded-lg bg-surface-container-highest hover:bg-rose-500/20 hover:text-rose-300 text-on-surface-variant font-bold text-label-xs transition-colors cursor-pointer flex items-center gap-xs"
                >
                  <span className="material-symbols-outlined text-[14px]">clear</span>
                  <span>Clear Selection</span>
                </button>
              )}
            </div>

            {/* Selection Summary */}
            {selectedRoads.length > 0 ? (
              <div className="p-sm rounded-xl bg-surface-container border border-primary/30 flex flex-wrap items-center justify-between gap-sm">
                <div>
                  <div className="text-xs text-primary font-bold">
                    Selected Road(s): {selectedRoads.join(', ')}
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5">
                    Connected Endpoint Nodes (Derived Automatically):{' '}
                    <span className="font-bold text-on-surface">{selectedNodes.join(', ')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">
                Select an affected road segment below. Endpoint nodes will be derived automatically.
              </p>
            )}

            {/* Affected Roads Multiselect */}
            <div>
              <label className="block text-label-sm font-semibold text-on-surface-variant mb-xs uppercase tracking-wider">
                Select Affected Road Segment(s)
              </label>
              <div className="flex flex-wrap gap-xs">
                {availableRoads.map(road => {
                  const roadId = typeof road === 'object' ? road.road_id : road;
                  const label = typeof road === 'object' ? `Road ${road.road_id} (${road.u} → ${road.v})` : `Road ${roadId}`;
                  const isSelected = selectedRoads.includes(roadId);
                  return (
                    <button
                      key={roadId}
                      type="button"
                      onClick={() => toggleRoad(roadId)}
                      className={`px-md py-xs rounded-xl font-bold text-label-md border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-error text-on-error border-error shadow-sm'
                          : 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-error'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Derived Affected Nodes */}
            {selectedNodes.length > 0 && (
              <div>
                <label className="block text-label-sm font-semibold text-on-surface-variant mb-xs uppercase tracking-wider">
                  Auto-Populated Affected Nodes
                </label>
                <div className="flex flex-wrap gap-xs">
                  {selectedNodes.map(node => (
                    <span
                      key={node}
                      className="px-md py-xs rounded-xl font-bold text-label-md border bg-primary/20 text-primary border-primary/40 flex items-center gap-xs"
                    >
                      <span>Node {node}</span>
                      <span className="text-[10px] bg-primary/30 px-1 rounded uppercase">Auto</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-label-md font-semibold text-on-surface mb-xs">
              Detailed Situation Report *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe current hazard status, water depth, debris, or accessibility issues..."
              className="w-full px-md py-sm rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:border-primary outline-none text-body-md"
            />
          </div>

          {/* Actions */}
          <div className="pt-sm border-t border-outline-variant flex justify-end gap-md shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-lg py-sm rounded-xl border border-outline-variant text-on-surface-variant font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-xl py-sm rounded-xl bg-error text-on-error font-bold hover:bg-error/90 transition-all cursor-pointer flex items-center gap-xs shadow-md"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-body-md">progress_activity</span>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-body-md">send</span>
                  <span>{userRole === 'admin' ? 'Create & Approve Disaster' : 'Submit Disaster Report'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
