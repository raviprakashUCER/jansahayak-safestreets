import { ReportSubmissionPayload, StageExecutionResult } from "./types";
import { executeStage1Intake } from "./intake";
import { executeStage2EvidenceValidation } from "./evidence-validation";
import { executeStage3AIAnalysis } from "./ai-analysis";
import { executeStage4LocationVerification } from "./location-verification";
import { executeStage5DuplicateMatching } from "./duplicate-matching";
import { executeStage6CanonicalIncident } from "./canonical-incident";
import { executeStage7Moderation, ModerationDecision } from "./moderation";
import { executeStage8Publication } from "./publication";
import { processOutboxBatch } from "./worker";
import { getPipelineLogsCollection } from "@/lib/db/mongodb";
import { db, incidents } from "@/lib/db";
import { eq } from "drizzle-orm";

export interface PipelineExecutionSummary {
  reportId: string;
  incidentId?: string;
  incidentNumber?: string;
  status: string;
  stagesCompleted: number;
  stageResults: Array<StageExecutionResult<unknown>>;
  isPublished: boolean;
  durationMs: number;
}

/**
 * End-to-End Automated Pipeline Orchestrator
 * Coordinates Stages 1 through 6 upon report submission, managing MongoDB documents,
 * PostGIS spatial calculations, and PostgreSQL canonical records.
 */
export async function runReportPipeline(
  payload: ReportSubmissionPayload,
): Promise<PipelineExecutionSummary> {
  const startTime = Date.now();
  const stageResults: Array<StageExecutionResult<unknown>> = [];
  const pipelineLogsColl = await getPipelineLogsCollection();

  async function logStage(res: StageExecutionResult<unknown>, reportId: string) {
    stageResults.push(res);
    try {
      await pipelineLogsColl.insertOne({
        reportId,
        stage: res.stage,
        stageName: res.stageName,
        status: res.success ? "SUCCESS" : "FAILED",
        details: { data: res.data, error: res.error },
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Non-blocking log persistence
    }
  }

  // --- STAGE 1: Report Submission & GridFS Intake ---
  const s1 = await executeStage1Intake(payload);
  if (!s1.success || !s1.data) {
    await logStage(s1, payload.reportId || "unknown");
    return {
      reportId: payload.reportId || "unknown",
      status: "INTAKE_FAILED",
      stagesCompleted: 0,
      stageResults,
      isPublished: false,
      durationMs: Date.now() - startTime,
    };
  }

  const { reportId, document } = s1.data;
  await logStage(s1, reportId);

  // PRD §1, §6, §19 Idempotency Guard:
  // If report has already completed downstream stages and is linked to an incident, short-circuit
  if (
    document.associatedIncidentId &&
    document.status !== "SUBMITTED" &&
    document.status !== "DRAFT"
  ) {
    try {
      const [existingIncident] = await db
        .select()
        .from(incidents)
        .where(eq(incidents.id, document.associatedIncidentId))
        .limit(1);

      if (existingIncident) {
        return {
          reportId,
          incidentId: existingIncident.id,
          incidentNumber: existingIncident.incidentNumber,
          status: existingIncident.status,
          stagesCompleted: 6,
          stageResults,
          isPublished: existingIncident.isPublished,
          durationMs: Date.now() - startTime,
        };
      }
    } catch {
      // Non-blocking fallback
    }
  }

  // Extract photo buffers for downstream validation & AI
  const photoBuffers = payload.photos.map((p) => p.buffer);

  // --- STAGE 2: Server-side Evidence Validation ---
  const s2 = await executeStage2EvidenceValidation(document, photoBuffers);
  await logStage(s2, reportId);
  if (!s2.success || !s2.data?.isValid) {
    return {
      reportId,
      status: "EVIDENCE_VALIDATION_FAILED",
      stagesCompleted: 1,
      stageResults,
      isPublished: false,
      durationMs: Date.now() - startTime,
    };
  }

  // --- STAGE 3: AI Evidence Analysis (OpenRouter) ---
  const s3 = await executeStage3AIAnalysis(document, photoBuffers);
  await logStage(s3, reportId);
  if (!s3.success || !s3.data) {
    return {
      reportId,
      status: "AI_ANALYSIS_FAILED",
      stagesCompleted: 2,
      stageResults,
      isPublished: false,
      durationMs: Date.now() - startTime,
    };
  }
  const aiAnalysis = s3.data;

  // --- STAGE 4: Location Verification & Clustering ---
  const s4 = await executeStage4LocationVerification(document);
  await logStage(s4, reportId);
  if (!s4.success || !s4.data || !s4.data.isVerified) {
    return {
      reportId,
      status: "LOCATION_VERIFICATION_FAILED",
      stagesCompleted: 3,
      stageResults,
      isPublished: false,
      durationMs: Date.now() - startTime,
    };
  }
  const location = s4.data;

  // --- STAGE 5: PostGIS Candidate Discovery & Duplicate Matching ---
  const s5 = await executeStage5DuplicateMatching(document, location, aiAnalysis);
  await logStage(s5, reportId);
  if (!s5.success || !s5.data) {
    return {
      reportId,
      status: "MATCHING_FAILED",
      stagesCompleted: 4,
      stageResults,
      isPublished: false,
      durationMs: Date.now() - startTime,
    };
  }
  const matching = s5.data;

  // --- STAGE 6: Canonical Incident & Location Synthesis (PostgreSQL + PostGIS) ---
  const s6 = await executeStage6CanonicalIncident(document, location, aiAnalysis, matching);
  await logStage(s6, reportId);
  if (!s6.success || !s6.data) {
    return {
      reportId,
      status: "INCIDENT_SYNTHESIS_FAILED",
      stagesCompleted: 5,
      stageResults,
      isPublished: false,
      durationMs: Date.now() - startTime,
    };
  }

  const { incidentId, incident } = s6.data;

  // Asynchronously trigger transactional outbox processing post-commit (PRD §4)
  void processOutboxBatch().catch((err) => {
    console.warn("Asynchronous outbox dispatch caught error:", err);
  });

  return {
    reportId,
    incidentId,
    incidentNumber: incident.incidentNumber,
    status: incident.status,
    stagesCompleted: 6,
    stageResults,
    isPublished: incident.isPublished,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Handles Stage 7 Moderation Action and triggers Stage 8 Publication if approved.
 */
export async function reviewAndPublishIncident(params: {
  incidentId: string;
  moderatorId: string;
  decision: ModerationDecision;
  reason?: string;
  notes?: string;
  correctedLocation?: {
    latitude: number;
    longitude: number;
  };
}) {
  // Execute Stage 7: Moderation Review
  const s7 = await executeStage7Moderation(params);
  if (!s7.success || !s7.data) {
    return {
      stage7: s7,
      stage8: null,
      success: false,
      error: s7.error,
    };
  }

  // If approved, trigger Stage 8: Transactional Publication
  if (params.decision === "approve") {
    const s8 = await executeStage8Publication({
      incidentId: params.incidentId,
      publishedBy: params.moderatorId,
    });

    // Asynchronously trigger post-publication outbox dispatch (PRD §4)
    if (s8.success) {
      void processOutboxBatch().catch((err) => {
        console.warn("Asynchronous outbox post-publication dispatch caught error:", err);
      });
    }

    return {
      stage7: s7,
      stage8: s8,
      success: s8.success,
      incident: s8.data?.incident || s7.data.incident,
    };
  }

  return {
    stage7: s7,
    stage8: null,
    success: true,
    incident: s7.data.incident,
  };
}
