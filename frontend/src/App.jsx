import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Header from './components/Header';
import RouteControls from './components/RouteControls';
import Sidebar from './components/Sidebar';
import EvacuationMap from './components/EvacuationMap';
import LeftNetworkMetrics from './components/LeftNetworkMetrics';
import RightPanel from './components/RightPanel';
import ShelterInfoModal from './components/ShelterInfoModal';
import ErrorBanner from './components/ErrorBanner';
import HealthCheck from './components/HealthCheck';
import ReportDisasterModal from './components/ReportDisasterModal';
import AdminDisasterManager from './components/AdminDisasterManager';
import NotificationToast from './components/NotificationToast';
import CivilianSubmissionModal from './components/CivilianSubmissionModal';
import {
  getRoads,
  getShelters,
  blockRoad,
  getDisasters,
  createDisaster,
  updateDisasterStatus,
  updateDisaster,
  deleteDisaster,
} from './services/api.js';
import {
  saveNetworkData,
  saveRoadStatus,
  getCachedData,
  addPendingChange,
  getPendingChanges,
  saveCustomNodeCoordinates,
  getCustomNodeCoordinates,
  resetCustomNodeCoordinates,
} from './services/offlineStorage.js';
import { findSafestRoute, checkBackendAvailability } from './services/routingService.js';
import { syncPendingChanges } from './services/syncService.js';
import { NODE_COORDINATES } from './config/nodeCoordinates.js';

