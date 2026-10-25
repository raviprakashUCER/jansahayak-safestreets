import { Metadata } from "next";
import { Suspense } from "react";
import ReportDetailClient from "./report-detail-client";

export const metadata: Metadata = {
  title: "Track Citizen Report — JanSahayak SafeStreets",
  description:
    "Inspect live civic processing progress, AI hazard classification, and official moderation status.",
};

async function ReportTracker({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  return <ReportDetailClient reportId={reportId} />;
}

export default function ReportTrackingPage({ params }: { params: Promise<{ reportId: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5f3ed] flex items-center justify-center py-24 text-[#0e2b24]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#1f4e3d] border-t-transparent rounded-full animate-spin" />
            <p className="font-serif text-sm italic">Loading civic report dossier...</p>
          </div>
        </div>
      }
    >
      <ReportTracker params={params} />
    </Suspense>
  );
}
