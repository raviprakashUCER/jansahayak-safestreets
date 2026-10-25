import { db, incidents, incidentEscalations, notifications, auditLogs } from "@/lib/db";
import { OFFICIAL_AUTHORITIES } from "@/lib/data/constants";
import { eq, and, sql } from "drizzle-orm";

export interface EscalationRule {
  authorityId: string;
  defaultSlaDays: number;
  l2OverdueThresholdHours: number;
  l3OverdueThresholdHours: number;
}

export const DEFAULT_ESCALATION_RULES: Record<string, EscalationRule> = {
  "gnida-civil": {
    authorityId: "gnida-civil",
    defaultSlaDays: 7,
    l2OverdueThresholdHours: 24,
    l3OverdueThresholdHours: 72,
  },
  "gnida-electrical": {
    authorityId: "gnida-electrical",
    defaultSlaDays: 3,
    l2OverdueThresholdHours: 12,
    l3OverdueThresholdHours: 48,
  },
  "drainage-cell": {
    authorityId: "drainage-cell",
    defaultSlaDays: 4,
    l2OverdueThresholdHours: 12,
    l3OverdueThresholdHours: 36,
  },
  "traffic-police": {
    authorityId: "traffic-police",
    defaultSlaDays: 5,
    l2OverdueThresholdHours: 24,
    l3OverdueThresholdHours: 48,
  },
  "gnida-pwd": {
    authorityId: "gnida-pwd",
    defaultSlaDays: 14,
    l2OverdueThresholdHours: 48,
    l3OverdueThresholdHours: 120,
  },
  horticulture: {
    authorityId: "horticulture",
    defaultSlaDays: 5,
    l2OverdueThresholdHours: 24,
    l3OverdueThresholdHours: 72,
  },
};

/**
 * Calculates official SLA deadline from report category or authority.
 */
export function calculateSlaDeadline(params: {
  category?: string;
  authorityId?: string;
  severity?: string;
  startDate?: Date;
}): { deadline: Date; slaDays: number; authorityId: string; authorityName: string } {
  const start = params.startDate ? new Date(params.startDate) : new Date();
  let authorityId = params.authorityId || "gnida-civil";

  if (!params.authorityId && params.category) {
    const cat = params.category.toLowerCase();
    if (cat.includes("lighting") || cat.includes("darkness")) {
      authorityId = "gnida-electrical";
    } else if (cat.includes("drainage") || cat.includes("manhole")) {
      authorityId = "drainage-cell";
    } else if (cat.includes("crossing") || cat.includes("signal")) {
      authorityId = "traffic-police";
    } else if (cat.includes("tree") || cat.includes("visibility")) {
      authorityId = "horticulture";
    } else if (cat.includes("expressway") || cat.includes("flyover")) {
      authorityId = "gnida-pwd";
    }
  }

  const authority =
    OFFICIAL_AUTHORITIES.find((a) => a.id === authorityId) || OFFICIAL_AUTHORITIES[0]!;

  let days: number = authority.slaDays;
  // Critical emergencies accelerate SLA by 50% (minimum 1 day)
  if (params.severity === "critical") {
    days = Math.max(1, Math.floor(days / 2));
  }

  const deadline = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

  return {
    deadline,
    slaDays: days,
    authorityId: authority.id,
    authorityName: authority.name,
  };
}

/**
 * Evaluates whether an incident has breached SLA deadlines and requires escalation.
 */
