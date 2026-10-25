import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { db, incidents, outboxEvents } from "@/lib/db";
import { getReportsCollection } from "@/lib/db/mongodb";

/**
 * PRD §18 System Telemetry & Civic Analytics API
 * GET /api/admin/analytics
 * Computes authentic live metrics across PostgreSQL canonical incidents,
 * outbox events, and MongoDB citizen reports.
 */
export async function GET() {
  try {
    const session = await getCurrentUserSession();

    if (session.role !== "moderator" && session.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Forbidden: Only designated moderators or administrators can access system analytics.",
        },
        { status: 403 },
      );
    }

    // 1. PostgreSQL Incidents Aggregation
    const incidentRows = await db.select().from(incidents);
    const totalIncidents = incidentRows.length;
    const publishedIncidents = incidentRows.filter((i) => i.isPublished).length;
    const underReviewIncidents = incidentRows.filter((i) => i.status === "under_review").length;
    const approvedIncidents = incidentRows.filter((i) => i.status === "approved").length;
    const rejectedIncidents = incidentRows.filter((i) => i.status === "rejected").length;

    // Severity Breakdown
    const severityCounts = {
      critical: incidentRows.filter((i) => i.severity === "critical").length,
      high: incidentRows.filter((i) => i.severity === "high").length,
      medium: incidentRows.filter((i) => i.severity === "medium").length,
      low: incidentRows.filter((i) => i.severity === "low").length,
    };

    // Category Breakdown
    const categoryCounts: Record<string, number> = {};
    for (const inc of incidentRows) {
      categoryCounts[inc.category] = (categoryCounts[inc.category] || 0) + 1;
    }

    // 2. Outbox Telemetry
    const outboxRows = await db.select().from(outboxEvents);
    const outboxCounts = {
      pending: outboxRows.filter((e) => e.status === "pending").length,
      processing: outboxRows.filter((e) => e.status === "processing").length,
      completed: outboxRows.filter((e) => e.status === "completed").length,
      failed: outboxRows.filter((e) => e.status === "failed").length,
      total: outboxRows.length,
    };

    // 3. MongoDB Raw Reports Count
    let totalReports = 0;
    try {
      const reportsColl = await getReportsCollection();
      totalReports = await reportsColl.countDocuments();
    } catch {
      // MongoDB non-blocking
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        totalIncidents,
        publishedIncidents,
        underReviewIncidents,
        approvedIncidents,
        rejectedIncidents,
        totalReports,
        severityCounts,
        categoryCounts,
        outboxCounts,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
