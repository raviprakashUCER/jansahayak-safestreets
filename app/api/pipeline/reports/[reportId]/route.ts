import { NextRequest, NextResponse } from "next/server";
import {
  getReportsCollection,
  getAILogsCollection,
  getPipelineLogsCollection,
} from "@/lib/db/mongodb";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const reportsColl = await getReportsCollection();
    const report = await reportsColl.findOne({ reportId });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const aiLogsColl = await getAILogsCollection();
    const aiLog = await aiLogsColl.findOne({ reportId });

    const pipelineLogsColl = await getPipelineLogsCollection();
    const jobLogs = await pipelineLogsColl.find({ reportId }).sort({ stage: 1 }).toArray();

    return NextResponse.json({
      success: true,
      report,
      aiAnalysis: aiLog?.structuredExtraction || null,
      jobLogs,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
