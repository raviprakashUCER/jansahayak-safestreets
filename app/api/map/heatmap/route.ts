import { NextRequest, NextResponse } from "next/server";
import { db, incidents } from "@/lib/db";
import { eq, and, desc, gte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const dateRange = searchParams.get("dateRange") || "all";
    const status = searchParams.get("status") || "all";
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";

    const conditions = [eq(incidents.isPublished, true)];

    if (category && category !== "all") {
      conditions.push(eq(incidents.category, category));
    }

    if (status !== "all") {
      conditions.push(eq(incidents.status, status));
    }

    if (dateRange !== "all") {
      const now = Date.now();
      let ms = 30 * 24 * 60 * 60 * 1000;
      if (dateRange === "24h") ms = 24 * 60 * 60 * 1000;
      else if (dateRange === "7d") ms = 7 * 24 * 60 * 60 * 1000;

      const threshold = new Date(now - ms);
      conditions.push(gte(incidents.createdAt, threshold));
    }

    const rows = await db
      .select()
      .from(incidents)
      .where(and(...conditions))
      .orderBy(desc(incidents.createdAt))
      .limit(300);

    const filteredRows = verifiedOnly
      ? rows.filter((r) => r.reportCount >= 2)
      : rows;

    // Convert to GeoJSON FeatureCollection
    const features = filteredRows.map((inc) => {
      // Calculate severity weight: critical=1.0, high=0.8, medium=0.5, low=0.2
      let weight = 0.5;
      const sev = inc.severity?.toLowerCase();
      if (sev === "critical") weight = 1.0;
      else if (sev === "high") weight = 0.8;
      else if (sev === "low") weight = 0.2;

      // Multiply slightly by report count for density cluster effect (up to 1.5x)
      weight = Math.min(1.5, weight * (1 + (inc.reportCount - 1) * 0.15));

      // Coordinate privacy: round to 4 decimals (~11 meters)
      const lat = Number(Number(inc.latitude).toFixed(4));
      const lng = Number(Number(inc.longitude).toFixed(4));

      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [lng, lat],
        },
        properties: {
          id: inc.id,
          title: inc.title,
          category: inc.category,
          severity: inc.severity,
          status: inc.status,
          reportCount: inc.reportCount,
          weight: Number(weight.toFixed(2)),
          createdAt: inc.createdAt,
        },
      };
    });

    return NextResponse.json({
      type: "FeatureCollection",
      count: features.length,
      features,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
