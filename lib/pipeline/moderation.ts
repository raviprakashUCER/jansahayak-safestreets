import { StageExecutionResult } from "./types";
import {
  db,
  incidents,
  incidentReports,
  moderationActions,
  outboxEvents,
  Incident,
} from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { getReportsCollection } from "@/lib/db/mongodb";

export type ModerationDecision =
  | "approve"
  | "reject"
  | "request_evidence"
  | "correct_location"
  | "merge"
  | "split"
  | "unpublish";

export interface ModerationActionParams {
  incidentId: string;
  moderatorId: string;
  decision: ModerationDecision;
  reason?: string;
  notes?: string;
  correctedLocation?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Stage 7: Moderation & Human-in-the-Loop Review Worker
 * Records immutable audit logs in PostgreSQL and transitions canonical incident states.
 */
export async function executeStage7Moderation(
  params: ModerationActionParams,
): Promise<StageExecutionResult<{ incident: Incident; decision: ModerationDecision }>> {
  const stageName = "Moderation Review & Audit";

  try {
    const { incidentId, moderatorId, decision, reason, notes, correctedLocation } = params;

    // 1. Mandatory Input Validation (PRD §12)
    if (!moderatorId || moderatorId.trim().length === 0) {
      return {
        stage: 7,
        stageName,
        success: false,
        error: "Moderator ID is required for civic auditability.",
        isRetryable: false,
      };
    }

    if (decision === "reject" && (!reason || reason.trim().length === 0)) {
      return {
        stage: 7,
        stageName,
        success: false,
        error: "Rejection requires a documented reason for civic auditability.",
        isRetryable: false,
      };
    }

    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, incidentId))
      .limit(1);

    if (!incident) {
      return {
        stage: 7,
        stageName,
        success: false,
        error: `Incident with ID ${incidentId} not found in PostgreSQL.`,
        isRetryable: false,
      };
    }

    let nextStatus = incident.status;
    let moderationStatus = incident.moderationStatus;

    if (decision === "approve") {
      nextStatus = "approved";
      moderationStatus = "approved";
    } else if (decision === "reject") {
      nextStatus = "rejected";
      moderationStatus = "rejected";
    } else if (decision === "request_evidence") {
      nextStatus = "under_review";
      moderationStatus = "needs_evidence";
    } else if (decision === "unpublish") {
      nextStatus = "suspended";
      moderationStatus = "rejected";
    }

    // Atomic update of incident moderation state
    const updatePayload: Partial<typeof incidents.$inferInsert> = {
      status: nextStatus,
      moderationStatus,
      moderatedBy: moderatorId,
      moderatedAt: new Date(),
      rejectionReason: decision === "reject" ? reason : undefined,
      updatedAt: new Date(),
      ...(decision === "unpublish" ? { isPublished: false } : {}),
    };

    if (correctedLocation && decision === "correct_location") {
      updatePayload.latitude = correctedLocation.latitude.toString();
      updatePayload.longitude = correctedLocation.longitude.toString();
      updatePayload.canonicalGeom = `SRID=4326;POINT(${correctedLocation.longitude} ${correctedLocation.latitude})`;
      updatePayload.spatialUncertaintyMeters = "5.00"; // Manual verification tightens uncertainty
    }

    const [updated] = await db
      .update(incidents)
      .set(updatePayload)
      .where(eq(incidents.id, incidentId))
      .returning();

    if (!updated) {
      throw new Error(`Incident ${incidentId} could not be updated.`);
    }

    // Immutable audit record in moderation_actions
    await db.insert(moderationActions).values({
      incidentId,
      moderatorId,
      action: decision,
      reason,
      notes,
      metadata: {
        previousStatus: incident.status,
        newStatus: nextStatus,
        correctedLocation: correctedLocation || null,
      },
    });

    // Write Outbox Event for post-commit notification dispatch
    await db.insert(outboxEvents).values({
      eventType: `incident.moderation_${decision}`,
      aggregateType: "incident",
      aggregateId: incidentId,
      payload: {
        incidentId,
        decision,
        moderatorId,
        newStatus: nextStatus,
        reason,
      },
    });

    // Update associated reports in MongoDB
    const reportsColl = await getReportsCollection();
    await reportsColl.updateMany(
      { associatedIncidentId: incidentId },
      {
        $set: {
          status:
            decision === "approve"
              ? "APPROVED"
              : decision === "reject"
                ? "REJECTED"
                : decision === "unpublish"
                  ? "SUSPENDED"
                  : "ADDITIONAL_EVIDENCE_REQUIRED",
          updatedAt: new Date().toISOString(),
        },
      },
    );

    return {
      stage: 7,
      stageName,
      success: true,
      data: {
        incident: updated,
        decision,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      stage: 7,
      stageName,
      success: false,
      error: `Stage 7 moderation failed: ${msg}`,
      isRetryable: false,
    };
  }
}

