"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/sections";
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart2,
  TrendingDown,
  Info,
  Calendar,
} from "lucide-react";
import type { SectorHealthScore } from "@/lib/analytics/civic-issue-index";
import { SCORE_METHODOLOGY_DISCLAIMER } from "@/lib/analytics/civic-issue-index";

export default function AreaHealthIndexPage() {
  const [sectors, setSectors] = useState<SectorHealthScore[]>([]);
  const [averageIndex, setAverageIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState<SectorHealthScore | null>(null);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const res = await fetch("/api/analytics/civic-index");
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.success && Array.isArray(data.sectors)) {
          setSectors(data.sectors);
          setAverageIndex(data.averageIndex || 0);
          if (data.sectors.length > 0) {
            setSelectedSector(data.sectors[0]);
          }
        }
      } catch (err) {
        console.warn("Failed to load civic index:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const filteredSectors = sectors.filter((s) => {
    if (filterGrade !== "all" && s.healthGrade !== filterGrade) return false;
    if (searchQuery && !s.sector.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="box-grid">
        <SiteNav />
        <main className="min-h-screen">
          <section className="section-box categories-section">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="section-label">Evidence-Based Governance</p>
                <div className="section-heading">
                  <h1 className="font-heading text-2xl font-bold text-[#0e2b24] dark:text-[#f5f3ed] sm:text-3xl">
                    Civic Issue Index & Area Health Scores
                  </h1>
                </div>
                <p className="mt-1 text-sm text-[#486057] dark:text-[#cbd5cb] max-w-2xl">
                  A transparent, mathematical 0–100 burden index derived from citizen-reported hazards across Greater
                  Noida. Lower numbers indicate fewer unaddressed road defects.
                </p>
              </div>

              {/* Regional average chip */}
              <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center font-mono text-xl font-bold text-primary">
                  {loading ? "..." : averageIndex}
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Regional Pilot Burden Index
                  </div>
                  <div className="text-xs font-semibold text-foreground">Greater Noida Mean Score</div>
                </div>
              </div>
            </div>

            {/* Methodology Explainer Banner */}
            <div className="mt-6 p-4 rounded-3xl bg-[#faf9f5] dark:bg-[#102922] border border-[#cbd5cb] dark:border-[#22483d] text-xs">
              <div className="flex items-start gap-2.5">
                <Info className="size-4 shrink-0 text-[#0e2b24] dark:text-[#78a37d] mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-semibold text-[#0e2b24] dark:text-[#f5f3ed]">
                    Mathematical Methodology (Weighted 0–100 Scale):
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#486057] dark:text-[#9bb2a8]">
                    <div className="p-2 rounded-xl bg-background/60 border border-border">
                      <span className="font-bold text-foreground">40% Density:</span> Volume of open unresolved hazards
                    </div>
                    <div className="p-2 rounded-xl bg-background/60 border border-border">
                      <span className="font-bold text-foreground">30% Severity:</span> Weighting for critical hazards
                    </div>
                    <div className="p-2 rounded-xl bg-background/60 border border-border">
                      <span className="font-bold text-foreground">20% Stagnancy:</span> Overdue aging beyond 14 days
                    </div>
                    <div className="p-2 rounded-xl bg-background/60 border border-border">
                      <span className="font-bold text-foreground">10% Credit:</span> Active resolution track record
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls: Search and Grade Filters */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                {["all", "A", "B", "C", "D", "E"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFilterGrade(g)}
                    className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                      filterGrade === g
                        ? "bg-[#0e2b24] text-white dark:bg-[#78a37d] dark:text-[#0e2b24] font-semibold"
                        : "bg-card border border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {g === "all" ? "All Grades" : `Grade ${g}`}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search Greater Noida sector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            {/* Main Sector Grid & Detail Panel */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sector Cards List */}
              <div className="lg:col-span-2 space-y-3">
                {loading ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">Calculating sector indices...</div>
                ) : filteredSectors.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-card border border-border text-center text-xs text-muted-foreground">
                    No sectors match the active search filter.
                  </div>
                ) : (
                  filteredSectors.map((s) => {
                    const isSelected = selectedSector?.sector === s.sector;
                    const gradeColors = {
                      A: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200",
                      B: "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200",
                      C: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200",
                      D: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-200",
                      E: "bg-red-100 text-red-900 border-red-300 dark:bg-red-950/60 dark:text-red-200",
                    }[s.healthGrade];

                    return (
                      <div
                        key={s.sector}
                        onClick={() => setSelectedSector(s)}
                        className={`p-4 rounded-2xl bg-card border transition-all cursor-pointer shadow-xs ${
                          isSelected
                            ? "border-[#0e2b24] dark:border-[#78a37d] ring-1 ring-primary/20"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className={`size-9 rounded-xl font-bold font-mono text-sm flex items-center justify-center border ${gradeColors}`}
                            >
                              {s.healthGrade}
                            </span>
                            <div>
                              <h3 className="font-semibold text-xs text-foreground">{s.sector}</h3>
                              <p className="text-[11px] text-muted-foreground">{s.gradeLabel}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono text-base font-bold text-foreground">
                              {s.civicIssueIndex}
                              <span className="text-[10px] text-muted-foreground font-normal">/100</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">Burden Index</div>
                          </div>
                        </div>

                        {/* Progress bar visualizing burden */}
                        <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              s.civicIssueIndex > 60
                                ? "bg-red-500"
                                : s.civicIssueIndex > 35
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.max(4, s.civicIssueIndex)}%` }}
                          />
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border">
                          <span>
                            {s.totalReported} total reports ({s.openIncidents} open)
                          </span>
                          <span>Resolution Rate: {s.resolutionRatePct}%</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Detailed Breakdown Sidebar */}
              <div>
                {selectedSector ? (
                  <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-4 sticky top-6">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Sector Factor Inspection
                      </span>
                      <h2 className="font-heading text-lg font-bold text-foreground mt-0.5">
                        {selectedSector.sector}
                      </h2>
                      <p className="text-xs text-muted-foreground">{selectedSector.coverageSummary}</p>
                    </div>

                    {!selectedSector.hasSufficientData && (
                      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                        <AlertCircle className="size-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Preliminary Estimate: </span>
                          This sector has fewer than 3 verified reports. Score will adjust as additional evidence is
                          contributed.
                        </div>
                      </div>
                    )}

                    {/* Metric Pills */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-background border border-border">
                        <div className="text-[10px] text-muted-foreground">Open Hazards</div>
                        <div className="font-mono text-sm font-bold text-foreground">
                          {selectedSector.openIncidents}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-background border border-border">
                        <div className="text-[10px] text-muted-foreground">Critical Hazards</div>
                        <div className="font-mono text-sm font-bold text-destructive">
                          {selectedSector.criticalCount}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-background border border-border">
                        <div className="text-[10px] text-muted-foreground">Avg Hazard Age</div>
                        <div className="font-mono text-sm font-bold text-foreground">
                          {selectedSector.avgAgeDays} days
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-background border border-border">
                        <div className="text-[10px] text-muted-foreground">Resolved Cases</div>
                        <div className="font-mono text-sm font-bold text-emerald-600">
                          {selectedSector.resolvedIncidents}
                        </div>
                      </div>
                    </div>

                    {/* Contributing Factor Breakdown */}
                    <div className="space-y-2 border-t border-border pt-3">
                      <div className="text-xs font-semibold text-foreground">Contributing Factor Breakdown:</div>

                      <div className="space-y-1.5 text-[11px]">
                        <div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Density Contribution</span>
                            <span className="font-mono font-bold text-foreground">
                              {selectedSector.factors.densityScore} / 40
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1 mt-0.5">
                            <div
                              className="bg-primary h-full rounded-full"
                              style={{ width: `${(selectedSector.factors.densityScore / 40) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Severity Penalty</span>
                            <span className="font-mono font-bold text-foreground">
                              {selectedSector.factors.severityPenalty} / 30
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1 mt-0.5">
                            <div
                              className="bg-amber-600 h-full rounded-full"
                              style={{ width: `${(selectedSector.factors.severityPenalty / 30) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Stagnancy Penalty (&gt;14d)</span>
                            <span className="font-mono font-bold text-foreground">
                              {selectedSector.factors.agePenalty} / 20
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1 mt-0.5">
                            <div
                              className="bg-red-600 h-full rounded-full"
                              style={{ width: `${(selectedSector.factors.agePenalty / 20) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Resolution Offset Credit</span>
                            <span className="font-mono font-bold text-emerald-600">
                              -{selectedSector.factors.resolutionCredit} / 10
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1 mt-0.5">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${(selectedSector.factors.resolutionCredit / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <Link
                        href={`/map?sector=${encodeURIComponent(selectedSector.sector)}`}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0e2b24] text-white dark:bg-[#78a37d] dark:text-[#0e2b24] text-xs font-semibold hover:opacity-90 transition-all"
                      >
                        <span>View Sector on Live Map</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-3xl bg-card border border-border text-center text-xs text-muted-foreground">
                    Select a sector from the left to inspect its scoring factors.
                  </div>
                )}
              </div>
            </div>

            {/* Statutory Methodology Disclaimer */}
            <div className="mt-10 p-4 rounded-3xl bg-[#f5f3ed] dark:bg-[#102922] border border-[#cbd5cb] dark:border-[#22483d] text-[11px] text-[#486057] dark:text-[#9bb2a8]">
              <div className="flex items-start gap-2">
                <Info className="size-4 shrink-0 mt-0.5 text-[#0e2b24] dark:text-[#78a37d]" />
                <div>
                  <span className="font-semibold text-[#0e2b24] dark:text-[#f5f3ed]">Civic Score Notice: </span>
                  {SCORE_METHODOLOGY_DISCLAIMER}
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
