"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, Download, MapPin, Eye, FileText, RotateCcw } from "lucide-react";

import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { HazardReport } from "@/lib/types/hazard";

/** Status vs severity are separate vocabularies (Severity/Status Split). */
function getStatusBadge(status: string) {
  switch (status) {
    case "open":
      return (
        <span className="status-open">
          <i aria-hidden="true" />
          Open
        </span>
      );
    case "in-progress":
      return (
        <span className="status-progress">
          <i aria-hidden="true" />
          In Progress
        </span>
      );
    case "escalated":
      return (
        <span className="status-escalated">
          <i aria-hidden="true" />
          Escalated
        </span>
      );
    case "resolved":
      return (
        <span className="status-resolved">
          <i aria-hidden="true" />
          Resolved
        </span>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "high":
    case "critical":
      return (
        <span className="sev-high">
          <i aria-hidden="true" />
          High
        </span>
      );
    case "medium":
    case "moderate":
      return (
        <span className="sev-medium">
          <i aria-hidden="true" />
          Medium
        </span>
      );
    default:
      return (
        <span className="sev-low">
          <i aria-hidden="true" />
          Low
        </span>
      );
  }
}

export default function ReportsPage() {
  // Real records fetched from API, or sample records loaded on request
  const [reports, setReports] = React.useState<HazardReport[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  const [selectedReport, setSelectedReport] = React.useState<HazardReport | null>(null);

  // Fetch real database reports on mount
  const loadReports = React.useCallback(async () => {
    try {
      const [mapRes, reportsRes] = await Promise.all([
        fetch("/api/map/incidents").catch(() => null),
        fetch("/api/reports?limit=50").catch(() => null),
      ]);

      const mapData = mapRes && mapRes.ok ? await mapRes.json() : null;
      const reportsData = reportsRes && reportsRes.ok ? await reportsRes.json() : null;

      const combined: HazardReport[] = [];
      const seenIds = new Set<string>();

      if (mapData && Array.isArray(mapData.incidents)) {
        for (const inc of mapData.incidents) {
          combined.push(inc);
          seenIds.add(inc.id);
        }
      }

      if (reportsData && Array.isArray(reportsData.reports)) {
        for (const r of reportsData.reports) {
          const rid = r.reportId || r._id;
          if (rid && !seenIds.has(rid)) {
            combined.push({
              id: rid,
              title: r.description ? r.description.slice(0, 60) : `${r.category} Report`,
              description: r.description || "Citizen road safety report",
              category: r.category || "road-surface",
              severity: "medium",
              status:
                r.status === "APPROVED" || r.status === "PUBLISHED" ? "resolved" : "under-review",
              latitude: r.submissionLocation?.latitude || 28.4744,
              longitude: r.submissionLocation?.longitude || 77.504,
              landmark: "Greater Noida",
              time: r.createdAt
                ? new Date(r.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Recently",
              reportedAt: r.createdAt
                ? new Date(r.createdAt).toLocaleDateString("en-IN")
                : "Recently",
            });
            seenIds.add(rid);
          }
        }
      }

      setReports(combined);
    } catch (e) {
      console.warn("Could not load database reports for registry:", e);
    }
  }, []);

  React.useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Filtered reports
  const filteredReports = React.useMemo(() => {
    return reports.filter((r) => {
      const matchesTab = activeTab === "all" || r.status === activeTab;
      const q = searchQuery.toLowerCase().trim();
      const loc = r.location || r.landmark || "";
      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        loc.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [reports, activeTab, searchQuery]);

  // Handle status update inside the detail dialog
  const handleStatusChange = (newStatus: HazardReport["status"]) => {
    if (!selectedReport) return;
    setReports((prev) =>
      prev.map((r) => (r.id === selectedReport.id ? { ...r, status: newStatus } : r)),
    );
    setSelectedReport((prev) => (prev ? { ...prev, status: newStatus } : null));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
              Hazard Reports Registry
            </h1>
            <Badge variant="secondary" className="text-xs">
              {filteredReports.length} of {reports.length}
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Browse, search, inspect dossiers, and update civic action status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9 sm:h-8"
            onClick={() => loadReports()}
          >
            <RotateCcw className="size-3.5" />
            <span>Refresh</span>
          </Button>

          <Button variant="outline" size="sm" className="gap-1.5 h-9 sm:h-8">
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>

          <Button size="sm" className="h-9 sm:h-8" render={<Link href="/reports/new" />}>
            <Plus className="size-3.5" />
            <span>Report</span>
          </Button>
        </div>
      </div>

      {/* ── Table & Mobile Card View ─── */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="border-b border-border pb-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative w-full md:max-w-xs">
              <Input
                placeholder="Search title, location, category..."
                className="pl-8 text-xs h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Filter Tabs with horizontal touch scrolling on mobile */}
            <div className="w-full overflow-x-auto no-scrollbar -mx-1 px-1 md:w-auto">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-9 sm:h-8 w-max min-w-full justify-start sm:w-auto">
                  <TabsTrigger value="all" className="text-xs px-2.5">
                    All ({reports.length})
                  </TabsTrigger>
                  <TabsTrigger value="open" className="text-xs px-2.5">
                    Open ({reports.filter((r) => r.status === "open").length})
                  </TabsTrigger>
                  <TabsTrigger value="in-progress" className="text-xs px-2.5">
                    Progress ({reports.filter((r) => r.status === "in-progress").length})
                  </TabsTrigger>
                  <TabsTrigger value="escalated" className="text-xs px-2.5">
                    Escalated ({reports.filter((r) => r.status === "escalated").length})
                  </TabsTrigger>
                  <TabsTrigger value="resolved" className="text-xs px-2.5">
                    Resolved ({reports.filter((r) => r.status === "resolved").length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {reports.length === 0 ? (
            /* Zatian / shadcn Empty State when no data has been submitted */
            <Empty className="my-8 border-0 bg-transparent px-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText className="size-6 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No hazard reports recorded yet</EmptyTitle>
                <EmptyDescription>
                  There are currently no active road hazard reports in the system. Citizen
                  submissions across Greater Noida corridors will populate here automatically.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="flex flex-wrap gap-2 justify-center">
                <Button size="sm" className="h-9" render={<Link href="/reports/new" />}>
                  <Plus className="mr-1.5 size-3.5" />
                  <span>Submit First Report</span>
                </Button>
              </EmptyContent>
            </Empty>
          ) : filteredReports.length === 0 ? (
            /* Empty state when active filter yields zero results */
            <Empty className="my-8 border-0 bg-transparent px-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search className="size-6 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No matching reports found</EmptyTitle>
                <EmptyDescription>
                  No hazard files matched your current search and status filters. Try clearing
                  keywords or changing tabs.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveTab("all");
                  }}
                >
                  Reset Filters
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              {/* Mobile Card Feed View (< md) */}
              <div className="block md:hidden divide-y divide-border">
                {filteredReports.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedReport(report)}
                    className="w-full text-left p-3.5 hover:bg-muted/30 transition-colors cursor-pointer space-y-2 active:bg-muted/50 block focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-muted-foreground">
                          {report.id}
                        </span>
                        {getStatusBadge(report.status)}
                      </div>
                      {getSeverityBadge(report.severity)}
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-foreground leading-snug">
                        {report.title}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 shrink-0 text-emerald-700" />
                          <span className="truncate max-w-[190px]">
                            {report.location || report.landmark}
                          </span>
                        </span>
                        <span>·</span>
                        <span>{report.categoryLabel || report.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/40">
                      <span>{report.time || report.reportedAt || "Recently"}</span>
                      <span className="font-medium text-foreground">
                        {report.votes || report.verificationsCount || 0} verifications · Tap to view
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Docket ID</TableHead>
                      <TableHead>Hazard Details</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow
                        key={report.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => setSelectedReport(report)}
                      >
                        <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                          {report.id}
                        </TableCell>

                        <TableCell>
                          <div className="font-medium text-xs text-foreground">{report.title}</div>
                          <div className="text-[11px] text-muted-foreground">
                            Reported {report.time || report.reportedAt || "Recently"} ·{" "}
                            {report.votes || report.verificationsCount || 0} verifications
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {report.categoryLabel || report.category}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate max-w-[160px]">
                              {report.location || report.landmark}
                            </span>
                          </span>
                        </TableCell>

                        <TableCell>{getStatusBadge(report.status)}</TableCell>

                        <TableCell>{getSeverityBadge(report.severity)}</TableCell>

                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="gap-1 text-xs"
                            onClick={() => setSelectedReport(report)}
                          >
                            <Eye className="size-3" />
                            <span>Inspect</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-6">
          <p className="text-xs text-muted-foreground">
            Showing <strong className="font-medium">{filteredReports.length}</strong> reports
          </p>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="xs" disabled>
              Previous
            </Button>
            <Button variant="outline" size="xs" disabled={filteredReports.length < 10}>
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* ── Report Detail Dialog using shadcn Dialog ─── */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        {selectedReport && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  {selectedReport.id}
                </span>
                {getStatusBadge(selectedReport.status)}
                {getSeverityBadge(selectedReport.severity)}
              </div>
              <DialogTitle className="mt-2 text-lg font-bold">{selectedReport.title}</DialogTitle>
              <DialogDescription className="text-xs">
                Reported {selectedReport.time || selectedReport.reportedAt || "Recently"} · Sector:{" "}
                {selectedReport.location || selectedReport.landmark}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2 text-xs">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="font-medium text-muted-foreground">Incident Description</p>
                <p className="mt-1 leading-relaxed text-foreground">{selectedReport.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border p-2.5">
                  <span className="text-muted-foreground">Assigned Authority</span>
                  <p className="font-medium mt-0.5 text-foreground">
                    {selectedReport.authority ||
                      selectedReport.officialRouting ||
                      "GNIDA Civil Maintenance"}
                  </p>
                </div>
                <div className="rounded-md border border-border p-2.5">
                  <span className="text-muted-foreground">GPS Geotag</span>
                  <p className="font-mono font-medium mt-0.5 text-foreground">
                    {selectedReport.coordinates ||
                      `${selectedReport.latitude}, ${selectedReport.longitude}`}
                  </p>
                </div>
              </div>

              {/* Status transition controls */}
              <div className="mt-2">
                <p className="font-medium text-foreground mb-2">Update Lifecycle Status</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="xs"
                    variant={selectedReport.status === "open" ? "default" : "outline"}
                    onClick={() => handleStatusChange("open")}
                  >
                    Open
                  </Button>
                  <Button
                    size="xs"
                    variant={selectedReport.status === "in-progress" ? "default" : "outline"}
                    onClick={() => handleStatusChange("in-progress")}
                  >
                    In Progress
                  </Button>
                  <Button
                    size="xs"
                    variant={selectedReport.status === "escalated" ? "default" : "outline"}
                    onClick={() => handleStatusChange("escalated")}
                  >
                    Escalate to Authority
                  </Button>
                  <Button
                    size="xs"
                    variant={selectedReport.status === "resolved" ? "default" : "outline"}
                    onClick={() => handleStatusChange("resolved")}
                  >
                    Mark Resolved
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <Link href={`/reports/${selectedReport.id}`}>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs bg-[#0e2b24] hover:bg-[#1c4b3e] text-white"
                >
                  <FileText className="size-3.5" />
                  <span>Track Full 8-Stage Dossier</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setSelectedReport(null)}>
                Close Dossier
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
