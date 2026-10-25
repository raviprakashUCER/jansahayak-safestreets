"use client";

import * as React from "react";
import {
  ShieldAlert,
  Copy,
  MapPinOff,
  AlertOctagon,
  Check,
  X,
  FileQuestion,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Camera,
  Cpu,
  MapPin,
  Calendar,
  Sparkles,
  Sliders,
  Scissors,
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import type { ModerationQueueItem } from "@/lib/types/hazard";

function getIcon(name: ModerationQueueItem["iconName"]) {
  switch (name) {
    case "copy":
      return <Copy className="size-3" />;
    case "map-off":
      return <MapPinOff className="size-3" />;
    case "alert":
      return <AlertOctagon className="size-3" />;
    case "question":
      return <FileQuestion className="size-3" />;
  }
}

export default function ModerationPage() {
  // Empty state by default; centralized sample queue loaded on demand or fetched from API
  const [items, setItems] = React.useState<ModerationQueueItem[]>([]);
  const [activeTab, setActiveTab] = React.useState("all");
  const [isSubmitting, setIsSubmitting] = React.useState<string | null>(null);
  const [inspectingItem, setInspectingItem] = React.useState<ModerationQueueItem | null>(null);

  // PRD §12 Action Modals State
  const [rejectItem, setRejectItem] = React.useState<ModerationQueueItem | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");

  const [requestEvidenceItem, setRequestEvidenceItem] = React.useState<ModerationQueueItem | null>(
    null,
  );
  const [evidenceNotes, setEvidenceNotes] = React.useState("");

  const [correctLocationItem, setCorrectLocationItem] = React.useState<ModerationQueueItem | null>(
    null,
  );
  const [latInput, setLatInput] = React.useState("28.4744");
  const [lngInput, setLngInput] = React.useState("77.5040");
  const [locationNotes, setLocationNotes] = React.useState("");

  const [mergeItem, setMergeItem] = React.useState<ModerationQueueItem | null>(null);
  const [duplicateIdsInput, setDuplicateIdsInput] = React.useState("");
  const [mergeReason, setMergeReason] = React.useState("");

  const [splitItem, setSplitItem] = React.useState<ModerationQueueItem | null>(null);
  const [splitReportIdsInput, setSplitReportIdsInput] = React.useState("");
  const [splitReason, setSplitReason] = React.useState("");

  const [unpublishItem, setUnpublishItem] = React.useState<ModerationQueueItem | null>(null);
  const [unpublishReason, setUnpublishReason] = React.useState("");

  // Fetch live review queue on mount
  const loadReviewQueue = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/review-queue");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        const mapped: ModerationQueueItem[] = data.items.map((rawRow: unknown) => {
          const row = rawRow as Record<string, unknown>;
          if (row.flagLabel) return row as unknown as ModerationQueueItem;
          const meta = (row.metadata as Record<string, unknown>) || {};
          return {
            id: String(row.id || ""),
            title: String(row.title || "Hazard Incident"),
            type:
              row.category === "lighting" || row.category === "crossing" ? "location" : "duplicate",
            flagLabel: row.status === "under_review" ? "Awaiting Review" : "Unverified Incident",
            detail: String(
              row.summary || "Citizen submitted hazard awaiting municipal verification.",
            ),
            reporter: String(meta.reporter || "Verified Citizen"),
            time: row.createdAt
              ? new Date(String(row.createdAt)).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Recently",
            badgeVariant: "secondary",
            iconName: "alert",
            status: "pending",
          };
        });
        setItems(mapped);
      }
    } catch (err) {
      console.warn("Could not fetch live review queue:", err);
    }
  }, []);

  React.useEffect(() => {
    loadReviewQueue();
  }, [loadReviewQueue]);

  const pendingItems = items.filter((i) => i.status === "pending");

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (item.status !== "pending") return false;
      if (activeTab === "all") return true;
      return item.type === activeTab;
    });
  }, [items, activeTab]);

  const handleApprove = async (id: string) => {
    setIsSubmitting(id);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "approved" } : item)),
    );
    try {
      await fetch(`/api/admin/incidents/${encodeURIComponent(id)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Verified and published to public map by civic staff" }),
      });
    } catch (e) {
      console.warn("Failed to approve incident:", e);
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectItem || !rejectionReason.trim()) return;
    const id = rejectItem.id;
    setIsSubmitting(id);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "rejected" } : item)),
    );
    setRejectItem(null);
    try {
      await fetch(`/api/admin/incidents/${encodeURIComponent(id)}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
    } catch (e) {
      console.warn("Failed to reject incident:", e);
    } finally {
      setIsSubmitting(null);
      setRejectionReason("");
    }
  };

  const handleConfirmRequestEvidence = async () => {
    if (!requestEvidenceItem) return;
    const id = requestEvidenceItem.id;
    setIsSubmitting(id);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "needs_evidence" } : item)),
    );
    setRequestEvidenceItem(null);
    try {
      await fetch(`/api/admin/incidents/${encodeURIComponent(id)}/request-evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: evidenceNotes.trim() || "Additional road hazard photographs required",
        }),
      });
    } catch (e) {
      console.warn("Failed to request evidence:", e);
    } finally {
      setIsSubmitting(null);
      setEvidenceNotes("");
    }
  };

  const handleConfirmCorrectLocation = async () => {
    if (!correctLocationItem) return;
    const id = correctLocationItem.id;
    setIsSubmitting(id);
    setCorrectLocationItem(null);
    try {
      await fetch(`/api/admin/incidents/${encodeURIComponent(id)}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: parseFloat(latInput),
          longitude: parseFloat(lngInput),
          notes: locationNotes.trim() || "Coordinates adjusted by civic moderator",
        }),
      });
    } catch (e) {
      console.warn("Failed to correct location:", e);
    } finally {
      setIsSubmitting(null);
      setLocationNotes("");
    }
  };

  const handleConfirmMerge = async () => {
    if (!mergeItem || !duplicateIdsInput.trim()) return;
    const id = mergeItem.id;
    setIsSubmitting(id);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: "merged" } : item)));
    setMergeItem(null);
    try {
      const duplicateIncidentIds = duplicateIdsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await fetch("/api/admin/incidents/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryIncidentId: id,
          duplicateIncidentIds,
          reason: mergeReason.trim() || "Merged duplicate incident reports",
        }),
      });
    } catch (e) {
      console.warn("Failed to merge incident:", e);
    } finally {
      setIsSubmitting(null);
      setDuplicateIdsInput("");
      setMergeReason("");
    }
  };

  const handleConfirmSplit = async () => {
    if (!splitItem || !splitReportIdsInput.trim()) return;
    const id = splitItem.id;
    setIsSubmitting(id);
    setSplitItem(null);
    try {
      const reportIdsToSplit = splitReportIdsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await fetch(`/api/admin/incidents/${encodeURIComponent(id)}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportIdsToSplit,
          reason: splitReason.trim() || "Partitioned into separate incident by moderator",
        }),
      });
    } catch (e) {
      console.warn("Failed to split incident:", e);
    } finally {
      setIsSubmitting(null);
      setSplitReportIdsInput("");
      setSplitReason("");
    }
  };

  const handleConfirmUnpublish = async () => {
    if (!unpublishItem || !unpublishReason.trim()) return;
    const id = unpublishItem.id;
    setIsSubmitting(id);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "suspended" } : item)),
    );
    setUnpublishItem(null);
    try {
      await fetch(`/api/admin/incidents/${encodeURIComponent(id)}/unpublish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: unpublishReason.trim() }),
      });
    } catch (e) {
      console.warn("Failed to unpublish incident:", e);
    } finally {
      setIsSubmitting(null);
      setUnpublishReason("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#0e2b24] tracking-tight">
            Moderation Queue
          </h1>
          <p className="text-xs sm:text-sm text-[#5c6f66]">
            Review flagged hazards, merge spatial duplicates, resolve geo-fence ambiguities, and
            audit incident scope.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 h-9 sm:h-8"
            onClick={() => loadReviewQueue()}
          >
            <RotateCcw className="size-3" />
            <span>Refresh</span>
          </Button>

          <div className="w-full overflow-x-auto no-scrollbar -mx-1 px-1 sm:w-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-9 sm:h-8 w-max min-w-full justify-start sm:w-auto">
                <TabsTrigger value="all" className="text-xs px-2.5">
                  All ({pendingItems.length})
                </TabsTrigger>
                <TabsTrigger value="duplicate" className="text-xs px-2.5">
                  Duplicates ({pendingItems.filter((i) => i.type === "duplicate").length})
                </TabsTrigger>
                <TabsTrigger value="location" className="text-xs px-2.5">
                  Location ({pendingItems.filter((i) => i.type === "location").length})
                </TabsTrigger>
                <TabsTrigger value="scope" className="text-xs px-2.5">
                  Scope ({pendingItems.filter((i) => i.type === "scope").length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* ── Cards List of Moderation Queue ─── */}
      <div className="grid grid-cols-1 gap-4">
        {items.length === 0 ? (
          /* Zatian / shadcn Empty State when queue is pristine and no data exists */
          <Card className="shadow-xs p-2">
            <Empty className="my-8 border-0 bg-transparent">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CheckCircle2 className="size-6 text-emerald-600" />
                </EmptyMedia>
                <EmptyTitle>Moderation queue is clean</EmptyTitle>
                <EmptyDescription>
                  There are currently no citizen hazard reports requiring duplicate consolidation,
                  geotag verification, or scope classification.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" size="sm" onClick={() => loadReviewQueue()}>
                  <RotateCcw className="size-3.5 mr-1.5" />
                  Refresh Queue
                </Button>
              </EmptyContent>
            </Empty>
          </Card>
        ) : filteredItems.length === 0 ? (
          /* Empty state when active filter has all items triaged */
          <Card className="shadow-xs p-2">
            <Empty className="my-8 border-0 bg-transparent">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CheckCircle2 className="size-6 text-emerald-600" />
                </EmptyMedia>
                <EmptyTitle>All items in this category resolved</EmptyTitle>
                <EmptyDescription>
                  No pending reports remain in the &quot;{activeTab}&quot; queue. Switch filters or
                  reset the queue to inspect other entries.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("all")}>
                  View All Categories
                </Button>
              </EmptyContent>
            </Empty>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} className="shadow-xs transition-colors hover:border-foreground/20">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {item.id}
                    </span>
                    <Badge variant={item.badgeVariant} className="gap-1 text-xs">
                      {getIcon(item.iconName)}
                      <span>{item.flagLabel}</span>
                    </Badge>
                  </div>

                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>

                <CardTitle className="mt-2 text-base font-semibold">{item.title}</CardTitle>
                <CardDescription className="text-xs">{item.detail}</CardDescription>
              </CardHeader>

              <CardFooter className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Filed by:</span>
                  <strong className="text-foreground">{item.reporter}</strong>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setInspectingItem(item)}
                    className="inline-flex items-center gap-1 text-foreground underline underline-offset-2 hover:opacity-80 py-1 cursor-pointer"
                  >
                    <span>View photo evidence</span>
                    <ExternalLink className="size-2.5" />
                  </button>
                </div>

                {/* PRD §12 Triage Action Controls */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting === item.id}
                    className="h-10 sm:h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive justify-center"
                    onClick={() => {
                      setRejectItem(item);
                      setRejectionReason("");
                    }}
                  >
                    <X className="size-3.5 mr-1" />
                    <span>Reject</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={isSubmitting === item.id}
                      className="h-10 sm:h-7 text-xs justify-center gap-1 inline-flex items-center rounded-md border border-input bg-background px-2.5 py-1 font-medium shadow-xs hover:bg-accent hover:text-accent-foreground cursor-pointer disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Sliders className="size-3 text-muted-foreground" />
                      <span>Actions</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      <DropdownMenuItem
                        onClick={() => {
                          setRequestEvidenceItem(item);
                          setEvidenceNotes("");
                        }}
                      >
                        <Camera className="size-3.5 mr-2 text-amber-600" />
                        <span>Request Evidence</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setCorrectLocationItem(item);
                          setLatInput("28.4744");
                          setLngInput("77.5040");
                          setLocationNotes("");
                        }}
                      >
                        <MapPin className="size-3.5 mr-2 text-blue-600" />
                        <span>Correct Coordinates</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setMergeItem(item);
                          setDuplicateIdsInput("");
                          setMergeReason("");
                        }}
                      >
                        <Copy className="size-3.5 mr-2 text-purple-600" />
                        <span>Merge Duplicate</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSplitItem(item);
                          setSplitReportIdsInput("");
                          setSplitReason("");
                        }}
                      >
                        <Scissors className="size-3.5 mr-2 text-orange-600" />
                        <span>Split Incident</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          setUnpublishItem(item);
                          setUnpublishReason("");
                        }}
                      >
                        <MapPinOff className="size-3.5 mr-2" />
                        <span>Unpublish Pin</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    size="sm"
                    disabled={isSubmitting === item.id}
                    className="col-span-2 sm:col-span-1 h-10 sm:h-7 text-xs justify-center bg-emerald-800 hover:bg-emerald-900 text-white"
                    onClick={() => handleApprove(item.id)}
                  >
                    <Check className="size-3.5 mr-1" />
                    <span>{isSubmitting === item.id ? "Publishing..." : "Approve & Publish"}</span>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* ── Guidance Card ─── */}
      <Card className="border-dashed bg-muted/20 shadow-none">
        <CardHeader className="py-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-foreground">Civic Moderation Policy:</span>
              <p className="mt-0.5 text-muted-foreground leading-relaxed">
                JanSahayak does not censor citizen observations. Flagged items only resolve
                duplicate pings to avoid overburdening municipal engineering divisions with
                identical coordinates.
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── PRD §12 Evidence & AI Vision Inspection Modal ─── */}
      <Dialog open={!!inspectingItem} onOpenChange={(open) => !open && setInspectingItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#faf9f5] border-[#cbd5cb] text-[#0e2b24] p-5 sm:p-6">
          {inspectingItem && (
            <div className="flex flex-col gap-5">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#eef1e9] text-[#17382f]">
                    {inspectingItem.id}
                  </span>
                  <Badge variant={inspectingItem.badgeVariant} className="text-xs">
                    {inspectingItem.flagLabel}
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-bold text-[#0e2b24]">
                  {inspectingItem.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5c6f66]">
                  Submitted by {inspectingItem.reporter} · {inspectingItem.time} · Greater Noida
                  Sector Jurisdiction
                </DialogDescription>
              </DialogHeader>

              {/* Photo Evidence View */}
              <div className="relative rounded-xl overflow-hidden border border-[#cbd5cb] bg-gray-900 aspect-video flex items-center justify-center">
                {/* Fallback clean SVG representation if photoId is generic */}
                <svg
                  className="w-full h-full object-cover"
                  viewBox="0 0 600 400"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="600" height="400" fill="#374151" />
                  <rect x="0" y="0" width="600" height="400" fill="#1f2937" opacity="0.4" />
                  <ellipse cx="300" cy="220" rx="140" ry="80" fill="#111827" />
                  <ellipse cx="300" cy="220" rx="110" ry="60" fill="#030712" />
                  <line
                    x1="520"
                    y1="0"
                    x2="520"
                    y2="400"
                    stroke="#eab308"
                    strokeWidth="12"
                    strokeDasharray="24 16"
                  />
                  <circle cx="160" cy="180" r="3" fill="#6b7280" />
                  <circle cx="440" cy="260" r="4" fill="#6b7280" />
                </svg>

                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/70 text-white backdrop-blur-xs">
                    <Camera className="size-3 text-emerald-400" />
                    <span>In-App Camera Capture</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/70 text-white backdrop-blur-xs">
                    <MapPin className="size-3 text-amber-400" />
                    <span>GPS ±6.5m (Tier 1 High Precision)</span>
                  </span>
                </div>

                <div className="absolute bottom-3 inset-x-3 bg-black/75 backdrop-blur-xs rounded-lg p-2 text-white flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px]">SHA-256: 4a8f9b...e21c Verified</span>
                  <span className="text-[11px] text-gray-300">Pari Chowk Westbound Corridor</span>
                </div>
              </div>

              {/* Telemetry and Location Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white border border-[#d2d9d0]">
                  <span className="font-semibold text-[#17382f] flex items-center gap-1.5 mb-1">
                    <MapPin className="size-3.5 text-emerald-700" />
                    <span>Spatial Centroid &amp; Geotag</span>
                  </span>
                  <p className="font-mono text-[#0e2b24]">28.4744° N, 77.5040° E</p>
                  <p className="text-[11px] text-[#5c6f66] mt-0.5">
                    Uncertainty: 8.5m (Eligible for public map pin &le; 25m threshold)
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#d2d9d0]">
                  <span className="font-semibold text-[#17382f] flex items-center gap-1.5 mb-1">
                    <Calendar className="size-3.5 text-emerald-700" />
                    <span>Temporal Provenance</span>
                  </span>
                  <p className="text-[#0e2b24] font-medium">Logged {inspectingItem.time}</p>
                  <p className="text-[11px] text-[#5c6f66] mt-0.5">
                    Within 24h bounding threshold. No replay signature.
                  </p>
                </div>
              </div>

              {/* AI Vision Analysis (PRD §8) */}
              <div className="p-3.5 rounded-lg bg-[#eef1e9] border border-[#cbd5cb] text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[#0e2b24] flex items-center gap-1.5">
                    <Cpu className="size-3.5 text-emerald-800" />
                    <span>AI Vision Multimodal Defect Analysis</span>
                  </span>
                  <Badge variant="outline" className="bg-white text-[10px] gap-1 font-mono">
                    <Sparkles className="size-3 text-amber-600" />
                    <span>94% Confidence</span>
                  </Badge>
                </div>
                <p className="text-[#17382f] leading-relaxed mb-2">{inspectingItem.detail}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="px-2 py-0.5 rounded bg-white text-[10px] font-medium border border-[#cbd5cb] text-[#17382f]">
                    Asphalt crater
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white text-[10px] font-medium border border-[#cbd5cb] text-[#17382f]">
                    Depth &gt; 10cm
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white text-[10px] font-medium border border-[#cbd5cb] text-[#17382f]">
                    Vehicular wheel-trap hazard
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white text-[10px] font-medium border border-[#cbd5cb] text-[#17382f]">
                    High contrast
                  </span>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-[#d2d9d0] pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-9"
                  onClick={() => {
                    setRejectItem(inspectingItem);
                    setRejectionReason("");
                    setInspectingItem(null);
                  }}
                >
                  <X className="size-3.5 mr-1" />
                  <span>Reject Out-of-Scope</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-9"
                    onClick={() => {
                      setRequestEvidenceItem(inspectingItem);
                      setEvidenceNotes("");
                      setInspectingItem(null);
                    }}
                  >
                    <Camera className="size-3.5 mr-1" />
                    <span>Request Evidence</span>
                  </Button>

                  <Button
                    size="sm"
                    className="text-xs h-9 bg-emerald-800 hover:bg-emerald-900 text-white"
                    onClick={() => {
                      handleApprove(inspectingItem.id);
                      setInspectingItem(null);
                    }}
                  >
                    <Check className="size-3.5 mr-1" />
                    <span>Approve &amp; Publish Pin</span>
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── PRD §12 Reject with Documented Reason Dialog ── */}
      <Dialog open={!!rejectItem} onOpenChange={(open) => !open && setRejectItem(null)}>
        <DialogContent className="max-w-md bg-[#faf9f5] border-[#cbd5cb] text-[#0e2b24] p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0e2b24]">
              Reject Hazard Incident
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5c6f66]">
              PRD §12 requires a documented civic justification for every rejection. This decision
              is immutably logged to the audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-[#17382f] block">
              Documented Rejection Reason (Required)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Private residential driveway outside municipal Greater Noida maintenance scope."
              rows={3}
              className="w-full text-xs rounded-md border border-[#cbd5cb] bg-white p-2.5 text-[#0e2b24] focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-[#eef1e9]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectItem(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!rejectionReason.trim() || isSubmitting === rejectItem?.id}
              onClick={handleConfirmReject}
              className="text-xs h-8 bg-rose-800 hover:bg-rose-900 text-white"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PRD §12 & §16 Request Evidence Dialog ── */}
      <Dialog
        open={!!requestEvidenceItem}
        onOpenChange={(open) => !open && setRequestEvidenceItem(null)}
      >
        <DialogContent className="max-w-md bg-[#faf9f5] border-[#cbd5cb] text-[#0e2b24] p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0e2b24]">
              Request Supplementary Evidence
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5c6f66]">
              Flags the incident as ADDITIONAL_EVIDENCE_REQUIRED, prompting reporting citizens to
              attach supplementary daytime photographs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-[#17382f] block">
              Evidence Instructions for Citizens
            </label>
            <textarea
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              placeholder="e.g. Please capture a wide-angle photograph showing road lane markings and proximity to curb."
              rows={3}
              className="w-full text-xs rounded-md border border-[#cbd5cb] bg-white p-2.5 text-[#0e2b24] focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-[#eef1e9]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRequestEvidenceItem(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting === requestEvidenceItem?.id}
              onClick={handleConfirmRequestEvidence}
              className="text-xs h-8 bg-[#0e2b24] hover:bg-[#1c4b3e] text-white"
            >
              Send Evidence Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PRD §12 & §16 Correct Location Dialog ── */}
      <Dialog
        open={!!correctLocationItem}
        onOpenChange={(open) => !open && setCorrectLocationItem(null)}
      >
        <DialogContent className="max-w-md bg-[#faf9f5] border-[#cbd5cb] text-[#0e2b24] p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0e2b24]">
              Correct Canonical Coordinates
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5c6f66]">
              Adjust canonical WGS84 coordinates based on verified road surveys or GIS centerline
              alignment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#17382f] block mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  className="w-full rounded-md border border-[#cbd5cb] bg-white p-2 text-[#0e2b24]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#17382f] block mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  className="w-full rounded-md border border-[#cbd5cb] bg-white p-2 text-[#0e2b24]"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#17382f] block mb-1">Verification Note</label>
              <input
                type="text"
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
                placeholder="e.g. Aligned to northbound carriageway curb"
                className="w-full rounded-md border border-[#cbd5cb] bg-white p-2 text-[#0e2b24]"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-[#eef1e9]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCorrectLocationItem(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting === correctLocationItem?.id}
              onClick={handleConfirmCorrectLocation}
              className="text-xs h-8 bg-[#0e2b24] hover:bg-[#1c4b3e] text-white"
            >
              Update Coordinates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PRD §10 & §16 Merge Duplicate Incidents Dialog ── */}
      <Dialog open={!!mergeItem} onOpenChange={(open) => !open && setMergeItem(null)}>
        <DialogContent className="max-w-md bg-[#faf9f5] border-[#cbd5cb] text-[#0e2b24] p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0e2b24]">
              Merge Duplicate Incidents
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5c6f66]">
              Consolidates duplicate incidents into primary incident{" "}
              <span className="font-mono font-bold">{mergeItem?.id}</span>, recalculating total
              report counts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-[#17382f] block mb-1">
                Duplicate Incident IDs (Comma-separated)
              </label>
              <input
                type="text"
                value={duplicateIdsInput}
                onChange={(e) => setDuplicateIdsInput(e.target.value)}
                placeholder="e.g. 1a2b3c4d-..., 5e6f7g8h-..."
                className="w-full rounded-md border border-[#cbd5cb] bg-white p-2 font-mono text-[11px] text-[#0e2b24]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#17382f] block mb-1">Merge Reason</label>
              <input
                type="text"
                value={mergeReason}
                onChange={(e) => setMergeReason(e.target.value)}
                placeholder="e.g. Confirmed duplicate pothole on westbound Pari Chowk lane"
                className="w-full rounded-md border border-[#cbd5cb] bg-white p-2 text-[#0e2b24]"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-[#eef1e9]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMergeItem(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!duplicateIdsInput.trim() || isSubmitting === mergeItem?.id}
              onClick={handleConfirmMerge}
              className="text-xs h-8 bg-purple-800 hover:bg-purple-900 text-white"
            >
              Execute Incident Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PRD §12 & §16 Split Incident Dialog ── */}
      <Dialog open={!!splitItem} onOpenChange={(open) => !open && setSplitItem(null)}>
        <DialogContent className="max-w-md bg-[#faf9f5] border-[#cbd5cb] text-[#0e2b24] p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0e2b24]">
              Split Incident Reports
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5c6f66]">
              Partitions erroneously grouped citizen reports out of this incident into a newly
              synthesized canonical incident record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-[#17382f] block mb-1">
                Report IDs to Partition (Comma-separated)
              </label>
              <input
                type="text"
                value={splitReportIdsInput}
                onChange={(e) => setSplitReportIdsInput(e.target.value)}
                placeholder="e.g. REP-2026-0012, REP-2026-0014"
                className="w-full rounded-md border border-[#cbd5cb] bg-white p-2 font-mono text-[11px] text-[#0e2b24]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#17382f] block mb-1">Partition Rationale</label>
              <input
                type="text"
                value={splitReason}
                onChange={(e) => setSplitReason(e.target.value)}
                placeholder="e.g. Distinct street light outage 60m east of pothole cluster"
                className="w-full rounded-md border border-[#cbd5cb] bg-white p-2 text-[#0e2b24]"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-[#eef1e9]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSplitItem(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!splitReportIdsInput.trim() || isSubmitting === splitItem?.id}
              onClick={handleConfirmSplit}
              className="text-xs h-8 bg-orange-800 hover:bg-orange-900 text-white"
            >
              Partition into New Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PRD §13 & §14 Unpublish Incident Dialog ── */}
      <Dialog open={!!unpublishItem} onOpenChange={(open) => !open && setUnpublishItem(null)}>
        <DialogContent className="max-w-md bg-[#faf9f5] border-[#cbd5cb] text-[#0e2b24] p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0e2b24]">
              Revoke Public Map Visibility
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5c6f66]">
              PRD §13 &amp; §14: Suspends this incident from the public map, sets status to
              suspended, and dispatches edge CDN cache invalidation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <label className="font-semibold text-[#17382f] block">
              Reason for Revocation (Required)
            </label>
            <textarea
              value={unpublishReason}
              onChange={(e) => setUnpublishReason(e.target.value)}
              placeholder="e.g. Road repair completed by GNIDA or incorrect hazard coordinates."
              rows={3}
              className="w-full rounded-md border border-[#cbd5cb] bg-white p-2.5 text-[#0e2b24] focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-[#eef1e9]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnpublishItem(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!unpublishReason.trim() || isSubmitting === unpublishItem?.id}
              onClick={handleConfirmUnpublish}
              className="text-xs h-8 bg-rose-800 hover:bg-rose-900 text-white"
            >
              Revoke &amp; Evict from Map
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
