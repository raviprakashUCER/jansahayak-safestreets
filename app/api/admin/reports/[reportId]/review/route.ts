import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { getReportsCollection, getAILogsCollection } from "@/lib/db/mongodb";
import { db, incidents, incidentReports, moderationActions } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * PRD §12 & §16 Admin Report Comprehensive Review Endpoint
 * GET /api/admin/reports/:reportId/review
 *
 * Provides civic moderators with the complete evidence dossier for a citizen report:
 * raw submission data, GridFS photo records, AI vision extractions, linked canonical incident,
 * and immutable moderation audit history.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const session = await getCurrentUserSession();

    if (session.role !== "moderator" && session.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Forbidden: Only designated moderators or administrators can access review dossiers.",
        },
        { status: 403 },
      );
    }

    const { reportId } = await params;

    // 1. Fetch raw report from MongoDB
    let reportDoc = null;
    let aiLogs = null;

    try {
      const reportsColl = await getReportsCollection();
      reportDoc = await reportsColl.findOne({ reportId });

      const aiColl = await getAILogsCollection();
      aiLogs = await aiColl.find({ reportId }).sort({ analyzedAt: -1 }).toArray();
    } catch {
      // Offline fallback handling
    }

    if (!reportDoc) {
      return NextResponse.json(
        { error: `Report '${reportId}' was not found in storage.` },
        { status: 404 },
      );
    }

    // 2. Fetch linked incident and junction data from PostgreSQL
    let associatedIncident = null;
    let moderationHistory: unknown[] = [];

    try {
      const junction = await db
        .select()
        .from(incidentReports)
        .where(eq(incidentReports.reportId, reportId))
        .limit(1);

      const incidentId = junction[0]?.incidentId || reportDoc.associatedIncidentId;

      if (incidentId) {
        const [inc] = await db
          .select()
          .from(incidents)
          .where(eq(incidents.id, incidentId))
          .limit(1);
        associatedIncident = inc || null;

        moderationHistory = await db
          .select()
          .from(moderationActions)
          .where(eq(moderationActions.incidentId, incidentId));
      }
    } catch {
      // Offline fallback: continue
    }

    // Format photo evidence with direct serving endpoints
    const evidencePhotos = (reportDoc.evidencePhotos || []).map((photo) => ({
      ...photo,
      downloadUrl: photo.fileId ? `/api/evidence/${photo.fileId}` : undefined,
    }));

    return NextResponse.json({
      success: true,
      report: {
        ...reportDoc,
        evidencePhotos,
      },
      aiAnalysis: aiLogs && aiLogs.length > 0 ? aiLogs[0] : null,
      associatedIncident,
      moderationHistory,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
