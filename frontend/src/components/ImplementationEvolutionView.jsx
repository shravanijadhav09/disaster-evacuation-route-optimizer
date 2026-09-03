import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Cpu,
  Database,
  Route,
  Activity,
  RefreshCw,
  WifiOff,
  Server,
  Layout,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Layers,
  BarChart3,
  Sliders,
} from 'lucide-react';

const REPORT_ITEMS = [
  {
    id: 'techniques',
    title: 'Techniques Newly Added',
    category: 'Core & Algorithms',
    icon: Sparkles,
    color: 'emerald',
    earlier: 'Static, unweighted edge distance routing with no environmental hazard evaluation, persistent audit logs, or offline network synchronization.',
    current: 'Integrated Machine Learning risk prediction pipeline combined with dynamic weight calculation, relational SQLite audit logging for incident state changes, and an IndexedDB offline network synchronization system.',
    technique: 'scikit-learn ML Pipeline (StandardScaler, ColumnTransformer, LogisticRegression), NetworkX dynamic weight functions, SQLite ORM audit logging (AuditLogModel), IndexedDB offline caching and PWA background synchronization queue.',
    why: 'Transforms basic geometric routing into a risk-aware, data-driven disaster management platform that balances physical distance against ML-predicted environmental hazards while ensuring complete operational audit accountability and offline resilience.',
    files: [
      { name: 'risk_service.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/ml/risk_service.py#L17-L60' },
      { name: 'predict.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/ml/predict.py#L49-L103' },
      { name: 'models.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/db/models.py#L32-L43' },
      { name: 'syncService.js', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/services/syncService.js#L45-L154' },
    ],
  },
  {
    id: 'algorithms',
    title: 'Algorithms Improved',
    category: 'Core & Algorithms',
    icon: Zap,
    color: 'amber',
    earlier: 'Standard unweighted or static distance-based Dijkstra shortest path calculation without risk assessment or active road blockage filtering.',
    current: 'Risk-aware Dijkstra shortest-path search executing over a dynamic traversable graph view (get_traversable_graph()). Edge weights are dynamically computed via _create_weight_function(risk_weight) using routing_cost = distance + (blockage_probability * risk_weight). Confirmed blocked roads are assigned infinite cost or excluded. Client-side offline execution mirrors this with a browser-native JS Dijkstra engine.',
    technique: 'Dynamic weight function closure in NetworkX Dijkstra (nx.shortest_path), infinite-cost edge pruning, traversable subgraph extraction, and browser-native Javascript Dijkstra search.',
    why: 'Guarantees that calculated evacuation paths strictly avoid blocked roads while dynamically penalizing high-risk roads based on user-adjustable risk weight multipliers (risk_weight), ensuring safe and navigable evacuation routes.',
    files: [
      { name: 'router.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/routing/router.py#L24-L165' },
      { name: 'graph.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/routing/graph.py#L128-L149' },
      { name: 'offlineRouting.js', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/services/offlineRouting.js#L17-L153' },
    ],
  },
  {
    id: 'architecture',
    title: 'Architecture Improvements',
    category: 'Architecture & Backend',
    icon: Layers,
    color: 'cyan',
    earlier: 'Monolithic script layout with direct variable mutations, hardcoded graph definitions, and no separation between database, routing logic, ML inference, and API handlers.',
    current: 'Decoupled, multi-tier micro-architecture. Features strict layer isolation: FastAPI REST API route handlers (app/api/routes/), Pydantic request/response schemas (app/schemas/), SQLAlchemy ORM database layer (app/db/), NetworkX graph engine (app/routing/), ML inference pipeline (app/ml/), and a React frontend with browser-native offline IndexedDB fallback.',
    technique: 'FastAPI APIRouter modularization, Singleton Graph dependency injection (deps.py), Pydantic model validation, SQLAlchemy ORM data mapping, and browser IndexedDB abstraction.',
    why: 'Enhances codebase maintainability, testability, scale, and fault tolerance. Ensures thread-safe graph state access across concurrent API requests.',
    files: [
      { name: 'deps.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/api/deps.py#L18-L37' },
      { name: 'disaster_store.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/db/disaster_store.py#L37-L50' },
      { name: 'disasters.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/api/routes/disasters.py#L21-L166' },
      { name: 'App.jsx', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/App.jsx#L221-L309' },
    ],
  },
  {
    id: 'database',
    title: 'Database / Storage Improvements',
    category: 'Architecture & Backend',
    icon: Database,
    color: 'purple',
    earlier: 'Transient in-memory data structures or unvalidated static JSON files (disasters_data.json) that reset upon server restart.',
    current: 'Persistent, thread-safe SQLite database backed by SQLAlchemy ORM with automatic legacy JSON data auto-migration (_migrate_from_json), relational models (IncidentModel, AuditLogModel), cascade deletion, and audit logging. IndexedDB on the frontend caches road networks, shelter statuses, node coordinates, pending offline actions, and custom map layouts.',
    technique: 'SQLite3, SQLAlchemy ORM (declarative_base, sessionmaker), JSON string serialization (affected_nodes_json, affected_roads_json), and IndexedDB Object Stores (roads, shelters, sync_meta, pending_changes, disasters).',
    why: 'Eliminates data loss across application restarts, maintains audit logs for every admin/civilian action, auto-migrates legacy records idempotently, and enables complete client-side storage for offline resilience.',
    files: [
      { name: 'database.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/db/database.py#L15-L58' },
      { name: 'models.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/db/models.py#L10-L43' },
      { name: 'disaster_store.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/db/disaster_store.py#L52-L140' },
      { name: 'offlineStorage.js', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/services/offlineStorage.js#L21-L94' },
    ],
  },
  {
    id: 'ml',
    title: 'ML Improvements',
    category: 'Core & Algorithms',
    icon: Cpu,
    color: 'blue',
    earlier: 'Fixed static risk coefficients or manually assigned blockage probabilities without empirical environmental feature integration.',
    current: 'End-to-end Machine Learning pipeline utilizing Logistic Regression to predict road blockage probability P(blocked=1) based on 10 environmental and infrastructure features (rainfall_mm, flood_level, elevation_m, road_type, historical_blockages, traffic_density, disaster_intensity, distance_to_waterbody_km, road_condition). Includes automated feature scaling, categorical encoding, joblib artifact persistence, evaluation metrics (ROC-AUC, confusion matrix), and batch prediction services.',
    technique: 'scikit-learn (LogisticRegression, StandardScaler, OneHotEncoder, ColumnTransformer, Pipeline), joblib artifact saving/loading, pandas batch DataFrame preprocessing.',
    why: 'Replaces subjective heuristics with data-driven predictive models, accurately estimating blockage probabilities (0.0 – 1.0) based on environmental intensity and historical road vulnerabilities.',
    files: [
      { name: 'preprocessing.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/ml/preprocessing.py#L22-L73' },
      { name: 'train.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/ml/train.py#L25-L95' },
      { name: 'predict.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/ml/predict.py#L49-L103' },
      { name: 'risk_service.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/ml/risk_service.py#L62-L150' },
    ],
  },
  {
    id: 'routing',
    title: 'Routing Improvements',
    category: 'Core & Algorithms',
    icon: Route,
    color: 'teal',
    earlier: 'Point-to-point shortest distance without risk inputs, hazard multipliers, hop count tracking, or shelter occupancy integration.',
    current: 'Risk-aware routing algorithm that balances physical length against ML risk probability using configurable risk-priority multipliers (risk_weight). Performs graph validation (node existence, start != dest), computes total distance, total risk, and total routing cost, and supports routing to emergency shelters with capacity tracking.',
    technique: 'NetworkX Graph pathfinding, dynamic cost evaluation, Pydantic route result models (RouteResult), and graph validation checks (NodeNotFoundError, NoRouteFoundError).',
    why: 'Enables emergency commanders and civilians to adjust risk sensitivity (e.g. prioritizing maximum safety during active floods vs minimum distance during clear weather), ensuring routes avoid flooded or high-risk roads.',
    files: [
      { name: 'router.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/routing/router.py#L49-L166' },
      { name: 'graph.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/routing/graph.py#L55-L126' },
      { name: 'routing.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/schemas/routing.py#L1-L40' },
    ],
  },
  {
    id: 'disaster',
    title: 'Disaster / Incident Management',
    category: 'Incident & Dynamic',
    icon: Activity,
    color: 'rose',
    earlier: 'Direct manual toggling of individual road statuses without incident context, civilian reporting, approval workflows, or audit history.',
    current: 'Comprehensive Disaster Incident Management system supporting dual roles (Civilian vs Admin). Civilians submit disaster reports (PENDING status) with automatic node derivation (deriveNodesFromRoads). Admin EOC controllers receive real-time notifications, review incidents in the AdminDisasterManager dashboard, filter/search reports, and approve (APPROVED), reject (REJECTED), edit, or resolve (RESOLVED) incidents with audit logs. Approving or resolving an incident automatically updates the road graph and triggers route recalculation.',
    technique: 'Role-based access headers (X-Role), Disaster Lifecycle State Machine (PENDING → APPROVED/REJECTED → RESOLVED), automatic node derivation, audit logging, and real-time dashboard polling (setInterval).',
    why: 'Establishes a verified Emergency Operations Command (EOC) workflow where crowdsourced civilian reports are reviewed before altering public evacuation routes, preventing false reports from disrupting operations.',
    files: [
      { name: 'disaster_store.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/db/disaster_store.py#L193-L377' },
      { name: 'disasters.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/api/routes/disasters.py#L57-L148' },
      { name: 'AdminDisasterManager.jsx', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/components/AdminDisasterManager.jsx#L40-L225' },
      { name: 'ReportDisasterModal.jsx', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/components/ReportDisasterModal.jsx#L32-L100' },
    ],
  },
  {
    id: 'rerouting',
    title: 'Dynamic Rerouting Capabilities',
    category: 'Incident & Dynamic',
    icon: RefreshCw,
    color: 'indigo',
    earlier: 'Static path computation requiring manual server restarts or page refreshes to reflect newly blocked roads.',
    current: 'Real-time dynamic graph edge update and automatic route recalculation. When a road is marked BLOCKED (via /roads/{id}/block or approving a disaster report), update_road_status() sets edge routing cost to math.inf, triggers graph impact re-synchronization (_rebuild_graph_impacts()), and immediately recomputes the optimal evacuation route without re-initializing graph topology.',
    technique: 'Graph edge lookup dictionary (_road_id_lookup), graph state re-synchronization (_rebuild_graph_impacts), and auto-retriggering route calculation in React state (handleFindRoute).',
    why: 'Enables instant response during fast-evolving disasters; when a road becomes impassable during an ongoing evacuation, emergency teams are instantly re-routed around the obstruction.',
    files: [
      { name: 'graph.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/routing/graph.py#L98-L126' },
      { name: 'roads.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/api/routes/roads.py#L37-L57' },
      { name: 'disaster_store.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/db/disaster_store.py#L379-L441' },
      { name: 'App.jsx', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/App.jsx#L357-L381' },
    ],
  },
  {
    id: 'offline',
    title: 'Offline Capabilities',
    category: 'Offline & Frontend',
    icon: WifiOff,
    color: 'orange',
    earlier: 'Complete application unavailability when backend connectivity or network access drops.',
    current: 'Full PWA-style offline resilience architecture. Frontend detects server unavailability, loads cached network topology/shelters/nodes from IndexedDB, executes an in-memory client-side Dijkstra router (offlineRouting.js), queues offline road-blocking operations in pending_changes, and automatically synchronizes queued changes via syncPendingChanges() upon network reconnection (window.addEventListener("online")).',
    technique: 'IndexedDB API (initDB, saveNetworkData, getCachedData), client-side Dijkstra algorithm (calculateOfflineRoute), background sync queue engine (syncService.js), and network status listeners (window.ononline).',
    why: 'Guarantees uninterrupted evacuation routing in disaster zones where cellular towers or power infrastructure are damaged.',
    files: [
      { name: 'offlineStorage.js', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/services/offlineStorage.js#L21-L167' },
      { name: 'offlineRouting.js', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/services/offlineRouting.js#L17-L153' },
      { name: 'syncService.js', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/services/syncService.js#L45-L154' },
    ],
  },
  {
    id: 'api',
    title: 'API / Backend Improvements',
    category: 'Architecture & Backend',
    icon: Server,
    color: 'sky',
    earlier: 'Monolithic single-file backend endpoints with untyped dictionaries and no centralized error handling or interactive API documentation.',
    current: 'Modular FastAPI backend with RESTful resource endpoints organized under /api/v1/ (roads.py, disasters.py, routing.py, shelters.py, health.py), strict Pydantic validation schemas (DisasterCreate, RouteRequest, RoadResponse), dependency injection for singleton graph state (deps.py), automatic OpenAPI/Swagger documentation (/docs), CORS middleware, and custom HTTP exception handlers.',
    technique: 'FastAPI framework, Pydantic data schemas, dependency injection (Depends), APIRouter, automatic Swagger/ReDoc generation, HTTP 409 conflict & 404 error handling.',
    why: 'Delivers robust input validation, clear error contracts, high API performance, easy frontend integration, and interactive swagger documentation.',
    files: [
      { name: 'disasters.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/api/routes/disasters.py#L21-L166' },
      { name: 'roads.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/api/routes/roads.py#L1-L60' },
      { name: 'routing.py', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/api/routes/routing.py#L1-L40' },
      { name: 'schemas/', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/backend/app/schemas/' },
    ],
  },
  {
    id: 'frontend',
    title: 'Frontend Capabilities',
    category: 'Offline & Frontend',
    icon: Layout,
    color: 'violet',
    earlier: 'Basic static map view or plain text route output without interactive controls, map customization, or visual telemetry.',
    current: 'Modern, feature-rich React dashboard built with Vite and Tailwind CSS. Features an interactive Leaflet GIS map (EvacuationMap.jsx) with customizable map themes (dark CARTO vs light OSM), draggable node location edit controls, animated polyline overlays (cyan route glow, red disaster hazard auras, dashed blocked road casing), midpoint road status badges, real-time telemetry metrics (LeftNetworkMetrics.jsx), right-side route breakdown timeline (RightPanel.jsx), emergency shelter occupancy modal, toast notifications, and role switcher (Admin EOC vs Civilian Scout).',
    technique: 'React 18 (Hooks, useMemo, useCallback, useRef), Leaflet & React-Leaflet, Lucide icons & Google Material Symbols, Tailwind CSS with glassmorphism styling, responsive flex/grid layouts.',
    why: 'Provides an intuitive, visual, and highly responsive user interface for both civilians seeking safe evacuation routes and emergency commanders managing disaster response.',
    files: [
      { name: 'App.jsx', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/App.jsx#L578-L790' },
      { name: 'EvacuationMap.jsx', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/components/EvacuationMap.jsx#L188-L621' },
      { name: 'AdminDisasterManager.jsx', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/components/AdminDisasterManager.jsx#L65-L225' },
      { name: 'LeftNetworkMetrics.jsx', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/components/LeftNetworkMetrics.jsx#L30-L93' },
      { name: 'RightPanel.jsx', path: 'file:///c:/Users/admin/Desktop/Disaster%20Management/disaster-evacuation-route-optimizer-main/frontend/src/components/RightPanel.jsx#L1-L200' },
    ],
  },
];

const CATEGORIES = ['ALL', 'Core & Algorithms', 'Architecture & Backend', 'Incident & Dynamic', 'Offline & Frontend'];

export default function ImplementationEvolutionView() {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards');

  const filteredItems = useMemo(() => {
    return REPORT_ITEMS.filter((item) => {
      const matchesCat = activeCategory === 'ALL' || item.category === activeCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.current.toLowerCase().includes(query) ||
        item.technique.toLowerCase().includes(query) ||
        item.why.toLowerCase().includes(query);

      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="flex-1 flex flex-col space-y-md overflow-y-auto pr-xs">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-surface-container via-surface-container-high to-surface-container border border-outline-variant p-lg rounded-2xl shadow-lg relative overflow-hidden shrink-0">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 top-2 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                SYSTEM EVOLUTION REPORT
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                SIH 2026 PROTOTYPE
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">
              Implementation Evolution & Project Improvements
            </h1>
            <p className="text-sm text-on-surface-variant mt-1 max-w-3xl">
              Comparative technical report evaluating early prototype baseline vs current codebase architecture across 11 key engineering categories.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-primary text-on-primary border-primary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container-high'
              }`}
              title="Grid View"
            >
              <Layout className="w-4 h-4" />
              <span className="hidden sm:inline">Cards View</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-primary text-on-primary border-primary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container-high'
              }`}
              title="Table View"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Table View</span>
            </button>
          </div>
        </div>

        {/* Analytics Summary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm mt-md pt-md border-t border-outline-variant/60">
          <div className="bg-surface-container-lowest/80 border border-outline-variant/60 p-sm rounded-xl">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
              Categories Analyzed
            </span>
            <span className="text-xl font-extrabold text-cyan-400 mt-0.5 block">11 Modules</span>
          </div>

          <div className="bg-surface-container-lowest/80 border border-outline-variant/60 p-sm rounded-xl">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
              Architecture Upgrade
            </span>
            <span className="text-xl font-extrabold text-emerald-400 mt-0.5 block">Multi-Tier REST</span>
          </div>

          <div className="bg-surface-container-lowest/80 border border-outline-variant/60 p-sm rounded-xl">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
              ML Risk Engine
            </span>
            <span className="text-xl font-extrabold text-amber-400 mt-0.5 block">10-Feature Pipeline</span>
          </div>

          <div className="bg-surface-container-lowest/80 border border-outline-variant/60 p-sm rounded-xl">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
              Reliability Status
            </span>
            <span className="text-xl font-extrabold text-purple-400 mt-0.5 block">Offline + PWA Sync</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-md bg-surface-container p-sm rounded-2xl border border-outline-variant shrink-0">
        {/* Category Tabs */}
        <div className="flex items-center gap-xs overflow-x-auto w-full sm:w-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-md py-xs rounded-xl font-bold text-label-sm whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-secondary-container text-on-secondary-container shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {cat === 'ALL' ? `All Enhancements (${REPORT_ITEMS.length})` : cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search report items..."
            className="w-full pl-9 pr-md py-xs rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:border-primary outline-none text-body-sm"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-md pb-lg">
          {filteredItems.map((item) => {
            const IconComp = item.icon;
            return (
              <div
                key={item.id}
                className="bg-surface-container border border-outline-variant rounded-2xl p-md flex flex-col justify-between shadow-md hover:border-cyan-500/40 transition-all space-y-md"
              >
                {/* Card Title Header */}
                <div>
                  <div className="flex justify-between items-start gap-sm mb-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-headline-xs text-headline-xs font-bold text-on-surface">
                          {item.title}
                        </h3>
                        <span className="text-[11px] font-semibold text-on-surface-variant">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Earlier vs Current Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-sm mt-md">
                    {/* Earlier Baseline */}
                    <div className="p-sm rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Earlier Baseline
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {item.earlier}
                      </p>
                    </div>

                    {/* Current Implementation */}
                    <div className="p-sm rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Current Implementation
                      </div>
                      <p className="text-xs text-on-surface leading-relaxed">
                        {item.current}
                      </p>
                    </div>
                  </div>

                  {/* Technology Added Pill Box */}
                  <div className="mt-md p-sm rounded-xl bg-surface-container-low border border-outline-variant/60">
                    <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider block mb-1">
                      Technique / Technology Added:
                    </span>
                    <p className="text-xs text-on-surface font-medium leading-normal">
                      {item.technique}
                    </p>
                  </div>

                  {/* Why Improvement */}
                  <div className="mt-xs p-sm rounded-xl bg-surface-container-high/60 border border-outline-variant/40">
                    <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider block mb-1">
                      Why It Is An Improvement:
                    </span>
                    <p className="text-xs text-on-surface-variant leading-normal">
                      {item.why}
                    </p>
                  </div>
                </div>

                {/* File Links Footer */}
                <div className="pt-sm border-t border-outline-variant flex flex-wrap items-center gap-xs">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mr-1 flex items-center gap-1">
                    <FileCode className="w-3 h-3 text-cyan-400" /> Responsible Modules:
                  </span>
                  {item.files.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded-lg bg-surface-container-highest hover:bg-cyan-500/20 hover:text-cyan-300 text-on-surface text-[11px] font-mono font-semibold transition-colors border border-outline-variant/60 flex items-center gap-1"
                    >
                      {file.name}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-surface-container border border-outline-variant rounded-2xl overflow-hidden shadow-md mb-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-high border-b border-outline-variant text-on-surface-variant uppercase text-[10px] font-bold tracking-wider">
                  <th className="p-md">Category</th>
                  <th className="p-md">Earlier Baseline</th>
                  <th className="p-md">Current Implementation</th>
                  <th className="p-md">Technology Added</th>
                  <th className="p-md">Responsible Modules</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="p-md font-bold text-on-surface whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-cyan-500/10 text-cyan-400">
                          <item.icon className="w-4 h-4" />
                        </span>
                        <span>{item.title}</span>
                      </div>
                    </td>
                    <td className="p-md text-rose-300 max-w-xs">{item.earlier}</td>
                    <td className="p-md text-emerald-300 max-w-xs">{item.current}</td>
                    <td className="p-md font-medium text-on-surface max-w-xs">{item.technique}</td>
                    <td className="p-md">
                      <div className="flex flex-wrap gap-1">
                        {item.files.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.path}
                            className="px-1.5 py-0.5 rounded bg-surface-container-highest text-cyan-400 font-mono text-[10px] hover:underline"
                          >
                            {file.name}
                          </a>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
