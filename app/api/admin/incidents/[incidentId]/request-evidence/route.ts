import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { executeStage7Moderation } from "@/lib/pipeline/moderation";

/**
 * PRD §12 & §16 Admin Incident Request Evidence Endpoint
 * POST /api/admin/incidents/:incidentId/request-evidence
 *
 * Requests additional photographic evidence or documentation from citizens.
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
          error:
            "Forbidden: Only designated moderators or administrators can request additional evidence.",
        },
        { status: 403 },
      );
    }

    const { incidentId } = await params;
    const body = await req.json().catch(() => ({}));
    const notes =
      (body.notes as string) || "Additional clear evidence required from reporting citizen";

    const result = await executeStage7Moderation({
      incidentId,
      moderatorId: session.userId,
      decision: "request_evidence",
      notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      incident: result.data?.incident,
      notes,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
