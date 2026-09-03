/**
 * Offline Evacuation Routing Engine for Disaster Evacuation Route Optimizer.
 * Builds an in-memory graph from IndexedDB cached road data and executes Dijkstra pathfinding algorithm
 * to find the safest evacuation route when the FastAPI backend or network is unavailable.
 */

import { getCachedData } from './offlineStorage.js';

/**
 * Calculate the safest evacuation route offline using IndexedDB cached road data.
 * 
 * @param {string} startNode - Origin node ID
 * @param {string} destNode - Destination shelter node ID
 * @param {number} riskWeight - Penalty weight for blockage probability (default 10.0)
 * @returns {Promise<Object>} Compatible RouteResponse object
 */
export async function calculateOfflineRoute(startNode, destNode, riskWeight = 10.0, customRoads = null) {
  // 1. Retrieve cached network snapshot from IndexedDB (or customRoads override)
  let roads = customRoads;
  if (!roads) {
    const cachedData = await getCachedData();
    roads = cachedData.roads || [];
  }

  if (!roads || roads.length === 0) {
    throw new Error('Offline routing unavailable: No synchronized road network stored on this device.');
  }

  const cleanStart = String(startNode).trim();
  const cleanDest = String(destNode).trim();

  if (cleanStart === cleanDest) {
    throw new Error(`Start location ('${cleanStart}') cannot equal Destination shelter.`);
  }

  // Extract all unique graph nodes and build adjacency list
  const adjacency = {};
  const allNodes = new Set();

  roads.forEach(road => {
    const u = String(road.u).trim();
    const v = String(road.v).trim();
    allNodes.add(u);
    allNodes.add(v);

    if (!adjacency[u]) adjacency[u] = [];
    if (!adjacency[v]) adjacency[v] = [];

    // Exclude confirmed BLOCKED roads
    if (road.status?.toUpperCase() === 'BLOCKED') {
      return;
    }

    // Formula: cost = distance + (blockage_probability * risk_weight)
    const distance = parseFloat(road.distance) || 0.0;
    const blockageProb = parseFloat(road.blockage_probability) || 0.0;
    const cost = distance + (blockageProb * parseFloat(riskWeight));

    // Undirected graph representation
    adjacency[u].push({ neighbor: v, road_id: road.road_id, distance, blockageProb, cost });
    adjacency[v].push({ neighbor: u, road_id: road.road_id, distance, blockageProb, cost });
  });

  // Validate start and destination nodes exist in graph
  if (!allNodes.has(cleanStart)) {
    throw new Error(`Start node '${cleanStart}' does not exist in the cached road graph.`);
  }
  if (!allNodes.has(cleanDest)) {
    throw new Error(`Destination node '${cleanDest}' does not exist in the cached road graph.`);
  }

  // 2. Dijkstra Shortest Path Search
  const distances = {};
  const previous = {};
  const unvisited = new Set(allNodes);

  allNodes.forEach(node => {
    distances[node] = Infinity;
    previous[node] = null;
  });
  distances[cleanStart] = 0;

  while (unvisited.size > 0) {
    // Select unvisited node with smallest tentative distance
    let current = null;
    let minDistance = Infinity;

    unvisited.forEach(node => {
      if (distances[node] < minDistance) {
        minDistance = distances[node];
        current = node;
      }
    });

    // If destination reached or remaining nodes unreachable
    if (current === null || minDistance === Infinity || current === cleanDest) {
      break;
    }

    unvisited.delete(current);

    // Examine edges
    const neighbors = adjacency[current] || [];
    for (const edge of neighbors) {
      if (!unvisited.has(edge.neighbor)) continue;

      const alt = distances[current] + edge.cost;
      if (alt < distances[edge.neighbor]) {
        distances[edge.neighbor] = alt;
        previous[edge.neighbor] = {
          node: current,
          road_id: edge.road_id,
          distance: edge.distance,
          blockageProb: edge.blockageProb,
          cost: edge.cost,
        };
      }
    }
  }

  // 3. Check if path was found
  if (distances[cleanDest] === Infinity || !previous[cleanDest]) {
    throw new Error(`No safe route is currently available between '${cleanStart}' and '${cleanDest}' using cached network data.`);
  }

  // 4. Path Reconstruction
  const nodesPath = [cleanDest];
  const roadIdsPath = [];
  let totalDistance = 0.0;
  let totalRisk = 0.0;
  let curr = cleanDest;

  while (previous[curr]) {
    const prevStep = previous[curr];
    nodesPath.unshift(prevStep.node);
    roadIdsPath.unshift(prevStep.road_id);
    totalDistance += prevStep.distance;
    totalRisk += prevStep.blockageProb;
    curr = prevStep.node;
  }

  return {
    start_node: cleanStart,
    destination_node: cleanDest,
    nodes: nodesPath,
    road_ids: roadIdsPath,
    total_distance: Math.round(totalDistance * 100) / 100,
    total_risk_score: Math.round(totalRisk * 100) / 100,
    total_cost: Math.round(distances[cleanDest] * 100) / 100,
    routing_mode: 'offline',
    is_offline: true,
  };
}
