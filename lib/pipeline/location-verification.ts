import { LocationQualityBand, LocationVerificationResult, StageExecutionResult } from "./types";
import { RawReportDocument, getReportsCollection } from "@/lib/db/mongodb";

/**
 * Calculates geodesic distance between two coordinates in meters using the Haversine formula.
 */
export function calculateGeodesicDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Stage 4: Geodesic Location Verification & Outlier Clustering Worker
 * Aggregates capture-time GPS samples, removes spatial outliers, computes sensor-weighted
 * centroid, and assigns PRD quality bands.
 */
export async function executeStage4LocationVerification(
  report: RawReportDocument,
): Promise<StageExecutionResult<LocationVerificationResult>> {
  const stageName = "Location Verification & Geodesic Clustering";
  const issues: string[] = [];

  try {
    const rawSamples: Array<{
      latitude: number;
      longitude: number;
      accuracy: number;
    }> = [];

    // Collect all capture-time GPS samples across all evidence photos
    for (const photo of report.evidencePhotos) {
      if (photo.gpsSamples && photo.gpsSamples.length > 0) {
        for (const sample of photo.gpsSamples) {
          if (
            Number.isFinite(sample.latitude) &&
            Number.isFinite(sample.longitude) &&
            sample.latitude >= -90 &&
            sample.latitude <= 90 &&
            sample.longitude >= -180 &&
            sample.longitude <= 180
          ) {
            // Cap horizontal accuracy between 2m (optimistic phone GPS) and 100m
            const acc = Math.max(2, Math.min(100, sample.horizontalAccuracyMeters || 15));
            rawSamples.push({
              latitude: sample.latitude,
              longitude: sample.longitude,
              accuracy: acc,
            });
          }
        }
      }
    }

    if (rawSamples.length === 0) {
      issues.push("No valid capture-time GPS coordinates found in submitted evidence.");
      return {
        stage: 4,
        stageName,
        success: false,
        error: "Location verification failed: Zero valid GPS samples.",
        isRetryable: false,
      };
    }

    // Preliminary Median/Centroid for Outlier Detection
    const medLat = rawSamples.reduce((s, p) => s + p.latitude, 0) / rawSamples.length;
    const medLng = rawSamples.reduce((s, p) => s + p.longitude, 0) / rawSamples.length;

    // Reject samples with distance > 100m from cluster median (likely GPS teleport/glitch)
    const validSamples: typeof rawSamples = [];
    let outlierCount = 0;

    for (const sample of rawSamples) {
      const dist = calculateGeodesicDistanceMeters(
        medLat,
        medLng,
        sample.latitude,
        sample.longitude,
      );
      if (dist <= 100) {
        validSamples.push(sample);
      } else {
        outlierCount++;
      }
    }

    if (validSamples.length === 0) {
      return {
        stage: 4,
        stageName,
        success: false,
        error: "All GPS samples were rejected as inconsistent or dispersed spatial outliers.",
        isRetryable: false,
      };
    }

    // Inverse-variance weighting: w_i = 1 / (accuracy_i ^ 2)
    let totalWeight = 0;
    let weightedLatSum = 0;
    let weightedLngSum = 0;

    for (const s of validSamples) {
      const weight = 1 / (s.accuracy * s.accuracy);
      totalWeight += weight;
      weightedLatSum += s.latitude * weight;
      weightedLngSum += s.longitude * weight;
    }

    const centroidLatitude = Number((weightedLatSum / totalWeight).toFixed(7));
    const centroidLongitude = Number((weightedLngSum / totalWeight).toFixed(7));

    // Calculate maximum spread (radius in meters) from centroid among valid samples
    let maxSpreadMeters = 0;
    let avgAccuracy = 0;

    for (const s of validSamples) {
      const dist = calculateGeodesicDistanceMeters(
        centroidLatitude,
        centroidLongitude,
        s.latitude,
        s.longitude,
      );
      if (dist > maxSpreadMeters) maxSpreadMeters = dist;
      avgAccuracy += s.accuracy;
    }

    avgAccuracy /= validSamples.length;

    // Combined spatial uncertainty = max sample spread + average sensor horizontal accuracy
    const spatialUncertaintyMeters = Number(
      Math.max(avgAccuracy, maxSpreadMeters + avgAccuracy * 0.5).toFixed(2),
    );

    // Quality Band Evaluation (PRD Section 9)
    let qualityBand: LocationQualityBand = "HIGH";
    if (spatialUncertaintyMeters <= 10) {
      qualityBand = "HIGH";
    } else if (spatialUncertaintyMeters <= 25) {
      qualityBand = "MEDIUM";
    } else if (spatialUncertaintyMeters <= 50) {
      qualityBand = "LOW";
      issues.push("Medium/Low GPS precision requires manual location verification.");
    } else {
      qualityBand = "REJECTED";
      issues.push(
        `High spatial uncertainty (${spatialUncertaintyMeters}m > 50m). Automatic public pin prohibited.`,
      );
    }

    const result: LocationVerificationResult = {
      isVerified: qualityBand !== "REJECTED",
      centroidLatitude,
      centroidLongitude,
      spatialUncertaintyMeters,
      qualityBand,
      outlierCount,
      samplesEvaluated: rawSamples.length,
      issues,
    };

    // Update report status in MongoDB
    const reportsColl = await getReportsCollection();
    await reportsColl.updateOne(
      { reportId: report.reportId },
      {
        $set: {
          status: result.isVerified ? "MATCHING_PENDING" : "LOCATION_VERIFICATION_FAILED",
          updatedAt: new Date().toISOString(),
        },
      },
    );

    return {
      stage: 4,
      stageName,
      success: result.isVerified,
      data: result,
      error: !result.isVerified ? issues.join("; ") : undefined,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      stage: 4,
      stageName,
      success: false,
      error: `Stage 4 location verification failed: ${msg}`,
      isRetryable: false,
    };
  }
}
