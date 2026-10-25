"use client";

import { useState } from "react";
import {
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  MapPinOff,
  Copy,
  AlertTriangle,
  Send,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CommunityVerificationCardProps {
  incidentId: string;
  initialConfirmations?: number;
  initialResolvedReports?: number;
}

export function CommunityVerificationCard({
  incidentId,
  initialConfirmations = 0,
  initialResolvedReports = 0,
}: CommunityVerificationCardProps) {
  const [confirmations, setConfirmations] = useState(initialConfirmations);
  const [resolvedReports, setResolvedReports] = useState(initialResolvedReports);
  const [selectedVote, setSelectedVote] = useState<
    "still_present" | "reported_resolved" | "incorrect_location" | "duplicate" | null
  >(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(
    null
  );
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = async (
    voteType: "still_present" | "reported_resolved" | "incorrect_location" | "duplicate"
  ) => {
    setSelectedVote(voteType);
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationType: voteType,
          notes: comment.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setHasVoted(true);
          setFeedback({
            type: "info",
            message: "You have already submitted a verification record for this incident.",
          });
          return;
        }
        throw new Error(data.error || "Failed to submit verification");
      }

      setHasVoted(true);
      if (voteType === "still_present") {
        setConfirmations((c) => c + 1);
      } else if (voteType === "reported_resolved") {
        setResolvedReports((r) => r + 1);
      }

      setFeedback({
        type: "success",
        message: data.message || "Thank you! Your verification has been recorded in the civic audit trail.",
      });
      setComment("");
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Verification submission failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#cbd5cb] dark:border-[#22483d] bg-[#faf9f5] dark:bg-[#102922] p-4 sm:p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eef1e9] dark:border-[#1e3c33] pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-700 dark:text-emerald-400" />
          <h3 className="font-heading text-sm font-bold text-[#0e2b24] dark:text-[#f5f3ed]">
            Community Verification & Ground Truth
          </h3>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 font-semibold">
            ✓ {confirmations} Confirmations
          </span>
          {resolvedReports > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 font-semibold">
              {resolvedReports} Marked Resolved
            </span>
          )}
        </div>
      </div>

      <p className="mt-2.5 text-xs text-[#5c6f66] dark:text-[#9bb2a8] leading-relaxed">
        Have you recently passed this location? Help Greater Noida civic teams verify whether this defect still
        poses a risk or has already been resurfaced.
      </p>

      {feedback && (
        <div
          className={`mt-3 p-3 rounded-xl text-xs font-medium border flex items-start gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
              : feedback.type === "info"
              ? "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800"
              : "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800"
          }`}
        >
          <Info className="size-4 shrink-0 mt-0.5" />
          <span>{feedback.message}</span>
        </div>
      )}

      {!hasVoted && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => handleVote("still_present")}
              className="text-xs h-9 bg-white dark:bg-[#122822] border-[#cbd5cb] dark:border-[#22483d] hover:bg-emerald-50 dark:hover:bg-[#1a382f] text-emerald-800 dark:text-emerald-300 font-semibold"
            >
              {submitting && selectedVote === "still_present" ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <CheckCircle className="size-3.5 mr-1" />
              )}
              Still There
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => handleVote("reported_resolved")}
              className="text-xs h-9 bg-white dark:bg-[#122822] border-[#cbd5cb] dark:border-[#22483d] hover:bg-blue-50 dark:hover:bg-[#1a382f] text-blue-800 dark:text-blue-300 font-semibold"
            >
              {submitting && selectedVote === "reported_resolved" ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <CheckCircle className="size-3.5 mr-1 text-blue-600" />
              )}
              Appears Fixed
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => handleVote("incorrect_location")}
              className="text-xs h-9 bg-white dark:bg-[#122822] border-[#cbd5cb] dark:border-[#22483d] hover:bg-amber-50 dark:hover:bg-[#1a382f] text-amber-800 dark:text-amber-300 font-medium"
            >
              {submitting && selectedVote === "incorrect_location" ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <MapPinOff className="size-3.5 mr-1" />
              )}
              Wrong Location
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => handleVote("duplicate")}
              className="text-xs h-9 bg-white dark:bg-[#122822] border-[#cbd5cb] dark:border-[#22483d] hover:bg-muted text-muted-foreground font-medium"
            >
              {submitting && selectedVote === "duplicate" ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <Copy className="size-3.5 mr-1" />
              )}
              Duplicate Case
            </Button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Optional citizen field note (e.g. 'Pothole expanded after rain')"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full text-xs bg-background border border-border rounded-xl px-3 py-1.5 focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="mt-3 pt-2.5 border-t border-[#eef1e9] dark:border-[#1e3c33] flex items-center justify-between text-[10px] text-[#5c6f66] dark:text-[#9bb2a8]">
        <span>Anti-tamper: 1 verification per authenticated user · IP rate-limited</span>
        <span>Not an official repair certificate</span>
      </div>
    </div>
  );
}
