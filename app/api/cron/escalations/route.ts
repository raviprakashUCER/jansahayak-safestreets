import { NextResponse } from "next/server";
import { db, incidents } from "@/lib/db";
import { evaluateAndTriggerEscalation } from "@/lib/escalations/escalation-service";
import { eq, ne } from "drizzle-orm";

export async function GET() {
  try {
    // Select all open, in-progress, or under-review incidents
    const activeIncidents = await db
      .select({ id: incidents.id, incidentNumber: incidents.incidentNumber })
      .from(incidents)
      .where(ne(incidents.status, "resolved"))
      .limit(100);

    const results: Array<{
      incidentNumber: string;
      escalated: boolean;
      level: number;
      isOverdue: boolean;
      reason: string;
    }> = [];

    for (const inc of activeIncidents) {
      const res = await evaluateAndTriggerEscalation(inc.id);
      results.push({
        incidentNumber: inc.incidentNumber,
        escalated: res.escalated,
        level: res.level,
        isOverdue: res.isOverdue,
        reason: res.reason,
      });
    }

    const overdueCount = results.filter((r) => r.isOverdue).length;
    const escalatedCount = results.filter((r) => r.escalated).length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checkedCount: results.length,
      overdueCount,
      escalatedCount,
      evaluations: results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
