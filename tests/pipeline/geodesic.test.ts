import { describe, it, expect } from "vitest";
import { calculateGeodesicDistanceMeters } from "@/lib/pipeline/location-verification";

describe("Stage 4: Geodesic Calculations & Haversine Accuracy (PRD §9)", () => {
  it("calculates accurate Great Circle distance between known coordinates", () => {
    // Pari Chowk, Greater Noida: (28.4744, 77.5040)
    // Alpha 1 Commercial Belt: (28.4830, 77.5140)
    // Expected distance ~ 1.36 km (1360m ± 50m)
    const dist = calculateGeodesicDistanceMeters(28.4744, 77.504, 28.483, 77.514);
    expect(dist).toBeGreaterThan(1300);
    expect(dist).toBeLessThan(1420);
  });

  it("returns 0m distance for identical coordinate pairs", () => {
    const dist = calculateGeodesicDistanceMeters(28.4744, 77.504, 28.4744, 77.504);
    expect(dist).toBe(0);
  });

  it("measures short-range displacement within 5 meters accurately", () => {
    // 0.000045 degrees latitude is roughly 5 meters
    const dist = calculateGeodesicDistanceMeters(28.4744, 77.504, 28.474445, 77.504);
    expect(dist).toBeGreaterThanOrEqual(4.5);
    expect(dist).toBeLessThanOrEqual(5.5);
  });
});