export interface IncidentMergeParams {
  primaryIncidentId: string;
  duplicateIncidentIds: string[];
  moderatorId: string;
  reason?: string;
}

/**
 * Merges duplicate incidents into a canonical primary incident (PRD §10, §12, §16).
 * Re-associates all linked reports to the primary incident, updates counts, and revokes duplicates.
 */
export async function executeIncidentMerge(params: IncidentMergeParams): Promise<{
  success: boolean;
  primaryIncidentId?: string;
  duplicateIncidentIds?: string[];
  movedReportsCount?: number;
  error?: string;
}> {
  try {
    const { primaryIncidentId, duplicateIncidentIds, moderatorId, reason } = params;

    if (!moderatorId || moderatorId.trim().length === 0) {
      return { success: false, error: "Moderator ID is required for merge." };
    }
    if (!primaryIncidentId) {
      return { success: false, error: "Primary incident ID is required for merge." };
    }
    if (!duplicateIncidentIds || duplicateIncidentIds.length === 0) {
      return {
        success: false,
        error: "At least one duplicate incident ID must be specified for merge.",
      };
    }
    if (duplicateIncidentIds.includes(primaryIncidentId)) {
      return {
        success: false,
        error: "Duplicate incident IDs cannot contain the primary incident ID.",
      };
    }

    const [primary] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, primaryIncidentId))
      .limit(1);

    if (!primary) {
      return { success: false, error: `Primary incident ${primaryIncidentId} not found.` };
    }

    // 1. Move all incidentReports referencing duplicate incidents to primaryIncidentId
    const moved = await db
      .update(incidentReports)
      .set({ incidentId: primaryIncidentId })
      .where(inArray(incidentReports.incidentId, duplicateIncidentIds))
      .returning();

    // 2. Mark duplicate incidents as merged and unpublish them
    await db
      .update(incidents)
      .set({
        status: "merged",
        isPublished: false,
        moderationStatus: "approved",
        updatedAt: new Date(),
        metadata: {
          mergedInto: primaryIncidentId,
          mergeReason: reason || "Merged with canonical incident",
          mergedBy: moderatorId,
          mergedAt: new Date().toISOString(),
        },
      })
      .where(inArray(incidents.id, duplicateIncidentIds));

    // 3. Update primary incident reportCount
    const newReportCount = (primary.reportCount || 1) + moved.length;
    await db
      .update(incidents)
      .set({
        reportCount: newReportCount,
        updatedAt: new Date(),
      })
      .where(eq(incidents.id, primaryIncidentId));

    // 4. Update MongoDB raw reports association
    try {
      const reportsColl = await getReportsCollection();
      await reportsColl.updateMany(
        { associatedIncidentId: { $in: duplicateIncidentIds } },
        {
          $set: {
            associatedIncidentId: primaryIncidentId,
            updatedAt: new Date().toISOString(),
          },
        },
      );
    } catch {
      // Offline fallback: continue
    }

    // 5. Immutable audit log in moderation_actions
    await db.insert(moderationActions).values({
      incidentId: primaryIncidentId,
      moderatorId,
      action: "merge",
      reason,
      metadata: {
        mergedDuplicates: duplicateIncidentIds,
        movedReportsCount: moved.length,
      },
    });

    // 6. Outbox event for map cache eviction & downstream sync
    await db.insert(outboxEvents).values({
      eventType: "incident.merged",
      aggregateType: "incident",
      aggregateId: primaryIncidentId,
      payload: {
        primaryIncidentId,
        duplicateIncidentIds,
        moderatorId,
        reason,
        movedReportsCount: moved.length,
      },
    });

    return {
      success: true,
      primaryIncidentId,
      duplicateIncidentIds,
      movedReportsCount: moved.length,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Incident merge failed: ${msg}` };
  }
}

export interface IncidentSplitParams {
  incidentId: string;
  reportIdsToSplit: string[];
  moderatorId: string;
  reason?: string;
}

/**
 * Splits erroneously grouped reports out of an incident into a new canonical incident (PRD §12, §16).
 */
export async function executeIncidentSplit(params: IncidentSplitParams): Promise<{
  success: boolean;
  originalIncidentId?: string;
  newIncidentId?: string;
  splitReportsCount?: number;
  error?: string;
}> {
  try {
    const { incidentId, reportIdsToSplit, moderatorId, reason } = params;

    if (!moderatorId || moderatorId.trim().length === 0) {
      return { success: false, error: "Moderator ID is required for split." };
    }
    if (!incidentId) {
      return { success: false, error: "Original incident ID is required for split." };
    }
    if (!reportIdsToSplit || reportIdsToSplit.length === 0) {
      return { success: false, error: "At least one report ID must be specified for split." };
    }

    const [original] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, incidentId))
      .limit(1);

    if (!original) {
      return { success: false, error: `Original incident ${incidentId} not found.` };
    }

    const existingReports = await db
      .select()
      .from(incidentReports)
      .where(eq(incidentReports.incidentId, incidentId));

    if (reportIdsToSplit.length >= existingReports.length && existingReports.length > 0) {
      return {
        success: false,
        error: "Cannot split all reports out of an incident. At least one report must remain.",
      };
    }

    const splitSuffix = Math.floor(1000 + Math.random() * 9000);
    const newIncidentNumber = `INC-SPLIT-${Date.now().toString().slice(-6)}-${splitSuffix}`;

    // 1. Insert new canonical incident partitioned from parent
    const [newIncident] = await db
      .insert(incidents)
      .values({
        incidentNumber: newIncidentNumber,
        category: original.category,
        severity: original.severity,
        status: "under_review",
        title: `${original.title} (Split)`,
        summary: `Split partition from incident ${original.incidentNumber}: ${reason || "Moderator partition"}`,
        latitude: original.latitude,
        longitude: original.longitude,
        canonicalGeom: original.canonicalGeom,
        spatialUncertaintyMeters: original.spatialUncertaintyMeters,
        reportCount: reportIdsToSplit.length,
        isPublished: false,
        moderationStatus: "pending",
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
        metadata: {
          parentIncidentId: incidentId,
          splitReason: reason || null,
        },
      })
      .returning();

    if (!newIncident) {
      throw new Error("Failed to create new incident record for split partition.");
    }

    // 2. Re-assign reports to new incident
    await db
      .update(incidentReports)
      .set({ incidentId: newIncident.id, isPrimaryReport: false })
      .where(
        and(
          eq(incidentReports.incidentId, incidentId),
          inArray(incidentReports.reportId, reportIdsToSplit),
        ),
      );

    // 3. Decrement reportCount on original incident
    const remainingCount = Math.max(1, (original.reportCount || 1) - reportIdsToSplit.length);
    await db
      .update(incidents)
      .set({
        reportCount: remainingCount,
        updatedAt: new Date(),
      })
      .where(eq(incidents.id, incidentId));

    // 4. Update MongoDB raw reports association
    try {
      const reportsColl = await getReportsCollection();
      await reportsColl.updateMany(
        { reportId: { $in: reportIdsToSplit } },
        {
          $set: {
            associatedIncidentId: newIncident.id,
            updatedAt: new Date().toISOString(),
          },
        },
      );
    } catch {
      // Offline fallback: continue
    }

    // 5. Immutable audit log in moderation_actions
    await db.insert(moderationActions).values({
      incidentId,
      moderatorId,
      action: "split",
      reason,
      metadata: {
        newIncidentId: newIncident.id,
        splitReports: reportIdsToSplit,
      },
    });

    // 6. Outbox event for map cache & analytics
    await db.insert(outboxEvents).values({
      eventType: "incident.split",
      aggregateType: "incident",
      aggregateId: incidentId,
      payload: {
        originalIncidentId: incidentId,
        newIncidentId: newIncident.id,
        splitReportsCount: reportIdsToSplit.length,
        moderatorId,
        reason,
      },
    });

    return {
      success: true,
      originalIncidentId: incidentId,
      newIncidentId: newIncident.id,
      splitReportsCount: reportIdsToSplit.length,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Incident split failed: ${msg}` };
  }
}

