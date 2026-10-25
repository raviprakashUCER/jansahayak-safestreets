import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { db, outboxEvents } from "@/lib/db";
import { desc } from "drizzle-orm";

/**
 * PRD §18 Outbox Telemetry & Queue Observability Endpoint
 * GET /api/admin/outbox
 */
export async function GET() {
  try {
    const session = await getCurrentUserSession();

    if (session.role !== "moderator" && session.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Forbidden: Only designated moderators or administrators can inspect outbox telemetry.",
        },
        { status: 403 },
      );
    }

    const recent = await db
      .select()
      .from(outboxEvents)
      .orderBy(desc(outboxEvents.createdAt))
      .limit(20);

    const counts = {
      pending: recent.filter((e) => e.status === "pending").length,
      processing: recent.filter((e) => e.status === "processing").length,
      completed: recent.filter((e) => e.status === "completed").length,
      failed: recent.filter((e) => e.status === "failed").length,
      totalRecent: recent.length,
    };

    return NextResponse.json({
      success: true,
      counts,
      events: recent,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
