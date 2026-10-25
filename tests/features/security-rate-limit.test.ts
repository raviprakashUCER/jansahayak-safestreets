import { describe, it, expect } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/security/rate-limit";
import {
  CreateVerificationSchema,
  RouteAdvisoryQuerySchema,
  OfflineDraftSchema,
} from "@/lib/validations/incident-schemas";

describe("Security, Rate Limiting & Schema Validations", () => {
  it("should permit requests within rate limit threshold", () => {
    const key = "test_ip_normal";
    resetRateLimit(key);

    const first = checkRateLimit({ key, maxRequests: 3, windowSeconds: 60 });
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);

    const second = checkRateLimit({ key, maxRequests: 3, windowSeconds: 60 });
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);
  });

  it("should block requests when rate limit threshold is exceeded", () => {
    const key = "test_ip_abusive";
    resetRateLimit(key);

    checkRateLimit({ key, maxRequests: 2, windowSeconds: 60 });
    checkRateLimit({ key, maxRequests: 2, windowSeconds: 60 });

    const third = checkRateLimit({ key, maxRequests: 2, windowSeconds: 60 });
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("should validate verification payload correctly", () => {
    const valid = CreateVerificationSchema.safeParse({
      verificationType: "still_present",
      notes: "Defect is expanding due to heavy trucks",
    });
    expect(valid.success).toBe(true);

    const invalidType = CreateVerificationSchema.safeParse({
      verificationType: "random_invalid_vote",
    });
    expect(invalidType.success).toBe(false);
  });

  it("should enforce Greater Noida coordinate bounding box in Route Advisory", () => {
    // Valid coordinates inside Greater Noida
    const validCoords = RouteAdvisoryQuerySchema.safeParse({
      originLat: 28.47,
      originLng: 77.5,
      destLat: 28.48,
      destLng: 77.51,
      corridorMeters: 150,
    });
    expect(validCoords.success).toBe(true);

    // Invalid coordinates outside region (e.g., London coordinates)
    const outsideBounds = RouteAdvisoryQuerySchema.safeParse({
      originLat: 51.5,
      originLng: -0.12,
      destLat: 28.48,
      destLng: 77.51,
    });
    expect(outsideBounds.success).toBe(false);
  });

  it("should validate offline draft payload integrity", () => {
    const validDraft = OfflineDraftSchema.safeParse({
      id: "draft_12345",
      title: "Broken pavement on Beta 1",
      category: "footpath",
      description: "Severe trip hazard for elderly walkers",
      latitude: 28.475,
      longitude: 77.505,
      savedAt: new Date().toISOString(),
      photos: [],
    });
    expect(validDraft.success).toBe(true);

    const missingFields = OfflineDraftSchema.safeParse({
      id: "draft_broken",
    });
    expect(missingFields.success).toBe(false);
  });
});
