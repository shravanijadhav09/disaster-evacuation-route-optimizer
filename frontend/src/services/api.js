/**
 * Centralized API Client for Disaster Evacuation Route Optimizer.
 * Connects React frontend to FastAPI backend endpoints.
 */

function getSanitizedApiBaseUrl() {
  let raw = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
    ? import.meta.env.VITE_API_BASE_URL
    : '';

  if (!raw) {
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      return 'https://disaster-evacuation-route-optimizer.onrender.com/api';
    }
    return 'http://localhost:8000/api';
  }

  let clean = raw.trim().replace(/\/+$/, '');

  if (clean.endsWith('/api/v1')) {
    clean = clean.substring(0, clean.length - 3); // convert /api/v1 -> /api
  }

  if (!clean.endsWith('/api')) {
    clean = `${clean}/api`;
  }

  return clean;
}

async function request(endpoint, options = {}) {
  const baseUrl = getSanitizedApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let errorMessage;
      if (typeof data?.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data?.detail)) {
        errorMessage = data.detail.map(err => `${err.loc ? err.loc.join('.') : 'field'}: ${err.msg || JSON.stringify(err)}`).join(', ');
      } else if (typeof data?.detail === 'object' && data.detail !== null) {
        errorMessage = JSON.stringify(data.detail);
      } else {
        errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (!error.status) {
      error.message = error.message || 'Unable to connect to backend server. Please verify backend is running.';
    }
    throw error;
  }
}

/**
 * Health Check API
 */
export async function getHealth() {
  return request('/health');
}
export const fetchHealthStatus = getHealth;


/**
 * Fetch all roads in active network
 */
export async function getRoads() {
  return request('/roads');
}

/**
 * Fetch a single road by ID
 */
export async function getRoad(road_id) {
  return request(`/roads/${encodeURIComponent(road_id)}`);
}

/**
 * Mark a road as confirmed BLOCKED
 */
export async function blockRoad(road_id) {
  return request(`/roads/${encodeURIComponent(road_id)}/block`, {
    method: 'POST',
  });
}

/**
 * Fetch all evacuation shelters
 */
export async function getShelters() {
  return request('/shelters');
}

/**
 * Calculate optimal risk-aware route between start_node and destination_node
 */
export async function findRoute(start_node, destination_node, risk_weight = 10.0) {
  return request('/route', {
    method: 'POST',
    body: JSON.stringify({
      start_node,
      destination_node,
      risk_weight: parseFloat(risk_weight),
    }),
  });
}

/**
 * Fetch all disasters with optional status filter
 */
export async function getDisasters(statusFilter = null) {
  const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
  return request(`/disasters${query}`);
}

/**
 * Create a new disaster report (Civilians or Admins)
 */
export async function createDisaster(payload, userRole = 'user') {
  return request('/disasters', {
    method: 'POST',
    headers: {
      'X-Role': userRole,
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Admin update status of a disaster (APPROVE, REJECT, RESOLVE)
 */
export async function updateDisasterStatus(disasterId, statusPayload, userRole = 'admin') {
  const payload = typeof statusPayload === 'string'
    ? { status: statusPayload, admin_notes: `Status updated to ${statusPayload}` }
    : (statusPayload && typeof statusPayload === 'object' ? statusPayload : { status: String(statusPayload) });

  return request(`/disasters/${encodeURIComponent(disasterId)}/status`, {
    method: 'PATCH',
    headers: {
      'X-Role': userRole,
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Admin edit disaster fields
 */
export async function updateDisaster(disasterId, updatePayload, userRole = 'admin') {
  return request(`/disasters/${encodeURIComponent(disasterId)}`, {
    method: 'PUT',
    headers: {
      'X-Role': userRole,
    },
    body: JSON.stringify(updatePayload),
  });
}

/**
 * Admin delete disaster report
 */
export async function deleteDisaster(disasterId, userRole = 'admin') {
  return request(`/disasters/${encodeURIComponent(disasterId)}`, {
    method: 'DELETE',
    headers: {
      'X-Role': userRole,
    },
  });
}

