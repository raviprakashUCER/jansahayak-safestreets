import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { executeIncidentUnpublish } from "@/lib/pipeline/moderation";

/**
 * PRD §13, §14 & §16 Admin Incident Unpublish Endpoint
 * POST /api/admin/incidents/:incidentId/unpublish
 *
 * Revokes public map visibility for an incident, sets status to suspended,
 * and emits an outbox event for map edge-cache invalidation.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> },
) {
  try {
    const session = await getCurrentUserSession();

    if (session.role !== "moderator" && session.role !== "admin") {
      return NextResponse.json(
        {
          error: "Forbidden: Only designated moderators or administrators can unpublish incidents.",
        },
        { status: 403 },
      );
    }

    const { incidentId } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = (body.reason as string) || "Unpublished by moderator audit";

    const result = await executeIncidentUnpublish({
      incidentId,
      moderatorId: session.userId,
      reason,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      incidentId: result.incidentId,
      reason,
      status: "suspended",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
