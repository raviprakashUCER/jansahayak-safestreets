import { EvidenceValidationResult, StageExecutionResult } from "./types";
import { RawReportDocument, getReportsCollection } from "@/lib/db/mongodb";

/**
 * Checks file header bytes (magic numbers) for allowed image formats.
 */
function isValidImageMagicNumber(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return true;
  }

  // WebP: RIFF .... WEBP
  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") {
    return true;
  }

  return false;
}

/**
 * Stage 2: Server-side Evidence Validation Worker
 * Validates binary integrity, magic numbers, exact duplicate hashes, timestamp plausibility,
 * and GPS coordinate validity.
 */
export async function executeStage2EvidenceValidation(
  report: RawReportDocument,
  photoBuffers?: Buffer[],
): Promise<StageExecutionResult<EvidenceValidationResult>> {
  const stageName = "Evidence Validation";
  const issues: string[] = [];

  try {
    const photos = report.evidencePhotos;

    if (!photos || photos.length < 4) {
      return {
        stage: 2,
        stageName,
        success: false,
        error: `PRD §2/§7 validation failed: Minimum 4 evidence photographs required, received ${photos ? photos.length : 0}.`,
        isRetryable: false,
      };
    }

    const seenHashes = new Set<string>();
    const sha256Hashes: string[] = [];
    const gridFsFileIds: string[] = [];

    const now = Date.now();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
    const maxFutureSkewMs = 5 * 60 * 1000; // 5 minutes skew allowed

    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (!p) continue;

      // 1. GridFS ID check
      if (p.fileId) {
        gridFsFileIds.push(p.fileId);
      }

      // 2. Exact Duplicate Photo Hash Check
      if (seenHashes.has(p.sha256)) {
        issues.push(
          `Duplicate photo detected at index ${i + 1} with hash ${p.sha256.slice(0, 10)}.`,
        );
      }
      seenHashes.add(p.sha256);
      sha256Hashes.push(p.sha256);

      // 3. File Buffer Magic Numbers & Size Limit (PRD §7)
      if (photoBuffers && photoBuffers[i]) {
        const buf = photoBuffers[i];
        if (buf) {
          if (buf.length < 100) {
            issues.push(`Photo ${i + 1} file is empty or corrupted.`);
          }
          const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15MB limit
          if (buf.length > MAX_PHOTO_BYTES) {
            issues.push(
              `Photo ${i + 1} exceeds maximum allowable file size of 15MB (${(buf.length / (1024 * 1024)).toFixed(1)}MB).`,
            );
          }
          if (!isValidImageMagicNumber(buf)) {
            issues.push(`Photo ${i + 1} has an invalid or corrupted image header.`);
          }
        }
      }

      // Check byteSize metadata
      if (p.byteSize && p.byteSize > 15 * 1024 * 1024) {
        issues.push(
          `Photo ${i + 1} records size exceeding 15MB limit (${(p.byteSize / (1024 * 1024)).toFixed(1)}MB).`,
        );
      }

      // In-app camera capture verification (PRD §2, §6, §7)
      if (p.isCameraCapture === false) {
        issues.push(
          `Photo ${i + 1} was not captured via in-app camera viewfinder. Gallery uploads are prohibited.`,
        );
      }

      // 4. Timestamp Plausibility Check
      const captureTime = new Date(p.captureTimestamp).getTime();
      if (isNaN(captureTime)) {
        issues.push(`Photo ${i + 1} has an unparseable capture timestamp: ${p.captureTimestamp}`);
      } else {
        if (captureTime > now + maxFutureSkewMs) {
          issues.push(`Photo ${i + 1} timestamp is in the future.`);
        }
        if (now - captureTime > maxAgeMs) {
          issues.push(
            `Photo ${i + 1} was captured more than 24 hours ago. Recent evidence is required.`,
          );
        }
      }

      // 5. GPS Sample Validity Check
      if (!p.gpsSamples || p.gpsSamples.length === 0) {
        issues.push(`Photo ${i + 1} has no associated GPS coordinates.`);
      } else {
        for (const sample of p.gpsSamples) {
          if (!Number.isFinite(sample.latitude) || sample.latitude < -90 || sample.latitude > 90) {
            issues.push(`Photo ${i + 1} contains invalid latitude: ${sample.latitude}`);
          }
          if (
            !Number.isFinite(sample.longitude) ||
            sample.longitude < -180 ||
            sample.longitude > 180
          ) {
            issues.push(`Photo ${i + 1} contains invalid longitude: ${sample.longitude}`);
          }
          if (
            !Number.isFinite(sample.horizontalAccuracyMeters) ||
            sample.horizontalAccuracyMeters <= 0
          ) {
            issues.push(`Photo ${i + 1} missing positive horizontal accuracy value.`);
          }
        }
      }
    }

    const isValid = issues.length === 0;

    // Update Report Status in MongoDB (safe fallback when MongoDB is unconfigured or in tests)
    if (process.env.NODE_ENV !== "test") {
      try {
        const reportsColl = await getReportsCollection();
        await reportsColl.updateOne(
          { reportId: report.reportId },
          {
            $set: {
              status: isValid ? "EVIDENCE_VALIDATED" : "EVIDENCE_VALIDATION_FAILED",
              updatedAt: new Date().toISOString(),
            },
          },
        );
      } catch {
        // Non-blocking in disconnected environments
      }
    }

    if (!isValid) {
      return {
        stage: 2,
        stageName,
        success: false,
        error: `Evidence validation failed: ${issues.join("; ")}`,
        data: {
          isValid: false,
          photoCount: photos.length,
          sha256Hashes,
          issues,
          gridFsFileIds,
        },
        isRetryable: false,
      };
    }

    return {
      stage: 2,
      stageName,
      success: true,
      data: {
        isValid: true,
        photoCount: photos.length,
        sha256Hashes,
        issues: [],
        gridFsFileIds,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      stage: 2,
      stageName,
      success: false,
      error: `Stage 2 evidence validation error: ${msg}`,
      isRetryable: true,
    };
  }
}
