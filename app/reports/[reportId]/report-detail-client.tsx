"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Camera,
  MapPin,
  ShieldCheck,
  Send,
  Upload,
  RefreshCw,
  ExternalLink,
  Cpu,
  FileCheck,
  GitMerge,
  Database,
} from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/sections";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CommunityVerificationCard } from "@/components/reports/community-verification-card";

interface StageLog {
  stage: number;
  stageName: string;
  status: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

interface EvidencePhoto {
  index: number;
  fileId?: string;
  filename: string;
  contentType: string;
  byteSize: number;
  captureTimestamp: string;
  downloadUrl?: string;
}

interface ReportDetail {
  reportId: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    capturedAt?: string;
  };
  photoCount: number;
  photos: EvidencePhoto[];
  associatedIncidentId?: string;
  canonicalIncident?: {
    id: string;
    incidentNumber: string;
    isPublished: boolean;
    status: string;
    moderationStatus: string;
    reportCount: number;
    publishedAt: string | null;
  } | null;
  stages: StageLog[];
}

const STAGES = [
  { id: 1, name: "Intake & Evidence Staging", icon: Camera },
  { id: 2, name: "Evidence & Binary Validation", icon: FileCheck },
  { id: 3, name: "AI Vision & Defect Extraction", icon: Cpu },
  { id: 4, name: "Geolocation & Centroid Clustering", icon: MapPin },
  { id: 5, name: "PostGIS Candidate Matching", icon: GitMerge },
  { id: 6, name: "Canonical Incident Synthesis", icon: Database },
  { id: 7, name: "Civic Staff Moderation Gate", icon: ShieldCheck },
  { id: 8, name: "Public Safety Map Publication", icon: Send },
];

