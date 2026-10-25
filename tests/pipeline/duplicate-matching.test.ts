import { describe, it, expect } from "vitest";
import { computeCosineSimilarity } from "@/lib/pipeline/duplicate-matching";
import { calculateGeodesicDistanceMeters } from "@/lib/pipeline/location-verification";

describe("Stage 5: Candidate Discovery & Duplicate Matching Gates (PRD §10)", () => {
  describe("Cosine Similarity Vector Math", () => {
    it("returns 1.0 for identical semantic embedding vectors", () => {
      const vec = [0.12, 0.45, -0.67, 0.89, 0.03];
      const similarity = computeCosineSimilarity(vec, vec);
      expect(similarity).toBeCloseTo(1.0, 3);
    });

    it("returns 0.0 for orthogonal embedding vectors", () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      const similarity = computeCosineSimilarity(vecA, vecB);
      expect(similarity).toBe(0.0);
    });

    it("returns negative value for opposite embedding vectors", () => {
      const vecA = [1, 2, 3];
      const vecB = [-1, -2, -3];
      const similarity = computeCosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(-1.0, 3);
    });

    it("handles empty or zero-length vectors safely", () => {
      expect(computeCosineSimilarity([], [1, 2, 3])).toBe(0);
      expect(computeCosineSimilarity([1, 2, 3], [])).toBe(0);
    });
  });

  describe("Candidate Spatial Discovery Gates", () => {
    it("matches candidates within the 30-meter spatial threshold", () => {
      // Base point Pari Chowk
      const baseLat = 28.4744;
      const baseLng = 77.504;
      // Point 20 meters away
      const candidateLat = baseLat + 0.00018;
      const candidateLng = baseLng;

      const dist = calculateGeodesicDistanceMeters(baseLat, baseLng, candidateLat, candidateLng);
      expect(dist).toBeLessThanOrEqual(30.0);
    });

    it("identifies candidates beyond 30m but within the 50m continuous-defect threshold", () => {
      const baseLat = 28.4744;
      const baseLng = 77.504;
      // Point 40 meters away (valid for continuous road surface defects)
      const candidateLat = baseLat + 0.00036;
      const candidateLng = baseLng;

      const dist = calculateGeodesicDistanceMeters(baseLat, baseLng, candidateLat, candidateLng);
      expect(dist).toBeGreaterThan(30.0);
      expect(dist).toBeLessThanOrEqual(50.0);
    });

    it("rejects candidates beyond 50 meters from spatial cluster", () => {
      const baseLat = 28.4744;
      const baseLng = 77.504;
      // Point 75 meters away
      const candidateLat = baseLat + 0.00068;
      const candidateLng = baseLng;

      const dist = calculateGeodesicDistanceMeters(baseLat, baseLng, candidateLat, candidateLng);
      expect(dist).toBeGreaterThan(50.0);
    });
  });
});
