import { PILOT_SECTORS } from "@/lib/data/constants";

export interface SectorHealthScore {
  sector: string;
  civicIssueIndex: number; // 0 (minimal defects) to 100 (high civic defect burden)
  healthGrade: "A" | "B" | "C" | "D" | "E";
  gradeLabel: string;
  totalReported: number;
  openIncidents: number;
  resolvedIncidents: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  avgAgeDays: number;
  resolutionRatePct: number;
  hasSufficientData: boolean;
  factors: {
    densityScore: number; // 0-40
    severityPenalty: number; // 0-30
    agePenalty: number; // 0-20
    resolutionCredit: number; // 0-10
  };
  coverageSummary: string;
  lastCalculatedAt: string;
  methodologyNote: string;
}

export const SCORE_METHODOLOGY_DISCLAIMER =
  "The JanSahayak Civic Issue Index is an evidence-based mathematical assessment derived exclusively from citizen-submitted and verified community roadway hazard reports. It is not an official municipal safety certification or government audit rating, and does not rank elected ward representatives.";

/**
 * Calculates a transparent 0-100 Civic Issue Index for an area.
 * Formula:
 * - Density of open issues (Weight 40%)
 * - Severity-weighted hazard penalty (Weight 30%)
 * - Age of unresolved issues (>7d, >14d) (Weight 20%)
 * - Resolution track record offset (Weight 10%)
 */
export function calculateSectorIssueIndex(params: {
  sector: string;
  incidents: Array<{
    severity: string;
    status: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  }>;
}): SectorHealthScore {
  const totalReported = params.incidents.length;
  const now = Date.now();

  if (totalReported === 0) {
    return {
      sector: params.sector,
      civicIssueIndex: 0,
      healthGrade: "A",
      gradeLabel: "Insufficient Reports",
      totalReported: 0,
      openIncidents: 0,
      resolvedIncidents: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      avgAgeDays: 0,
      resolutionRatePct: 0,
      hasSufficientData: false,
      factors: {
        densityScore: 0,
        severityPenalty: 0,
        agePenalty: 0,
        resolutionCredit: 0,
      },
      coverageSummary: "No validated community reports on record for this sector.",
      lastCalculatedAt: new Date().toISOString(),
      methodologyNote: SCORE_METHODOLOGY_DISCLAIMER,
    };
  }

  const openList = params.incidents.filter(
    (i) => i.status !== "resolved" && i.status !== "rejected"
  );
  const resolvedList = params.incidents.filter((i) => i.status === "resolved");

  const openIncidents = openList.length;
  const resolvedIncidents = resolvedList.length;

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let totalAgeDays = 0;

  for (const inc of openList) {
    const sev = inc.severity?.toLowerCase() || "medium";
    if (sev === "critical") criticalCount++;
    else if (sev === "high") highCount++;
    else if (sev === "medium" || sev === "moderate") mediumCount++;
    else lowCount++;

    const created = inc.createdAt ? new Date(inc.createdAt).getTime() : now;
    const ageDays = Math.max(0, (now - created) / (1000 * 60 * 60 * 24));
    totalAgeDays += ageDays;
  }

  const avgAgeDays = openIncidents > 0 ? Number((totalAgeDays / openIncidents).toFixed(1)) : 0;
  const resolutionRatePct =
    totalReported > 0 ? Math.round((resolvedIncidents / totalReported) * 100) : 0;

  // 1. Density Score (Max 40 points)
  // 10+ open issues maxes out the sector baseline
  const densityScore = Math.min(40, (openIncidents / 10) * 40);

  // 2. Severity Penalty (Max 30 points)
  // Weighted: Critical * 3, High * 2, Medium * 1, Low * 0.5
  const severityPoints =
    criticalCount * 3 + highCount * 2 + mediumCount * 1 + lowCount * 0.5;
  const severityPenalty = Math.min(30, (severityPoints / 15) * 30);

  // 3. Age Penalty (Max 20 points)
  // Average age > 14 days gets full 20 penalty points
  const agePenalty = Math.min(20, (avgAgeDays / 14) * 20);

  // 4. Resolution Credit (Reduces score by up to 10 points)
  const resolutionCredit = Number(((resolutionRatePct / 100) * 10).toFixed(1));

  // Final 0-100 composite index
  let rawIndex = densityScore + severityPenalty + agePenalty - resolutionCredit;
  const civicIssueIndex = Math.round(Math.max(0, Math.min(100, rawIndex)));

  // Health Grade Mapping (Lower index = Better road health)
  let healthGrade: "A" | "B" | "C" | "D" | "E" = "A";
  let gradeLabel = "Excellent Corridors";

  if (civicIssueIndex > 75) {
    healthGrade = "E";
    gradeLabel = "Severe Defect Density";
  } else if (civicIssueIndex > 50) {
    healthGrade = "D";
    gradeLabel = "Elevated Hazard Burden";
  } else if (civicIssueIndex > 30) {
    healthGrade = "C";
    gradeLabel = "Moderate Maintenance Needed";
  } else if (civicIssueIndex > 15) {
    healthGrade = "B";
    gradeLabel = "Fair / Minor Wear";
  }

  return {
    sector: params.sector,
    civicIssueIndex,
    healthGrade,
    gradeLabel,
    totalReported,
    openIncidents,
    resolvedIncidents,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    avgAgeDays,
    resolutionRatePct,
    hasSufficientData: totalReported >= 2,
    factors: {
      densityScore: Math.round(densityScore),
      severityPenalty: Math.round(severityPenalty),
      agePenalty: Math.round(agePenalty),
      resolutionCredit: Math.round(resolutionCredit),
    },
    coverageSummary: `Evaluated across ${totalReported} total community submissions (${openIncidents} active, ${resolvedIncidents} resolved).`,
    lastCalculatedAt: new Date().toISOString(),
    methodologyNote: SCORE_METHODOLOGY_DISCLAIMER,
  };
}

/**
 * Computes health score for all pilot sectors in Greater Noida.
 */
export function computeAllPilotSectorsIndex(
  allIncidents: Array<{
    category: string;
    severity: string;
    status: string;
    latitude: number;
    longitude: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    metadata?: Record<string, unknown>;
  }>
): SectorHealthScore[] {
  return PILOT_SECTORS.map((sector) => {
    // Match incidents by metadata.landmark / sector string or location
    const matched = allIncidents.filter((inc) => {
      const landmark = String(inc.metadata?.landmark || "").toLowerCase();
      const secLower = sector.toLowerCase();
      return landmark.includes(secLower);
    });

    return calculateSectorIssueIndex({
      sector,
      incidents: matched,
    });
  });
}
