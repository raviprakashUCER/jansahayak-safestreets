import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { db, incidents, incidentReports, communityVerifications } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getReportsCollection } from "@/lib/db/mongodb";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ incidentId: string }> }
) {
  try {
    const { incidentId } = await context.params;
    const session = await getCurrentUserSession();

    if (session.role !== "moderator" && session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Administrative role required to access case synthesis summaries." },
        { status: 403 }
      );
    }

    // 1. Fetch incident from PostgreSQL
    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, incidentId))
      .limit(1);

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // 2. Fetch associated reports
    const associatedReports = await db
      .select()
      .from(incidentReports)
      .where(eq(incidentReports.incidentId, incidentId));

    // 3. Fetch community verifications
    const verifications = await db
      .select()
      .from(communityVerifications)
      .where(eq(communityVerifications.incidentId, incidentId));

    // 4. Fetch raw report details from MongoDB if available
    let rawReportsData: Array<{ reportId: string; description: string; photoCount: number }> = [];
    try {
      const reportsColl = await getReportsCollection();
      const reportIds = associatedReports.map((r) => r.reportId);
      if (reportIds.length > 0) {
        const found = await reportsColl.find({ reportId: { $in: reportIds } }).toArray();
        rawReportsData = found.map((f) => ({
          reportId: f.reportId,
          description: f.description,
          photoCount: f.evidencePhotos?.length || 0,
        }));
      }
    } catch {
      // Non-blocking
    }

    const totalPhotos = rawReportsData.reduce((acc, r) => acc + r.photoCount, 0);
    const confirms = verifications.filter((v) => v.verificationType === "confirm_exists").length;
    const resolvedReports = verifications.filter((v) => v.verificationType === "report_resolved").length;

    // Rule-based deterministic synthesis
    const facts = [
      `Canonical Incident ID: ${incident.incidentNumber} (${incident.id})`,
      `Reported Category: ${incident.category} | Assessed Severity: ${incident.severity.toUpperCase()}`,
      `Current Moderation Status: ${incident.moderationStatus} | Public Publication: ${incident.isPublished ? "PUBLISHED" : "UNPUBLISHED"}`,
      `Spatial Coordinate: ${Number(incident.latitude).toFixed(5)}° N, ${Number(incident.longitude).toFixed(5)}° E (±${Number(incident.spatialUncertaintyMeters).toFixed(1)}m uncertainty)`,
      `Corroboration: Associated with ${associatedReports.length} raw citizen report(s) and supported by ${totalPhotos} evidence photo(s)`,
      `Community Feedback: ${confirms} independent 'still there' confirmation(s), ${resolvedReports} 'reported resolved' claim(s)`,
    ];

    const missingInformation: string[] = [];
    if (totalPhotos < 4) {
      missingInformation.push("Fewer than 4 standard evidence photographs available for this case.");
    }
    if (Number(incident.spatialUncertaintyMeters) > 15) {
      missingInformation.push(`High spatial uncertainty of ±${Number(incident.spatialUncertaintyMeters).toFixed(1)}m. Field GPS verification advised.`);
    }
    if (!incident.metadata || Object.keys(incident.metadata).length === 0) {
      missingInformation.push("Specific landmark annotation or nearest street intersection name is missing.");
    }

    const suggestedNextSteps: string[] = [];
    if (incident.moderationStatus === "pending") {
      suggestedNextSteps.push("Perform visual evidence quality triage to approve or reject canonical map publication.");
    }
    if (incident.severity === "critical" && incident.status !== "assigned") {
      suggestedNextSteps.push("Critical severity tag: Route urgent repair notice to GNIDA Drainage or Civil Division.");
    }
    if (resolvedReports > 0) {
      suggestedNextSteps.push(`Dispatch field inspector to confirm the ${resolvedReports} citizen claim(s) that this defect was repaired.`);
    }

    let summaryText = `Incident ${incident.incidentNumber} represents a ${incident.severity} ${incident.category.toLowerCase()} hazard in Greater Noida. Primary report states: "${incident.summary || incident.title}". The file contains ${associatedReports.length} associated citizen submission(s) with ${totalPhotos} evidence capture(s).`;

    // Attempt OpenRouter synthesis if configured
    let isAIGenerated = false;
    let provider = "rule-based-synthesis";
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (apiKey && !apiKey.includes("placeholder") && apiKey.trim().length > 10) {
      try {
        const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
        const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

        const prompt = `
You are the Administrative Case Synthesis Assistant for JanSahayak SafeStreets municipal reviewers.
Synthesize the following real case records without inventing facts:
- Incident: ${incident.incidentNumber}
- Category: ${incident.category}
- Severity: ${incident.severity}
- Title & Summary: ${incident.title} - ${incident.summary}
- Location: ${incident.latitude}, ${incident.longitude}
- Report count: ${incident.reportCount}
- Associated citizen reports descriptions: ${JSON.stringify(rawReportsData.map((r) => r.description))}
- Community verifications: ${confirms} confirmed exists, ${resolvedReports} claimed resolved

Provide a concise, professional 3-sentence summary highlighting the core issue, roadway risk, and recommended municipal action.
`;

        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "JanSahayak SafeStreets",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 300,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            summaryText = content.trim();
            isAIGenerated = true;
            provider = "openrouter";
          }
        }
      } catch {
        // Fall back gracefully to deterministic synthesis
      }
    }

    return NextResponse.json({
      success: true,
      incidentId: incident.id,
      incidentNumber: incident.incidentNumber,
      summary: summaryText,
      facts,
      missingInformation,
      suggestedNextSteps,
      isAIGenerated,
      provider,
      disclaimer:
        "AI case summaries are decision-support aids for municipal moderators. They do not constitute official administrative actions and must not be used to automatically reject or close complaints.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
