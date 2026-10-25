import { NextRequest, NextResponse } from "next/server";
import { db, incidents } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

/**
 * PRD §16 Public Map Incidents Endpoint
 * Returns sanitized, privacy-safe canonical incidents for public map display.
 * Only published and moderation-approved incidents from PostgreSQL are returned.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const conditions = [eq(incidents.isPublished, true), eq(incidents.status, "approved")];

    if (category && category !== "all") {
      conditions.push(eq(incidents.category, category));
    }

    const rows = await db
      .select()
      .from(incidents)
      .where(and(...conditions))
      .orderBy(desc(incidents.createdAt))
      .limit(100);

    // Convert rows to sanitized map hazard format
    const publicIncidents = rows.map((inc) => ({
      id: inc.id,
      title: inc.title,
      summary: inc.summary,
      description: inc.summary || inc.title,
      category: inc.category,
      categoryLabel: inc.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      severity:
        (inc.severity as "critical" | "high" | "medium" | "moderate" | "low" | "minor") || "medium",
      status:
        (inc.status as
          | "open"
          | "in-progress"
          | "escalated"
          | "resolved"
          | "under-review"
          | "assigned"
          | "community-verified") || "open",
      statusLabel: (inc.status || "open")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      latitude: Number(inc.latitude),
      longitude: Number(inc.longitude),
      coordinates: `${Number(inc.latitude).toFixed(4)}° N, ${Number(inc.longitude).toFixed(4)}° E`,
      spatialUncertaintyMeters: Number(inc.spatialUncertaintyMeters) || 10,
      verificationsCount: inc.reportCount || 1,
      votes: inc.reportCount || 1,
      reportedAt:
        inc.publishedAt?.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }) || "Recently",
      time: "Verified",
      location: ((inc.metadata as Record<string, unknown>)?.landmark as string) || "Greater Noida",
      landmark: ((inc.metadata as Record<string, unknown>)?.landmark as string) || "Greater Noida",
    }));

    return NextResponse.json({
      success: true,
      count: publicIncidents.length,
      liveCount: publicIncidents.length,
      incidents: publicIncidents,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