export interface IncidentUnpublishParams {
  incidentId: string;
  moderatorId: string;
  reason: string;
}

/**
 * Revokes an incident from public visibility and triggers cache invalidation (PRD §13, §14, §16).
 */
export async function executeIncidentUnpublish(params: IncidentUnpublishParams): Promise<{
  success: boolean;
  incidentId?: string;
  error?: string;
}> {
  try {
    const { incidentId, moderatorId, reason } = params;

    if (!moderatorId || moderatorId.trim().length === 0) {
      return { success: false, error: "Moderator ID is required for unpublish." };
    }
    if (!incidentId) {
      return { success: false, error: "Incident ID is required for unpublish." };
    }
    if (!reason || reason.trim().length === 0) {
      return { success: false, error: "Unpublish action requires a documented reason." };
    }

    const modResult = await executeStage7Moderation({
      incidentId,
      moderatorId,
      decision: "unpublish",
      reason,
    });

    if (!modResult.success) {
      return { success: false, error: modResult.error };
    }

    // Explicit cache invalidation outbox event for edge/map CDN (PRD §14)
    await db.insert(outboxEvents).values({
      eventType: "incident.unpublished",
      aggregateType: "incident",
      aggregateId: incidentId,
      payload: {
        incidentId,
        moderatorId,
        reason,
        timestamp: new Date().toISOString(),
      },
    });

    return { success: true, incidentId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Incident unpublish failed: ${msg}` };
  }
}