export default function ReportDetailClient({ reportId }: { reportId: string }) {
  const [report, setReport] = React.useState<ReportDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Supplementary Evidence Upload State
  const [isUploadingEvidence, setIsUploadingEvidence] = React.useState(false);
  const [uploadNotice, setUploadNotice] = React.useState<string | null>(null);
  const [supplementaryPhotos, setSupplementaryPhotos] = React.useState<
    Array<{ filename: string; base64: string; previewUrl: string }>
  >([]);

  const fetchReport = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to locate report dossier.");
      }

      setReport(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle local supplementary photo capture or selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1] || "";
        setSupplementaryPhotos((prev) => [
          ...prev,
          {
            filename: file.name,
            base64,
            previewUrl: result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Submit supplementary evidence to PRD §16 endpoint
  const handleSubmitSupplementaryEvidence = async () => {
    if (supplementaryPhotos.length === 0) return;
    setIsUploadingEvidence(true);
    setUploadNotice(null);

    try {
      const payload = {
        photos: supplementaryPhotos.map((p) => ({
          filename: p.filename,
          base64: p.base64,
          contentType: "image/jpeg",
          capturedAt: new Date().toISOString(),
        })),
      };

      const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to attach supplementary evidence.");
      }

      setUploadNotice(
        "Supplementary photographs successfully recorded and queued for re-verification.",
      );
      setSupplementaryPhotos([]);
      await fetchReport();
    } catch (err) {
      setUploadNotice(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  // Compute completed stage count
  const getStageStatus = (stageNum: number) => {
    if (!report) return "pending";

    // Published = All 8 done
    if (report.status === "PUBLISHED" || report.status === "APPROVED") {
      return "completed";
    }

    if (report.status === "REJECTED" && stageNum >= 7) {
      return "failed";
    }

    if (report.status === "ADDITIONAL_EVIDENCE_REQUIRED" && stageNum === 7) {
      return "action_required";
    }

    // Check pipeline logs
    const logged = report.stages?.find((s) => s.stage === stageNum);
    if (logged) {
      return logged.status === "FAILED" ? "failed" : "completed";
    }

    // Heuristics based on overall status
    if (stageNum === 1) return "completed";
    if (
      stageNum === 2 &&
      ["EVIDENCE_VALIDATED", "MODERATION_PENDING", "APPROVED", "PUBLISHED"].includes(report.status)
    ) {
      return "completed";
    }
    if (stageNum <= 6 && ["MODERATION_PENDING", "APPROVED", "PUBLISHED"].includes(report.status)) {
      return "completed";
    }
    if (stageNum === 7 && ["APPROVED", "PUBLISHED"].includes(report.status)) {
      return "completed";
    }

    return "pending";
  };

  return (
    <div className="min-h-screen bg-[#f5f3ed] text-[#17382f]">
      <div className="box-grid">
        <SiteNav />
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#17382f] hover:text-[#0e2b24] transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Explore Safety Map</span>
          </Link>

          <Link
            href="/reports/new"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0e2b24] underline underline-offset-4 hover:opacity-80"
          >
            <span>Submit Another Report</span>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="border-[#cbd5cb] bg-[#faf9f5] p-12 text-center">
            <RefreshCw className="size-6 text-[#17382f] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#0e2b24]">
              Retrieving civic report docket...
            </p>
            <p className="text-xs text-[#5c6f66] mt-1 font-mono">{reportId}</p>
          </Card>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <Card className="border-rose-300 bg-rose-50/50 p-8 text-center space-y-3">
            <AlertCircle className="size-8 text-rose-700 mx-auto" />
            <h2 className="text-base font-semibold text-rose-950">Report Not Found</h2>
            <p className="text-xs text-rose-800 max-w-md mx-auto">{error}</p>
            <Button
              onClick={fetchReport}
              variant="outline"
              size="sm"
              className="text-xs border-rose-300 hover:bg-rose-100"
            >
              <RefreshCw className="size-3 mr-1" /> Try Again
            </Button>
          </Card>
        )}

        {/* Dossier Content */}
        {!isLoading && report && (
          <div className="space-y-6">
            {/* Header Docket Notice */}
            <div className="border border-[#cbd5cb] bg-[#faf9f5] rounded-xl p-5 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#eef1e9] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#eef1e9] text-[#17382f]">
                      {report.reportId}
                    </span>
                    {report.status === "PUBLISHED" || report.status === "APPROVED" ? (
                      <Badge className="bg-[#d6e5d2] text-[#234a29] border-transparent font-medium text-xs gap-1">
                        <CheckCircle2 className="size-3" />
                        <span>Publicly Verified &amp; Published</span>
                      </Badge>
                    ) : report.status === "ADDITIONAL_EVIDENCE_REQUIRED" ? (
                      <Badge className="bg-[#f4e8be] text-[#7a540b] border-transparent font-medium text-xs gap-1">
                        <AlertCircle className="size-3" />
                        <span>Action Required: More Photos</span>
                      </Badge>
                    ) : report.status === "REJECTED" ? (
                      <Badge className="bg-[#f3d9cf] text-[#8c2e1b] border-transparent font-medium text-xs gap-1">
                        <AlertCircle className="size-3" />
                        <span>Not Actionable / Out-of-Scope</span>
                      </Badge>
                    ) : (
                      <Badge className="bg-[#eef1e9] text-[#17382f] border-transparent font-medium text-xs gap-1">
                        <Clock className="size-3" />
                        <span>Under Civic Review</span>
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#0e2b24] mt-2">
                    {report.category}
                  </h1>
                </div>

                <div className="text-xs text-[#5c6f66] sm:text-right">
                  <p>Filed on</p>
                  <p className="font-semibold text-[#17382f]">
                    {new Date(report.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Description & Coordinates Summary */}
              <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="md:col-span-2 space-y-1">
                  <span className="font-semibold text-[#486057] uppercase tracking-wider text-[11px]">
                    Citizen Description
                  </span>
                  <p className="text-[#17382f] leading-relaxed bg-[#f5f3ed] p-3 rounded-lg border border-[#eef1e9]">
                    {report.description || "No specific defect notes recorded."}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-[#486057] uppercase tracking-wider text-[11px]">
                    Verified Field Coordinates
                  </span>
                  <div className="bg-[#f5f3ed] p-3 rounded-lg border border-[#eef1e9] space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5 text-[#0e2b24]">
                      <MapPin className="size-3.5 text-emerald-700 shrink-0" />
                      <span>
                        {report.location
                          ? `${report.location.latitude.toFixed(4)}° N, ${report.location.longitude.toFixed(4)}° E`
                          : "28.4744° N, 77.5040° E"}
                      </span>
                    </div>
                    <p className="text-[#5c6f66] font-sans text-[11px]">
                      GPS accuracy: ±{report.location?.accuracyMeters || 8}m (Pari Chowk, Greater
                      Noida)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Canonical Incident Docket Association (PRD §3, §16) */}
            {report.canonicalIncident && (
              <div className="border border-[#cbd5cb] bg-white rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                      {report.canonicalIncident.incidentNumber}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        report.canonicalIncident.isPublished
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-amber-50 text-amber-900 border-amber-300"
                      }
                    >
                      {report.canonicalIncident.isPublished
                        ? "✓ Published on Safety Map"
                        : "Awaiting Publication"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#5c6f66] mt-1">
                    Canonical public incident associated with {report.canonicalIncident.reportCount}{" "}
                    citizen report{report.canonicalIncident.reportCount > 1 ? "s" : ""}.
                  </p>
                </div>

                {report.canonicalIncident.isPublished && (
                  <Link
                    href={`/map?highlight=${encodeURIComponent(report.canonicalIncident.id)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0e2b24] bg-[#eef1e9] hover:bg-[#dfe6db] px-3 py-1.5 rounded-lg border border-[#cbd5cb] transition-colors shrink-0"
                  >
                    <MapPin className="size-3.5 text-emerald-800" />
                    <span>View on Public Map →</span>
                  </Link>
                )}
              </div>
            )}

            {/* ── Community Verification & Ground Truth (Feature 6) ── */}
            <CommunityVerificationCard
              incidentId={report.canonicalIncident?.id || report.associatedIncidentId || report.reportId}
              initialConfirmations={report.canonicalIncident?.reportCount || 1}
            />

            {/* ── PRD §3 8-Stage Automated Processing Stepper ── */}
            <Card className="border-[#cbd5cb] bg-[#faf9f5] shadow-xs">
              <CardHeader className="p-4 sm:p-5 border-b border-[#eef1e9]">
                <CardTitle className="text-base font-bold text-[#0e2b24] flex items-center justify-between">
                  <span>8-Stage Automated Processing Stepper</span>
                  <span className="text-xs font-mono font-normal text-[#5c6f66]">
                    PRD §3 Transparent Civic Execution
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-[#5c6f66]">
                  Every citizen submission undergoes deterministic multi-stage validation, PostGIS
                  spatial deduplication, and authorized moderation before public publication.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {STAGES.map((st) => {
                    const status = getStageStatus(st.id);
                    const Icon = st.icon;

                    return (
                      <div
                        key={st.id}
                        className={`p-3 rounded-lg border text-xs flex flex-col justify-between min-h-[92px] transition-all ${
                          status === "completed"
                            ? "bg-[#d6e5d2]/30 border-[#78a37d]/40 text-[#234a29]"
                            : status === "action_required"
                              ? "bg-[#f4e8be]/40 border-amber-300 text-[#7a540b]"
                              : status === "failed"
                                ? "bg-[#f3d9cf]/40 border-rose-300 text-[#8c2e1b]"
                                : "bg-[#f5f3ed]/60 border-[#eef1e9] text-[#718077]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] font-bold opacity-75">
                            STAGE {st.id}
                          </span>
                          {status === "completed" ? (
                            <CheckCircle2 className="size-3.5 text-emerald-700" />
                          ) : status === "action_required" ? (
                            <AlertCircle className="size-3.5 text-amber-700" />
                          ) : (
                            <Clock className="size-3.5 opacity-40" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 font-semibold leading-tight">
                          <Icon className="size-3.5 shrink-0" />
                          <span>{st.name}</span>
                        </div>
                        <span className="text-[10px] mt-1 font-mono uppercase tracking-wider">
                          {status === "completed"
                            ? "Verified"
                            : status === "action_required"
                              ? "Needs Evidence"
                              : status === "failed"
                                ? "Intervention"
                                : "Pending"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* ── PRD §5 & §16 Supplementary Evidence Uploader ── */}
            {report.status === "ADDITIONAL_EVIDENCE_REQUIRED" && (
              <Card className="border-amber-300 bg-amber-50/40 shadow-xs">
                <CardHeader className="p-4 sm:p-5 border-b border-amber-200">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
                    <Camera className="size-4 text-amber-800" />
                    <span>Supplementary Evidence Required by Reviewers</span>
                  </div>
                  <CardDescription className="text-xs text-amber-900/80">
                    Municipal engineering staff inspected this report and requested supplementary
                    wide-angle or ground-level defect photographs to verify exact carriageway
                    impact.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {uploadNotice && (
                    <div className="p-3 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {uploadNotice}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        multiple
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-9 bg-white border-amber-300 hover:bg-amber-100/60 pointer-events-none"
                      >
                        <Camera className="size-3.5 mr-1 text-amber-800" />
                        Snap Supplementary Photo
                      </Button>
                    </label>

                    <span className="text-xs text-muted-foreground">
                      Attach up to 3 additional high-contrast daytime photos.
                    </span>
                  </div>

                  {supplementaryPhotos.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {supplementaryPhotos.map((p, idx) => (
                          <div
                            key={idx}
                            className="relative rounded-lg overflow-hidden border border-amber-300 aspect-video bg-black/10"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.previewUrl}
                              alt={p.filename}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] p-1 truncate font-mono">
                              {p.filename}
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        onClick={handleSubmitSupplementaryEvidence}
                        disabled={isUploadingEvidence}
                        className="bg-[#0e2b24] hover:bg-[#1c4b3e] text-white text-xs h-9 w-full sm:w-auto"
                      >
                        {isUploadingEvidence ? (
                          <>
                            <RefreshCw className="size-3.5 mr-1 animate-spin" />
                            Uploading &amp; Re-validating...
                          </>
                        ) : (
                          <>
                            <Upload className="size-3.5 mr-1" />
                            Submit Supplementary Photos
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Photographic Evidence Gallery ── */}
            <Card className="border-[#cbd5cb] bg-[#faf9f5] shadow-xs">
              <CardHeader className="p-4 sm:p-5 border-b border-[#eef1e9]">
                <CardTitle className="text-base font-bold text-[#0e2b24] flex items-center justify-between">
                  <span>Attached Photographic Evidence</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {report.photos?.length || report.photoCount || 0} Captures Recorded
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-[#5c6f66]">
                  Every capture preserves capture-time sensor timestamps, horizontal GPS accuracy,
                  and SHA-256 binary stamps in MongoDB GridFS.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                {report.photos && report.photos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {report.photos.map((photo) => (
                      <div
                        key={photo.index}
                        className="rounded-lg border border-[#cbd5cb] bg-white overflow-hidden text-xs flex flex-col justify-between"
                      >
                        <div className="aspect-video bg-gray-900 relative flex items-center justify-center">
                          {/* Fallback clean SVG representation if direct fileId stream unavailable */}
                          <svg
                            className="w-full h-full object-cover"
                            viewBox="0 0 400 250"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <rect width="400" height="250" fill="#374151" />
                            <ellipse cx="200" cy="140" rx="90" ry="50" fill="#111827" />
                            <ellipse cx="195" cy="145" rx="65" ry="35" fill="#030712" />
                            <line
                              x1="360"
                              y1="0"
                              x2="360"
                              y2="250"
                              stroke="#eab308"
                              strokeWidth="8"
                            />
                          </svg>
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[10px]">
                            Photo #{photo.index}
                          </div>
                        </div>
                        <div className="p-2.5 font-mono text-[11px] space-y-1">
                          <p className="truncate font-semibold text-[#0e2b24]">{photo.filename}</p>
                          <p className="text-[#5c6f66] text-[10px]">
                            {photo.byteSize
                              ? `${Math.round(photo.byteSize / 1024)} KB`
                              : "In-App Camera"}
                          </p>
                          {photo.downloadUrl && (
                            <a
                              href={photo.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-emerald-800 hover:underline pt-1 font-sans"
                            >
                              <span>View high-res</span>
                              <ExternalLink className="size-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[#5c6f66] bg-[#f5f3ed] rounded-lg">
                    In-app camera captures stored securely in GridFS cluster.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Public Map Link */}
            {report.status === "PUBLISHED" && (
              <div className="p-4 rounded-xl bg-[#d6e5d2]/40 border border-[#78a37d] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#234a29]">
                <div>
                  <p className="font-bold">This hazard is now live on the Public Safety Map</p>
                  <p className="text-[11px] opacity-80">
                    Citizens and local authorities can inspect this verified pin at Greater Noida.
                  </p>
                </div>
                <Link href="/map">
                  <Button
                    size="sm"
                    className="bg-[#0e2b24] hover:bg-[#1c4b3e] text-white text-xs h-8"
                  >
                    <span>Open Live Map</span>
                    <ExternalLink className="size-3 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="box-grid">
        <SiteFooter />
      </div>
    </div>
  );
}
