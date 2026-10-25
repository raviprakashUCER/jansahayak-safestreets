import { NextRequest, NextResponse } from "next/server";
import { processOutboxBatch } from "@/lib/pipeline/worker";

/**
 * PRD §4 Outbox Processing Cron Endpoint
 * Periodically or on-demand triggered to process pending outbox events.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const batch = parseInt(searchParams.get("batch") || "25", 10);

    const summary = await processOutboxBatch(batch);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
