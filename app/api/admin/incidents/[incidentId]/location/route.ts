import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { executeStage7Moderation } from "@/lib/pipeline/moderation";

/**
 * PRD §12 & §16 Admin Incident Location Correction Endpoint
 * POST /api/admin/incidents/:incidentId/location
 *
 * Updates canonical incident coordinates based on expert field verification or road surveys.
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
            "Forbidden: Only designated moderators or administrators can correct incident coordinates.",
        },
        { status: 403 },
      );
    }

    const { incidentId } = await params;
    const body = await req.json().catch(() => ({}));
    const { latitude, longitude, notes } = body;

    const lat = typeof latitude === "number" ? latitude : parseFloat(latitude);
    const lng = typeof longitude === "number" ? longitude : parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "Invalid coordinates: latitude must be [-90, 90] and longitude [-180, 180]." },
        { status: 400 },
      );
    }

    const result = await executeStage7Moderation({
      incidentId,
      moderatorId: session.userId,
      decision: "correct_location",
      notes: notes || "Location adjusted manually by civic moderator",
      correctedLocation: {
        latitude: lat,
        longitude: lng,
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      incident: result.data?.incident,
      correctedLocation: { latitude: lat, longitude: lng },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
