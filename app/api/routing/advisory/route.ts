import { NextRequest, NextResponse } from "next/server";
import { db, incidents } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { RouteAdvisoryQuerySchema } from "@/lib/validations/incident-schemas";
import { generateRouteAdvisory } from "@/lib/routing/route-advisory";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = RouteAdvisoryQuerySchema.safeParse({
      originLat: searchParams.get("originLat"),
      originLng: searchParams.get("originLng"),
      destLat: searchParams.get("destLat"),
      destLng: searchParams.get("destLng"),
      corridorMeters: searchParams.get("corridorMeters") || 150,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid coordinate parameters. Values must be within Greater Noida bounds.", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { originLat, originLng, destLat, destLng, corridorMeters } = parsed.data;

    // Fetch published incidents
    const rows = await db
      .select()
      .from(incidents)
      .where(eq(incidents.isPublished, true))
      .limit(200);

    const availableIncidents = rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      severity: r.severity,
      status: r.status,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      createdAt: r.createdAt,
      reportCount: r.reportCount,
    }));

    const advisory = generateRouteAdvisory({
      origin: { latitude: originLat, longitude: originLng },
      destination: { latitude: destLat, longitude: destLng },
      availableIncidents,
      corridorThresholdMeters: corridorMeters,
    });

    return NextResponse.json({
      success: true,
      advisory,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
