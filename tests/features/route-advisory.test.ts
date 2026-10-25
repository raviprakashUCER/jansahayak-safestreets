import { describe, it, expect } from "vitest";
import {
  calculateCrossTrackDistanceMeters,
  generateRouteAdvisory,
  ROUTE_SAFETY_DISCLAIMER,
} from "@/lib/routing/route-advisory";

describe("Nearby Hazards & Route Corridor Advisory", () => {
  const origin = { latitude: 28.4682, longitude: 77.5039, name: "Pari Chowk" };
  const destination = { latitude: 28.482, longitude: 77.512, name: "Beta II Market" };

  it("should calculate zero cross-track distance for points directly on segment", () => {
    // Midpoint between origin and destination
    const midpoint = {
      latitude: (origin.latitude + destination.latitude) / 2,
      longitude: (origin.longitude + destination.longitude) / 2,
    };

    const crossTrack = calculateCrossTrackDistanceMeters(midpoint, origin, destination);
    expect(crossTrack).toBeLessThan(10); // Within numerical rounding tolerance
  });

  it("should identify hazards within 150m transit corridor", () => {
    // Place a hazard 40 meters off the midpoint
    const nearHazard = {
      id: "inc_corridor_test",
      title: "Deep Pothole at Pari Chowk Interchange",
      category: "road-surface",
      severity: "high" as const,
      latitude: (origin.latitude + destination.latitude) / 2 + 0.0003,
      longitude: (origin.longitude + destination.longitude) / 2,
      status: "open",
      createdAt: new Date().toISOString(),
      reportCount: 3,
    };

    const farHazard = {
      id: "inc_far_away",
      title: "Broken kerbstone 4 kilometers away",
      category: "footpath",
      severity: "low" as const,
      latitude: 28.53,
      longitude: 77.44,
      status: "open",
      createdAt: new Date().toISOString(),
      reportCount: 1,
    };

    const advisory = generateRouteAdvisory({
      origin,
      destination,
      availableIncidents: [nearHazard, farHazard],
      corridorThresholdMeters: 150,
    });

    expect(advisory).toBeDefined();
    expect(advisory.hazardsOnRouteCount).toBe(1);
    expect(advisory.hazards[0]!.id).toBe("inc_corridor_test");
    expect(advisory.advisoryLevel).toBe("caution");
    expect(advisory.disclaimer).toBe(ROUTE_SAFETY_DISCLAIMER);
    expect(advisory.alternateWaypoints).toBeDefined();
  });

  it("should mark advisory clear when no corridor hazards exist", () => {
    const advisory = generateRouteAdvisory({
      origin,
      destination,
      availableIncidents: [],
      corridorThresholdMeters: 150,
    });

    expect(advisory.hazardsOnRouteCount).toBe(0);
    expect(advisory.advisoryLevel).toBe("clear");
    expect(advisory.waypoints.length).toBeGreaterThanOrEqual(2);
  });
});
