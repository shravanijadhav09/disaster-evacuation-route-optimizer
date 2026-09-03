# Disaster Evacuation Route Optimizer

**SIH 2026 PROTOTYPE**

An intelligent evacuation routing system that combines **machine learning risk prediction** with **graph-based pathfinding** to suggest safer routes during disasters such as floods, cyclones, and heavy rainfall.

---

## Problem Statement

During disasters, roads may become unsafe or physically blocked. Traditional shortest-route navigation does not account for disaster-related road risk. Emergency responders and civilians need a route that balances **distance** with **safety**, avoiding roads that are likely to be impassable.

## Solution

This system uses a **Logistic Regression-based ML model** to predict the probability of road blockage based on environmental and infrastructural features. That prediction is converted into a **risk-weighted routing cost**, and **NetworkX Dijkstra** computes the safest evacuation path. When a road becomes blocked, the road graph is updated and the route is recalculated instantly. The frontend visualizes the evacuation network on an interactive Leaflet map, and an offline-capable architecture ensures routing continues even when connectivity is lost.

## Key Features

- Interactive evacuation map with draggable origin and destination markers
- ML-based road blockage risk prediction
- Risk-aware Dijkstra shortest-path routing
- Dynamic road closure simulation with automatic rerouting
- Emergency shelter information with capacity and occupancy
- Adjustable risk-priority control slider
- Offline routing fallback using IndexedDB and client-side Dijkstra
- Background synchronization of offline changes when connectivity returns

## How It Works

```
Disaster / Road Data
        ↓
Logistic Regression Risk Prediction
        ↓
Road Blockage Probability
        ↓
Risk-Aware Routing Cost  (cost = distance + blockage_probability × risk_weight)
        ↓
Dijkstra Algorithm
        ↓
Safest Evacuation Route
        ↓
Leaflet Map Visualization
```

The routing engine computes a cost for each road segment:

```
routing_cost = distance + (blockage_probability × risk_weight)
```

- `distance`: physical length of the road
- `blockage_probability`: ML-predicted probability of blockage (0.0 – 1.0)
- `risk_weight`: user-configurable penalty multiplier (default 10.0)

Confirmed blocked roads receive an infinite cost and are excluded from routing.

## System Architecture

```mermaid
flowchart TD
    A[Frontend<br/>React + Vite + Leaflet] -->|REST API| B[FastAPI Backend]
    B --> C[ML Risk Engine<br/>Logistic Regression]
    B --> D[NetworkX Routing Engine<br/>Dijkstra]
    C --> D
    D --> E[Road / Shelter Data]
```

## Tech Stack

| Layer | Technologies |
|:---|:---|
| Frontend | React, Vite, Leaflet, Tailwind CSS |
| Backend | FastAPI, Python, Uvicorn |
| ML | scikit-learn, Logistic Regression, pandas, numpy |
| Routing | NetworkX, Dijkstra |
| Offline | IndexedDB, Client-side Dijkstra |
| Validation | Pydantic |

## Main Workflow

1. User selects a starting point on the map.
2. User selects an evacuation shelter as the destination.
3. System loads road network data with ML-generated blockage probabilities.
4. Dijkstra calculates the safest route using distance and risk-weighted cost.
5. Route is rendered as a polyline on the Leaflet map.
6. If a road is confirmed blocked, the graph updates and the route recalculates automatically.

## Dynamic Rerouting

```
Initial Route:
  A → B → C → Shelter

Road B → C becomes blocked:
  A → D → E → Shelter
```

When a road segment is marked as blocked, the system sets its routing cost to infinity, removes it from the traversable graph, and recomputes the shortest path using Dijkstra.

## Emergency Shelters

The system maintains shelter data including:
- Shelter location (graph node)
- Capacity
- Current occupancy
- Operational status

## Machine Learning

