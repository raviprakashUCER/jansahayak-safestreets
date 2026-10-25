import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { executeIncidentMerge } from "@/lib/pipeline/moderation";

/**
 * PRD §10, §12 & §16 Admin Incident Merge Endpoint
 * POST /api/admin/incidents/merge
 *
 * Merges one or more duplicate incidents into a canonical primary incident.
 * Migrates report associations, adjusts counters, unpublishes duplicates, and records audit logs.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserSession();

    if (session.role !== "moderator" && session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only designated moderators or administrators can merge incidents." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { primaryIncidentId, duplicateIncidentIds, reason } = body;

    if (!primaryIncidentId || typeof primaryIncidentId !== "string") {
      return NextResponse.json(
        { error: "Invalid request: 'primaryIncidentId' string is required." },
        { status: 400 },
      );
    }

    if (!Array.isArray(duplicateIncidentIds) || duplicateIncidentIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "Invalid request: 'duplicateIncidentIds' must be a non-empty array of incident IDs.",
        },
        { status: 400 },
      );
    }

    const result = await executeIncidentMerge({
      primaryIncidentId,
      duplicateIncidentIds,
      moderatorId: session.userId,
      reason: reason || "Merged by moderator review",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      primaryIncidentId: result.primaryIncidentId,
      duplicateIncidentIds: result.duplicateIncidentIds,
      movedReportsCount: result.movedReportsCount,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
