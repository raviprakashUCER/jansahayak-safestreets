"use client";

import * as React from "react";
import {
  Sparkles,
  Check,
  X,
  ArrowRight,
  Loader2,
  Bot,
  HelpCircle,
  FileEdit,
  Building2,
  AlertTriangle,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ComplaintAssistantSuggestion } from "@/lib/ai/types";

interface AIComplaintAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTitle: (title: string) => void;
  onApplyCategory: (category: string) => void;
  onApplyDescription: (desc: string) => void;
  onApplySeverity: (sev: "critical" | "high" | "medium" | "low") => void;
  currentCategory?: string;
  currentDescription?: string;
  sector?: string;
}

export function AIComplaintAssistantDialog({
  isOpen,
  onClose,
  onApplyTitle,
  onApplyCategory,
  onApplyDescription,
  onApplySeverity,
  currentCategory,
  currentDescription,
  sector,
}: AIComplaintAssistantProps) {
  const [promptInput, setPromptInput] = React.useState(currentDescription || "");
  const [isLoading, setIsLoading] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState<ComplaintAssistantSuggestion | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Editable suggestion fields
  const [editableTitle, setEditableTitle] = React.useState("");
  const [editableDesc, setEditableDesc] = React.useState("");

  const handleFetchAssistant = async () => {
    if (!promptInput.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/ai/complaint-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: promptInput.trim(),
          currentCategory,
          currentDescription,
          sector: sector || "Greater Noida",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to retrieve AI complaint suggestions.");
      }

      setSuggestion(data.suggestion);
      setEditableTitle(data.suggestion.suggestedTitle);
      setEditableDesc(data.suggestion.improvedDescription);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyAll = () => {
    if (!suggestion) return;
    if (editableTitle) onApplyTitle(editableTitle);
    if (suggestion.suggestedCategory) onApplyCategory(suggestion.suggestedCategory);
    if (editableDesc) onApplyDescription(editableDesc);
    if (suggestion.suggestedSeverity) onApplySeverity(suggestion.suggestedSeverity);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#faf9f5] border border-[#cbd5cb] text-[#17382f] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#0e2b24]">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-[#0e2b24]">
                AI Smart Complaint Assistant (English / हिन्दी)
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5c6f66]">
                Describe the problem in your own words. We will structure the title, category,
                department, and evidence checklist.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Input prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0e2b24]">
              What road problem are you seeing? (Sadak / Pothole / Streetlight / Manhole)
            </label>
            <Textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="e.g. Pari Chowk roundabout ke paas bohot bada gaddha hai jisse gaadiya slow ho rahi hain..."
              className="bg-white border-[#cbd5cb] text-xs leading-relaxed min-h-[75px]"
            />
            <div className="flex justify-between items-center text-[11px] text-[#5c6f66]">
              <span>Supports Hindi and English</span>
              <Button
                type="button"
                size="sm"
                onClick={handleFetchAssistant}
                disabled={isLoading || !promptInput.trim()}
                className="bg-[#0e2b24] text-[#faf9f5] hover:bg-[#1c4b3e] h-8 text-xs font-medium cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5 text-[#e7b64f]" />
                    Generate Suggestions
                  </>
                )}
              </Button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Generated Suggestions */}
          {suggestion && (
            <div className="p-4 rounded-xl border border-[#cbd5cb] bg-white space-y-4 text-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[#eef1e9] pb-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-800 border-emerald-300 font-medium text-[11px]"
                  >
                    {suggestion.isAIGenerated ? "AI Generated" : "Rule-Based Prior"}
                  </Badge>
                  <span className="text-[11px] text-[#5c6f66]">
                    Provider: {suggestion.provider}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleApplyAll}
                  className="h-7 text-xs font-semibold bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Apply All
                </Button>
              </div>

              {/* Title Suggestion */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#0e2b24] text-[11px]">Structured Title:</span>
                  <button
                    type="button"
                    onClick={() => onApplyTitle(editableTitle)}
                    className="text-[11px] text-emerald-700 hover:underline font-medium cursor-pointer"
                  >
                    Apply Title
                  </button>
                </div>
                <input
                  type="text"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#cbd5cb] text-xs text-[#0e2b24] bg-[#faf9f5]"
                />
              </div>

              {/* Category & Severity Suggestion */}
              <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-[#faf9f5] border border-[#eef1e9]">
                <div>
                  <span className="text-[#5c6f66] block text-[10px]">Suggested Category</span>
                  <span className="font-semibold text-[#0e2b24]">
                    {suggestion.suggestedCategory}
                  </span>
                  <button
                    type="button"
                    onClick={() => onApplyCategory(suggestion.suggestedCategory)}
                    className="text-[10px] text-emerald-700 hover:underline block mt-0.5"
                  >
                    Apply Category
                  </button>
                </div>
                <div>
                  <span className="text-[#5c6f66] block text-[10px]">Suggested Urgency</span>
                  <Badge
                    variant="outline"
                    className="capitalize font-semibold text-[11px] mt-0.5"
                  >
                    {suggestion.suggestedSeverity}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => onApplySeverity(suggestion.suggestedSeverity)}
                    className="text-[10px] text-emerald-700 hover:underline block mt-0.5"
                  >
                    Apply Severity
                  </button>
                </div>
              </div>

              {/* Improved Description */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#0e2b24] text-[11px]">
                    Polished Description (Civic Tone):
                  </span>
                  <button
                    type="button"
                    onClick={() => onApplyDescription(editableDesc)}
                    className="text-[11px] text-emerald-700 hover:underline font-medium cursor-pointer"
                  >
                    Apply Description
                  </button>
                </div>
                <Textarea
                  value={editableDesc}
                  onChange={(e) => setEditableDesc(e.target.value)}
                  className="bg-[#faf9f5] border-[#cbd5cb] text-xs min-h-[65px]"
                />
              </div>

              {/* Department Routing */}
              <div className="p-2.5 rounded-lg bg-[#faf9f5] border border-[#eef1e9] flex items-start gap-2.5">
                <Building2 className="h-4 w-4 text-[#5c6f66] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#0e2b24] block">
                    {suggestion.suggestedDepartment.name}
                  </span>
                  <span className="text-[11px] text-[#5c6f66] block">
                    {suggestion.suggestedDepartment.jurisdiction} (SLA: ~
                    {suggestion.suggestedDepartment.slaDays} days)
                  </span>
                </div>
              </div>

              {/* Suggested Evidence */}
              <div className="space-y-1.5">
                <span className="font-semibold text-[#0e2b24] flex items-center gap-1.5 text-[11px]">
                  <Camera className="h-3.5 w-3.5 text-[#5c6f66]" />
                  Recommended Evidence Shots (Minimum 4 Required):
                </span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#5c6f66]">
                  {suggestion.suggestedEvidence.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <p className="text-[10px] text-[#5c6f66] italic leading-tight pt-2 border-t border-[#eef1e9]">
                {suggestion.disclaimer}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[#cbd5cb] pt-3 flex justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs h-8 border-[#cbd5cb]"
          >
            Close
          </Button>
          {suggestion && (
            <Button
              type="button"
              onClick={handleApplyAll}
              className="bg-[#0e2b24] text-[#faf9f5] hover:bg-[#1c4b3e] text-xs h-8"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" /> Apply All Suggestions
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
