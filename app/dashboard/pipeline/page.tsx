"use client";

import * as React from "react";
import {
  Workflow,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  Camera,
  Cpu,
  MapPin,
  GitMerge,
  ShieldCheck,
  Send,
  RefreshCw,
  FileCheck,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StageResult {
  stage: number;
  stageName: string;
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

interface PipelineResponse {
  reportId: string;
  incidentId?: string;
  incidentNumber?: string;
  status: string;
  stagesCompleted: number;
  stageResults: StageResult[];
  isPublished: boolean;
  durationMs: number;
}

export default function PipelineInspectionPage() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [pipelineData, setPipelineData] = React.useState<PipelineResponse | null>(null);
  const [category, setCategory] = React.useState("Road Surface / Pothole");
  const [description, setDescription] = React.useState(
    "Deep cavity across westbound lane near Pari Chowk junction. Significant tire damage hazard for two-wheelers and night traffic.",
  );
  const [moderationDecision, setModerationDecision] = React.useState<string | null>(null);
  const [isModerating, setIsModerating] = React.useState(false);
  const [publicationResult, setPublicationResult] = React.useState<Record<string, unknown> | null>(
    null,
  );
  const [outboxData, setOutboxData] = React.useState<{
    counts: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
      totalRecent: number;
    };
    events: Array<{
      id: string;
      eventType: string;
      aggregateId: string;
      status: string;
      createdAt: string;
    }>;
  } | null>(null);
  const [isProcessingOutbox, setIsProcessingOutbox] = React.useState(false);
  const [outboxWorkerResult, setOutboxWorkerResult] = React.useState<Record<
    string,
    unknown
  > | null>(null);

  const fetchOutboxStatus = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/outbox");
      const json = await res.json();
      if (json.success) {
        setOutboxData(json);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  React.useEffect(() => {
    fetchOutboxStatus();
  }, [fetchOutboxStatus]);

  const handleTriggerOutboxWorker = async () => {
    setIsProcessingOutbox(true);
    setOutboxWorkerResult(null);
    try {
      const res = await fetch("/api/cron/process-outbox?batch=25", { method: "POST" });
      const json = await res.json();
      setOutboxWorkerResult(json);
      await fetchOutboxStatus();
    } catch (err) {
      setOutboxWorkerResult({ error: String(err) });
    } finally {
      setIsProcessingOutbox(false);
    }
  };

  // Generate 4 synthetic JPEG test buffers (each with valid JPEG headers 0xFF, 0xD8, 0xFF)
  const createMockPhoto = (name: string, index: number) => {
    // Valid minimal JPEG binary buffer encoded as base64
    // FF D8 FF DB (JPEG header) + dummy bytes
    const bytes = new Uint8Array(6000);
    bytes[0] = 0xff;
    bytes[1] = 0xd8;
    bytes[2] = 0xff;
    bytes[3] = 0xe0;
    for (let i = 4; i < 6000; i++) {
      bytes[i] = (i + index * 37) % 256;
    }
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(bytes)));

    return {
      filename: `${name}_${index + 1}.jpg`,
      base64,
      contentType: "image/jpeg",
      capturedAt: new Date(Date.now() - (4 - index) * 45000).toISOString(),
      isCameraCapture: true,
      gpsSamples: [
        {
          latitude: 28.4744 + index * 0.00003,
          longitude: 77.504 + index * 0.00004,
          horizontalAccuracyMeters: 6.5 + index * 0.8,
          sampleTimestamp: new Date(Date.now() - (4 - index) * 45000).toISOString(),
        },
      ],
    };
  };

  const runPipelineSimulation = async () => {
    setIsRunning(true);
    setModerationDecision(null);
    setPublicationResult(null);

    try {
      const photos = [
        createMockPhoto("pothole_angle_wide", 0),
        createMockPhoto("pothole_depth_macro", 1),
        createMockPhoto("pothole_curb_context", 2),
        createMockPhoto("pothole_traffic_orientation", 3),
      ];

      const res = await fetch("/api/pipeline/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "citizen_dev",
          category,
          description,
          photos,
          submissionLocation: {
            latitude: 28.4744,
            longitude: 77.504,
            accuracyMeters: 8.0,
            capturedAt: new Date().toISOString(),
          },
        }),
      });

      const json = await res.json();
      if (json.summary) {
        setPipelineData(json.summary);
      }
    } catch (err) {
      console.error("Pipeline run error:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleModeration = async (decision: "approve" | "reject" | "request_evidence") => {
    if (!pipelineData?.incidentId) return;
    setIsModerating(true);

    try {
      const res = await fetch("/api/pipeline/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: pipelineData.incidentId,
          decision,
          reason:
            decision === "reject"
              ? "Duplicate defect already undergoing contractor surfacing."
              : "Field evidence verified by municipality inspector.",
          notes: "Processed via JanSahayak PRD Pipeline Engine.",
        }),
      });

      const json = await res.json();
      setModerationDecision(decision);
      setPublicationResult(json);

      if (json.incident) {
        setPipelineData((prev) =>
          prev
            ? {
                ...prev,
                status: json.incident.status,
                isPublished: json.incident.isPublished,
              }
            : null,
        );
      }
    } catch (err) {
      console.error("Moderation error:", err);
    } finally {
      setIsModerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-foreground tracking-tight">
              PRD Processing Pipeline & Architecture
            </h1>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:border-emerald-800 text-xs"
            >
              Stages 1–8 Active
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Automated citizen report intake, MongoDB GridFS evidence storage, OpenRouter AI vision
            analysis, PostGIS spatial clustering, strict deduplication, and transactional map
            publication.
          </p>
        </div>

        <Button
          onClick={runPipelineSimulation}
          disabled={isRunning}
          className="gap-2 bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm w-full sm:w-auto h-10 sm:h-9 justify-center shrink-0"
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Executing Pipeline...</span>
            </>
          ) : (
            <>
              <Workflow className="h-4 w-4" />
              <span>Run Pipeline Simulation</span>
            </>
          )}
        </Button>
      </div>

      {/* Architecture Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card shadow-xs border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                PostgreSQL + PostGIS
              </span>
              <Database className="h-4 w-4 text-emerald-600" />
            </div>
            <CardTitle className="text-sm font-semibold">Structured & Geospatial</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Drizzle ORM schema managing <code className="text-foreground font-mono">incidents</code>
            , PostGIS <code className="text-foreground font-mono">canonical_geom</code>, outbox
            events, and moderation audits.
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                MongoDB & GridFS
              </span>
              <Layers className="h-4 w-4 text-emerald-600" />
            </div>
            <CardTitle className="text-sm font-semibold">Unstructured & Media</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Native GridFS bucket streaming 4+ camera evidence photos, SHA-256 deduplication, raw
            citizen submissions, and AI execution traces.
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                OpenRouter AI
              </span>
              <Cpu className="h-4 w-4 text-emerald-600" />
            </div>
            <CardTitle className="text-sm font-semibold">Vision & Analysis</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Multi-image structured extraction, hazard classification, defect severity, usability
            checking, and visual similarity embeddings.
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs border-border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Clerk JS Auth
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <CardTitle className="text-sm font-semibold">RBAC & Webhooks</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Role gating (<code className="text-foreground font-mono">citizen</code>,{" "}
            <code className="text-foreground font-mono">moderator</code>,{" "}
            <code className="text-foreground font-mono">admin</code>) and automated user sync via
            Webhooks into PostgreSQL.
          </CardContent>
        </Card>
      </div>

      {/* PRD §18 Transactional Outbox Telemetry & Worker Controls */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <RefreshCw
                  className={`h-4 w-4 text-emerald-600 ${isProcessingOutbox ? "animate-spin" : ""}`}
                />
                Transactional Outbox Queue &amp; Worker Telemetry
              </CardTitle>
              <CardDescription className="text-xs">
                PRD §4 &amp; §18 asynchronous post-commit event queue with guaranteed delivery and
                retry backoff.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOutboxStatus}
                className="text-xs h-8"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleTriggerOutboxWorker}
                disabled={isProcessingOutbox}
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs h-8"
              >
                {isProcessingOutbox ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Process Outbox Batch
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-md bg-muted/40 border border-border">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Pending
              </p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {outboxData?.counts.pending ?? 0}
              </p>
            </div>
            <div className="p-2.5 rounded-md bg-muted/40 border border-border">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Processing
              </p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {outboxData?.counts.processing ?? 0}
              </p>
            </div>
            <div className="p-2.5 rounded-md bg-muted/40 border border-border">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Completed
              </p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {outboxData?.counts.completed ?? 0}
              </p>
            </div>
            <div className="p-2.5 rounded-md bg-muted/40 border border-border">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Dead-Letter / Failed
              </p>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                {outboxData?.counts.failed ?? 0}
              </p>
            </div>
          </div>

          {outboxWorkerResult && (
            <div className="p-2.5 rounded bg-muted/60 text-xs font-mono">
              <span className="font-semibold text-foreground">Worker Dispatch Result: </span>
              <pre className="text-[11px] text-muted-foreground overflow-x-auto mt-1">
                {JSON.stringify(outboxWorkerResult, null, 2)}
              </pre>
            </div>
          )}

          {outboxData?.events && outboxData.events.length > 0 && (
            <div className="border border-border rounded-md overflow-hidden text-xs">
              <div className="bg-muted/50 px-3 py-1.5 font-semibold text-muted-foreground border-b border-border flex justify-between">
                <span>Recent Outbox Events</span>
                <span>{outboxData.events.length} Recorded</span>
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-border font-mono text-[11px]">
                {outboxData.events.map((evt) => (
                  <div key={evt.id} className="p-2 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="font-semibold text-foreground">{evt.eventType}</span>
                      <span className="text-muted-foreground ml-2">ID: {evt.aggregateId}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        evt.status === "completed"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : evt.status === "failed"
                            ? "bg-rose-50 text-rose-800 border-rose-300"
                            : "bg-amber-50 text-amber-800 border-amber-300"
                      }`}
                    >
                      {evt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simulation Controls */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Simulation Input Parameters</CardTitle>
          <CardDescription className="text-xs">
            Configure the test report payload to witness how the PRD pipeline processes evidence,
            detects duplicates, and calculates canonical locations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="category-select"
                className="text-xs font-medium text-foreground block mb-1"
              >
                Problem Category
              </label>
              <select
                id="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option>Road Surface / Pothole</option>
                <option>Broken Footpath / Pavement</option>
                <option>Street Lighting / Darkness</option>
                <option>Drainage / Manhole</option>
                <option>Visibility / Obstruction</option>
              </select>
            </div>
            <div>
              <span className="text-xs font-medium text-foreground block mb-1">
                Pilot Coordinate & In-App Photos
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-xs border border-border rounded-md px-3 py-2 bg-muted/40">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span className="font-mono text-foreground break-all">
                    28.4744° N, 77.5040° E
                  </span>
                </div>
                <span className="sm:ml-auto text-muted-foreground text-[11px]">
                  4 Camera Photos (Pari Chowk)
                </span>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="desc-input" className="text-xs font-medium text-foreground block mb-1">
              Citizen Description
            </label>
            <input
              id="desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      {/* Execution Results View */}
      {pipelineData ? (
        <div className="space-y-5 animate-in fade-in-50 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 gap-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Pipeline Completed: {pipelineData.stagesCompleted} Stages Executed in{" "}
                  {pipelineData.durationMs}ms
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  Report ID: {pipelineData.reportId} | Incident:{" "}
                  {pipelineData.incidentNumber || "Pending"} | Status: {pipelineData.status}
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-800 text-white self-start sm:self-center">
              {pipelineData.isPublished ? "Publicly Published" : "Ready for Moderation"}
            </Badge>
          </div>

          {/* 8-Stage Progress Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pipelineData.stageResults.map((st) => (
              <Card key={st.stage} className="border-border">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      STAGE {st.stage}
                    </span>
                    {st.success ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]"
                      >
                        Passed
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">
                        Failed
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    {st.stage === 1 && <Camera className="h-4 w-4 text-emerald-600" />}
                    {st.stage === 2 && <FileCheck className="h-4 w-4 text-emerald-600" />}
                    {st.stage === 3 && <Cpu className="h-4 w-4 text-emerald-600" />}
                    {st.stage === 4 && <MapPin className="h-4 w-4 text-emerald-600" />}
                    {st.stage === 5 && <GitMerge className="h-4 w-4 text-emerald-600" />}
                    {st.stage === 6 && <Database className="h-4 w-4 text-emerald-600" />}
                    {st.stage === 7 && <ShieldCheck className="h-4 w-4 text-emerald-600" />}
                    {st.stage === 8 && <Send className="h-4 w-4 text-emerald-600" />}
                    {st.stageName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  {st.error ? (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">{st.error}</p>
                  ) : (
                    <div className="bg-muted/40 rounded p-2.5 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-40">
                      <pre>{JSON.stringify(st.data, null, 2)}</pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Moderation & Stage 8 Publication Actions */}
          {pipelineData.incidentId && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    Stage 7 & 8: Moderator Review Docket
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    Human-in-the-Loop Gate
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Review the candidate incident created in PostgreSQL. Approving evaluates the PRD
                  Stage 8 Publication Eligibility Predicate and publishes the pin atomically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2.5">
                  <Button
                    onClick={() => handleModeration("approve")}
                    disabled={isModerating || pipelineData.isPublished}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs h-10 sm:h-8 justify-center"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    <span>Approve &amp; Publish to Map</span>
                  </Button>
                  <Button
                    onClick={() => handleModeration("reject")}
                    disabled={isModerating || pipelineData.isPublished}
                    variant="outline"
                    className="text-rose-700 hover:bg-rose-50 text-xs h-10 sm:h-8 border-rose-200 justify-center"
                  >
                    <AlertCircle className="h-3.5 w-3.5 mr-1" />
                    <span>Reject Incident</span>
                  </Button>
                  <Button
                    onClick={() => handleModeration("request_evidence")}
                    disabled={isModerating || pipelineData.isPublished}
                    variant="outline"
                    className="text-xs h-10 sm:h-8 justify-center"
                  >
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    <span>Request Additional Photos</span>
                  </Button>
                </div>

                {moderationDecision && publicationResult && (
                  <div className="mt-3 p-3 rounded bg-muted/60 text-xs font-mono">
                    <p className="font-semibold text-foreground mb-1">
                      Decision Recorded: {moderationDecision.toUpperCase()}
                    </p>
                    <pre className="text-[11px] text-muted-foreground overflow-x-auto">
                      {JSON.stringify(publicationResult, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-dashed border-border bg-muted/20">
          <CardContent className="p-10 text-center space-y-3">
            <Workflow className="h-10 w-10 text-muted-foreground/60 mx-auto" />
            <h3 className="text-base font-semibold text-foreground">
              Pipeline Ready for Execution
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Click &quot;Run Pipeline Simulation&quot; above to trigger Stages 1 through 6. The
              engine will stream 4 camera photos to MongoDB GridFS, compute AI embeddings, query
              PostGIS within 30m, and synthesize a canonical incident in PostgreSQL.
            </p>
            <Button
              onClick={runPipelineSimulation}
              disabled={isRunning}
              className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs"
            >
              Start Simulation Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
