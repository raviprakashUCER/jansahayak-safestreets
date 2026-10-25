import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { executeIncidentSplit } from "@/lib/pipeline/moderation";

/**
 * PRD §12 & §16 Admin Incident Split Endpoint
 * POST /api/admin/incidents/:incidentId/split
 *
 * Partitions erroneously grouped reports out of an incident into a new canonical incident.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> },
) {
  try {
    const session = await getCurrentUserSession();

    if (session.role !== "moderator" && session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only designated moderators or administrators can split incidents." },
        { status: 403 },
      );
    }

    const { incidentId } = await params;
    const body = await req.json().catch(() => ({}));
    const { reportIdsToSplit, reason } = body;

    if (!Array.isArray(reportIdsToSplit) || reportIdsToSplit.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: 'reportIdsToSplit' must be a non-empty array of report IDs." },
        { status: 400 },
      );
    }

    const result = await executeIncidentSplit({
      incidentId,
      reportIdsToSplit,
      moderatorId: session.userId,
      reason: reason || "Partitioned into separate incident by moderator",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      originalIncidentId: result.originalIncidentId,
      newIncidentId: result.newIncidentId,
      splitReportsCount: result.splitReportsCount,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
