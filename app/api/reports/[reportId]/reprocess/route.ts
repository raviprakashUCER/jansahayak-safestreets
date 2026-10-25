import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { getReportsCollection, downloadEvidencePhotoFromGridFS } from "@/lib/db/mongodb";
import { runReportPipeline } from "@/lib/pipeline/orchestrator";
import { IngestedEvidencePhoto, ReportSubmissionPayload } from "@/lib/pipeline/types";

/**
 * PRD §14 & §16 Report Reprocessing Endpoint
 * POST /api/reports/:reportId/reprocess
 *
 * Re-runs the automated multi-stage processing pipeline on an existing citizen report
 * following a transient failure, updated evidence, or moderator intervention.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const session = await getCurrentUserSession();
    const { reportId } = await params;

    const reportsColl = await getReportsCollection();
    const reportDoc = await reportsColl.findOne({ reportId });

    if (!reportDoc) {
      return NextResponse.json(
        { error: `Report with ID '${reportId}' not found.` },
        { status: 404 },
      );
    }

    // Citizen owner or moderator/admin authorization
    if (
      reportDoc.userId !== session.userId &&
      session.role !== "moderator" &&
      session.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to reprocess this report." },
        { status: 403 },
      );
    }

    // Reconstruct IngestedEvidencePhoto array by downloading from GridFS if needed
    const photos: IngestedEvidencePhoto[] = [];

    for (let i = 0; i < (reportDoc.evidencePhotos || []).length; i++) {
      const p = reportDoc.evidencePhotos[i];
      if (!p) continue;
      let buffer: Buffer = Buffer.alloc(0);

      if (p.fileId) {
        try {
          buffer = await downloadEvidencePhotoFromGridFS(p.fileId);
        } catch {
          // If GridFS download fails, fallback to empty buffer
        }
      }

      photos.push({
        buffer,
        filename: p.filename,
        contentType: p.contentType,
        capturedAt: p.captureTimestamp,
        isCameraCapture: true,
        gpsSamples: p.gpsSamples,
      });
    }

    const payload: ReportSubmissionPayload = {
      reportId: reportDoc.reportId,
      userId: reportDoc.userId,
      category: reportDoc.category,
      description: reportDoc.description,
      submissionLocation: reportDoc.submissionLocation,
      deviceMetadata: reportDoc.deviceMetadata,
      photos,
    };

    const summary = await runReportPipeline(payload);

    return NextResponse.json({
      success: true,
      reportId: summary.reportId,
      status: summary.status,
      stagesCompleted: summary.stagesCompleted,
      incidentId: summary.incidentId,
      stageResults: summary.stageResults,
      durationMs: summary.durationMs,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
