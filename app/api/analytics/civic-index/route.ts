import { NextResponse } from "next/server";
import { db, incidents } from "@/lib/db";
import { computeAllPilotSectorsIndex, SCORE_METHODOLOGY_DISCLAIMER } from "@/lib/analytics/civic-issue-index";

export async function GET() {
  try {
    const rows = await db.select().from(incidents);

    const mapped = rows.map((r) => ({
      category: r.category,
      severity: r.severity,
      status: r.status,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      metadata: r.metadata as Record<string, unknown>,
    }));

    const sectorScores = computeAllPilotSectorsIndex(mapped);

    // Summary calculations across pilot region
    const sectorsWithData = sectorScores.filter((s) => s.hasSufficientData);
    const avgRegionalIndex =
      sectorsWithData.length > 0
        ? Math.round(
            sectorsWithData.reduce((acc, s) => acc + s.civicIssueIndex, 0) / sectorsWithData.length
          )
        : 0;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      region: "Greater Noida Pilot",
      averageIndex: avgRegionalIndex,
      sectorsEvaluated: sectorScores.length,
      disclaimer: SCORE_METHODOLOGY_DISCLAIMER,
      sectors: sectorScores,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
