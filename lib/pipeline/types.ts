/**
 * JanSahayak Processing Pipeline Types & Domain Definitions
 * Adheres strictly to PRD: Automated Citizen Report Processing, Evidence Analysis, Geolocation and Map Publication
 */

export type PipelineStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type ProcessingStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "EVIDENCE_VALIDATION_PENDING"
  | "EVIDENCE_VALIDATION_FAILED"
  | "EVIDENCE_VALIDATED"
  | "AI_ANALYSIS_PENDING"
  | "AI_ANALYSIS_FAILED"
  | "LOCATION_VERIFICATION_PENDING"
  | "LOCATION_VERIFICATION_FAILED"
  | "MATCHING_PENDING"
  | "MATCH_REVIEW_REQUIRED"
  | "INCIDENT_ASSOCIATED"
  | "MODERATION_PENDING"
  | "ADDITIONAL_EVIDENCE_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "PUBLICATION_PENDING"
  | "PUBLISHED"
  | "PROCESSING_FAILED";

export type LocationQualityBand = "HIGH" | "MEDIUM" | "LOW" | "REJECTED";

export interface GPSSample {
  latitude: number;
  longitude: number;
  horizontalAccuracyMeters: number;
  sampleTimestamp: string;
  altitudeMeters?: number;
  headingDegrees?: number;
}

export interface IngestedEvidencePhoto {
  buffer: Buffer;
  filename: string;
  contentType: string;
  capturedAt: string;
  isCameraCapture: boolean; // Must be true, gallery uploads rejected
  gpsSamples: GPSSample[];
}

export interface ReportSubmissionPayload {
  reportId?: string;
  userId: string;
  category: string;
  description: string;
  idempotencyKey?: string;
  photos: IngestedEvidencePhoto[];
  submissionLocation: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    capturedAt: string;
  };
  deviceMetadata?: {
    platform?: string;
    userAgent?: string;
    appVersion?: string;
  };
}

export interface EvidenceValidationResult {
  isValid: boolean;
  photoCount: number;
  sha256Hashes: string[];
  issues: string[];
  gridFsFileIds: string[];
}

export interface AIAnalysisResult {
  predictedCategory: string;
  severity: "low" | "medium" | "high" | "critical";
  confidenceScore: number; // 0.00 to 1.00
  defectSummary: string;
  visualCharacteristics: string[];
  usabilityAssessment: {
    isUsable: boolean;
    issuesDetected: string[];
  };
  embeddingVector: number[];
  contradictionsDetected: boolean;
  recommendedNextAction: "auto_merge" | "review_required" | "create_new";
  modelUsed: string;
}

export interface LocationVerificationResult {
  isVerified: boolean;
  centroidLatitude: number;
  centroidLongitude: number;
  spatialUncertaintyMeters: number;
  qualityBand: LocationQualityBand;
  outlierCount: number;
  samplesEvaluated: number;
  issues: string[];
}

export interface DuplicateMatchingResult {
  action: "AUTO_MERGE" | "MANUAL_REVIEW" | "CREATE_NEW";
  matchedIncidentId?: string;
  candidateCount: number;
  matchScore?: number;
  matchReason?: string;
  passedGates: string[];
  failedGates: string[];
}

export interface StageExecutionResult<T> {
  stage: PipelineStage;
  stageName: string;
  success: boolean;
  data?: T;
  error?: string;
  isRetryable?: boolean;
}
