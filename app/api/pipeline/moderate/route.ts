import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { reviewAndPublishIncident } from "@/lib/pipeline/orchestrator";
import { ModerationDecision } from "@/lib/pipeline/moderation";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserSession();

    // Enforce moderator / admin permission
    if (session.role !== "moderator" && session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only designated moderators or administrators can review reports." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { incidentId, decision, reason, notes, correctedLocation } = body;

    if (!incidentId || !decision) {
      return NextResponse.json(
        { error: "Missing required fields: incidentId and decision." },
        { status: 400 },
      );
    }

    const validDecisions: ModerationDecision[] = [
      "approve",
      "reject",
      "request_evidence",
      "correct_location",
    ];

    if (!validDecisions.includes(decision as ModerationDecision)) {
      return NextResponse.json(
        { error: `Invalid decision. Allowed values: ${validDecisions.join(", ")}` },
        { status: 400 },
      );
    }

    const result = await reviewAndPublishIncident({
      incidentId,
      moderatorId: session.userId,
      decision: decision as ModerationDecision,
      reason,
      notes,
      correctedLocation,
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
