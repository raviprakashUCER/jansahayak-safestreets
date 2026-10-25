"use client";

import * as React from "react";
import { Eye, Check, X, AlertCircle, Sparkles, Loader2, Edit3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RoadDamageDetectionResult, DamageDetectionBox } from "@/lib/ai/types";

interface RoadDamageVisionBadgeProps {
  photoBase64: string;
  categoryHint?: string;
  onConfirmCategory?: (category: string) => void;
  onConfirmSeverity?: (sev: "critical" | "high" | "medium" | "low") => void;
}

export function RoadDamageVisionBadge({
  photoBase64,
  categoryHint,
  onConfirmCategory,
  onConfirmSeverity,
}: RoadDamageVisionBadgeProps) {
  const [detection, setDetection] = React.useState<RoadDamageDetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isAccepted, setIsAccepted] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);

  const handleRunAnalysis = async () => {
    if (!photoBase64 || isAnalyzing) return;
    setIsAnalyzing(true);

    try {
      const res = await fetch("/api/ai/road-damage-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: photoBase64,
          categoryHint: categoryHint || "pothole",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDetection(data.detection);
      }
    } catch (err) {
      console.warn("Vision detection client error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isDismissed) return null;

  return (
    <div className="mt-1 text-[11px] space-y-1.5">
      {!detection && !isAnalyzing && (
        <button
          type="button"
          onClick={handleRunAnalysis}
          className="inline-flex items-center gap-1 text-[11px] text-emerald-800 hover:text-emerald-950 font-medium bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded px-2 py-0.5 cursor-pointer transition-colors"
        >
          <Sparkles className="h-3 w-3 text-amber-600" />
          AI Damage Scan
        </button>
      )}

      {isAnalyzing && (
        <span className="inline-flex items-center gap-1 text-[11px] text-[#5c6f66] bg-[#faf9f5] border border-[#cbd5cb] rounded px-2 py-0.5">
          <Loader2 className="h-3 w-3 animate-spin text-emerald-800" />
          Analyzing road surface...
        </span>
      )}

      {detection && detection.primaryHazard && (
        <div className="p-2 rounded bg-white border border-[#cbd5cb] shadow-xs space-y-1 text-[#17382f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[#0e2b24]">
                {detection.primaryHazard.label}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1 py-0 h-4 ${
                  detection.primaryHazard.confidence >= 0.75
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-amber-50 text-amber-800 border-amber-300"
                }`}
              >
                {Math.round(detection.primaryHazard.confidence * 100)}% Match
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {!isAccepted && (
                <button
                  type="button"
                  title="Accept AI classification"
                  onClick={() => {
                    setIsAccepted(true);
                    if (onConfirmCategory) {
                      const catName =
                        detection.primaryHazard?.category === "pothole"
                          ? "Road Surface / Pothole"
                          : detection.primaryHazard?.category === "manhole_drainage"
                          ? "Drainage / Manhole"
                          : detection.primaryHazard?.category === "broken_footpath"
                          ? "Broken Footpath / Pavement"
                          : "Road Surface / Pothole";
                      onConfirmCategory(catName);
                    }
                    if (onConfirmSeverity && detection.primaryHazard?.severity) {
                      onConfirmSeverity(detection.primaryHazard.severity);
                    }
                  }}
                  className="p-1 rounded text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                title="Dismiss suggestion"
                onClick={() => setIsDismissed(true)}
                className="p-1 rounded text-[#5c6f66] hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <p className="text-[10px] text-[#5c6f66] leading-tight">
            {detection.primaryHazard.reason}
          </p>

          {detection.needsHumanReview && (
            <div className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>Uncertain visual features: Queued for human verification.</span>
            </div>
          )}

          {isAccepted && (
            <span className="text-[10px] text-emerald-800 font-medium block">
              ✓ Suggestion applied to report
            </span>
          )}
        </div>
      )}
    </div>
  );
}
