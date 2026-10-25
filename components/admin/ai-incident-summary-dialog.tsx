"use client";

import { useState } from "react";
import {
  Sparkles,
  Bot,
  FileText,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { IncidentAdminSummary } from "@/lib/ai/types";

export interface AIIncidentSummaryDialogProps {
  incidentId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIIncidentSummaryDialog({
  incidentId,
  isOpen,
  onOpenChange,
}: AIIncidentSummaryDialogProps) {
  const [summary, setSummary] = useState<IncidentAdminSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/incidents/${encodeURIComponent(incidentId)}/ai-summary`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate incident summary");
      }
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (open: boolean) => {
    onOpenChange(open);
    if (open && !summary && !loading) {
      fetchSummary();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border border-border p-6 rounded-3xl">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </span>
              <DialogTitle className="text-base font-bold text-foreground">
                AI Incident Dossier Summary
              </DialogTitle>
            </div>
            <span className="font-mono text-xs text-muted-foreground">Case #{incidentId.slice(0, 8)}</span>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Automated synthesized brief for municipal moderators and ward supervisors.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-7 animate-spin text-primary" />
            <p className="text-xs font-semibold text-muted-foreground">
              Extracting defect patterns &amp; synthesizing evidence...
            </p>
          </div>
        ) : error ? (
          <div className="py-6 text-center text-xs text-destructive bg-destructive/10 rounded-2xl p-4">
            {error}
          </div>
        ) : summary ? (
          <div className="space-y-4 pt-2 text-xs">
            {/* AI Warning Label */}
            <div className="p-3 rounded-2xl bg-[#faf9f5] dark:bg-[#102922] border border-[#cbd5cb] dark:border-[#22483d] text-[11px] flex items-start gap-2 text-[#486057] dark:text-[#9bb2a8]">
              <Info className="size-4 shrink-0 mt-0.5 text-primary" />
              <div>
                <span className="font-semibold text-foreground">
                  {summary.isAiGenerated ? "AI-Synthesized Brief: " : "Rule-Based Deterministic Brief: "}
                </span>
                Information is an advisory synthesis of citizen evidence. Verify underlying photographic proofs
                before closing or dispatching work crews.
              </div>
            </div>

            {/* Core Summary Paragraph */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />
                <span>Executive Case Summary</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{summary.summaryText}</p>
            </div>

            {/* Common Issues & Evidence Signals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-card border border-border space-y-2">
                <div className="font-semibold text-foreground text-[11px]">Primary Defect Pattern</div>
                <div className="p-2 rounded-xl bg-background border border-border font-mono text-[11px] text-foreground">
                  {summary.commonIssuesIdentified.join(", ") || "Standard road surface degradation"}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-card border border-border space-y-2">
                <div className="font-semibold text-foreground text-[11px]">Suggested Priority Level</div>
                <div className="p-2 rounded-xl bg-background border border-border flex items-center justify-between">
                  <span className="font-mono uppercase font-bold text-primary">{summary.suggestedPriority}</span>
                  <span className="text-[10px] text-muted-foreground">Based on severity rules</span>
                </div>
              </div>
            </div>

            {/* Missing Information Needed */}
            {summary.missingInformationNeeded.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
                <div className="font-semibold flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="size-3.5" />
                  <span>Missing Verification Data</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px]">
                  {summary.missingInformationNeeded.map((item: string, idx: number) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Next Steps */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="size-3.5 text-emerald-700" />
                <span>Recommended Engineering Next Steps</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                {summary.suggestedNextSteps.map((step: string, idx: number) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>

            {/* Underlying Record Citations */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Underlying Citations: {summary.underlyingCitations.join(", ")}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSummary}
                className="text-xs h-7 gap-1"
              >
                <Sparkles className="size-3" />
                <span>Regenerate Brief</span>
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