export async function evaluateAndTriggerEscalation(incidentId: string): Promise<{
  escalated: boolean;
  level: number;
  reason: string;
  deadline: string;
  isOverdue: boolean;
}> {
  try {
    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, incidentId))
      .limit(1);

    if (!incident) {
      return {
        escalated: false,
        level: 1,
        reason: "Incident not found",
        deadline: new Date().toISOString(),
        isOverdue: false,
      };
    }

    if (incident.status === "resolved" || incident.status === "rejected") {
      return {
        escalated: false,
        level: 1,
        reason: "Incident already closed or resolved",
        deadline: incident.updatedAt?.toISOString() || new Date().toISOString(),
        isOverdue: false,
      };
    }

    const { deadline, slaDays, authorityId, authorityName } = calculateSlaDeadline({
      category: incident.category,
      severity: incident.severity,
      startDate: incident.createdAt,
    });

    const now = Date.now();
    const isOverdue = now > deadline.getTime();
    const overdueHours = isOverdue ? (now - deadline.getTime()) / (1000 * 60 * 60) : 0;

    let targetLevel = 1;
    let targetOfficer = `${authorityName} Dispatch Desk`;
    let reason = `Standard civic SLA monitoring (${slaDays} days allocated).`;

    if (incident.severity === "critical" && overdueHours > 12) {
      targetLevel = 3;
      targetOfficer = "Senior Executive Engineer / GNIDA Grievance Cell";
      reason = `CRITICAL HAZARD SLA BREACH: Incident unresolved after ${overdueHours.toFixed(0)} overdue hours.`;
    } else if (overdueHours > 24) {
      targetLevel = 2;
      targetOfficer = "Divisional Ward Superintendent";
      reason = `SLA BREACH: Unresolved for ${overdueHours.toFixed(0)} hours beyond standard ${slaDays}-day timeline.`;
    } else if (isOverdue) {
      targetLevel = 1;
      reason = `SLA Reminder: Municipal response window of ${slaDays} days expired.`;
    }

    // Check existing escalation record in PostgreSQL
    const existingEscalations = await db
      .select()
      .from(incidentEscalations)
      .where(eq(incidentEscalations.incidentId, incidentId))
      .limit(1);

    const existing = existingEscalations[0];
    const lastReminder = existing?.lastReminderSentAt ? new Date(existing.lastReminderSentAt).getTime() : 0;
    const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours reminder cooldown
    const canSendReminder = isOverdue && now - lastReminder > cooldownMs;

    if (!existing) {
      // Create initial escalation docket
      await db.insert(incidentEscalations).values({
        incidentId,
        escalationLevel: targetLevel,
        authorityId,
        targetOfficer,
        triggerReason: reason,
        status: isOverdue ? "active" : "acknowledged",
        slaDays,
        slaDeadline: deadline,
        lastReminderSentAt: isOverdue ? new Date() : null,
        reminderCount: isOverdue ? 1 : 0,
        notes: `Automated SLA tracking initiated for ${incident.incidentNumber}.`,
      });
    } else if (existing.escalationLevel < targetLevel || canSendReminder) {
      // Update escalation level and bump reminder
      await db
        .update(incidentEscalations)
        .set({
          escalationLevel: Math.max(existing.escalationLevel, targetLevel),
          targetOfficer,
          triggerReason: reason,
          lastReminderSentAt: canSendReminder ? new Date() : existing.lastReminderSentAt,
          reminderCount: canSendReminder ? existing.reminderCount + 1 : existing.reminderCount,
          updatedAt: new Date(),
        })
        .where(eq(incidentEscalations.id, existing.id));

      // Also create an in-app citizen notification
      if (canSendReminder) {
        await db.insert(notifications).values({
          userId: incident.publishedBy || "public_citizen",
          incidentId,
          type: "escalation",
          title: `Follow-up Due: ${incident.incidentNumber}`,
          message: `Your reported hazard (${incident.title}) has exceeded its ${slaDays}-day SLA. Internal review docket escalated to ${targetOfficer}.`,
          linkUrl: `/dashboard/escalations`,
        });

        // Audit log
        await db.insert(auditLogs).values({
          actorId: "system_scheduler",
          actorRole: "system",
          action: "incident.escalated",
          targetType: "incident",
          targetId: incidentId,
          details: {
            level: targetLevel,
            officer: targetOfficer,
            overdueHours,
          },
        });
      }
    }

    return {
      escalated: targetLevel > 1,
      level: targetLevel,
      reason,
      deadline: deadline.toISOString(),
      isOverdue,
    };
  } catch (error) {
    console.warn("Escalation evaluation error (falling back):", error);
    const { deadline, slaDays } = calculateSlaDeadline({});
    return {
      escalated: false,
      level: 1,
      reason: "Calculated based on standard default policy.",
      deadline: deadline.toISOString(),
      isOverdue: false,
    };
  }
}
