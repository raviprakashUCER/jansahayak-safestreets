import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { reviewAndPublishIncident } from "@/lib/pipeline/orchestrator";

/**
 * PRD §16 Admin Incident Approval Endpoint
 * POST /api/admin/incidents/:incidentId/approve
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> },
) {
  try {
    const session = await getCurrentUserSession();

    if (session.role !== "moderator" && session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only designated moderators or administrators can approve incidents." },
        { status: 403 },
      );
    }

    const { incidentId } = await params;
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional on approve
    }

    const reason = (body.reason as string) || "Verified by civic moderator inspection";
    const notes = body.notes as string | undefined;

    const result = await reviewAndPublishIncident({
      incidentId,
      moderatorId: session.userId,
      decision: "approve",
      reason,
      notes,
    });

    return NextResponse.json({
      success: result.success,
      incident: result.incident,
      stage7: result.stage7,
      stage8: result.stage8,
      error: result.error,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
