import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { db, incidents, communityVerifications, auditLogs } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { CommunityVerificationSchema } from "@/lib/validations/incident-schemas";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ incidentId: string }> }
) {
  try {
    const { incidentId } = await context.params;
    const session = await getCurrentUserSession();

    // Check rate limit: 10 verification requests per 5 minutes per user/IP
    const rateKey = session.userId || req.headers.get("x-forwarded-for") || "anon_verifier";
    const rateCheck = checkRateLimit(`verify:${rateKey}`, { intervalMs: 300_000, maxTokens: 10 });

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many verification requests. Please wait a few minutes before corroborating again." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = CommunityVerificationSchema.safeParse({ ...body, incidentId });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { verificationType, notes, evidencePhotoUrl, suggestedLatitude, suggestedLongitude } =
      parsed.data;

    // Check incident existence in PostgreSQL
    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, incidentId))
      .limit(1);

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // Check if user already submitted this verification type for this incident
    const effectiveUserId = session.userId || `citizen_anon_${rateKey.slice(0, 16)}`;
    const existing = await db
      .select()
      .from(communityVerifications)
      .where(
        and(
          eq(communityVerifications.incidentId, incidentId),
          eq(communityVerifications.userId, effectiveUserId),
          eq(communityVerifications.verificationType, verificationType)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: "You have already recorded your verification for this incident. Multiple repeat confirmations are not permitted.",
        },
        { status: 409 }
      );
    }

    // Insert verification record
    await db.insert(communityVerifications).values({
      incidentId,
      userId: effectiveUserId,
      verificationType,
      notes: notes || null,
      evidencePhotoUrl: evidencePhotoUrl || null,
      suggestedLatitude: suggestedLatitude ? String(suggestedLatitude) : null,
      suggestedLongitude: suggestedLongitude ? String(suggestedLongitude) : null,
    });

    // Update incident corroboration count if confirming still exists
    let newReportCount = incident.reportCount;
    if (verificationType === "confirm_exists") {
      newReportCount = incident.reportCount + 1;
      await db
        .update(incidents)
        .set({
          reportCount: newReportCount,
          updatedAt: new Date(),
        })
        .where(eq(incidents.id, incidentId));
    }

    // Record in audit log
    await db.insert(auditLogs).values({
      actorId: effectiveUserId,
      actorRole: session.role || "citizen",
      action: `verification.${verificationType}`,
      targetType: "incident",
      targetId: incidentId,
      details: {
        notes,
        hasEvidence: Boolean(evidencePhotoUrl),
        hasLocationCorrection: Boolean(suggestedLatitude),
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    // Count all distinct confirmations for this incident
    const allVerifications = await db
      .select()
      .from(communityVerifications)
      .where(eq(communityVerifications.incidentId, incidentId));

    const confirmCount = allVerifications.filter((v) => v.verificationType === "confirm_exists").length;
    const resolvedReportCount = allVerifications.filter((v) => v.verificationType === "report_resolved").length;
    const flagLocationCount = allVerifications.filter((v) => v.verificationType === "flag_location").length;

    return NextResponse.json({
      success: true,
      message:
        verificationType === "confirm_exists"
          ? "Thank you for confirming that this hazard still exists. Your corroboration has been recorded."
          : verificationType === "report_resolved"
          ? "Thank you for reporting that this hazard may be resolved. It has been queued for municipal verification."
          : "Location correction recorded for reviewer audit.",
      verifications: {
        total: allVerifications.length,
        confirmExists: confirmCount,
        reportedResolved: resolvedReportCount,
        flaggedLocation: flagLocationCount,
        reportCount: newReportCount,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
