"use client";

import * as React from "react";
import Link from "next/link";
import {
  Flame,
  Clock,
  TrendingDown,
  CheckCircle2,
  FileText,
  PieChart,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  Plus,
  MapPin,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import type { HazardReport } from "@/lib/types/hazard";

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

export default function DashboardPage() {
  const [reports, setReports] = React.useState<HazardReport[]>([]);
  const [pendingReviewCount, setPendingReviewCount] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState("all");

  React.useEffect(() => {
    let active = true;

    async function fetchDashboardData() {
      try {
        const [incidentsRes, reviewRes] = await Promise.all([
          fetch("/api/map/incidents"),
          fetch("/api/admin/review-queue"),
        ]);

        if (incidentsRes.ok) {
          const incData = await incidentsRes.json();
          if (active && incData.success && Array.isArray(incData.incidents)) {
            setReports(incData.incidents);
          }
        }

        if (reviewRes.ok) {
          const revData = await reviewRes.json();
          if (active && revData.success && Array.isArray(revData.items)) {
            setPendingReviewCount(revData.items.length);
          }
        }
      } catch (err) {
        console.warn("Failed to load dashboard live data:", err);
      }
    }

    fetchDashboardData();

    return () => {
      active = false;
    };
  }, []);

  const filteredReports = React.useMemo(() => {
    if (activeTab === "all") return reports;
    return reports.filter((r) => r.status === activeTab);
  }, [reports, activeTab]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Civic Operations Overview
            </h1>
            <Badge variant="outline" className="text-xs">
              Live Database
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Greater Noida road-safety hazard command center · Monitoring, triage &amp; SLA tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" className="shrink-0 h-8" render={<Link href="/reports/new" />}>
            <Plus className="size-3.5" />
            <span>Report Hazard</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Telemetry Grid ─── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Card className="shadow-xs">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
                Active Hazards
              </CardDescription>
              <Flame className="size-3.5 sm:size-4 text-muted-foreground/70 shrink-0" />
            </div>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">
              {reports.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {reports.length > 0 ? "Published on public map" : "No active hazards"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
                Pending Verification
              </CardDescription>
              <Clock className="size-3.5 sm:size-4 text-muted-foreground/70 shrink-0" />
            </div>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">
              {pendingReviewCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {pendingReviewCount > 0 ? "Awaiting moderator review" : "Review queue clean"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
                Target Resolution SLA
              </CardDescription>
              <TrendingDown className="size-3.5 sm:size-4 text-muted-foreground/70 shrink-0" />
            </div>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">
              7.0d
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Standard GNIDA civil SLA</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
                Resolved Incidents
              </CardDescription>
              <CheckCircle2 className="size-3.5 sm:size-4 text-muted-foreground/70 shrink-0" />
            </div>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">
              {reports.filter((r) => r.status === "resolved").length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {reports.filter((r) => r.status === "resolved").length > 0
                ? "Verified remediations"
                : "Awaiting closure"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Dashboard Workspace Grid ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Recent Reports Table (8 cols) */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Card className="shadow-xs">
            <CardHeader className="border-b border-border pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Recent Hazard Submissions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Community reports registered in database
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="h-8">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="open">Open</TabsTrigger>
                      <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                      <TabsTrigger value="escalated">Escalated</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <CardAction>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8"
                      render={<Link href="/dashboard/reports" />}
                    >
                      <span>View all</span>
                      <ArrowUpRight className="size-3.5" />
                    </Button>
                  </CardAction>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {reports.length === 0 ? (
                <Empty className="my-8 border-0 bg-transparent">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileText className="size-6 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No reports logged yet</EmptyTitle>
                    <EmptyDescription>
                      Citizen road-safety reports for Greater Noida will populate here with live
                      verification status.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button size="sm" render={<Link href="/reports/new" />}>
                      <Plus className="mr-1.5 size-3.5" />
                      <span>File First Report</span>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : filteredReports.length === 0 ? (
                <Empty className="my-8 border-0 bg-transparent">
                  <EmptyHeader>
                    <EmptyTitle>No reports match this status</EmptyTitle>
                    <EmptyDescription>
                      No records found under &quot;{activeTab}&quot;.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("all")}>
                      Show All Reports
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>Hazard Dossier</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Votes</TableHead>
                      <TableHead className="text-right">Reported</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                          {report.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-foreground text-sm line-clamp-1">
                              {report.title}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="size-3" />
                              {report.location || report.landmark}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getSeverityBadge(report.severity)}</TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-right font-medium text-xs">
                          {report.votes || report.verificationsCount || 0}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {report.time || report.reportedAt || "Recently"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>

            <CardFooter className="border-t border-border px-6 py-3 bg-muted/10">
              <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                <span>
                  Showing {filteredReports.length} of {reports.length} reports
                </span>
                <Link
                  href="/dashboard/reports"
                  className="text-foreground hover:underline underline-offset-4"
                >
                  View full reports →
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Right: Moderation Queue Alert Card & Quick Links (4 cols) */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-emerald-800" />
                  <CardTitle className="text-base text-[#0e2b24]">Moderation Queue</CardTitle>
                </div>
                <Badge
                  variant={pendingReviewCount > 0 ? "destructive" : "outline"}
                  className="font-bold text-xs"
                >
                  {pendingReviewCount > 0 ? `${pendingReviewCount} Needs Review` : "0 Pending"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {pendingReviewCount > 0
                  ? "Citizen reports awaiting moderator verification and official approval."
                  : "All citizen submissions have been audited. Review queue is clean."}
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between text-xs"
                render={<Link href="/dashboard/moderation" />}
              >
                <span>Open Moderation Console</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">System Telemetry</CardTitle>
                  <CardDescription className="text-xs">
                    Pipeline health and outbox event queue status
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Empty className="my-2 border-0 bg-transparent py-4">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <PieChart className="size-5 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle className="text-sm font-medium">Live System Observability</EmptyTitle>
                  <EmptyDescription className="text-[11px]">
                    Detailed metrics for pipeline stages, AI latency, and outbox delivery are
                    available in the analytics dashboard.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
            <CardFooter className="border-t border-border pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs h-8"
                render={<Link href="/dashboard/analytics" />}
              >
                <span>View Live Analytics</span>
                <ArrowUpRight className="size-3.5" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
