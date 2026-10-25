"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/sections";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  FileCheck,
  TrendingUp,
  MapPin,
  Calendar,
  Info,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

interface AccountabilityData {
  totalSubmissions: number;
  totalIncidents: number;
  verifiedIncidents: number;
  pendingReviews: number;
  unresolvedIncidents: number;
  resolvedIncidents: number;
  overdueIncidents: number;
  resolutionRatePct: number;
  avgResolutionDays: number;
  categoryCounts: Record<string, number>;
  areaCounts: Record<string, number>;
  monthlyTrends: Record<string, number>;
}

export default function PublicAccountabilityPage() {
  const [data, setData] = useState<AccountabilityData | null>(null);
  const [definitions, setDefinitions] = useState<Record<string, string>>({});
  const [range, setRange] = useState<"all" | "30d" | "90d">("all");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accountability?range=${range}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.metrics) {
        setData(json.metrics);
        setDefinitions(json.definitions || {});
      }
    } catch (err) {
      console.warn("Failed to fetch public accountability data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range]);

  return (
    <>
      <div className="box-grid">
        <SiteNav />
        <main className="min-h-screen">
          <section className="section-box categories-section">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="section-label">Civic Governance Transparency</p>
                <div className="section-heading">
                  <h1 className="font-heading text-2xl font-bold text-[#0e2b24] dark:text-[#f5f3ed] sm:text-3xl">
                    Public Accountability Dashboard
                  </h1>
                </div>
                <p className="mt-1 text-sm text-[#486057] dark:text-[#cbd5cb] max-w-2xl">
                  Inspect authentic civic performance metrics derived from verified roadway reports, municipal SLA
                  deadlines, and repair records in Greater Noida.
                </p>
              </div>

              {/* Date range filter */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-card border border-border shadow-xs text-xs">
                {(["all", "30d", "90d"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`px-3 py-1 rounded-xl font-medium transition-all cursor-pointer ${
                      range === r
                        ? "bg-[#0e2b24] text-white dark:bg-[#78a37d] dark:text-[#0e2b24] font-semibold"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {r === "all" ? "All Time" : r === "30d" ? "Past 30 Days" : "Past 90 Days"}
                  </button>
                ))}
              </div>
            </div>

            {/* Core KPI Telemetry Grid */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span>Total Submissions</span>
                  <FileCheck className="size-4 text-emerald-600" />
                </div>
                <div className="mt-2 font-mono text-2xl font-bold text-foreground">
                  {loading ? "..." : data?.totalSubmissions || 0}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Citizen photo filings</p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span>Verified Hazards</span>
                  <ShieldCheck className="size-4 text-primary" />
                </div>
                <div className="mt-2 font-mono text-2xl font-bold text-foreground">
                  {loading ? "..." : data?.verifiedIncidents || 0}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Pipeline-validated dockets</p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span>Resolution Rate</span>
                  <TrendingUp className="size-4 text-emerald-600" />
                </div>
                <div className="mt-2 font-mono text-2xl font-bold text-emerald-600">
                  {loading ? "..." : `${data?.resolutionRatePct || 0}%`}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Remediated cases</p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                  <span>Avg Resolution SLA</span>
                  <Clock className="size-4 text-amber-600" />
                </div>
                <div className="mt-2 font-mono text-2xl font-bold text-foreground">
                  {loading ? "..." : `${data?.avgResolutionDays || 0}d`}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Filing to repair closure</p>
              </div>
            </div>

            {/* Sub-KPI Row */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-card border border-border text-xs">
                <span className="text-muted-foreground text-[11px]">Under Active Review</span>
                <div className="font-mono text-lg font-bold text-foreground mt-0.5">
                  {loading ? "..." : data?.pendingReviews || 0}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-card border border-border text-xs">
                <span className="text-muted-foreground text-[11px]">Unresolved Hazards</span>
                <div className="font-mono text-lg font-bold text-foreground mt-0.5">
                  {loading ? "..." : data?.unresolvedIncidents || 0}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-card border border-border text-xs">
                <span className="text-muted-foreground text-[11px]">Officially Remediated</span>
                <div className="font-mono text-lg font-bold text-emerald-600 mt-0.5">
                  {loading ? "..." : data?.resolvedIncidents || 0}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-card border border-border text-xs">
                <span className="text-muted-foreground text-[11px]">Overdue Past SLA (&gt;7d)</span>
                <div className="font-mono text-lg font-bold text-destructive mt-0.5">
                  {loading ? "..." : data?.overdueIncidents || 0}
                </div>
              </div>
            </div>

            {/* Category & Sector Breakdown Visualizations */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category-wise Breakdown */}
              <div className="p-5 rounded-3xl bg-card border border-border shadow-xs">
                <h2 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  <span>Category-Wise Incident Distribution</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Distribution of defect types across Greater Noida carriageways.
                </p>

                <div className="mt-4 space-y-3">
                  {data?.categoryCounts && Object.keys(data.categoryCounts).length > 0 ? (
                    Object.entries(data.categoryCounts).map(([cat, count]) => {
                      const total = data.totalIncidents || 1;
                      const pct = Math.round((count / total) * 100);
                      const cleanLabel = cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

                      return (
                        <div key={cat} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">{cleanLabel}</span>
                            <span className="font-mono text-muted-foreground">
                              {count} cases ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full transition-all"
                              style={{ width: `${Math.max(4, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-xs text-muted-foreground">No reports recorded in this period.</div>
                  )}
                </div>
              </div>

              {/* Sector / Area Incident Concentration */}
              <div className="p-5 rounded-3xl bg-card border border-border shadow-xs">
                <h2 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                  <MapPin className="size-4 text-emerald-600" />
                  <span>Sector &amp; Corridor Incident Volume</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Geographic distribution across pilot sectors in Greater Noida.
                </p>

                <div className="mt-4 max-h-75 overflow-y-auto pr-1 space-y-2">
                  {data?.areaCounts && Object.keys(data.areaCounts).length > 0 ? (
                    Object.entries(data.areaCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 8)
                      .map(([sector, count]) => (
                        <div
                          key={sector}
                          className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between text-xs"
                        >
                          <span className="font-medium text-foreground">{sector}</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {count} reports
                          </span>
                        </div>
                      ))
                  ) : (
                    <div className="p-6 text-center text-xs text-muted-foreground">No area data available.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Metric Definitions & Calculation Transparency (PRD Requirement 7) */}
            <div className="mt-8 p-5 rounded-3xl bg-[#faf9f5] dark:bg-[#102922] border border-[#cbd5cb] dark:border-[#22483d] text-xs">
              <div className="flex items-start gap-2.5">
                <Info className="size-4 shrink-0 text-[#0e2b24] dark:text-[#78a37d] mt-0.5" />
                <div className="space-y-2 w-full">
                  <h3 className="font-semibold text-[#0e2b24] dark:text-[#f5f3ed]">
                    Mathematical Metric Formulations &amp; Calculation Rules:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#486057] dark:text-[#9bb2a8]">
                    {Object.entries(definitions).map(([key, desc]) => (
                      <div key={key} className="p-2 rounded-xl bg-background/60 border border-border">
                        <span className="font-bold text-foreground uppercase tracking-wider">{key}: </span>
                        <span>{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
