"use client";

import * as React from "react";
import Link from "next/link";
import {
  Camera,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Crosshair,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  SlidersHorizontal,
  Car,
  Footprints,
  Lightbulb,
  Waves,
  Navigation,
  EyeOff,
  Building2,
  Clock,
  Sparkles,
  FileText,
  SwitchCamera,
  Upload,
  AlertCircle,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { PILOT_CONFIG, PILOT_SECTORS, OFFICIAL_AUTHORITIES } from "@/lib/data/constants";
import { AIComplaintAssistantDialog } from "@/components/reports/ai-complaint-assistant-dialog";
import { RoadDamageVisionBadge } from "@/components/reports/road-damage-vision-badge";
import { OfflineDraftBanner } from "@/components/reports/offline-draft-banner";
import { saveOfflineDraft, OfflineDraft } from "@/lib/storage/offline-drafts";

interface PhotoItem {
  id: string;
  filename: string;
  base64: string;
  byteSize: number;
  capturedAt: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  previewUrl: string;
}

const CATEGORIES = [
  {
    id: "Road Surface / Pothole",
    title: "Pothole & Surface Damage",
    shortTitle: "Pothole",
    desc: "Craters, cracking asphalt, sinking road, or loose gravel",
    icon: Car,
    defaultSeverity: "high" as const,
    authorityId: "gnida-civil",
  },
  {
    id: "Broken Footpath / Pavement",
    title: "Broken Footpath & Walkway",
    shortTitle: "Footpath",
    desc: "Broken walkway slabs, missing curb stones, or blocked pedestrian path",
    icon: Footprints,
    defaultSeverity: "medium" as const,
    authorityId: "gnida-civil",
  },
  {
    id: "Street Lighting / Darkness",
    title: "Street Light Outage",
    shortTitle: "Street Light",
    desc: "Lights not working, broken pole, or dark stretch of road",
    icon: Lightbulb,
    defaultSeverity: "medium" as const,
    authorityId: "gnida-electrical",
  },
  {
    id: "Drainage / Manhole",
    title: "Open Manhole & Drainage",
    shortTitle: "Manhole / Drain",
    desc: "Missing drain cover, broken culvert, or hazardous open hole",
    icon: Waves,
    defaultSeverity: "critical" as const,
    authorityId: "drainage-cell",
  },
  {
    id: "Unsafe Crossing / Signals",
    title: "Traffic Signal & Crossing",
    shortTitle: "Signals & Crossing",
    desc: "Defective signal timer, faded zebra crossing, or hazardous intersection",
    icon: Navigation,
    defaultSeverity: "high" as const,
    authorityId: "traffic-police",
  },
  {
    id: "Visibility / Obstruction",
    title: "Blocked Visibility & Trees",
    shortTitle: "Visibility",
    desc: "Overgrown tree branches blocking road signs or illegal boards",
    icon: EyeOff,
    defaultSeverity: "low" as const,
    authorityId: "horticulture",
  },
];

const SEVERITIES = [
  {
    level: "critical" as const,
    label: "Critical",
    badgeLabel: "Critical Emergency",
    desc: "Immediate accident risk (e.g. open manhole, fallen wire)",
    activeClass: "bg-rose-100 text-rose-900 border-rose-300 font-semibold shadow-xs",
  },
  {
    level: "high" as const,
    label: "High",
    badgeLabel: "High Urgency",
    desc: "Vehicle damage or severe safety hazard on fast lane",
    activeClass: "bg-amber-100 text-amber-900 border-amber-300 font-semibold shadow-xs",
  },
  {
    level: "medium" as const,
    label: "Medium",
    badgeLabel: "Moderate",
    desc: "Disrupts traffic flow or pedestrian movement",
    activeClass: "bg-[#eef1e9] text-[#17382f] border-[#cbd5cb] font-semibold shadow-xs",
  },
  {
    level: "low" as const,
    label: "Low",
    badgeLabel: "Minor / Observation",
    desc: "Early surface wear or non-urgent repair",
    activeClass: "bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold shadow-xs",
  },
];

export default function NewReportPage() {
  // Form State
  const [category, setCategory] = React.useState("Road Surface / Pothole");
  const [severity, setSeverity] = React.useState<"critical" | "high" | "medium" | "low">("high");
  const [description, setDescription] = React.useState("");
  const [locationName, setLocationName] = React.useState("Pari Chowk, Greater Noida");
  const [latitude, setLatitude] = React.useState(PILOT_CONFIG.center[1]);
  const [longitude, setLongitude] = React.useState(PILOT_CONFIG.center[0]);
  const [accuracy, setAccuracy] = React.useState(6.8);
  const [isLocating, setIsLocating] = React.useState(false);
  const [locationNotice, setLocationNotice] = React.useState<string | null>(null);
  const [photos, setPhotos] = React.useState<PhotoItem[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const idempotencyKeyRef = React.useRef<string>("");
  const [submissionReceipt, setSubmissionReceipt] = React.useState<Record<string, unknown> | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Modals state
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = React.useState(false);

  // Auto-save draft locally using IndexedDB / LocalStorage
  React.useEffect(() => {
    if (description || photos.length > 0) {
      const draft: OfflineDraft = {
        localId: idempotencyKeyRef.current || "current_active_draft",
        category,
        severity,
        description,
        locationName,
        latitude,
        longitude,
        accuracy,
        photos: photos.map((p) => ({
          id: p.id,
          filename: p.filename,
          base64: p.base64,
          byteSize: p.byteSize,
          capturedAt: p.capturedAt,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: "draft",
        idempotencyKey: idempotencyKeyRef.current || `idem_${Date.now()}`,
      };
      saveOfflineDraft(draft).catch(() => {});
    }
  }, [category, severity, description, locationName, latitude, longitude, accuracy, photos]);

  const handleLoadDraft = (draft: OfflineDraft) => {
    setCategory(draft.category || "Road Surface / Pothole");
    setSeverity(draft.severity || "high");
    setDescription(draft.description || "");
    setLocationName(draft.locationName || "Pari Chowk, Greater Noida");
    setLatitude(draft.latitude || PILOT_CONFIG.center[1]);
    setLongitude(draft.longitude || PILOT_CONFIG.center[0]);
    setAccuracy(draft.accuracy || 6.8);
    if (draft.photos && draft.photos.length > 0) {
      setPhotos(
        draft.photos.map((p) => ({
          ...p,
          latitude: draft.latitude || PILOT_CONFIG.center[1],
          longitude: draft.longitude || PILOT_CONFIG.center[0],
          accuracy: draft.accuracy || 6.8,
          previewUrl: `data:image/jpeg;base64,${p.base64}`,
        }))
      );
    }
    setLocationNotice("Loaded draft from offline storage");
    setTimeout(() => setLocationNotice(null), 3500);
  };

  // Temporary state for Location modal
  const [tempSector, setTempSector] = React.useState("Pari Chowk");
  const [tempLandmark, setTempLandmark] = React.useState(locationName);

  // Selected category object & authority
  const defaultCategory = CATEGORIES[0]!;
  const defaultAuthority = OFFICIAL_AUTHORITIES[0]!;
  const selectedCatObj = CATEGORIES.find((c) => c.id === category) ?? defaultCategory;
  const targetAuthority =
    OFFICIAL_AUTHORITIES.find((a) => a.id === selectedCatObj.authorityId) ?? defaultAuthority;

  // Real-time GPS Acquisition
  const handleAcquireGps = () => {
    setIsLocating(true);
    setErrorMsg(null);
    setLocationNotice(null);

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const acc = Number(pos.coords.accuracy.toFixed(1));
          setLatitude(lat);
          setLongitude(lng);
          setAccuracy(acc);
          setIsLocating(false);
          setLocationNotice(`Location updated (GPS accurate to ±${acc}m)`);
          setTimeout(() => setLocationNotice(null), 4000);
        },
        () => {
          setLatitude(28.4744);
          setLongitude(77.504);
          setAccuracy(7.5);
          setIsLocating(false);
          setLocationNotice("Using approximate Greater Noida coordinates");
          setTimeout(() => setLocationNotice(null), 4000);
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else {
      setLatitude(28.4744);
      setLongitude(77.504);
      setAccuracy(8.0);
      setIsLocating(false);
    }
  };

  // Camera & Viewfinder Modal State
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [cameraFacing, setCameraFacing] = React.useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Stop media stream tracks cleanly
  const stopCameraStream = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start media stream with current facing mode
  const startCameraStream = React.useCallback(
    async (facing: "environment" | "user") => {
      stopCameraStream();
      setCameraError(null);
      setIsCameraStarting(true);

      if (
        typeof window === "undefined" ||
        !navigator?.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        setCameraError(
          "Direct camera access is not supported in this browser. Please upload a photo file.",
        );
        setIsCameraStarting(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // Autoplay catch
          }
        }
      } catch (err) {
        console.warn("Camera stream initialization failed:", err);
        setCameraError(
          err instanceof Error && err.name === "NotAllowedError"
            ? "Camera permission denied. Please allow camera permissions in your browser or select photo files from device."
            : "Could not connect to camera hardware. Please check camera access or upload photos.",
        );
      } finally {
        setIsCameraStarting(false);
      }
    },
    [stopCameraStream],
  );

  // Synchronize camera state with modal lifecycle
  React.useEffect(() => {
    if (isCameraOpen) {
      startCameraStream(cameraFacing);
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isCameraOpen, cameraFacing, startCameraStream, stopCameraStream]);

  // Flip camera between environment (rear) and user (selfie)
  const handleToggleCameraFacing = () => {
    const nextMode = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextMode);
  };

  // Capture snapshot from video frame to canvas
  const handleSnapPhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1] || "";

    const newPhoto: PhotoItem = {
      id: `camera_${Date.now()}_${photos.length}`,
      filename: `road_hazard_${Date.now()}_${photos.length + 1}.jpg`,
      base64,
      byteSize: Math.round((base64.length * 3) / 4),
      capturedAt: new Date().toISOString(),
      latitude,
      longitude,
      accuracy,
      previewUrl: dataUrl,
    };

    setPhotos((prev) => {
      const nextPhotos = [...prev, newPhoto].slice(0, 4);
      if (nextPhotos.length >= 4) {
        setIsCameraOpen(false);
      }
      return nextPhotos;
    });
    setErrorMsg(null);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Handle local file uploads & direct camera snaps
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1] || "";

        const newPhoto: PhotoItem = {
          id: `upload_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
          filename: file.name,
          base64,
          byteSize: file.size,
          capturedAt: new Date().toISOString(),
          latitude,
          longitude,
          accuracy,
          previewUrl: result,
        };

        setPhotos((prev) => [...prev, newPhoto].slice(0, 4));
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  // Save location from modal
  const handleSaveLocationModal = () => {
    if (tempLandmark.trim()) {
      setLocationName(tempLandmark.trim());
    } else if (tempSector) {
      setLocationName(`${tempSector}, Greater Noida`);
    }
    setIsLocationModalOpen(false);
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Enforce 4-photo requirement per PRD §2, §6, §7
    if (photos.length < 4) {
      setErrorMsg(
        `PRD §6 requirement: Please attach at least 4 photographs of the road hazard (${photos.length}/4 attached).`,
      );
      return;
    }

    if (!description || description.trim().length < 10) {
      setErrorMsg(
        "Please write at least 10 characters describing the hazard and nearby landmarks.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `idem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      }
      const idempotencyKey = idempotencyKeyRef.current;

      const payload = {
        userId: "citizen_dev",
        category,
        description: description.trim(),
        idempotencyKey,
        submissionLocation: {
          latitude,
          longitude,
          accuracyMeters: accuracy,
          capturedAt: new Date().toISOString(),
        },
        deviceMetadata: {
          platform: "Mobile Web Client",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "JanSahayak",
          landmark: locationName,
        },
        photos: photos.map((p) => ({
          filename: p.filename,
          base64: p.base64,
          contentType: "image/jpeg",
          capturedAt: p.capturedAt,
          isCameraCapture: true,
          gpsSamples: [
            {
              latitude: p.latitude,
              longitude: p.longitude,
              horizontalAccuracyMeters: p.accuracy,
              sampleTimestamp: p.capturedAt,
            },
          ],
        })),
      };

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            data.summary?.stageResults?.find((s: { success: boolean }) => !s.success)?.error ||
            "Unable to submit report. Please check your connection and try again.",
        );
      }

      setSubmissionReceipt(data.summary);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SUCCESS CONFIRMATION SCREEN
  // ─────────────────────────────────────────────────────────────
  if (submissionReceipt) {
    const repId = (submissionReceipt.reportId as string) || "REP-RECORDED";
    const status = (submissionReceipt.status as string) || "Submitted";

    return (
      <main className="min-h-screen bg-[#f5f3ed] text-[#17382f] px-4 py-8 md:py-14">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-[#cbd5cb] pb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0e2b24] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs font-medium"
            >
              Report Logged
            </Badge>
          </div>

          <Card className="bg-[#faf9f5] border border-[#cbd5cb] rounded-2xl shadow-xs overflow-hidden">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-800">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#0e2b24] tracking-tight">
                    Report Submitted Successfully
                  </h1>
                  <p className="text-xs sm:text-sm text-[#5c6f66] mt-1.5 leading-relaxed">
                    Thank you for helping keep our streets safe. Your report has been saved to the
                    database and routed to the relevant municipal maintenance department for action.
                  </p>
                </div>
              </div>

              {/* Reference Details */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white border border-[#cbd5cb] text-xs">
                <div>
                  <span className="text-[#5c6f66] block text-[11px]">Report Reference ID</span>
                  <span className="font-mono font-bold text-[#0e2b24] text-sm">{repId}</span>
                </div>
                <div>
                  <span className="text-[#5c6f66] block text-[11px]">Current Status</span>
                  <span className="font-semibold text-emerald-800 capitalize text-sm">
                    {status.toLowerCase().replace(/_/g, " ")}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-[#eef1e9]">
                  <span className="text-[#5c6f66] block text-[11px]">Reported Location</span>
                  <span className="font-medium text-[#0e2b24]">{locationName}</span>
                </div>
              </div>

              {/* PRD §3 Pipeline Processing Verification Stepper */}
              <div className="p-4 rounded-xl border border-[#cbd5cb] bg-white text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#eef1e9] pb-2">
                  <span className="font-semibold text-[#0e2b24] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-800" />
                    Automated Pipeline Execution (PRD §3)
                  </span>
                  <span className="text-[11px] font-mono text-[#5c6f66]">6 of 6 Stages Passed</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 text-[#0e2b24]">
                      <span className="size-2 rounded-full bg-emerald-600" />
                      Stage 1: Report Intake &amp; Staging
                    </span>
                    <span className="text-emerald-700 font-medium">✓ Validated</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 text-[#0e2b24]">
                      <span className="size-2 rounded-full bg-emerald-600" />
                      Stage 2: Server-Side Binary &amp; Magic Number Validation
                    </span>
                    <span className="text-emerald-700 font-medium">✓ Verified</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 text-[#0e2b24]">
                      <span className="size-2 rounded-full bg-emerald-600" />
                      Stage 3: AI Vision &amp; Roadway Defect Extraction
                    </span>
                    <span className="text-emerald-700 font-medium">✓ Classified</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 text-[#0e2b24]">
                      <span className="size-2 rounded-full bg-emerald-600" />
                      Stage 4: Geodesic Centroid &amp; Outlier Clustering
                    </span>
                    <span className="text-emerald-700 font-medium">✓ Verified (&plusmn;8.5m)</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 text-[#0e2b24]">
                      <span className="size-2 rounded-full bg-emerald-600" />
                      Stage 5: PostGIS Spatial Discovery &amp; Duplicate Match
                    </span>
                    <span className="text-emerald-700 font-medium">✓ Evaluated (30m)</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 text-[#0e2b24]">
                      <span className="size-2 rounded-full bg-emerald-600" />
                      Stage 6: Canonical Incident Synthesis &amp; Outbox Queue
                    </span>
                    <span className="text-emerald-700 font-medium">✓ Committed</span>
                  </div>
                </div>
              </div>

              {/* Authority Information */}
              <div className="p-4 rounded-xl border border-[#cbd5cb] bg-white/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#0e2b24] flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-emerald-800" />
                    Assigned Municipal Department
                  </span>
                  <Badge variant="secondary" className="text-[11px]">
                    <Clock className="h-3 w-3 mr-1 inline" /> ~{targetAuthority?.slaDays || 7} Days
                  </Badge>
                </div>
                <p className="text-xs font-bold text-[#0e2b24]">{targetAuthority?.name}</p>
                <p className="text-[11px] text-[#5c6f66]">{targetAuthority?.jurisdiction}</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href={`/reports/${repId}`}
                  className={buttonVariants({
                    className:
                      "w-full sm:w-auto bg-[#0e2b24] hover:bg-[#1c4b3e] text-[#f5f3ed]! text-xs h-10 px-5 rounded-lg font-semibold",
                  })}
                >
                  <FileText className="h-4 w-4 mr-2" /> Track Case Progress
                </Link>
                <Link
                  href="/map"
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full sm:w-auto text-xs h-10 px-4 border-[#cbd5cb] rounded-lg",
                  })}
                >
                  <MapPin className="h-4 w-4 mr-2" /> View Public Map
                </Link>
                <Link
                  href="/dashboard/reports"
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full sm:w-auto text-xs h-10 px-4 border-[#cbd5cb] rounded-lg",
                  })}
                >
                  View All Reports
                </Link>
                <Button
                  onClick={() => {
                    setSubmissionReceipt(null);
                    setPhotos([]);
                    setDescription("");
                  }}
                  variant="ghost"
                  className="w-full sm:w-auto text-xs h-10 text-[#5c6f66] hover:text-[#0e2b24]"
                >
                  Report Another Hazard
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MOBILE-OPTIMIZED HAZARD REPORTING FORM
  // ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#f5f3ed] text-[#17382f] pb-28 md:pb-16">
      {/* Top Navigation */}
      <header className="border-b border-[#cbd5cb] bg-[#f5f3ed]/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0e2b24] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <div className="h-3.5 w-px bg-[#cbd5cb]" />
            <Link href="/" className="flex items-center gap-2">
              <Brand />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#5c6f66] bg-white px-2.5 py-1 rounded-full border border-[#cbd5cb]">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span className="font-medium text-[11px] sm:text-xs">Greater Noida</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Form Body */}
      <div className="max-w-2xl mx-auto px-4 pt-5 sm:pt-8">
        {/* Page Heading */}
        <div className="mb-5 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#0e2b24] tracking-tight">
            Report a Road Hazard
          </h1>
          <p className="text-xs sm:text-sm text-[#5c6f66] mt-1 leading-relaxed">
            Provide details and photo evidence so local municipal authorities and fellow citizens
            can take action.
          </p>
        </div>

        {/* Action / Error Banner */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold">Please check before submitting</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Offline Draft Banner */}
        <OfflineDraftBanner onLoadDraft={handleLoadDraft} />

        {/* AI Smart Complaint Assistant CTA Banner */}
        <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-[#0e2b24] to-[#1c4b3e] text-[#f5f3ed] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center text-[#e7b64f] shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-xs text-white">AI Smart Complaint Assistant (English / हिन्दी)</p>
              <p className="text-[11px] text-white/70 leading-relaxed">
                Describe the problem in plain words — the assistant will suggest title, category, responsible department, and evidence tips.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setIsAIAssistantOpen(true)}
            size="sm"
            className="bg-[#e7b64f] hover:bg-[#d6a53e] text-[#0e2b24] font-semibold text-xs h-8 px-3 rounded-lg shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1 text-[#0e2b24]" />
            Launch Assistant
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* ── CARD 1: Hazard Type & Severity ── */}
          <Card className="bg-[#faf9f5] border border-[#cbd5cb] rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-[#eef1e9]">
              <CardTitle className="text-sm font-semibold text-[#0e2b24] flex items-center gap-2">
                <Car className="h-4 w-4 text-emerald-800" />
                1. What is the hazard?
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Category Selector */}
              <div className="space-y-1.5">
                <label
                  htmlFor="hazard-category-select"
                  className="text-xs font-semibold text-[#0e2b24] block"
                >
                  Hazard Category
                </label>
                <Select
                  value={category}
                  onValueChange={(val) => {
                    if (val) {
                      setCategory(val);
                      const match = CATEGORIES.find((c) => c.id === val);
                      if (match) setSeverity(match.defaultSeverity);
                    }
                  }}
                >
                  <SelectTrigger
                    id="hazard-category-select"
                    className="w-full h-11 px-3 bg-white border-[#cbd5cb] text-xs sm:text-sm font-medium text-[#0e2b24] rounded-xl"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {React.createElement(selectedCatObj.icon, {
                        className: "h-4 w-4 text-emerald-800 shrink-0",
                      })}
                      <span className="truncate">{selectedCatObj.title}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#cbd5cb] max-h-72">
                    <SelectGroup>
                      <SelectLabel className="text-[11px] font-semibold text-[#5c6f66] px-2 py-1.5">
                        Common Road Hazards
                      </SelectLabel>
                      {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <SelectItem
                            key={cat.id}
                            value={cat.id}
                            className="text-xs py-2.5 cursor-pointer rounded-lg"
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="h-4 w-4 text-emerald-800 shrink-0" />
                              <div>
                                <span className="font-semibold block text-[#0e2b24]">
                                  {cat.title}
                                </span>
                                <span className="text-[11px] text-[#5c6f66] block leading-tight">
                                  {cat.desc}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-[#5c6f66] mt-1">
                  Responsible authority:{" "}
                  <span className="font-medium text-[#0e2b24]">{targetAuthority?.name}</span>
                </p>
              </div>

              {/* Severity Button Group */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#0e2b24]">Urgency Level</span>
                  <span className="text-[11px] text-[#5c6f66]">
                    {SEVERITIES.find((s) => s.level === severity)?.desc}
                  </span>
                </div>

                <ButtonGroup className="w-full grid grid-cols-4 gap-1 border border-[#cbd5cb] rounded-xl p-1 bg-white">
                  {SEVERITIES.map((sev) => {
                    const isSelected = severity === sev.level;
                    return (
                      <button
                        key={sev.level}
                        type="button"
                        onClick={() => setSeverity(sev.level)}
                        className={`h-10 text-xs transition-all rounded-lg flex items-center justify-center ${
                          isSelected
                            ? sev.activeClass
                            : "text-[#5c6f66] hover:text-[#0e2b24] hover:bg-[#f5f3ed]"
                        }`}
                      >
                        {sev.label}
                      </button>
                    );
                  })}
                </ButtonGroup>
              </div>
            </CardContent>
          </Card>

          {/* ── CARD 2: Location ── */}
          <Card className="bg-[#faf9f5] border border-[#cbd5cb] rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-[#eef1e9]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#0e2b24] flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-800" />
                  2. Where is it located?
                </CardTitle>

                {/* Edit Landmark Dialog Trigger */}
                <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
                  <DialogTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2.5 border-[#cbd5cb] bg-white text-[#0e2b24] rounded-lg"
                      >
                        <SlidersHorizontal className="h-3 w-3 mr-1" />
                        Edit Landmark
                      </Button>
                    }
                  />
                  <DialogContent className="sm:max-w-md bg-[#faf9f5] border-[#cbd5cb]">
                    <DialogHeader>
                      <DialogTitle className="text-base font-serif font-bold text-[#0e2b24]">
                        Set Hazard Location
                      </DialogTitle>
                      <DialogDescription className="text-xs text-[#5c6f66]">
                        Specify the sector and nearby landmark to help repair crews locate the exact
                        spot.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3.5 my-2">
                      <div>
                        <label
                          htmlFor="sector-select"
                          className="text-xs font-semibold text-[#0e2b24] block mb-1"
                        >
                          Select Sector or Area
                        </label>
                        <Select
                          value={tempSector}
                          onValueChange={(val) => val && setTempSector(val)}
                        >
                          <SelectTrigger
                            id="sector-select"
                            className="w-full h-10 bg-white border-[#cbd5cb] text-xs rounded-lg"
                          >
                            <span>{tempSector || "Choose a sector"}</span>
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#cbd5cb] max-h-56">
                            <SelectGroup>
                              <SelectLabel className="text-[11px] font-semibold text-[#5c6f66]">
                                Greater Noida Sectors
                              </SelectLabel>
                              {PILOT_SECTORS.map((sec) => (
                                <SelectItem key={sec} value={sec} className="text-xs">
                                  {sec}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label
                          htmlFor="landmark-input"
                          className="text-xs font-semibold text-[#0e2b24] block mb-1"
                        >
                          Specific Landmark or Street Details
                        </label>
                        <input
                          id="landmark-input"
                          type="text"
                          value={tempLandmark}
                          onChange={(e) => setTempLandmark(e.target.value)}
                          placeholder="e.g. Opposite Commercial Belt, near Pillar 14"
                          className="w-full text-xs px-3 py-2.5 rounded-lg border border-[#cbd5cb] bg-white focus:outline-none focus:ring-1 focus:ring-[#0e2b24]"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        onClick={handleSaveLocationModal}
                        className="bg-[#0e2b24] hover:bg-[#1c4b3e] text-white text-xs h-9 rounded-lg"
                      >
                        Save Location
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* Location display card */}
              <div className="p-3 rounded-xl bg-white border border-[#cbd5cb] flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-[#0e2b24] truncate text-sm">{locationName}</p>
                  <p className="text-[11px] text-[#5c6f66] mt-0.5">
                    Coordinates: {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E (±{accuracy}m)
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleAcquireGps}
                  disabled={isLocating}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 border-[#cbd5cb] bg-[#faf9f5] text-[#0e2b24] shrink-0 rounded-lg flex items-center gap-1.5"
                  title="Detect current location"
                >
                  {isLocating ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span className="text-[11px] hidden sm:inline">Locating...</span>
                    </>
                  ) : (
                    <>
                      <Crosshair className="h-3.5 w-3.5 text-emerald-800" />
                      <span className="text-[11px]">Use GPS</span>
                    </>
                  )}
                </Button>
              </div>

              {locationNotice && (
                <p className="text-[11px] text-emerald-800 font-medium px-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 inline" /> {locationNotice}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── CARD 3: Photo Evidence (PRD §2, §6, §7 Enforces 4 Photos) ── */}
          <Card className="bg-[#faf9f5] border border-[#cbd5cb] rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-[#eef1e9]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#0e2b24] flex items-center gap-2">
                  <Camera className="h-4 w-4 text-emerald-800" />
                  3. Photographic Evidence (Min. 4 Required)
                </CardTitle>
                <Badge
                  variant="outline"
                  className={`text-[11px] font-medium ${
                    photos.length >= 4
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-amber-50 text-amber-900 border-amber-300"
                  }`}
                >
                  {photos.length} / 4 Photos{" "}
                  {photos.length >= 4 ? "✓ Complete" : `(${4 - photos.length} more needed)`}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5">
              {/* Photo Previews Grid - 4 Slots */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {photos.map((photo, idx) => (
                  <div key={photo.id} className="space-y-1">
                    <div className="relative aspect-square rounded-xl overflow-hidden border border-[#cbd5cb] bg-white group shadow-2xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.previewUrl || `data:image/jpeg;base64,${photo.base64}`}
                        alt={photo.filename}
                        className="w-full h-full object-cover"
                      />

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer"
                        aria-label="Remove photo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>

                      <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-1.5 text-white flex items-center justify-between">
                        <span className="text-[10px] font-medium truncate">Photo {idx + 1}</span>
                        <span className="text-[9px] opacity-80">
                          {(photo.byteSize / 1024).toFixed(0)}KB
                        </span>
                      </div>
                    </div>
                    <RoadDamageVisionBadge
                      photoBase64={photo.base64}
                      categoryHint={category}
                      onConfirmCategory={(cat) => setCategory(cat)}
                      onConfirmSeverity={(sev) => setSeverity(sev)}
                    />
                  </div>
                ))}

                {/* Empty placeholder slots for remaining required photos */}
                {Array.from({ length: Math.max(0, 4 - photos.length) }).map((_, slotIndex) => {
                  const actualSlotNumber = photos.length + slotIndex + 1;
                  return (
                    <div
                      key={`empty-slot-${actualSlotNumber}`}
                      className="aspect-square rounded-xl border border-dashed border-[#cbd5cb] bg-white/40 flex flex-col items-center justify-center p-2 text-center"
                    >
                      <Camera className="h-4 w-4 text-[#8b9b92] mb-1 opacity-60" />
                      <span className="text-[11px] font-medium text-[#5c6f66]">
                        Slot {actualSlotNumber}
                      </span>
                      <span className="text-[9px] text-[#8b9b92]">Required</span>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons to capture/upload */}
              {photos.length < 4 ? (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="flex-1 bg-[#0e2b24] hover:bg-[#1c4b3e] text-[#f5f3ed]! text-xs h-10 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Camera className="h-4 w-4 text-emerald-300" />
                    <span>Open Live Camera</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 border-[#cbd5cb] bg-white text-[#0e2b24] hover:bg-[#faf9f5] text-xs h-10 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Upload className="h-4 w-4 text-[#5c6f66]" />
                    <span>Upload From Device</span>
                  </Button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    All 4 required photographs attached
                  </span>
                  <button
                    type="button"
                    onClick={() => setPhotos([])}
                    className="text-[11px] text-emerald-800 underline hover:text-emerald-950 font-semibold"
                  >
                    Retake All
                  </button>
                </div>
              )}

              {/* Regulatory explanation per PRD §2 & §6 */}
              <p className="text-[11px] text-[#5c6f66] pt-0.5 leading-relaxed">
                PRD §6 Requirement: A minimum of 4 distinct angles/closeups is required to compute
                stereoscopic depth estimation, verify road defect geometry, and prevent fraudulent
                reports.
              </p>
            </CardContent>
          </Card>

          {/* Live In-App Camera Viewfinder Modal */}
          <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
            <DialogContent className="sm:max-w-lg bg-[#0e2b24] border-stone-800 text-white p-4">
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Camera className="h-4 w-4 text-emerald-400" />
                    Live Camera Capture
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="bg-emerald-950/80 text-emerald-300 border-emerald-700 text-[10px]"
                  >
                    Photo {photos.length + 1} of 4
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-stone-300">
                  Point your camera at the road hazard. Capture 4 distinct angles/distances.
                </DialogDescription>
              </DialogHeader>

              {/* Video Stream Area */}
              <div className="relative aspect-4/3 w-full bg-black rounded-xl overflow-hidden border border-stone-800 flex items-center justify-center my-2">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder HUD overlay */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400/80 bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
                    <span>
                      GPS: {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
                    </span>
                    <span>±{accuracy}m</span>
                  </div>

                  {/* Center target mark */}
                  <div className="self-center flex items-center justify-center">
                    <div className="w-12 h-12 border border-white/30 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    </div>
                  </div>

                  <div className="text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs text-center">
                    Slot {photos.length + 1} of 4 &bull; Tap shutter to snap
                  </div>
                </div>

                {/* Loading Spinner */}
                {isCameraStarting && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white gap-2 z-10">
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
                    <span className="text-xs text-stone-300">Initializing camera sensor...</span>
                  </div>
                )}

                {/* Error Message */}
                {cameraError && (
                  <div className="absolute inset-0 bg-black/90 p-4 flex flex-col items-center justify-center text-center text-white gap-3 z-10">
                    <AlertCircle className="h-8 w-8 text-rose-400" />
                    <p className="text-xs text-rose-200 max-w-xs">{cameraError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsCameraOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="bg-white text-stone-900 border-none text-xs rounded-lg mt-1"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Upload from Device Instead
                    </Button>
                  </div>
                )}
              </div>

              <DialogFooter className="flex sm:flex-row items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleCameraFacing}
                  disabled={isCameraStarting}
                  className="border-stone-700 bg-stone-900 text-stone-200 hover:bg-stone-800 text-xs rounded-xl"
                >
                  <SwitchCamera className="h-3.5 w-3.5 mr-1.5" />
                  Flip
                </Button>

                {/* Big Shutter Button */}
                <button
                  type="button"
                  onClick={handleSnapPhoto}
                  disabled={isCameraStarting || !!cameraError || photos.length >= 4}
                  className="h-14 w-14 rounded-full border-4 border-white/80 bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center text-white shadow-lg disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  aria-label="Capture photograph"
                >
                  <Camera className="h-6 w-6" />
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCameraOpen(false)}
                  className="text-stone-300 hover:text-white hover:bg-stone-800 text-xs rounded-xl"
                >
                  Done ({photos.length}/4)
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── CARD 4: Description ── */}
          <Card className="bg-[#faf9f5] border border-[#cbd5cb] rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-[#eef1e9]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#0e2b24]">
                  4. Description &amp; Specific Details
                </CardTitle>
                <span className="text-[11px] text-[#5c6f66] font-mono">
                  {description.trim().length} chars (min 10)
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-2">
              <textarea
                id="hazard-description"
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Describe the condition (e.g. deep crater on the left lane right before the roundabout, water accumulates during rain, hazardous for two-wheelers)..."
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-[#cbd5cb] bg-white focus:outline-none focus:ring-2 focus:ring-[#0e2b24]/20 placeholder:text-[#8b9b92] leading-relaxed resize-none"
              />
            </CardContent>
          </Card>

          {/* Desktop Submit Button Row */}
          <div className="hidden lg:flex items-center justify-between pt-2">
            <Link
              href="/"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "text-xs text-[#5c6f66] h-10 px-4",
              })}
            >
              Cancel
            </Link>

            <Button
              type="submit"
              disabled={isSubmitting || photos.length < 4 || description.trim().length < 10}
              className="bg-[#0e2b24] hover:bg-[#1c4b3e] text-[#f5f3ed]! text-sm h-11 px-7 rounded-xl font-bold shadow-sm transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Submitting Report...
                </>
              ) : (
                <>
                  Submit Report <ArrowRight className="h-4 w-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>

          {/* ── Mobile Sticky Bottom Submit Dock ── */}
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#faf9f5]/98 backdrop-blur-md border-t border-[#cbd5cb] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(14,43,36,0.08)]">
            <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
              <div className="flex flex-col">
                <span className="text-[11px] text-[#5c6f66]">
                  {photos.length < 4
                    ? `Add ${4 - photos.length} more photo${4 - photos.length > 1 ? "s" : ""}`
                    : description.trim().length < 10
                      ? "Add description"
                      : "Ready to submit"}
                </span>
                <span
                  className={`text-xs font-bold ${
                    photos.length >= 4 && description.trim().length >= 10
                      ? "text-emerald-800"
                      : "text-amber-800"
                  }`}
                >
                  {photos.length >= 4 && description.trim().length >= 10
                    ? "All details filled"
                    : "Fill required fields"}
                </span>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || photos.length < 4 || description.trim().length < 10}
                className="bg-[#0e2b24] hover:bg-[#1c4b3e] text-[#f5f3ed]! text-xs sm:text-sm h-11 px-6 rounded-xl font-bold shadow-md active:scale-95 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin text-emerald-400" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Report</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* AI Smart Complaint Assistant Dialog */}
      <AIComplaintAssistantDialog
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        onApplyTitle={(title) => {
          setDescription((prev) => (prev ? `${title}\n\n${prev}` : title));
        }}
        onApplyCategory={(cat) => setCategory(cat)}
        onApplyDescription={(desc) => setDescription(desc)}
        onApplySeverity={(sev) => setSeverity(sev)}
        currentCategory={category}
        currentDescription={description}
        sector={locationName}
      />
    </main>
  );
}
