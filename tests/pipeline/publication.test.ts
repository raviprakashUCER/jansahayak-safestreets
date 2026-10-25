import { describe, it, expect } from "vitest";
import { evaluatePublicationPredicate } from "@/lib/pipeline/publication";

describe("Stage 8: Fail-Closed Publication Eligibility Predicate (PRD §13)", () => {
  it("approves publication when all strict PRD predicates are satisfied", () => {
    const result = evaluatePublicationPredicate({
      status: "approved",
      moderationStatus: "approved",
      latitude: 28.4744,
      longitude: 77.504,
      spatialUncertaintyMeters: 8.5,
    });

    expect(result.eligible).toBe(true);
    expect(result.failedPredicates).toHaveLength(0);
  });

  it("fails closed when moderation approval is missing", () => {
    const result = evaluatePublicationPredicate({
      status: "under_review",
      moderationStatus: "pending",
      latitude: 28.4744,
      longitude: 77.504,
      spatialUncertaintyMeters: 8.5,
    });

    expect(result.eligible).toBe(false);
    expect(result.failedPredicates).toContain(
      "Incident has not received official moderation approval.",
    );
  });

  it("fails closed when spatial uncertainty exceeds the 25m PRD threshold", () => {
    const result = evaluatePublicationPredicate({
      status: "approved",
      moderationStatus: "approved",
      latitude: 28.4744,
      longitude: 77.504,
      spatialUncertaintyMeters: 38.2, // > 25m
    });

    expect(result.eligible).toBe(false);
    expect(result.failedPredicates[0]).toMatch(/Spatial uncertainty.*exceeds 25m threshold/);
  });

  it("fails closed when canonical coordinates are outside WGS84 range", () => {
    const result = evaluatePublicationPredicate({
      status: "approved",
      moderationStatus: "approved",
      latitude: 112.5, // > 90
      longitude: 77.504,
      spatialUncertaintyMeters: 5.0,
    });

    expect(result.eligible).toBe(false);
    expect(result.failedPredicates).toContain(
      "Canonical spatial coordinates are invalid or out of WGS84 range.",
    );
  });

  it("fails closed when incident status is marked rejected", () => {
    const result = evaluatePublicationPredicate({
      status: "rejected",
      moderationStatus: "approved",
      latitude: 28.4744,
      longitude: 77.504,
      spatialUncertaintyMeters: 5.0,
    });

    expect(result.eligible).toBe(false);
    expect(result.failedPredicates).toContain(
      "Rejected incidents cannot be published to the public map.",
    );
  });
});
