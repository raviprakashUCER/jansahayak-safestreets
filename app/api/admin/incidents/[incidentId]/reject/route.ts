import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { reviewAndPublishIncident } from "@/lib/pipeline/orchestrator";

/**
 * PRD §16 Admin Incident Rejection Endpoint
 * POST /api/admin/incidents/:incidentId/reject
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> },
) {
  try {
    const session = await getCurrentUserSession();

    if (session.role !== "moderator" && session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only designated moderators or administrators can reject incidents." },
        { status: 403 },
      );
    }

    const { incidentId } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = (body.reason as string) || "Report rejected after staff audit";
    const notes = body.notes as string | undefined;

    const result = await reviewAndPublishIncident({
      incidentId,
      moderatorId: session.userId,
      decision: "reject",
      reason,
      notes,
    });

    return NextResponse.json({
      success: result.success,
      incident: result.incident,
      stage7: result.stage7,
      error: result.error,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
