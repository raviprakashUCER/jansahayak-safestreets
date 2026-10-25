import { MongoClient, Db, GridFSBucket, ObjectId } from "mongodb";
import { createHash } from "crypto";

// Global cache for MongoClient across Next.js dev reloads
declare global {
  // eslint-disable-next-line no-var
  var __jansahayak_mongo_client__: MongoClient | undefined;
}

const uri =
  process.env.MONGODB_URI || "mongodb://mongo:mongo@localhost:27017/jansahayak?authSource=admin";
const dbName = process.env.MONGODB_DB_NAME || "jansahayak";

let client: MongoClient;

if (process.env.NODE_ENV === "development") {
  if (!global.__jansahayak_mongo_client__) {
    global.__jansahayak_mongo_client__ = new MongoClient(uri, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
    });
  }
  client = global.__jansahayak_mongo_client__;
} else {
  client = new MongoClient(uri, {
    maxPoolSize: 50,
  });
}

/**
 * Returns connected MongoDB database instance.
 */
export async function getMongoDb(): Promise<Db> {
  try {
    await client.connect();
  } catch {
    // If stale connection or connection dropped in development, instantiate fresh client
    client = new MongoClient(uri, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });
    if (process.env.NODE_ENV === "development") {
      global.__jansahayak_mongo_client__ = client;
    }
    await client.connect();
  }
  return client.db(dbName);
}

/**
 * Returns GridFS bucket configured for evidence photos.
 */
export async function getGridFSBucket(): Promise<GridFSBucket> {
  const db = await getMongoDb();
  return new GridFSBucket(db, { bucketName: "evidence_photos" });
}

/**
 * Collection helper for raw citizen report submissions.
 */
export async function getReportsCollection() {
  const db = await getMongoDb();
  return db.collection<RawReportDocument>("raw_reports");
}

/**
 * Collection helper for raw AI vision responses & embeddings.
 */
export async function getAILogsCollection() {
  const db = await getMongoDb();
  return db.collection<AILogDocument>("ai_analysis_logs");
}

/**
 * Collection helper for granular pipeline job execution history.
 */
export async function getPipelineLogsCollection() {
  const db = await getMongoDb();
  return db.collection<PipelineJobLogDocument>("pipeline_job_logs");
}

/**
 * Helper to compute SHA-256 hash of photo buffer for duplicate detection.
 */
export function computeBufferSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Uploads an evidence photo directly to GridFS with capture telemetry metadata.
 */
export async function uploadEvidencePhotoToGridFS(params: {
  buffer: Buffer;
  filename: string;
  reportId: string;
  photoIndex: number;
  contentType: string;
  isCameraCapture?: boolean;
  gps: {
    latitude: number;
    longitude: number;
    horizontalAccuracyMeters: number;
    capturedAt: string;
  };
}): Promise<{ fileId: string; sha256: string; length: number }> {
  const bucket = await getGridFSBucket();
  const sha256 = computeBufferSha256(params.buffer);

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(params.filename, {
      metadata: {
        contentType: params.contentType,
        reportId: params.reportId,
        photoIndex: params.photoIndex,
        isCameraCapture: params.isCameraCapture,
        sha256,
        gps: params.gps,
        uploadedAt: new Date().toISOString(),
      },
    });

    uploadStream.on("error", (error) => reject(error));
    uploadStream.on("finish", () => {
      resolve({
        fileId: uploadStream.id.toString(),
        sha256,
        length: params.buffer.length,
      });
    });

    uploadStream.end(params.buffer);
  });
}

/**
 * Downloads an evidence photo from GridFS into a Buffer.
 */
export async function downloadEvidencePhotoFromGridFS(fileId: string): Promise<Buffer> {
  const bucket = await getGridFSBucket();
  const objectId = new ObjectId(fileId);
  const downloadStream = bucket.openDownloadStream(objectId);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    downloadStream.on("data", (chunk) => chunks.push(chunk));
    downloadStream.on("error", (err) => reject(err));
    downloadStream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

// Interfaces for MongoDB Documents

export interface PhotoCaptureRecord {
  fileId?: string; // GridFS file ID
  sha256: string;
  filename: string;
  contentType: string;
  byteSize: number;
  captureTimestamp: string;
  isCameraCapture?: boolean;
  gpsSamples: Array<{
    latitude: number;
    longitude: number;
    horizontalAccuracyMeters: number;
    sampleTimestamp: string;
    altitudeMeters?: number;
    headingDegrees?: number;
  }>;
}

export interface RawReportDocument {
  _id?: ObjectId;
  reportId: string;
  userId: string;
  category: string;
  description: string;
  idempotencyKey?: string;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "EVIDENCE_VALIDATED"
    | "EVIDENCE_VALIDATION_FAILED"
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
    | "SUSPENDED"
    | "PUBLICATION_PENDING"
    | "PUBLISHED"
    | "PROCESSING_FAILED";
  evidencePhotos: PhotoCaptureRecord[];
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
  associatedIncidentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AILogDocument {
  _id?: ObjectId;
  reportId: string;
  provider: "openrouter" | "mock";
  model: string;
  rawResponse: Record<string, unknown>;
  structuredExtraction: {
    predictedCategory: string;
    severity: "low" | "medium" | "high" | "critical";
    confidenceScore: number;
    defectSummary: string;
    visualCharacteristics: string[];
    usabilityAssessment: {
      isUsable: boolean;
      issuesDetected: string[];
    };
    embeddingVector?: number[]; // Feature vector representation for visual similarity
    contradictionsDetected?: boolean;
    recommendedNextAction: "auto_merge" | "review_required" | "create_new";
  };
  tokensUsed?: number;
  durationMs: number;
  analyzedAt: string;
}

export interface PipelineJobLogDocument {
  _id?: ObjectId;
  reportId: string;
  stage: number;
  stageName: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED" | "WARNING";
  details: Record<string, unknown>;
  timestamp: string;
}
