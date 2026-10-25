import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { POST as submitReport } from "@/app/api/pipeline/submit/route";
import { getReportsCollection } from "@/lib/db/mongodb";

/**
 * PRD §16 Reports Endpoint
 * POST /api/reports: Standard intake for citizen hazard reports.
 * GET /api/reports: Fetch citizen submissions (user-scoped or recent public).
 */
export async function POST(req: NextRequest) {
  return submitReport(req);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUserSession();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const reportsColl = await getReportsCollection();
    const query: Record<string, unknown> = {};

    if (session.isAuthenticated && session.userId) {
      query.userId = session.userId;
    }

    const reports = await reportsColl
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({
        _id: 1,
        reportId: 1,
        category: 1,
        description: 1,
        status: 1,
        createdAt: 1,
        submissionLocation: 1,
        "photos.filename": 1,
        "photos.byteSize": 1,
      })
      .toArray();

    return NextResponse.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isConnRefused = msg.includes("ECONNREFUSED") || msg.includes("connect");
    return NextResponse.json(
      {
        error: isConnRefused ? "Database connection unavailable" : msg,
        isRetryable: isConnRefused,
      },
      { status: isConnRefused ? 503 : 500 },
    );
  }
}
