/**
 * Unified Routing Service Abstraction for Disaster Evacuation Route Optimizer.
 * Seamlessly switches between online FastAPI /route endpoint and local IndexedDB offline Dijkstra engine.
 */

import { findRoute, getHealth } from './api.js';
import { calculateOfflineRoute } from './offlineRouting.js';

/**
 * Check whether FastAPI backend server is currently reachable.
 */
export async function checkBackendAvailability() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  try {
    const health = await getHealth();
    return health && health.status === 'ok';
  } catch (err) {
    return false;
  }
}

/**
 * Find safest evacuation route with automatic online / offline failover.
 * 
 * @param {string} startNode - Origin node ID
 * @param {string} destinationNode - Destination shelter node ID
 * @param {number} riskWeight - Penalty weight for road risk
 * @returns {Promise<Object>} Unified RouteResponse object
 */
export async function findSafestRoute(startNode, destinationNode, riskWeight = 10.0) {
  // Step 1: Check network & backend health availability
  const isBackendAvailable = await checkBackendAvailability();

  if (isBackendAvailable) {
    try {
      // Execute Online FastAPI Routing
      const onlineRoute = await findRoute(startNode, destinationNode, riskWeight);
      return {
        ...onlineRoute,
        routing_mode: 'online',
        is_offline: false,
      };
    } catch (apiError) {
      console.warn('Online routing request failed. Falling back to local IndexedDB offline routing:', apiError);
      // Fall through to offline routing
    }
  }

  // Step 2: Execute Offline IndexedDB Dijkstra Routing
  console.info('Executing offline route calculation using cached IndexedDB network graph...');
  const offlineRoute = await calculateOfflineRoute(startNode, destinationNode, riskWeight);
  return offlineRoute;
}
