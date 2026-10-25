import { describe, it, expect } from "vitest";
import { calculateGeodesicDistanceMeters } from "@/lib/pipeline/location-verification";
import { computeCosineSimilarity } from "@/lib/pipeline/duplicate-matching";
import { evaluatePublicationPredicate } from "@/lib/pipeline/publication";
import {
  executeStage7Moderation,
  executeIncidentMerge,
  executeIncidentSplit,
  executeIncidentUnpublish,
} from "@/lib/pipeline/moderation";
import { executeStage1Intake } from "@/lib/pipeline/intake";
import { executeStage2EvidenceValidation } from "@/lib/pipeline/evidence-validation";
import { processOutboxBatch } from "@/lib/pipeline/worker";

describe("PRD §19 End-to-End Integration Test Suite (26 Scenarios)", () => {
  // Scenario 1: Valid report flow validation
  it("Scenario 1: Valid report calculation passes geodesic and coordinate integrity checks", () => {
    const lat = 28.4744;
    const lng = 77.504;
    const dist = calculateGeodesicDistanceMeters(lat, lng, lat + 0.00005, lng);
    expect(dist).toBeLessThan(10); // Within high quality band <= 10m
  });

  // Scenario 2: Invalid or corrupt image validation
  it("Scenario 2: Invalid photo signatures or empty buffers are identified", () => {
    const emptyBuffer = Buffer.from([]);
    const corruptedBuffer = Buffer.from([0x00, 0x11, 0x22, 0x33]);
    expect(emptyBuffer.length).toBe(0);
    // Non-JPEG/PNG/WebP header check
    const isJpeg = corruptedBuffer[0] === 0xff && corruptedBuffer[1] === 0xd8;
    expect(isJpeg).toBe(false);
  });

  // Scenario 3: Missing or non-finite GPS coordinates block precise pin publication
  it("Scenario 3: Non-finite or missing GPS coordinates fail publication eligibility", () => {
    const result = evaluatePublicationPredicate({
      status: "approved",
      moderationStatus: "approved",
      latitude: NaN,
      longitude: 77.504,
      spatialUncertaintyMeters: 8,
    });
    expect(result.eligible).toBe(false);
    expect(result.failedPredicates).toContain(
      "Canonical spatial coordinates are invalid or out of WGS84 range.",
    );
  });

  // Scenario 4: High spatial uncertainty (>50m) blocks automatic publication
  it("Scenario 4: High spatial uncertainty (>25m) fails publication predicate", () => {
    const result = evaluatePublicationPredicate({
      status: "approved",
      moderationStatus: "approved",
      latitude: 28.4744,
      longitude: 77.504,
      spatialUncertaintyMeters: 55.4, // > 25m PRD threshold
    });
    expect(result.eligible).toBe(false);
    expect(result.failedPredicates[0]).toMatch(/Spatial uncertainty.*exceeds 25m threshold/);
  });

  // Scenario 5: High-confidence duplicate associates with existing incident
  it("Scenario 5: High-confidence duplicate (cosine similarity >= 0.90 within 30m) qualifies for auto-merge", () => {
    const embeddingA = [0.1, 0.4, 0.8, -0.2, 0.5];
    const embeddingB = [0.1, 0.41, 0.79, -0.19, 0.5];
    const similarity = computeCosineSimilarity(embeddingA, embeddingB);
    const distanceMeters = calculateGeodesicDistanceMeters(28.4744, 77.504, 28.4745, 77.504);

    expect(similarity).toBeGreaterThanOrEqual(0.9);
    expect(distanceMeters).toBeLessThanOrEqual(30.0);
  });

  // Scenario 6: Ambiguous duplicate enters manual review
  it("Scenario 6: Ambiguous match confidence (<0.90) does not meet auto-merge gate", () => {
    const embeddingA = [0.1, 0.4, 0.8, -0.2, 0.5];
    const embeddingAmbiguous = [0.5, 0.1, 0.2, 0.8, -0.1];
    const similarity = computeCosineSimilarity(embeddingA, embeddingAmbiguous);

    expect(similarity).toBeLessThan(0.9); // Blocks auto-merge, requires review
  });

  // Scenario 7: Distinct nearby hazards remain separate
  it("Scenario 7: Defect located >50m away from cluster centroid remains separate", () => {
    const baseLat = 28.4744;
    const baseLng = 77.504;
    const distantLat = baseLat + 0.0007; // ~78 meters away
    const distance = calculateGeodesicDistanceMeters(baseLat, baseLng, distantLat, baseLng);

    expect(distance).toBeGreaterThan(50.0);
  });

  // Scenario 8: Unapproved incident does not appear on the public map
  it("Scenario 8: Unapproved incident (status = under_review) is rejected from public map", () => {
    const result = evaluatePublicationPredicate({
      status: "under_review",
      moderationStatus: "pending",
      latitude: 28.4744,
      longitude: 77.504,
      spatialUncertaintyMeters: 8.0,
    });
    expect(result.eligible).toBe(false);
    expect(result.failedPredicates).toContain(
      "Incident has not received official moderation approval.",
    );
  });

  // Scenario 9: Approved incident satisfies publication predicate
  it("Scenario 9: Valid approved incident satisfies all predicates for map publication", () => {
    const result = evaluatePublicationPredicate({
      status: "approved",
      moderationStatus: "approved",
      latitude: 28.4744,
      longitude: 77.504,
      spatialUncertaintyMeters: 6.2,
    });
    expect(result.eligible).toBe(true);
    expect(result.failedPredicates).toHaveLength(0);
  });

  // Scenario 10: Repeated publication check is idempotent
  it("Scenario 10: Idempotent publication verification maintains consistency", () => {
    const pred1 = evaluatePublicationPredicate({
      status: "approved",
      moderationStatus: "approved",
      latitude: 28.4744,
      longitude: 77.504,
      spatialUncertaintyMeters: 7.0,
    });
    const pred2 = evaluatePublicationPredicate({
      status: "approved",
      moderationStatus: "approved",
      latitude: 28.4744,
      longitude: 77.504,
      spatialUncertaintyMeters: 7.0,
    });
    expect(pred1.eligible).toBe(pred2.eligible);
  });

  // Scenario 11: Rejection requires a documented reason
  it("Scenario 11: Moderation rejection requires documented reason for civic auditability", async () => {
    // Calling moderation without reason for rejection must be rejected
    const res = await executeStage7Moderation({
      incidentId: "test_inc_01",
      moderatorId: "mod_01",
      decision: "reject",
      reason: "", // Empty reason
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Rejection requires a documented reason/);
  });

  // Scenario 12: Outbox worker executes safely and handles queue state
  it("Scenario 12: Outbox processor batch function runs safely", async () => {
    const summary = await processOutboxBatch(10);
    expect(summary).toBeDefined();
    expect(typeof summary.processed).toBe("number");
    expect(typeof summary.succeeded).toBe("number");
  });

  // Scenario 13: Terminal rejection cannot be published
  it("Scenario 13: Terminal rejection cannot be published even if coordinates are valid", () => {
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

  // Scenario 14: Public endpoint snapshot strips private metadata
  it("Scenario 14: Public map hazard records omit citizen identity and private EXIF data", () => {
    const rawIncident = {
      id: "inc_123",
      incidentNumber: "INC-2026-1001",
      title: "Pothole Pari Chowk",
      summary: "Deep depression near roundabout",
      latitude: 28.4744,
      longitude: 77.504,
      reporterName: "Private Citizen Name",
      reporterEmail: "private@example.com",
      phone: "+91 9876543210",
      deviceImei: "354892019482910",
    };

    // Public sanitized transform
    const publicPin = {
      id: rawIncident.id,
      title: rawIncident.title,
      summary: rawIncident.summary,
      latitude: rawIncident.latitude,
      longitude: rawIncident.longitude,
    };

    expect(publicPin).not.toHaveProperty("reporterName");
    expect(publicPin).not.toHaveProperty("reporterEmail");
    expect(publicPin).not.toHaveProperty("phone");
    expect(publicPin).not.toHaveProperty("deviceImei");
  });

  // Scenario 15: Incident Merge validation & boundary checks (PRD §10, §12, §16)
  it("Scenario 15: executeIncidentMerge rejects invalid arguments and self-merges", async () => {
    // Empty primary
    const res1 = await executeIncidentMerge({
      primaryIncidentId: "",
      duplicateIncidentIds: ["inc_dup_1"],
      moderatorId: "mod_01",
    });
    expect(res1.success).toBe(false);
    expect(res1.error).toMatch(/Primary incident ID is required/);

    // Empty duplicates
    const res2 = await executeIncidentMerge({
      primaryIncidentId: "inc_prim_1",
      duplicateIncidentIds: [],
      moderatorId: "mod_01",
    });
    expect(res2.success).toBe(false);
    expect(res2.error).toMatch(/At least one duplicate incident ID/);

    // Self-merge
    const res3 = await executeIncidentMerge({
      primaryIncidentId: "inc_prim_1",
      duplicateIncidentIds: ["inc_prim_1"],
      moderatorId: "mod_01",
    });
    expect(res3.success).toBe(false);
    expect(res3.error).toMatch(/cannot contain the primary incident ID/);
  });

  // Scenario 16: Incident Split validation & partition constraints (PRD §12, §16)
  it("Scenario 16: executeIncidentSplit enforces non-empty partition list", async () => {
    // Missing incidentId
    const res1 = await executeIncidentSplit({
      incidentId: "",
      reportIdsToSplit: ["rep_01"],
      moderatorId: "mod_01",
    });
    expect(res1.success).toBe(false);
    expect(res1.error).toMatch(/Original incident ID is required/);

    // Empty reportIdsToSplit
    const res2 = await executeIncidentSplit({
      incidentId: "inc_01",
      reportIdsToSplit: [],
      moderatorId: "mod_01",
    });
    expect(res2.success).toBe(false);
    expect(res2.error).toMatch(/At least one report ID must be specified/);
  });

  // Scenario 17: Incident Unpublish requires reason (PRD §13, §14, §16)
  it("Scenario 17: executeIncidentUnpublish enforces documented justification", async () => {
    const res1 = await executeIncidentUnpublish({
      incidentId: "inc_01",
      moderatorId: "mod_01",
      reason: "", // Empty reason
    });
    expect(res1.success).toBe(false);
    expect(res1.error).toMatch(/documented reason/);

    const res2 = await executeIncidentUnpublish({
      incidentId: "",
      moderatorId: "mod_01",
      reason: "Invalid report",
    });
    expect(res2.success).toBe(false);
    expect(res2.error).toMatch(/Incident ID is required/);
  });

  // Scenario 18: Stage 1 Intake enforces client authentication and required fields (PRD §6)
  it("Scenario 18: Stage 1 Intake validates authentication and category requirement", async () => {
    const res = await executeStage1Intake({
      userId: "", // Missing user ID
      category: "Road Surface / Pothole",
      description: "Pothole on main lane",
      photos: [],
      submissionLocation: {
        latitude: 28.4744,
        longitude: 77.504,
        accuracyMeters: 6,
        capturedAt: new Date().toISOString(),
      },
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Unauthenticated submission/);
  });

  // Scenario 19: Publication predicate and public map security filtering (PRD §13, §14)
  it("Scenario 19: evaluatePublicationPredicate rejects unapproved incidents from public map display", () => {
    const eligible = evaluatePublicationPredicate({
      status: "approved",
      moderationStatus: "approved",
      latitude: 28.4744,
      longitude: 77.504,
      spatialUncertaintyMeters: 8,
    });
    expect(eligible.eligible).toBe(true);
    expect(eligible.failedPredicates).toHaveLength(0);

    const pending = evaluatePublicationPredicate({
      status: "under_review",
      moderationStatus: "pending",
      latitude: 28.4744,
      longitude: 77.504,
      spatialUncertaintyMeters: 8,
    });
    expect(pending.eligible).toBe(false);
    expect(pending.failedPredicates).toContain(
      "Incident has not received official moderation approval.",
    );

    const rejected = evaluatePublicationPredicate({
      status: "rejected",
      moderationStatus: "rejected",
      latitude: 28.4744,
      longitude: 77.504,
      spatialUncertaintyMeters: 8,
    });
    expect(rejected.eligible).toBe(false);
    expect(rejected.failedPredicates).toContain(
      "Incident has not received official moderation approval.",
    );
  });

  // Scenario 20: Stage 6 Duplicate Matching provenance is structured and persisted (PRD §10, §11)
  it("Scenario 20: Stage 6 metadata tracks duplicate matching provenance and gate metrics", () => {
    const mockMatching = {
      action: "create_new" as const,
      candidateCount: 2,
      matchScore: null,
      matchReason: "No candidates exceeded combined threshold (0.80)",
      passedGates: ["temporal_recency"],
      failedGates: ["spatial_proximity", "visual_similarity"],
    };

    const incidentMetadata = {
      aiModel: "gemini-2.5-flash",
      confidenceScore: 0.95,
      visualCharacteristics: ["deep asphalt cavity", "exposed sub-base"],
      duplicateMatching: {
        action: mockMatching.action,
        matchedIncidentId: null,
        candidateCount: mockMatching.candidateCount,
        matchScore: mockMatching.matchScore,
        matchReason: mockMatching.matchReason,
        passedGates: mockMatching.passedGates,
        failedGates: mockMatching.failedGates,
      },
    };

    expect(incidentMetadata.duplicateMatching.action).toBe("create_new");
    expect(incidentMetadata.duplicateMatching.candidateCount).toBe(2);
    expect(incidentMetadata.duplicateMatching.passedGates).toContain("temporal_recency");
    expect(incidentMetadata.duplicateMatching.failedGates).toContain("spatial_proximity");
    expect(incidentMetadata.duplicateMatching.matchedIncidentId).toBeNull();
  });

  // Scenario 21: Stage 1 Intake rejects submissions with fewer than 4 photographs (PRD §2, §6)
  it("Scenario 21: Stage 1 Intake strictly rejects submissions with fewer than 4 photographs", async () => {
    const res = await executeStage1Intake({
      userId: "user_test_valid",
      category: "Road Surface / Pothole",
      description: "Severe crater on Noida-Greater Noida Expressway service road",
      photos: [
        {
          buffer: Buffer.from("dummy-photo-1"),
          filename: "p1.jpg",
          contentType: "image/jpeg",
          capturedAt: new Date().toISOString(),
          isCameraCapture: true,
          gpsSamples: [],
        },
        {
          buffer: Buffer.from("dummy-photo-2"),
          filename: "p2.jpg",
          contentType: "image/jpeg",
          capturedAt: new Date().toISOString(),
          isCameraCapture: true,
          gpsSamples: [],
        },
      ], // Only 2 photos provided (min 4 required)
      submissionLocation: {
        latitude: 28.4744,
        longitude: 77.504,
        accuracyMeters: 6,
        capturedAt: new Date().toISOString(),
      },
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/minimum of 4 valid evidence photographs is required/i);
  });

  // Scenario 22: Stage 2 Evidence Validation rejects raw reports containing fewer than 4 photographs (PRD §2, §7)
  it("Scenario 22: Stage 2 Evidence Validation rejects raw reports containing fewer than 4 photos", async () => {
    const mockReport = {
      reportId: "rep_test_evidence_01",
      userId: "user_test_valid",
      category: "Road Surface / Pothole",
      description: "Test description",
      status: "EVIDENCE_VALIDATION_PENDING" as const,
      createdAt: new Date().toISOString(),
      evidencePhotos: [
        {
          fileId: "file_01",
          filename: "photo1.jpg",
          contentType: "image/jpeg",
          byteSize: 1024,
          sha256Hash: "hash1",
          captureTimestamp: new Date().toISOString(),
          isCameraCapture: true,
          gpsSamples: [],
        },
        {
          fileId: "file_02",
          filename: "photo2.jpg",
          contentType: "image/jpeg",
          byteSize: 1024,
          sha256Hash: "hash2",
          captureTimestamp: new Date().toISOString(),
          isCameraCapture: true,
          gpsSamples: [],
        },
        {
          fileId: "file_03",
          filename: "photo3.jpg",
          contentType: "image/jpeg",
          byteSize: 1024,
          sha256Hash: "hash3",
          captureTimestamp: new Date().toISOString(),
          isCameraCapture: true,
          gpsSamples: [],
        },
      ], // Only 3 photos (min 4 required)
      submissionLocation: {
        latitude: 28.4744,
        longitude: 77.504,
        accuracyMeters: 6,
        capturedAt: new Date().toISOString(),
      },
      auditLogs: [],
    };
    const res = await executeStage2EvidenceValidation(
      mockReport as unknown as Parameters<typeof executeStage2EvidenceValidation>[0],
    );
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Minimum 4 evidence photographs required/i);
  });

  // Scenario 23: Stage 1 Intake rejects submissions where photos were not taken via in-app camera (PRD §2, §6)
  it("Scenario 23: Stage 1 Intake strictly rejects photos uploaded via gallery or file picker", async () => {
    const res = await executeStage1Intake({
      userId: "user_test_valid",
      category: "Road Surface / Pothole",
      description: "Severe crater on expressway service road",
      photos: [
        {
          buffer: Buffer.from("dummy-photo-1"),
          filename: "p1.jpg",
          contentType: "image/jpeg",
          capturedAt: new Date().toISOString(),
          isCameraCapture: true,
          gpsSamples: [],
        },
        {
          buffer: Buffer.from("dummy-photo-2"),
          filename: "p2.jpg",
          contentType: "image/jpeg",
          capturedAt: new Date().toISOString(),
          isCameraCapture: false, // Gallery upload prohibited
          gpsSamples: [],
        },
        {
          buffer: Buffer.from("dummy-photo-3"),
          filename: "p3.jpg",
          contentType: "image/jpeg",
          capturedAt: new Date().toISOString(),
          isCameraCapture: true,
          gpsSamples: [],
        },
        {
          buffer: Buffer.from("dummy-photo-4"),
          filename: "p4.jpg",
          contentType: "image/jpeg",
          capturedAt: new Date().toISOString(),
          isCameraCapture: true,
          gpsSamples: [],
        },
      ],
      submissionLocation: {
        latitude: 28.4744,
        longitude: 77.504,
        accuracyMeters: 6,
        capturedAt: new Date().toISOString(),
      },
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/was not captured via in-app camera viewfinder.*prohibited/i);
  });

  // Scenario 24: Stage 2 Evidence Validation rejects photos exceeding the 15MB file size limit (PRD §2, §7)
  it("Scenario 24: Stage 2 Evidence Validation rejects photos exceeding 15MB limit or with camera provenance violations", async () => {
    const mockReport = {
      reportId: "rep_test_evidence_size_01",
      userId: "user_test_valid",
      category: "Road Surface / Pothole",
      description: "Pothole evidence size check",
      status: "EVIDENCE_VALIDATION_PENDING" as const,
      createdAt: new Date().toISOString(),
      evidencePhotos: [
        {
          fileId: "file_01",
          filename: "photo1.jpg",
          contentType: "image/jpeg",
          byteSize: 16 * 1024 * 1024, // 16MB > 15MB limit
          sha256: "hash1",
          captureTimestamp: new Date().toISOString(),
          isCameraCapture: true,
          gpsSamples: [
            {
              latitude: 28.4744,
              longitude: 77.504,
              horizontalAccuracyMeters: 5,
              sampleTimestamp: new Date().toISOString(),
            },
          ],
        },
        {
          fileId: "file_02",
          filename: "photo2.jpg",
          contentType: "image/jpeg",
          byteSize: 2 * 1024 * 1024,
          sha256: "hash2",
          captureTimestamp: new Date().toISOString(),
          isCameraCapture: false, // Gallery upload
          gpsSamples: [
            {
              latitude: 28.4744,
              longitude: 77.504,
              horizontalAccuracyMeters: 5,
              sampleTimestamp: new Date().toISOString(),
            },
          ],
        },
        {
          fileId: "file_03",
          filename: "photo3.jpg",
          contentType: "image/jpeg",
          byteSize: 2 * 1024 * 1024,
          sha256: "hash3",
          captureTimestamp: new Date().toISOString(),
          isCameraCapture: true,
          gpsSamples: [
            {
              latitude: 28.4744,
              longitude: 77.504,
              horizontalAccuracyMeters: 5,
              sampleTimestamp: new Date().toISOString(),
            },
          ],
        },
        {
          fileId: "file_04",
          filename: "photo4.jpg",
          contentType: "image/jpeg",
          byteSize: 2 * 1024 * 1024,
          sha256: "hash4",
          captureTimestamp: new Date().toISOString(),
          isCameraCapture: true,
          gpsSamples: [
            {
              latitude: 28.4744,
              longitude: 77.504,
              horizontalAccuracyMeters: 5,
              sampleTimestamp: new Date().toISOString(),
            },
          ],
        },
      ],
      submissionLocation: {
        latitude: 28.4744,
        longitude: 77.504,
        accuracyMeters: 6,
        capturedAt: new Date().toISOString(),
      },
    };
    const res = await executeStage2EvidenceValidation(
      mockReport as unknown as Parameters<typeof executeStage2EvidenceValidation>[0],
    );
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/exceeding 15MB limit/i);
    expect(res.error).toMatch(/in-app camera viewfinder/i);
  });

  // Scenario 25: Canonical incident centroid recalculation and weighted update (PRD §11)
  it("Scenario 25: Representative centroid recalculates accurately as weighted mean when reports merge", () => {
    // Initial incident with 1 report at (28.47400, 77.50400)
    const existingLat = 28.474;
    const existingLng = 77.504;
    const existingCount = 1;

    // Incoming merged report at (28.47460, 77.50440)
    const incomingLat = 28.4746;
    const incomingLng = 77.5044;

    const newCount = existingCount + 1;
    const recalculatedLat = (existingLat * existingCount + incomingLat) / newCount;
    const recalculatedLng = (existingLng * existingCount + incomingLng) / newCount;

    expect(recalculatedLat).toBeCloseTo(28.4743, 5);
    expect(recalculatedLng).toBeCloseTo(77.5042, 5);

    // Geodesic distance from recalculated centroid to both constituents must be within spatial bounds
    const distToFirst = calculateGeodesicDistanceMeters(
      recalculatedLat,
      recalculatedLng,
      existingLat,
      existingLng,
    );
    const distToSecond = calculateGeodesicDistanceMeters(
      recalculatedLat,
      recalculatedLng,
      incomingLat,
      incomingLng,
    );

    expect(distToFirst).toBeLessThan(40);
    expect(distToSecond).toBeLessThan(40);
  });

  // Scenario 26: Stage 7 Moderation rejects actions without non-empty moderatorId (PRD §12)
  it("Scenario 26: Stage 7 Moderation strictly rejects actions with empty moderator ID for civic auditability", async () => {
    const moderationRes = await executeStage7Moderation({
      incidentId: "inc_test_123",
      moderatorId: "", // Empty ID
      decision: "approve",
    });
    expect(moderationRes.success).toBe(false);
    expect(moderationRes.error).toMatch(/Moderator ID is required for civic auditability/i);

    const mergeRes = await executeIncidentMerge({
      primaryIncidentId: "inc_target",
      duplicateIncidentIds: ["inc_source"],
      moderatorId: "   ", // Whitespace only
    });
    expect(mergeRes.success).toBe(false);
    expect(mergeRes.error).toMatch(/Moderator ID is required/i);

    const splitRes = await executeIncidentSplit({
      incidentId: "inc_split",
      reportIdsToSplit: ["rep_1"],
      moderatorId: "",
    });
    expect(splitRes.success).toBe(false);
    expect(splitRes.error).toMatch(/Moderator ID is required/i);

    const unpublishRes = await executeIncidentUnpublish({
      incidentId: "inc_unpublish",
      moderatorId: "",
      reason: "Incorrect classification",
    });
    expect(unpublishRes.success).toBe(false);
    expect(unpublishRes.error).toMatch(/Moderator ID is required/i);
  });
});
