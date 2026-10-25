import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { runReportPipeline } from "@/lib/pipeline/orchestrator";
import { IngestedEvidencePhoto, ReportSubmissionPayload } from "@/lib/pipeline/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserSession();
    const contentType = req.headers.get("content-type") || "";

    let payload: ReportSubmissionPayload;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const category = (formData.get("category") as string) || "";
      const description = (formData.get("description") as string) || "";
      const idempotencyKey = (formData.get("idempotencyKey") as string) || undefined;

      const subLat = parseFloat((formData.get("submissionLatitude") as string) || "28.4744");
      const subLng = parseFloat((formData.get("submissionLongitude") as string) || "77.5040");

      const photos: IngestedEvidencePhoto[] = [];
      const photoFiles = formData.getAll("photos") as File[];
      const gpsRaw = formData.get("gpsSamples") as string;
      const parsedGps = gpsRaw ? JSON.parse(gpsRaw) : [];

      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        if (!file || typeof file.arrayBuffer !== "function") continue;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const photoGps = parsedGps[i] || [
          {
            latitude: subLat,
            longitude: subLng,
            horizontalAccuracyMeters: 8.5,
            sampleTimestamp: new Date().toISOString(),
          },
        ];

        photos.push({
          buffer,
          filename: file.name,
          contentType: file.type || "image/jpeg",
          capturedAt: new Date().toISOString(),
          isCameraCapture: true,
          gpsSamples: photoGps,
        });
      }

      payload = {
        userId: session.userId,
        category,
        description,
        idempotencyKey,
        photos,
        submissionLocation: {
          latitude: subLat,
          longitude: subLng,
          accuracyMeters: 10,
          capturedAt: new Date().toISOString(),
        },
        deviceMetadata: {
          userAgent: req.headers.get("user-agent") || undefined,
        },
      };
    } else {
      // JSON body with base64 encoded photo buffers
      const json = await req.json();
      const photos: IngestedEvidencePhoto[] = (json.photos || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any, idx: number) => ({
          buffer: Buffer.from(p.base64 || "", "base64"),
          filename: p.filename || `photo_${idx + 1}.jpg`,
          contentType: p.contentType || "image/jpeg",
          capturedAt: p.capturedAt || new Date().toISOString(),
          isCameraCapture: p.isCameraCapture ?? true,
          gpsSamples: p.gpsSamples || [
            {
              latitude: json.submissionLocation?.latitude || 28.4744,
              longitude: json.submissionLocation?.longitude || 77.504,
              horizontalAccuracyMeters: 8,
              sampleTimestamp: new Date().toISOString(),
            },
          ],
        }),
      );

      payload = {
        userId: session.userId || json.userId,
        category: json.category,
        description: json.description,
        idempotencyKey: json.idempotencyKey,
        photos,
        submissionLocation: json.submissionLocation || {
          latitude: 28.4744,
          longitude: 77.504,
          accuracyMeters: 10,
          capturedAt: new Date().toISOString(),
        },
        deviceMetadata: json.deviceMetadata,
      };
    }

    const summary = await runReportPipeline(payload);

    return NextResponse.json({
      success: summary.stagesCompleted >= 6,
      summary,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isConnRefused = msg.includes("ECONNREFUSED") || msg.includes("connect");
    return NextResponse.json(
      {
        success: false,
        error: isConnRefused
          ? "Database service is temporarily unavailable. Please verify database connectivity."
          : msg,
        isRetryable: isConnRefused,
      },
      { status: isConnRefused ? 503 : 500 },
    );
  }
}
