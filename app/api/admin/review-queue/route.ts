import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { db, incidents } from "@/lib/db";
import { eq, or, desc } from "drizzle-orm";

/**
 * PRD §16 Admin Review Queue Endpoint
 * GET /api/admin/review-queue: Fetch incidents awaiting staff verification or review.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUserSession();

    if (session.role !== "moderator" && session.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Forbidden: Only designated moderators or administrators can access the review queue.",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const rows = await db
      .select()
      .from(incidents)
      .where(or(eq(incidents.status, "under_review"), eq(incidents.status, "open")))
      .orderBy(desc(incidents.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      count: rows.length,
      items: rows,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