- **Model**: Logistic Regression
- **Target**: Binary classification — whether a road segment is blocked (`blocked`)
- **Features**: Rainfall, flood level, elevation, road type, historical blockages, traffic density, disaster intensity, distance to waterbody, road condition
- **Dataset**: `disaster_road_risk_dataset.csv`
- **Usage**: The trained model predicts `blockage_probability` for each road segment. This probability feeds directly into the routing cost formula, biasing the pathfinder toward safer roads.

## API Overview

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/v1/health` | Backend health check |
| `GET` | `/api/v1/roads` | Fetch all road segments with risk scores |
| `POST` | `/api/v1/roads/{road_id}/block` | Mark a road as blocked and exclude it from routing |
| `GET` | `/api/v1/shelters` | Fetch evacuation shelters |
| `POST` | `/api/v1/route` | Calculate safest evacuation route |

Interactive API documentation is available at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc`.

## Offline Capability

The frontend caches road networks, shelters, and node coordinates in **IndexedDB**. When the backend is unreachable, a client-side Dijkstra engine computes routes using the cached data. Pending road-blocking operations are queued and synchronized automatically once connectivity is restored.

## Project Structure

```
disaster-evacuation-optimizer/
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI route handlers
│   │   ├── core/              # Application config & settings
│   │   ├── db/                # Data helpers & seed data
│   │   ├── ml/                # ML pipeline (train, predict, risk service)
│   │   ├── routing/           # NetworkX graph & Dijkstra engine
│   │   └── schemas/           # Pydantic validation models
│   ├── tests/                 # Backend unit & integration tests
│   ├── main.py                # FastAPI entrypoint
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/        # Map, route panel, road status, shelters
│   │   ├── config/            # Node coordinate definitions
│   │   ├── services/          # API client, offline storage, sync, routing
│   │   ├── App.jsx            # Application shell
│   │   └── index.css          # Global styles
│   ├── tests/                 # Frontend JavaScript test suites
│   ├── package.json           # Node dependencies & scripts
│   └── vite.config.js         # Vite dev server config
└── disaster_road_risk_dataset.csv
```

## Cloud Database & Production Deployment

### Database Support: Supabase PostgreSQL / Local PostgreSQL / SQLite

The application supports both local development and cloud production deployments with PostgreSQL (hosted on Supabase) or local SQLite fallback.

#### Environment Variables Configuration

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

Define your production credentials in `.env` (never commit `.env` to git):

```env
# Supabase PostgreSQL Database Connection
DATABASE_URL=postgresql://postgres.YOUR_INSTANCE:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Allowed Frontend Origins (Comma-separated for production)
CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:5173

# Server Binding
HOST=0.0.0.0
PORT=8000

# Frontend API Endpoint
VITE_API_BASE_URL=https://your-backend.onrender.com
```

#### Migrating Existing SQLite Records to PostgreSQL

To safely migrate existing local SQLite records (`evacuation_data.db`) to your PostgreSQL / Supabase instance:

```bash
python backend/app/db/migrate_sqlite_to_pg.py
```

This migration script:
1. Validates PostgreSQL schema creation.
2. Reads existing `incidents` and `audit_logs` records.
3. Migrates records idempotently without duplicating data.
4. Displays a detailed record count verification report.

---

## Getting Started

### Backend (Development)

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # Linux/macOS
pip install -r requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Backend (Production Cloud Start Command)

```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the browser at `http://localhost:5173`.

---

## Testing & Verification

### Backend Automated Test Suite

```bash
python -m pytest backend
```

### Frontend Build & Bundle Verification

```bash
cd frontend
npm run build
```

---

## SIH 2026 Prototype

This project is a **Smart India Hackathon 2026** prototype focused on intelligent disaster evacuation routing. It demonstrates the integration of ML-driven risk assessment with real-time graph-based rerouting for emergency operations.

---

## Future Scope

- Live disaster, weather, and traffic data integration
- GIS-based real road network import
- Mobile application for field responders
- Integration with emergency response authorities and command centers
- Advanced ML models with temporal and sensor-based features

---

## Contributors

Built as an SIH 2026 prototype. Contributions welcome.

