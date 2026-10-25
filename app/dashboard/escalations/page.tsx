"use client";

import * as React from "react";
import { Building2, Clock, ExternalLink, MessageSquare, CheckCircle2, Send } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
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
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import type { EscalationDocket } from "@/lib/types/hazard";

export default function EscalationsPage() {
  // Empty state by default; centralized sample records loaded on request
  const [escalations, setEscalations] = React.useState<EscalationDocket[]>([]);
  const [activeModalId, setActiveModalId] = React.useState<string | null>(null);
  const [officialNote, setOfficialNote] = React.useState("");

  const activeEscalation = escalations.find((e) => e.id === activeModalId);

  const handleUpdateStatus = (id: string, newStatus: EscalationDocket["status"]) => {
    setEscalations((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        let statusLabel = "In Progress";
        let statusVariant: EscalationDocket["statusVariant"] = "default";
        if (newStatus === "acknowledged") {
          statusLabel = "Acknowledged by Dept";
          statusVariant = "secondary";
        } else if (newStatus === "resolved") {
          statusLabel = "Remediation Complete";
          statusVariant = "default";
        } else if (newStatus === "awaiting-response") {
          statusLabel = "Awaiting Response";
          statusVariant = "destructive";
        }

        return {
          ...e,
          status: newStatus,
          statusLabel,
          statusVariant,
          lastUpdate: `Just now — Status shifted to ${statusLabel}`,
        };
      }),
    );
  };

  const handleSaveNote = () => {
    if (!activeModalId || !officialNote.trim()) return;
    setEscalations((prev) =>
      prev.map((e) =>
        e.id === activeModalId
          ? {
              ...e,
              lastUpdate: `Just now — Official Note: ${officialNote}`,
            }
          : e,
      ),
    );
    setOfficialNote("");
    setActiveModalId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
              Authority Escalation Tracker
            </h1>
            <Badge variant="outline" className="text-xs">
              {escalations.length} Active Dockets
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Auditable trail of hazard files escalated to responsible municipal authorities and
            elected ward reps.
          </p>
        </div>
      </div>

      {/* ── Escalation Dockets List ─── */}
      <div className="grid grid-cols-1 gap-5">
        {escalations.length === 0 ? (
          /* Zatian / shadcn Empty State when no dockets exist */
          <Card className="shadow-xs p-2">
            <Empty className="my-8 border-0 bg-transparent">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Building2 className="size-6 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No active authority escalations</EmptyTitle>
                <EmptyDescription>
                  There are currently no formal grievance dockets open with GNIDA, PWD, or Municipal
                  Drainage cells. Unresolved community hazards will trigger automated docket
                  creation after SLA expiry.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </Card>
        ) : (
          escalations.map((item) => (
            <Card key={item.id} className="shadow-xs">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        {item.id}
                      </span>
                      <Badge variant={item.statusVariant} className="text-xs">
                        {item.statusLabel}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Linked: <strong>{item.originReportId}</strong> (+{item.linkedReports}{" "}
                        reports)
                      </span>
                    </div>

                    <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    <span>Open for {item.daysOpen} days</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <p className="text-xs text-foreground leading-relaxed">{item.summary}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2.5">
                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Forwarded To</span>
                      <strong className="text-foreground">{item.authority}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2.5">
                    <MessageSquare className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-muted-foreground block text-[11px]">
                        Assigned Officer
                      </span>
                      <strong className="text-foreground">{item.officer}</strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border p-3 text-xs bg-muted/20">
                  <span className="font-medium text-foreground block mb-0.5">
                    Latest Timeline Milestone
                  </span>
                  <span className="text-muted-foreground">{item.lastUpdate}</span>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-foreground hover:underline py-1 self-start"
                >
                  <span>View Official PDF Docket</span>
                  <ExternalLink className="size-3" />
                </button>

                {/* Action Buttons - Responsive thumb-friendly grid on mobile */}
                <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 sm:h-7 text-xs justify-center"
                    onClick={() => setActiveModalId(item.id)}
                  >
                    <MessageSquare className="size-3.5 mr-1" />
                    <span>Log Officer Reply</span>
                  </Button>

                  {item.status !== "resolved" ? (
                    <Button
                      size="sm"
                      className="h-10 sm:h-7 text-xs justify-center bg-emerald-800 hover:bg-emerald-900 text-white"
                      onClick={() => handleUpdateStatus(item.id, "resolved")}
                    >
                      <CheckCircle2 className="size-3.5 mr-1" />
                      <span>Mark Remediated</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 sm:h-7 text-xs justify-center"
                      onClick={() => handleUpdateStatus(item.id, "in-progress")}
                    >
                      <span>Re-open Docket</span>
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* ── Log Officer Reply Dialog ─── */}
      <Dialog open={!!activeModalId} onOpenChange={(open) => !open && setActiveModalId(null)}>
        {activeEscalation && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Log Official Authority Reply
              </DialogTitle>
              <DialogDescription className="text-xs">
                Record correspondence, reference dispatch number, or field inspection notes for
                docket {activeEscalation.id}.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3">
              <label htmlFor="official-response" className="text-xs font-medium block">
                Official Response / Minutes:
              </label>
              <Textarea
                id="official-response"
                placeholder="e.g. Work order #GN-WO-401 issued to contractor. Inspection scheduled for Oct 28..."
                className="text-xs"
                rows={4}
                value={officialNote}
                onChange={(e) => setOfficialNote(e.target.value)}
              />

              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Quick Status:</span>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleUpdateStatus(activeEscalation.id, "acknowledged")}
                >
                  Mark Acknowledged
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleUpdateStatus(activeEscalation.id, "in-progress")}
                >
                  Mark In-Progress
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setActiveModalId(null)}>
                Cancel
              </Button>
              <Button size="sm" className="gap-1.5" onClick={handleSaveNote}>
                <Send className="size-3" />
                <span>Save to Audit Trail</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