export default function App() {
  const [roads, setRoads] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [disasters, setDisasters] = useState([]);
  const [activeTab, setActiveTab] = useState('analysis');
  const [userRole, setUserRole] = useState(() => {
    try {
      return localStorage.getItem('evacuation_user_role') || 'admin';
    } catch (e) {
      return 'admin';
    }
  });

  const [selectedStart, setSelectedStart] = useState('A');
  const [selectedDest, setSelectedDest] = useState('Z');
  const [riskWeight, setRiskWeight] = useState(10.0);
  const [activeRoute, setActiveRoute] = useState(null);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [activeRoutingMode, setActiveRoutingMode] = useState('online');
  const [isLoadingRoads, setIsLoadingRoads] = useState(true);
  const [isLoadingShelters, setIsLoadingShelters] = useState(true);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isBlockingRoadId, setIsBlockingRoadId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [mapTheme, setMapTheme] = useState(() => {
    try {
      return localStorage.getItem('evacuation_map_theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });
  const [nodeCoordinatesState, setNodeCoordinatesState] = useState(NODE_COORDINATES);
  const [savedNodeCoordinatesState, setSavedNodeCoordinatesState] = useState(NODE_COORDINATES);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const [selectedShelterModal, setSelectedShelterModal] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [disasterStatusFilter, setDisasterStatusFilter] = useState('ALL');
  const [civilianSubmissionModalData, setCivilianSubmissionModalData] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const notifiedPendingIdsRef = useRef(new Set());
  const initialPendingSeededRef = useRef(false);

  // Auto-polling for Admin EOC dashboard to detect new PENDING disaster requests
  useEffect(() => {
    const pollDisasters = async () => {
      try {
        const res = await getDisasters();
        const fetched = res.disasters || [];
        setDisasters(fetched);

        const pendingIncidents = fetched.filter(d => d.status === 'PENDING');

        if (!initialPendingSeededRef.current) {
          pendingIncidents.forEach(d => notifiedPendingIdsRef.current.add(d.id));
          initialPendingSeededRef.current = true;
        }

        // Detect newly appeared PENDING incidents
        const newPending = pendingIncidents.filter(d => !notifiedPendingIdsRef.current.has(d.id));
        if (newPending.length > 0) {
          newPending.forEach(d => {
            notifiedPendingIdsRef.current.add(d.id);
            setNotifications(prev => [
              ...prev,
              {
                id: `toast-${d.id}-${Date.now()}`,
                type: 'NEW_REQUEST',
                title: '🔔 NEW DISASTER REQUEST',
                message: d.title,
                disasterId: d.id,
                details: {
                  road: d.affected_roads?.join(', ') || 'N/A',
                  severity: `${Math.round((d.severity || 0.7) * 100)}%`,
                },
              },
            ]);
          });
        }
      } catch (e) {
        console.warn('Polling disasters failed:', e);
      }
    };

    pollDisasters();
    const intervalId = setInterval(pollDisasters, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const handleRoleToggle = (newRole) => {
    setUserRole(newRole);
    try {
      localStorage.setItem('evacuation_user_role', newRole);
    } catch (e) {
      console.warn('Failed to save user role preference:', e);
    }
    setInfoMessage(`Switched to ${newRole === 'admin' ? 'Administrator (Full Access)' : 'Civilian / Responder'} Mode.`);
    fetchDisastersData();
  };

  const handleThemeChange = (newTheme) => {
    setMapTheme(newTheme);
    try {
      localStorage.setItem('evacuation_map_theme', newTheme);
    } catch (e) {
      console.warn('Failed to save map theme preference:', e);
    }
  };

  const loadCustomNodeLayout = useCallback(async () => {
    try {
      const customCoords = await getCustomNodeCoordinates();
      if (customCoords && Object.keys(customCoords).length > 0) {
        const mergedCoords = { ...NODE_COORDINATES, ...customCoords };
        setNodeCoordinatesState(mergedCoords);
        setSavedNodeCoordinatesState(mergedCoords);
      }
    } catch (err) {
      console.warn('Failed to load custom node layout:', err);
    }
  }, []);

  const handleNodePositionChange = (nodeId, [newLat, newLng]) => {
    setNodeCoordinatesState(prevCoords => ({
      ...prevCoords,
      [nodeId]: [newLat, newLng],
    }));
    setHasUnsavedChanges(true);
  };

  const fetchDisastersData = useCallback(async () => {
    try {
      const res = await getDisasters();
      setDisasters(res.disasters || []);
    } catch (err) {
      console.warn('Failed to fetch disasters from backend:', err);
    }
  }, []);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(false);

    try {
      const syncResult = await syncPendingChanges();

      if (syncResult.success) {
        if (syncResult.roads && syncResult.roads.length > 0) {
          setRoads(syncResult.roads);
          setShelters(syncResult.shelters || []);
          setActiveRoutingMode('online');
        }

        if (syncResult.lastSyncTimestamp) {
          setLastSyncTimestamp(syncResult.lastSyncTimestamp);
        }

        const remaining = await getPendingChanges();
        setPendingChanges(remaining);

        if (syncResult.syncedCount > 0) {
          setInfoMessage(`Successfully synchronized ${syncResult.syncedCount} offline change(s).`);
        }
      }
    } catch (err) {
      console.error('Synchronization error:', err);
      setSyncError(true);
    } fontFinally: {
      setIsSyncing(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setError(null);
    setInfoMessage(null);
    setIsLoadingRoads(true);
    setIsLoadingShelters(true);

    await loadCustomNodeLayout();

    const isAvailable = await checkBackendAvailability();
    setApiConnected(isAvailable);

    if (isAvailable) {
      await handleSync();

      try {
        const [roadsData, sheltersData, disastersData] = await Promise.all([
          getRoads(),
          getShelters(),
          getDisasters(),
        ]);

        const fetchedRoads = roadsData.roads || [];
        const fetchedShelters = sheltersData.shelters || [];
        const fetchedDisasters = disastersData.disasters || [];

        setRoads(fetchedRoads);
        setShelters(fetchedShelters);
        setDisasters(fetchedDisasters);
        setActiveRoutingMode('online');

        try {
          const syncRes = await saveNetworkData({
            roads: fetchedRoads,
            shelters: fetchedShelters,
            nodeCoordinates: NODE_COORDINATES,
          });
          setLastSyncTimestamp(syncRes.timestamp);
        } catch (cacheErr) {
          console.warn('Failed to cache network data to IndexedDB:', cacheErr);
        }

        if (fetchedShelters && fetchedShelters.length > 0) {
          setSelectedDest(fetchedShelters[0].location_node || 'Z');
        }
      } catch (err) {
        console.error('Online API load failed, attempting offline fallback:', err);
        await loadOfflineCachedData();
      }
    } else {
      console.info('Backend unavailable. Loading offline cached network...');
      await loadOfflineCachedData();
    }

    setIsLoadingRoads(false);
    setIsLoadingShelters(false);
  }, [handleSync, loadCustomNodeLayout]);

  const loadOfflineCachedData = async () => {
    try {
      const cached = await getCachedData();
      if (cached.roads && cached.roads.length > 0) {
        setRoads(cached.roads);
        setShelters(cached.shelters || []);
        setLastSyncTimestamp(cached.lastSyncTimestamp);
        setPendingChanges(cached.pendingChanges || []);
        setActiveRoutingMode('offline');
        setInfoMessage('Offline mode active: Using cached road network.');
      } else {
        setActiveRoutingMode('offline');
        setError('Offline routing unavailable: No cached network stored on this device.');
      }
    } catch (dbErr) {
      setActiveRoutingMode('offline');
      setError('Failed to read local storage cache.');
    }
  };

  useEffect(() => {
    loadInitialData();

    const handleWindowOnline = () => {
      handleSync();
    };

    window.addEventListener('online', handleWindowOnline);
    return () => {
      window.removeEventListener('online', handleWindowOnline);
    };
  }, [loadInitialData, handleSync]);

  const availableNodes = useMemo(() => {
    const nodeSet = new Set();
    roads.forEach(r => {
      if (r.u) nodeSet.add(r.u);
      if (r.v) nodeSet.add(r.v);
    });
    return Array.from(nodeSet).sort();
  }, [roads]);

  const isRouteBlocked = useMemo(() => {
    if (!activeRoute || !activeRoute.road_ids) return false;
    const blockedRoadIds = new Set(roads.filter(r => r.status?.toUpperCase() === 'BLOCKED').map(r => r.road_id));
    return activeRoute.road_ids.some(id => blockedRoadIds.has(id));
  }, [activeRoute, roads]);

  const handleFindRoute = async () => {
    if (!selectedStart || !selectedDest) {
      setError('Please select both a Start location and Destination shelter.');
      return;
    }

    if (selectedStart === selectedDest) {
      setError(`Start location ('${selectedStart}') cannot equal Destination shelter.`);
      return;
    }

    setError(null);
    setIsCalculatingRoute(true);

    try {
      const routeData = await findSafestRoute(selectedStart, selectedDest, riskWeight);
      setActiveRoute(routeData);
      setActiveRoutingMode(routeData.routing_mode || 'online');

      if (routeData.is_offline) {
        setInfoMessage('Offline route calculated locally using cached network data.');
      }
    } catch (err) {
      console.error('Route calculation failed:', err);
      setActiveRoute(null);
      setError(err.message || 'No safe route is currently available between these locations.');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleBlockRoad = async (roadId) => {
    setError(null);
    setInfoMessage(null);
    setIsBlockingRoadId(roadId);

    const isAvailable = await checkBackendAvailability();

    if (isAvailable) {
      try {
        await blockRoad(roadId);
        await saveRoadStatus(roadId, 'BLOCKED');

        const updatedRoadsData = await getRoads();
        const updatedRoads = updatedRoadsData.roads || [];
        setRoads(updatedRoads);

        if (activeRoute) {
          handleFindRoute();
        }
      } catch (err) {
        console.warn(`Online block failed for ${roadId}:`, err);
      }
    }
    setIsBlockingRoadId(null);
  };

  /* Disaster Management Handlers */
  const handleCreateDisasterReport = async (payload) => {
    try {
      const newDisaster = await createDisaster(payload, userRole);

      if (userRole === 'user') {
        setCivilianSubmissionModalData(newDisaster);
        setNotifications(prev => [
          ...prev,
          {
            id: `toast-user-${newDisaster.id}-${Date.now()}`,
            type: 'CIVILIAN_SUBMITTED',
            title: '✓ REQUEST SENT TO ADMIN EOC',
            message: 'Your disaster report has been submitted successfully. It is now waiting for Admin EOC approval.',
            details: {
              status: '🟠 PENDING APPROVAL',
            },
          },
        ]);
      } else {
        setNotifications(prev => [
          ...prev,
          {
            id: `toast-admin-${newDisaster.id}-${Date.now()}`,
            type: 'APPROVED',
            title: '✓ DISASTER INCIDENT CREATED',
            message: `'${newDisaster.title}' created & approved directly by Admin.`,
            details: {
              road: newDisaster.affected_roads?.join(', ') || 'N/A',
              impact: '🔴 BLOCKED',
            },
          },
        ]);
      }

      // Refresh roads and disasters
      const [updatedRoads, updatedDisasters] = await Promise.all([
        getRoads(),
        getDisasters(),
      ]);
      setRoads(updatedRoads.roads || []);
      setDisasters(updatedDisasters.disasters || []);

      if (activeRoute) {
        handleFindRoute();
      }
    } catch (err) {
      setError(`Failed to submit disaster report: ${err.message}`);
    }
  };

  const [operationalFeedback, setOperationalFeedback] = useState(null);

  const handleApproveDisaster = async (disasterId) => {
    try {
      const target = disasters.find(d => d.id === disasterId);
      await updateDisasterStatus(disasterId, {
        status: 'APPROVED',
        admin_notes: 'Approved by EOC Admin. Graph risk recalculated.',
      }, 'admin');

      const [updatedRoads, updatedDisasters] = await Promise.all([
        getRoads(),
        getDisasters(),
      ]);
      setRoads(updatedRoads.roads || []);
      setDisasters(updatedDisasters.disasters || []);

      const affRoads = target?.affected_roads || [];
      const affRoadObjs = (updatedRoads.roads || []).filter(r => affRoads.includes(r.road_id));
      const isBlocked = affRoadObjs.some(r => r.status?.toUpperCase() === 'BLOCKED');
      const roadStatusStr = isBlocked ? 'BLOCKED' : (affRoadObjs.some(r => r.status?.toUpperCase() === 'HIGH_RISK' || r.blockage_probability > 0.4) ? 'HIGH RISK' : 'OPEN');
      const impactStr = roadStatusStr === 'BLOCKED' ? '🔴 BLOCKED' : (roadStatusStr === 'HIGH RISK' ? '🟠 HIGH RISK' : '🟢 OPEN');

      setNotifications(prev => [
        ...prev,
        {
          id: `toast-appr-${disasterId}-${Date.now()}`,
          type: 'APPROVED',
          title: '✓ REQUEST APPROVED',
          message: target?.title || 'Disaster Incident',
          details: {
            road: affRoads.join(', ') || 'N/A',
            impact: `${impactStr}. Route recalculated automatically.`,
          },
        },
      ]);

      setOperationalFeedback({
        type: 'APPROVED',
        title: target?.title || 'Disaster Incident',
        affectedRoads: affRoads.join(', ') || 'N/A',
        roadStatus: roadStatusStr,
        routeRecalculated: true,
      });

      if (activeRoute) {
        handleFindRoute();
      }
    } catch (err) {
      setError(`Failed to approve disaster: ${err.message}`);
    }
  };

  const handleRejectDisaster = async (disasterId) => {
    try {
      const target = disasters.find(d => d.id === disasterId);
      await updateDisasterStatus(disasterId, {
        status: 'REJECTED',
        admin_notes: 'Rejected by EOC Admin after verification.',
      }, 'admin');

      setNotifications(prev => [
        ...prev,
        {
          id: `toast-rej-${disasterId}-${Date.now()}`,
          type: 'REJECTED',
          title: '✕ REQUEST REJECTED',
          message: target?.title || 'Disaster Incident',
          details: {
            impact: 'No network changes were applied.',
          },
        },
      ]);

      setInfoMessage(`Disaster report rejected.`);
      fetchDisastersData();
    } catch (err) {
      setError(`Failed to reject disaster: ${err.message}`);
    }
  };

  const handleResolveDisaster = async (disasterId) => {
    if (!window.confirm("Resolve this disaster?\nThe affected road(s) will be returned to their appropriate non-incident state.")) {
      return;
    }

    try {
      const target = disasters.find(d => d.id === disasterId);
      await updateDisasterStatus(disasterId, {
        status: 'RESOLVED',
        admin_notes: 'Incident resolved & hazards cleared by field team.',
      }, 'admin');

      const [updatedRoads, updatedDisasters] = await Promise.all([
        getRoads(),
        getDisasters(),
      ]);
      setRoads(updatedRoads.roads || []);
      setDisasters(updatedDisasters.disasters || []);

      const affRoads = target?.affected_roads || [];
      const affRoadObjs = (updatedRoads.roads || []).filter(r => affRoads.includes(r.road_id));
      const restoredStatus = affRoadObjs.map(r => `Road ${r.road_id} (${r.status === 'BLOCKED' ? '🔴 BLOCKED' : '🟢 ' + r.status})`).join(', ') || `Road ${affRoads.join(', ')} 🟢 OPEN`;

      setNotifications(prev => [
        ...prev,
        {
          id: `toast-res-${disasterId}-${Date.now()}`,
          type: 'RESOLVED',
          title: '✓ DISASTER RESOLVED',
          message: target?.title || 'Disaster Incident',
          details: {
            road: affRoads.join(', ') || 'N/A',
            status: 'Affected road(s) are available again.',
          },
        },
      ]);

      setOperationalFeedback({
        type: 'RESOLVED',
        title: target?.title || 'Disaster Incident',
        affectedRoads: affRoads.join(', ') || 'N/A',
        restoredStatus: restoredStatus,
      });

      if (activeRoute) {
        handleFindRoute();
      }
    } catch (err) {
      setError(`Failed to resolve disaster: ${err.message}`);
    }
  };

  const handleDeleteDisaster = async (disasterId) => {
    if (!window.confirm('Are you sure you want to delete this disaster record?')) return;
    try {
      await deleteDisaster(disasterId, 'admin');
      setInfoMessage(`Disaster record deleted.`);
      fetchDisastersData();
    } catch (err) {
      setError(`Failed to delete disaster: ${err.message}`);
    }
  };

  const pendingDisastersCount = useMemo(() => {
    return disasters.filter(d => d.status === 'PENDING').length;
  }, [disasters]);

  return (
    <div className="app bg-background text-on-background font-body-md min-h-screen flex w-full h-full overflow-hidden">
      {/* Side Navigation Bar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingDisastersCount={pendingDisastersCount}
        userRole={userRole}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ml-0 ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-56'} h-screen overflow-hidden`}>

        {/* Top Header */}
        <Header
          lastSyncTimestamp={lastSyncTimestamp}
          pendingChangesCount={pendingChanges.length}
          pendingDisastersCount={pendingDisastersCount}
          activeRoutingMode={activeRoutingMode}
          mapTheme={mapTheme}
          isSyncing={isSyncing}
          onThemeChange={handleThemeChange}
          userRole={userRole}
          onRoleToggle={handleRoleToggle}
          onOpenReportModal={() => setIsReportModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(prev => !prev)}
        />

        <ErrorBanner error={error} onClose={() => setError(null)} />
        {infoMessage && !error && (
          <div className="bg-surface-container-high border-b border-outline-variant px-lg py-xs text-body-sm text-primary flex items-center justify-between shrink-0">
            <span>{infoMessage}</span>
            <button
              onClick={() => setInfoMessage(null)}
              className="text-primary font-bold hover:opacity-80 ml-md"
            >
              &times;
            </button>
          </div>
        )}

        {/* Operational Impact Notification Banner for Admin */}
        {userRole === 'admin' && operationalFeedback && (
          <div className="mx-lg my-sm p-md rounded-2xl border shadow-lg animate-fade-in flex items-start justify-between gap-md bg-surface-container-high border-primary/40">
            <div className="flex items-start gap-md">
              <div className={`p-sm rounded-xl text-white shrink-0 ${operationalFeedback.type === 'APPROVED' ? 'bg-rose-600' : 'bg-emerald-600'
                }`}>
                <span className="material-symbols-outlined text-2xl">
                  {operationalFeedback.type === 'APPROVED' ? 'check_circle' : 'task_alt'}
                </span>
              </div>
              <div className="space-y-xs">
                <div className="font-headline-xs text-headline-xs font-extrabold text-on-surface flex items-center gap-xs">
                  <span>{operationalFeedback.type === 'APPROVED' ? '✓ INCIDENT APPROVED' : '✓ INCIDENT RESOLVED'}</span>
                </div>
                <div className="text-body-sm text-on-surface font-semibold">
                  {operationalFeedback.title}
                </div>
                <div className="text-label-sm text-on-surface-variant font-medium">
                  {operationalFeedback.type === 'APPROVED' ? (
                    <>
                      Road <strong>{operationalFeedback.affectedRoads}</strong> is now <span className="font-bold text-rose-400">{operationalFeedback.roadStatus}</span>. Route has been recalculated automatically.
                    </>
                  ) : (
                    <>
                      Status: <strong>RESOLVED</strong>. {operationalFeedback.restoredStatus}.
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOperationalFeedback(null)}
              className="p-xs text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-highest transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-body-md">close</span>
            </button>
          </div>
        )}

        {/* Dynamic View Canvas based on activeTab */}
        <main className="flex-1 bg-surface-container-low overflow-y-auto flex flex-col p-md gap-md">
          {activeTab === 'disasters' ? (
            <AdminDisasterManager
              disasters={disasters}
              roads={roads}
              userRole={userRole}
              statusFilter={disasterStatusFilter}
              onStatusFilterChange={setDisasterStatusFilter}
              onOpenReportModal={() => setIsReportModalOpen(true)}
              onApproveDisaster={handleApproveDisaster}
              onRejectDisaster={handleRejectDisaster}
              onResolveDisaster={handleResolveDisaster}
              onDeleteDisaster={handleDeleteDisaster}
              onRefreshData={fetchDisastersData}
            />
          ) : activeTab === 'health' ? (
            <HealthCheck />
          ) : (
            <div className="flex-1 flex flex-col gap-sm min-h-0">
              {/* Compact Horizontal Telemetry Metrics Bar */}
              <LeftNetworkMetrics
                routeData={activeRoute}
                roads={roads}
                shelters={shelters}
                onSelectShelter={(shelter) => setSelectedShelterModal(shelter)}
              />

              {/* Route Configuration Controls */}
              <RouteControls
                availableNodes={availableNodes}
                availableShelters={shelters}
                selectedStart={selectedStart}
                selectedDest={selectedDest}
                riskWeight={riskWeight}
                isCalculating={isCalculatingRoute}
                isRouteBlocked={isRouteBlocked}
                roads={roads}
                onStartChange={setSelectedStart}
                onDestChange={setSelectedDest}
                onRiskWeightChange={setRiskWeight}
                onFindRoute={handleFindRoute}
                onBlockRoad={handleBlockRoad}
                isBlockingRoadId={isBlockingRoadId}
              />

              {/* Map-First 12-Column Operational Grid */}
              <div className="flex-1 grid grid-cols-12 gap-md min-h-0">
                {/* Primary Operational Focus: Dominant Telemetry Map (~65% width) */}
                <EvacuationMap
                  roads={roads}
                  shelters={shelters}
                  disasters={disasters}
                  activeRoute={activeRoute}
                  selectedStartNode={selectedStart}
                  selectedDestNode={selectedDest}
                  mapTheme={mapTheme}
                  nodeCoordinatesState={nodeCoordinatesState}
                  isEditMode={isEditMode}
                  onNodePositionChange={handleNodePositionChange}
                  onThemeChange={handleThemeChange}
                  onSelectRoad={(road) => {
                    if (road.status?.toUpperCase() !== 'BLOCKED') {
                      handleBlockRoad(road.road_id);
                    }
                  }}
                  onSelectShelter={(shelter) => setSelectedShelterModal(shelter)}
                  onSelectDisaster={(disaster) => {
                    setActiveTab('disasters');
                  }}
                />

                {/* Secondary Operational Focus: Timeline Segment Breakdown (~35% width) */}
                <RightPanel
                  activeRoute={activeRoute}
                  roads={roads}
                  disasters={disasters}
                  selectedStart={selectedStart}
                  selectedDest={selectedDest}
                  onBlockRoad={handleBlockRoad}
                  isBlockingRoadId={isBlockingRoadId}
                  onRecalculateRoute={handleFindRoute}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Real-time Notification Toast System */}
      <NotificationToast
        notifications={notifications}
        onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
        onReviewRequest={(disasterId) => {
          setActiveTab('disasters');
          setDisasterStatusFilter('PENDING');
        }}
      />

      {/* Shelter Info Modal */}
      {selectedShelterModal && (
        <ShelterInfoModal
          shelter={selectedShelterModal}
          onClose={() => setSelectedShelterModal(null)}
        />
      )}

      {/* Report Disaster Modal */}
      {isReportModalOpen && (
        <ReportDisasterModal
          availableNodes={availableNodes}
          availableRoads={roads}
          userRole={userRole}
          onSubmit={handleCreateDisasterReport}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {/* Civilian Submission Confirmation Popup Modal */}
      {civilianSubmissionModalData && (
        <CivilianSubmissionModal
          submission={civilianSubmissionModalData}
          onClose={() => setCivilianSubmissionModalData(null)}
        />
      )}
    </div>
  );
}
