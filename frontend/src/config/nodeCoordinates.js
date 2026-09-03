/**
 * Prototype Node Coordinate Mapping.
 * Maps abstract graph nodes ('A', 'B', 'C', etc.) to Leaflet [latitude, longitude] coordinates.
 * Center Location: Coastal Evacuation Zone (13.0827, 80.2707)
 */

export const NODE_COORDINATES = {
  A: [13.0850, 80.2600], // Start Origin Intersection A
  B: [13.0950, 80.2720], // Junction B
  C: [13.0900, 80.2750], // North Relief Station C
  D: [13.0720, 80.2680], // South Bypass Interchange D
  E: [13.0800, 80.2750], // Highway Junction E
  Z: [13.0700, 80.2720], // Central Evacuation Shelter Z (Land-based)
  S1: [13.0900, 80.2750], // Shelter C
  S2: [13.0700, 80.2720], // Shelter Z
  S3: [13.0800, 80.2750], // Shelter E
};

export const DEFAULT_MAP_CENTER = [13.0827, 80.2750];
export const DEFAULT_MAP_ZOOM = 13;

/**
 * Get [lat, lng] coordinates for a given graph node ID.
 * Generates deterministic fallback coordinates if node is not explicitly mapped.
 */
export function getNodeCoordinates(nodeId) {
  if (!nodeId) return DEFAULT_MAP_CENTER;
  const upperNode = String(nodeId).toUpperCase().trim();
  
  if (NODE_COORDINATES[upperNode]) {
    return NODE_COORDINATES[upperNode];
  }

  // Deterministic fallback offset based on node string hash
  let hash = 0;
  for (let i = 0; i < upperNode.length; i++) {
    hash = upperNode.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = ((hash % 100) / 2000);
  const lngOffset = (((hash >> 3) % 100) / 2000);

  return [DEFAULT_MAP_CENTER[0] + latOffset, DEFAULT_MAP_CENTER[1] + lngOffset];
}

/**
 * Get array of [lat, lng] coordinate pairs for an edge between u and v.
 */
export function getRoadPolyline(u, v) {
  return [getNodeCoordinates(u), getNodeCoordinates(v)];
}
