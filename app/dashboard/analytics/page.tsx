"use client";

import * as React from "react";
import {
  Download,
  Clock,
  CheckCircle2,
  Users,
  Activity,
  BarChart3,
  PieChart,
  RotateCcw,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

interface LiveMetrics {
  totalIncidents: number;
  publishedIncidents: number;
  underReviewIncidents: number;
  approvedIncidents: number;
  rejectedIncidents: number;
  totalReports: number;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  categoryCounts: Record<string, number>;
  outboxCounts: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  };
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = React.useState<LiveMetrics | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchAnalytics = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.warn("Failed to fetch live analytics:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const categories = React.useMemo(() => {
    if (!metrics || !metrics.categoryCounts) return [];
    const total = metrics.totalIncidents || 1;
    return Object.entries(metrics.categoryCounts).map(([cat, count]) => ({
      label: cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      count,
      pct: Math.round((count / total) * 100),
    }));
  }, [metrics]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
              Civic Safety Analytics
            </h1>
            <Badge variant="outline" className="text-xs">
              Live Database Telemetry
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Quantifiable road hazard metrics, pipeline processing status, and verified incident
            telemetry across Greater Noida.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9 sm:h-8"
            onClick={fetchAnalytics}
            disabled={isLoading}
          >
            <RotateCcw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button variant="outline" size="sm" className="gap-1.5 h-9 sm:h-8">
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export Audit Report</span>
            <span className="sm:hidden">Report</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Cards ─── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <Card className="shadow-xs p-3.5 sm:p-5">
          <CardHeader className="p-0 pb-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
                Total Hazards
              </CardDescription>
              <Activity className="size-3.5 sm:size-4 text-muted-foreground shrink-0" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
              {metrics ? metrics.totalIncidents : "0"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {metrics && metrics.totalIncidents > 0
                ? `${metrics.publishedIncidents} published to map`
                : "No incidents registered"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs p-3.5 sm:p-5">
          <CardHeader className="p-0 pb-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
                Citizen Reports
              </CardDescription>
              <CheckCircle2 className="size-3.5 sm:size-4 text-muted-foreground shrink-0" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
              {metrics ? metrics.totalReports : "0"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {metrics && metrics.totalReports > 0
                ? "Stored in intake database"
                : "Awaiting submissions"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs p-3.5 sm:p-5">
          <CardHeader className="p-0 pb-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
                Under Review
              </CardDescription>
              <Clock className="size-3.5 sm:size-4 text-muted-foreground shrink-0" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
              {metrics ? metrics.underReviewIncidents : "0"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {metrics && metrics.underReviewIncidents > 0
                ? "In moderation queue"
                : "Review queue clear"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs p-3.5 sm:p-5">
          <CardHeader className="p-0 pb-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
                Outbox Pipeline
              </CardDescription>
              <Users className="size-3.5 sm:size-4 text-muted-foreground shrink-0" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
              {metrics ? metrics.outboxCounts.completed : "0"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {metrics ? `${metrics.outboxCounts.pending} pending dispatch` : "Outbox clear"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Analytics Visualizations Grid ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Severity Distribution (7 cols) */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          <Card className="shadow-xs">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg">Incident Severity Breakdown</CardTitle>
              <CardDescription>
                Urgency levels assigned across verified physical defects.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              {!metrics || metrics.totalIncidents === 0 ? (
                <Empty className="my-6 border-0 bg-transparent">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BarChart3 className="size-6 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No severity data collected yet</EmptyTitle>
                    <EmptyDescription>
                      Hazard severity distribution will graph automatically as reports are submitted
                      and analyzed across Greater Noida sectors.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-rose-800">Critical Emergencies</span>
                      <span className="font-mono font-semibold">
                        {metrics.severityCounts.critical} (
                        {Math.round(
                          (metrics.severityCounts.critical / metrics.totalIncidents) * 100,
                        )}
                        %)
                      </span>
                    </div>
                    <Progress
                      value={(metrics.severityCounts.critical / metrics.totalIncidents) * 100}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-amber-800">High Urgency</span>
                      <span className="font-mono font-semibold">
                        {metrics.severityCounts.high} (
                        {Math.round((metrics.severityCounts.high / metrics.totalIncidents) * 100)}%)
                      </span>
                    </div>
                    <Progress
                      value={(metrics.severityCounts.high / metrics.totalIncidents) * 100}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#17382f]">Medium Severity</span>
                      <span className="font-mono font-semibold">
                        {metrics.severityCounts.medium} (
                        {Math.round((metrics.severityCounts.medium / metrics.totalIncidents) * 100)}
                        %)
                      </span>
                    </div>
                    <Progress
                      value={(metrics.severityCounts.medium / metrics.totalIncidents) * 100}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-emerald-800">Low / Minor</span>
                      <span className="font-mono font-semibold">
                        {metrics.severityCounts.low} (
                        {Math.round((metrics.severityCounts.low / metrics.totalIncidents) * 100)}%)
                      </span>
                    </div>
                    <Progress
                      value={(metrics.severityCounts.low / metrics.totalIncidents) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="border-t border-border px-6 py-3 bg-muted/20 text-xs text-muted-foreground">
              <span>PRD §8 Vision classification and municipal urgency scoring</span>
            </CardFooter>
          </Card>
        </div>

        {/* Right: Category Breakdown (5 cols) */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          <Card className="shadow-xs">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg">Distribution by Category</CardTitle>
              <CardDescription>
                Breakdown by hazard typology across Greater Noida pilot.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 pt-4">
              {!metrics || categories.length === 0 ? (
                <Empty className="my-6 border-0 bg-transparent">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <PieChart className="size-6 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No category telemetry</EmptyTitle>
                    <EmptyDescription>
                      Typology distribution across road surface, footpaths, lighting, and crossings
                      will populate once reports are submitted.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                categories.map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="text-muted-foreground font-mono">
                        {item.count} ({item.pct}%)
                      </span>
                    </div>
                    <Progress value={item.pct} className="h-1.5" />
                  </div>
                ))
              )}
            </CardContent>

            <CardFooter className="border-t border-border px-6 py-3 bg-muted/20 text-xs text-muted-foreground">
              <span>Live PostGIS canonical grouping</span>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
