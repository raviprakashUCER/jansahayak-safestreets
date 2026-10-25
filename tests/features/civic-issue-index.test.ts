import { describe, it, expect } from "vitest";
import {
  calculateSectorIssueIndex,
  computeAllPilotSectorsIndex,
} from "@/lib/analytics/civic-issue-index";

describe("Civic Issue Index & Area Health Scoring", () => {
  it("should return insufficient data state when sector has zero reports", () => {
    const result = calculateSectorIssueIndex({
      sector: "Alpha I",
      incidents: [],
    });

    expect(result.sector).toBe("Alpha I");
    expect(result.civicIssueIndex).toBe(0);
    expect(result.hasSufficientData).toBe(false);
    expect(result.healthGrade).toBe("A");
    expect(result.totalReported).toBe(0);
  });

  it("should calculate higher burden index for sectors with critical unresolved hazards", () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * 86400000).toISOString();

    const highBurdenSector = calculateSectorIssueIndex({
      sector: "Beta I",
      incidents: [
        { severity: "critical", status: "open", createdAt: twentyDaysAgo },
        { severity: "critical", status: "open", createdAt: twentyDaysAgo },
        { severity: "high", status: "open", createdAt: twentyDaysAgo },
        { severity: "high", status: "in-progress", createdAt: twentyDaysAgo },
      ],
    });

    const lowBurdenSector = calculateSectorIssueIndex({
      sector: "Gamma II",
      incidents: [
        { severity: "low", status: "resolved", createdAt: twentyDaysAgo, updatedAt: new Date().toISOString() },
        { severity: "low", status: "resolved", createdAt: twentyDaysAgo, updatedAt: new Date().toISOString() },
        { severity: "medium", status: "resolved", createdAt: twentyDaysAgo, updatedAt: new Date().toISOString() },
      ],
    });

    expect(highBurdenSector.hasSufficientData).toBe(true);
    expect(lowBurdenSector.hasSufficientData).toBe(true);
    expect(highBurdenSector.civicIssueIndex).toBeGreaterThan(lowBurdenSector.civicIssueIndex);
    expect(highBurdenSector.factors.severityPenalty).toBeGreaterThan(lowBurdenSector.factors.severityPenalty);
    expect(lowBurdenSector.factors.resolutionCredit).toBeGreaterThan(highBurdenSector.factors.resolutionCredit);
  });

  it("should bound civicIssueIndex strictly between 0 and 100", () => {
    const extremeIncidentList = Array(50).fill({
      severity: "critical",
      status: "open",
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    });

    const result = calculateSectorIssueIndex({
      sector: "Pari Chowk",
      incidents: extremeIncidentList,
    });

    expect(result.civicIssueIndex).toBeLessThanOrEqual(100);
    expect(result.civicIssueIndex).toBeGreaterThanOrEqual(0);
    expect(result.healthGrade).toBe("E");
  });

  it("should compute indices across all Greater Noida pilot sectors", () => {
    const sectorScores = computeAllPilotSectorsIndex([]);
    expect(sectorScores.length).toBeGreaterThan(10);
    expect(sectorScores.every((s) => typeof s.civicIssueIndex === "number")).toBe(true);
  });
});
