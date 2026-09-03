import React, { useState, useMemo } from 'react';
import DisasterCard from './DisasterCard';

export default function AdminDisasterManager({
  disasters = [],
  roads = [],
  userRole = 'admin',
  statusFilter: activeStatusFilterProp,
  onStatusFilterChange,
  onOpenReportModal,
  onApproveDisaster,
  onRejectDisaster,
  onResolveDisaster,
  onDeleteDisaster,
  onEditDisaster,
  onRefreshData,
}) {
  const [internalFilter, setInternalFilter] = useState('ALL');
  const statusFilter = activeStatusFilterProp || internalFilter;

  const setStatusFilter = (val) => {
    if (onStatusFilterChange) {
      onStatusFilterChange(val);
    }
    setInternalFilter(val);
  };

  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => {
    const total = disasters.length;
    const pending = disasters.filter(d => d.status === 'PENDING').length;
    const approved = disasters.filter(d => d.status === 'APPROVED').length;
    const resolved = disasters.filter(d => d.status === 'RESOLVED').length;
    const rejected = disasters.filter(d => d.status === 'REJECTED').length;
    const history = resolved + rejected;
    return { total, pending, approved, resolved, rejected, history };
  }, [disasters]);

  const filteredDisasters = useMemo(() => {
    return disasters.filter(d => {
      let matchesStatus = false;
      const statusUpper = d.status?.toUpperCase();

      if (statusFilter === 'ALL') {
        matchesStatus = true;
      } else if (statusFilter === 'HISTORY') {
        matchesStatus = statusUpper === 'RESOLVED' || statusUpper === 'REJECTED';
      } else {
        matchesStatus = statusUpper === statusFilter;
      }

      const matchesSearch =
        !searchQuery ||
        d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.reported_by?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.affected_nodes && d.affected_nodes.some(n => n.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (d.affected_roads && d.affected_roads.some(r => r.toLowerCase().includes(searchQuery.toLowerCase())));

      return matchesStatus && matchesSearch;
    });
  }, [disasters, statusFilter, searchQuery]);

  return (
    <div className="flex-1 flex flex-col space-y-md overflow-hidden">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-surface-container border border-outline-variant p-md rounded-2xl gap-md shrink-0">
        <div>
          <div className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-error">admin_panel_settings</span>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {userRole === 'admin' ? 'Emergency Operations Command Center' : 'Disaster Reports Center'}
            </h2>
          </div>
          <p className="font-body-sm text-on-surface-variant mt-0.5">
            {userRole === 'admin'
              ? 'Review, verify, approve civilian disaster reports, and deploy road network rerouting.'
              : 'View reported disaster incidents and check status of your submitted emergency reports.'}
          </p>
        </div>

        <div className="flex items-center gap-sm shrink-0">
          <button
            onClick={onOpenReportModal}
            className="px-md py-sm bg-error text-on-error font-bold rounded-xl hover:bg-error/90 transition-all cursor-pointer flex items-center gap-xs shadow-md active:scale-95 text-label-md"
          >
            <span className="material-symbols-outlined text-body-md">add_alert</span>
            <span>+ Report Disaster Incident</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md shrink-0">
        <div className="bg-surface-container border border-outline-variant p-md rounded-2xl flex items-center justify-between">
          <div>
            <span className="font-label-sm text-on-surface-variant font-semibold block">Total Incidents</span>
            <span className="font-headline-md text-headline-md font-bold text-on-surface">{counts.total}</span>
          </div>
          <div className="p-sm rounded-xl bg-surface-container-highest text-on-surface-variant">
            <span className="material-symbols-outlined">dataset</span>
          </div>
        </div>

        <div className={`bg-surface-container border p-md rounded-2xl flex items-center justify-between transition-all ${
          counts.pending > 0 ? 'border-amber-500/50 bg-amber-500/10' : 'border-outline-variant'
        }`}>
          <div>
            <div className="flex items-center gap-xs">
              <span className="font-label-sm text-amber-400 font-semibold block">Pending Approvals</span>
              {counts.pending > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
            <span className="font-headline-md text-headline-md font-bold text-amber-400">{counts.pending}</span>
          </div>
          <div className="p-sm rounded-xl bg-amber-500/20 text-amber-400">
            <span className="material-symbols-outlined">hourglass_top</span>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant p-md rounded-2xl flex items-center justify-between">
          <div>
            <span className="font-label-sm text-rose-400 font-semibold block">Active Approved</span>
            <span className="font-headline-md text-headline-md font-bold text-rose-400">{counts.approved}</span>
          </div>
          <div className="p-sm rounded-xl bg-rose-500/20 text-rose-400">
            <span className="material-symbols-outlined">warning</span>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant p-md rounded-2xl flex items-center justify-between">
          <div>
            <span className="font-label-sm text-emerald-400 font-semibold block">Resolved Incidents</span>
            <span className="font-headline-md text-headline-md font-bold text-emerald-400">{counts.resolved}</span>
          </div>
          <div className="p-sm rounded-xl bg-emerald-500/20 text-emerald-400">
            <span className="material-symbols-outlined">task_alt</span>
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-md bg-surface-container p-sm rounded-2xl border border-outline-variant shrink-0">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-xs overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: `All Incidents (${counts.total})` },
            { id: 'PENDING', label: `Pending Approvals (${counts.pending})` },
            { id: 'APPROVED', label: `Active Incidents (${counts.approved})` },
            { id: 'HISTORY', label: `Incident History (${counts.history})` },
            { id: 'RESOLVED', label: `Resolved (${counts.resolved})` },
            { id: 'REJECTED', label: `Rejected (${counts.rejected})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-md py-xs rounded-xl font-bold text-label-sm whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-body-md pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search disasters..."
            className="w-full pl-xl pr-md py-xs rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:border-primary outline-none text-body-sm"
          />
        </div>
      </div>

      {/* Disasters Grid List */}
      <div className="flex-1 overflow-y-auto pr-xs">
        {filteredDisasters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {filteredDisasters.map(d => (
              <DisasterCard
                key={d.id}
                disaster={d}
                roads={roads}
                userRole={userRole}
                onApprove={onApproveDisaster}
                onReject={onRejectDisaster}
                onResolve={onResolveDisaster}
                onDelete={onDeleteDisaster}
                onEdit={onEditDisaster}
              />
            ))}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed border-outline-variant rounded-2xl p-lg text-center bg-surface-container-low">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-xs">
              checklist_rtl
            </span>
            <h4 className="font-headline-xs text-headline-xs font-bold text-on-surface">No Disaster Incidents Found</h4>
            <p className="font-body-sm text-on-surface-variant mt-xs max-w-sm">
              {searchQuery
                ? `No disaster records matching "${searchQuery}".`
                : 'There are no disaster reports matching the selected status filter.'}
            </p>
            <button
              onClick={onOpenReportModal}
              className="mt-md px-md py-xs bg-primary text-on-primary font-bold rounded-xl text-label-md hover:bg-primary/90 transition-all cursor-pointer"
            >
              Report New Disaster
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
