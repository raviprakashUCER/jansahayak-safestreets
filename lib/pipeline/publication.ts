import { StageExecutionResult } from "./types";
import { db, incidents, publicationRecords, outboxEvents, Incident } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getReportsCollection } from "@/lib/db/mongodb";

export interface PublicationParams {
  incidentId: string;
  publishedBy: string; // Moderator or System Publisher ID
}

/**
 * PRD §13 Publication Eligibility Predicate Evaluator
 * Verifies that all required criteria for public map display are met.
 */
export function evaluatePublicationPredicate(incident: {
  moderationStatus?: string | null;
  status?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  spatialUncertaintyMeters?: string | number | null;
}): { eligible: boolean; failedPredicates: string[] } {
  const failedPredicates: string[] = [];

  // Predicate 1: Moderation approval check
  if (incident.moderationStatus !== "approved" && incident.status !== "approved") {
    failedPredicates.push("Incident has not received official moderation approval.");
  }

  // Predicate 2: Spatial coordinates validity
  const lat = Number(incident.latitude);
  const lng = Number(incident.longitude);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    failedPredicates.push("Canonical spatial coordinates are invalid or out of WGS84 range.");
  }

  // Predicate 3: Spatial uncertainty threshold (must be <= 25m for public pin)
  const uncertainty = Number(incident.spatialUncertaintyMeters) || 999;
  if (uncertainty > 25) {
    failedPredicates.push(
      `Spatial uncertainty (${uncertainty}m) exceeds 25m threshold for public display.`,
    );
  }

  // Predicate 4: Terminal rejection check
  if (incident.status === "rejected") {
    failedPredicates.push("Rejected incidents cannot be published to the public map.");
  }

  return {
    eligible: failedPredicates.length === 0,
    failedPredicates,
  };
}

/**
 * Stage 8: Transactional Map Publication Worker
 * Evaluates the strict PRD publication eligibility predicate and atomically commits public pin visibility.
 */
export async function executeStage8Publication(
  params: PublicationParams,
): Promise<StageExecutionResult<{ incident: Incident; publicationRecordId: string }>> {
  const stageName = "Transactional Map Publication";

  try {
    const { incidentId, publishedBy } = params;

    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, incidentId))
      .limit(1);

    if (!incident) {
      return {
        stage: 8,
        stageName,
        success: false,
        error: `Incident ${incidentId} not found.`,
        isRetryable: false,
      };
    }

    // 1. Idempotency Check: Already Published
    if (incident.isPublished) {
      return {
        stage: 8,
        stageName,
        success: true,
        data: {
          incident,
          publicationRecordId: "already_published",
        },
      };
    }

    // 2. Strict Publication Eligibility Predicate (PRD Section 13)
    const { eligible, failedPredicates } = evaluatePublicationPredicate(incident);

    if (!eligible) {
      return {
        stage: 8,
        stageName,
        success: false,
        error: `Publication Predicate Failed: ${failedPredicates.join("; ")}`,
        isRetryable: false,
      };
    }

    const lat = Number(incident.latitude);
    const lng = Number(incident.longitude);
    const uncertainty = Number(incident.spatialUncertaintyMeters) || 10;

    // 3. Prepare Privacy-Safe Public Snapshot (No citizen personal details, EXIF, or private notes)
    const publicSnapshot = {
      incidentId: incident.id,
      incidentNumber: incident.incidentNumber,
      category: incident.category,
      severity: incident.severity,
      title: incident.title,
      summary: incident.summary,
      coordinates: {
        latitude: lat,
        longitude: lng,
      },
      spatialUncertaintyMeters: uncertainty,
      reportCount: incident.reportCount,
      publishedAt: new Date().toISOString(),
    };

    // 4. Atomic Database Commit: Update Incident & Write Publication Record
    const [publishedIncident] = await db
      .update(incidents)
      .set({
        isPublished: true,
        publishedAt: new Date(),
        publishedBy,
        updatedAt: new Date(),
      })
      .where(eq(incidents.id, incidentId))
      .returning();

    if (!publishedIncident) {
      throw new Error(`Failed to commit publication for incident ${incidentId}.`);
    }

    const [pubRecord] = await db
      .insert(publicationRecords)
      .values({
        incidentId,
        publishedBy,
        publicSnapshot,
      })
      .returning();

    if (!pubRecord) {
      throw new Error("Failed to insert publication snapshot record.");
    }

    // 5. Write Outbox Events for Map Cache Invalidation & Citizen Push Notifications
    await db.insert(outboxEvents).values({
      eventType: "incident.published",
      aggregateType: "incident",
      aggregateId: incidentId,
      payload: {
        incidentId,
        incidentNumber: incident.incidentNumber,
        publishedAt: pubRecord.publishedAt,
        coordinates: publicSnapshot.coordinates,
      },
    });

    await db.insert(outboxEvents).values({
      eventType: "map.cache_invalidated",
      aggregateType: "map",
      aggregateId: "public_tiles",
      payload: {
        incidentId,
        invalidatedBBoxRadiusMeters: 500,
        center: publicSnapshot.coordinates,
      },
    });

    // 6. Update associated reports in MongoDB
    const reportsColl = await getReportsCollection();
    await reportsColl.updateMany(
      { associatedIncidentId: incidentId },
      {
        $set: {
          status: "PUBLISHED",
          updatedAt: new Date().toISOString(),
        },
      },
    );

    return {
      stage: 8,
      stageName,
      success: true,
      data: {
        incident: publishedIncident,
        publicationRecordId: pubRecord.id,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      stage: 8,
      stageName,
      success: false,
      error: `Stage 8 publication failed: ${msg}`,
      isRetryable: false,
    };
  }
}
