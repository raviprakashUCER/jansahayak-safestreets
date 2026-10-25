import { NextRequest, NextResponse } from "next/server";
import { getReportsCollection, getPipelineLogsCollection } from "@/lib/db/mongodb";
import { db, incidents } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * PRD §16 Public-Safe Report Progress Endpoint
 * Returns sanitized report tracking state without leaking private notes, raw EXIF, or model prompts.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const reportsColl = await getReportsCollection();
    const report = await reportsColl.findOne(
      { reportId },
      {
        projection: {
          reportId: 1,
          category: 1,
          description: 1,
          status: 1,
          createdAt: 1,
          submissionLocation: 1,
          evidencePhotos: 1,
          associatedIncidentId: 1,
        },
      },
    );

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Fetch public-safe stage progress
    const logsColl = await getPipelineLogsCollection();
    const stageLogs = await logsColl
      .find({ reportId })
      .project({ stage: 1, stageName: 1, status: 1, details: 1, timestamp: 1 })
      .sort({ stage: 1 })
      .toArray();

    const formattedPhotos = (report.evidencePhotos || []).map((p, idx) => ({
      index: idx + 1,
      fileId: p.fileId,
      filename: p.filename,
      contentType: p.contentType,
      byteSize: p.byteSize,
      captureTimestamp: p.captureTimestamp,
      downloadUrl: p.fileId ? `/api/pipeline/photos/${p.fileId}` : undefined,
    }));

    let canonicalIncident: {
      id: string;
      incidentNumber: string;
      isPublished: boolean;
      status: string;
      moderationStatus: string;
      reportCount: number;
      publishedAt: Date | null;
    } | null = null;

    if (report.associatedIncidentId) {
      try {
        const [inc] = await db
          .select({
            id: incidents.id,
            incidentNumber: incidents.incidentNumber,
            isPublished: incidents.isPublished,
            status: incidents.status,
            moderationStatus: incidents.moderationStatus,
            reportCount: incidents.reportCount,
            publishedAt: incidents.publishedAt,
          })
          .from(incidents)
          .where(eq(incidents.id, report.associatedIncidentId))
          .limit(1);

        if (inc) {
          canonicalIncident = inc;
        }
      } catch {
        // Non-blocking fallback
      }
    }

    return NextResponse.json({
      success: true,
      reportId: report.reportId,
      category: report.category,
      description: report.description,
      status: report.status,
      createdAt: report.createdAt,
      location: report.submissionLocation,
      photoCount: formattedPhotos.length,
      photos: formattedPhotos,
      associatedIncidentId: report.associatedIncidentId,
      canonicalIncident,
      stages: stageLogs,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isConnRefused = msg.includes("ECONNREFUSED") || msg.includes("connect");
    return NextResponse.json(
      {
        error: isConnRefused ? "Database connection unavailable" : msg,
        isRetryable: isConnRefused,
      },
      { status: isConnRefused ? 503 : 500 },
    );
  }
}
