/**
 * Calculates geodesic distance between two coordinates in meters using the Haversine formula.
 */
export function calculateGeodesicDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface HazardAlongRoute {
  id: string;
  title: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  latitude: number;
  longitude: number;
  distanceFromStartMeters: number;
  crossTrackDistanceMeters: number;
  status: string;
  isCommunityVerified: boolean;
  ageDays: number;
}

export interface RouteAdvisoryResult {
  origin: RoutePoint;
  destination: RoutePoint;
  totalDistanceKm: number;
  estimatedTravelTimeMinutes: number;
  hazardsOnRouteCount: number;
  hazards: HazardAlongRoute[];
  advisoryLevel: "clear" | "caution" | "elevated_risk";
  advisorySummary: string;
  waypoints: Array<[number, number]>; // [lng, lat] for MapLibre LineString
  alternateWaypoints?: Array<[number, number]>;
  disclaimer: string;
}

export const ROUTE_SAFETY_DISCLAIMER =
  "Route assistance is an experimental advisory based solely on citizen-reported hazards. It does not guarantee road safety, structural passability, or absence of unrecorded defects. Exercise standard driving caution.";

/**
 * Calculates perpendicular cross-track distance from a hazard to a route segment (A -> B).
 */
export function calculateCrossTrackDistanceMeters(
  point: { latitude: number; longitude: number },
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
): number {
  const dStartPoint = calculateGeodesicDistanceMeters(start.latitude, start.longitude, point.latitude, point.longitude);
  const dStartEnd = calculateGeodesicDistanceMeters(start.latitude, start.longitude, end.latitude, end.longitude);

  if (dStartEnd < 1) return dStartPoint;

  // Approximate vector projection in meters
  // Convert lat/lng to meter offsets relative to start
  const latScale = 111320; // ~111.32km per degree
  const lngScale = 111320 * Math.cos((start.latitude * Math.PI) / 180);

  const dx = (end.longitude - start.longitude) * lngScale;
  const dy = (end.latitude - start.latitude) * latScale;

  const px = (point.longitude - start.longitude) * lngScale;
  const py = (point.latitude - start.latitude) * latScale;

  const segmentLenSq = dx * dx + dy * dy;
  if (segmentLenSq === 0) return dStartPoint;

  // Parameter t clamped between 0 and 1 along segment
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / segmentLenSq));

  const projX = start.longitude * lngScale + t * dx;
  const projY = start.latitude * latScale + t * dy;

  const currentX = point.longitude * lngScale;
  const currentY = point.latitude * latScale;

  const distX = currentX - projX;
  const distY = currentY - projY;

  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Computes hazard-aware route advisory across canonical database incidents.
 */
export function generateRouteAdvisory(params: {
  origin: RoutePoint;
  destination: RoutePoint;
  availableIncidents: Array<{
    id: string;
    title: string;
    category: string;
    severity: string;
    status: string;
    latitude: number;
    longitude: number;
    createdAt?: Date | string;
    reportCount?: number;
  }>;
  corridorThresholdMeters?: number; // Default 150m corridor width
}): RouteAdvisoryResult {
  const threshold = params.corridorThresholdMeters || 150;
  const totalDistMeters = calculateGeodesicDistanceMeters(
    params.origin.latitude,
    params.origin.longitude,
    params.destination.latitude,
    params.destination.longitude
  );

  const totalDistanceKm = Number((totalDistMeters / 1000).toFixed(2));
  // Baseline assumption ~ 30 km/h average speed in urban Greater Noida
  const estimatedTravelTimeMinutes = Math.max(2, Math.round((totalDistanceKm / 30) * 60));

  const now = Date.now();
  const hazardsOnRoute: HazardAlongRoute[] = [];

  for (const inc of params.availableIncidents) {
    if (inc.status === "resolved") continue;

    const crossTrack = calculateCrossTrackDistanceMeters(
      { latitude: inc.latitude, longitude: inc.longitude },
      params.origin,
      params.destination
    );

    if (crossTrack <= threshold) {
      const distFromStart = calculateGeodesicDistanceMeters(
        params.origin.latitude,
        params.origin.longitude,
        inc.latitude,
        inc.longitude
      );

      const createdTime = inc.createdAt ? new Date(inc.createdAt).getTime() : now;
      const ageDays = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));

      hazardsOnRoute.push({
        id: inc.id,
        title: inc.title,
        category: inc.category,
        severity: (inc.severity as HazardAlongRoute["severity"]) || "medium",
        latitude: inc.latitude,
        longitude: inc.longitude,
        distanceFromStartMeters: Math.round(distFromStart),
        crossTrackDistanceMeters: Math.round(crossTrack),
        status: inc.status,
        isCommunityVerified: (inc.reportCount || 1) >= 2,
        ageDays,
      });
    }
  }

  // Sort hazards by distance along the route
  hazardsOnRoute.sort((a, b) => a.distanceFromStartMeters - b.distanceFromStartMeters);

  let advisoryLevel: RouteAdvisoryResult["advisoryLevel"] = "clear";
  let summary = `Direct corridor is relatively clear with no high-severity hazards reported.`;

  const criticals = hazardsOnRoute.filter((h) => h.severity === "critical").length;
  const highs = hazardsOnRoute.filter((h) => h.severity === "high").length;

  if (criticals > 0) {
    advisoryLevel = "elevated_risk";
    summary = `Caution: ${criticals} critical hazard(s) (e.g. open manholes or deep depressions) reported within 150m of your planned path. Consider alternate route.`;
  } else if (highs > 0 || hazardsOnRoute.length >= 3) {
    advisoryLevel = "caution";
    summary = `Notice: ${hazardsOnRoute.length} roadway hazard(s) flagged along this corridor. Reduced driving speed recommended.`;
  }

  // Generate MapLibre LineString coordinates [lng, lat]
  const baseWaypoints: Array<[number, number]> = [
    [params.origin.longitude, params.origin.latitude],
    [
      (params.origin.longitude + params.destination.longitude) / 2,
      (params.origin.latitude + params.destination.latitude) / 2,
    ],
    [params.destination.longitude, params.destination.latitude],
  ];

  // If critical hazards exist, compute a simple lateral offset alternate route
  let alternateWaypoints: Array<[number, number]> | undefined;
  if (hazardsOnRoute.length > 0) {
    const midLng = (params.origin.longitude + params.destination.longitude) / 2;
    const midLat = (params.origin.latitude + params.destination.latitude) / 2;
    // Offset slightly northward/eastward to represent an alternate detour street
    const offsetDetour: [number, number] = [midLng + 0.003, midLat + 0.003];
    alternateWaypoints = [
      [params.origin.longitude, params.origin.latitude],
      offsetDetour,
      [params.destination.longitude, params.destination.latitude],
    ];
  }

  return {
    origin: params.origin,
    destination: params.destination,
    totalDistanceKm,
    estimatedTravelTimeMinutes,
    hazardsOnRouteCount: hazardsOnRoute.length,
    hazards: hazardsOnRoute,
    advisoryLevel,
    advisorySummary: summary,
    waypoints: baseWaypoints,
    alternateWaypoints,
    disclaimer: ROUTE_SAFETY_DISCLAIMER,
  };
}
