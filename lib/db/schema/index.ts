import {
  pgTable,
  text,
  varchar,
  numeric,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
  customType,
  index,
} from "drizzle-orm/pg-core";

/**
 * Custom PostGIS Geometry Point type for Drizzle ORM.
 * Stores WGS84 point coordinates geometry(Point, 4326).
 */
export const geometryPoint = customType<{
  data: { longitude: number; latitude: number } | string;
  driverData: string;
}>({
  dataType() {
    return "geometry(Point, 4326)";
  },
  toDriver(value) {
    if (typeof value === "string") return value;
    return `SRID=4326;POINT(${value.longitude} ${value.latitude})`;
  },
  fromDriver(value) {
    return value;
  },
});

/**
 * Users Table
 * Synchronized with Clerk JS via Webhooks & authentication tokens.
 */
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(), // Matches Clerk userId (e.g. user_xxx)
  email: varchar("email", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }),
  role: varchar("role", { length: 50 }).notNull().default("citizen"), // 'citizen' | 'moderator' | 'admin' | 'field_official'
  phoneNumber: varchar("phone_number", { length: 50 }),
  avatarUrl: text("avatar_url"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Canonical Incidents Table
 * Represents validated, deduplicated physical roadway hazards.
 */
export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentNumber: varchar("incident_number", { length: 64 }).unique().notNull(), // e.g. INC-2026-0001
    category: varchar("category", { length: 100 }).notNull(), // Road Surface / Pothole, etc.
    severity: varchar("severity", { length: 50 }).notNull().default("medium"), // 'low' | 'medium' | 'high' | 'critical'
    status: varchar("status", { length: 50 }).notNull().default("under_review"), // 'draft' | 'under_review' | 'approved' | 'rejected' | 'in_progress' | 'resolved'
    title: varchar("title", { length: 255 }).notNull(),
    summary: text("summary"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
    canonicalGeom: geometryPoint("canonical_geom"),
    spatialUncertaintyMeters: numeric("spatial_uncertainty_meters", { precision: 8, scale: 2 })
      .notNull()
      .default("10.00"),
    reportCount: integer("report_count").notNull().default(1),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: varchar("published_by", { length: 255 }),
    moderationStatus: varchar("moderation_status", { length: 50 }).notNull().default("pending"), // 'pending' | 'approved' | 'rejected' | 'needs_evidence'
    moderatedBy: varchar("moderated_by", { length: 255 }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("incidents_status_idx").on(table.status),
    index("incidents_category_idx").on(table.category),
    index("incidents_published_idx").on(table.isPublished),
  ],
);

/**
 * Incident-to-Report Association Junction Table
 * Connects Postgres canonical incidents with MongoDB raw reports.
 */
export const incidentReports = pgTable(
  "incident_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    reportId: varchar("report_id", { length: 128 }).notNull(), // MongoDB raw_reports._id
    userId: varchar("user_id", { length: 255 }).references(() => users.id),
    matchScore: numeric("match_score", { precision: 5, scale: 4 }), // Calibrated confidence score (0.0000 - 1.0000)
    matchReason: text("match_reason"),
    isPrimaryReport: boolean("is_primary_report").notNull().default(false),
    associatedAt: timestamp("associated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("incident_reports_incident_idx").on(table.incidentId),
    index("incident_reports_report_idx").on(table.reportId),
  ],
);

/**
 * Moderation Actions Table
 * Immutable audit trail for all reviewer decisions and manual overrides.
 */
export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    reportId: varchar("report_id", { length: 128 }),
    moderatorId: varchar("moderator_id", { length: 255 }),
    action: varchar("action", { length: 50 }).notNull(), // 'approve' | 'reject' | 'request_evidence' | 'merge' | 'split' | 'correct_location'
    reason: text("reason"),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("moderation_actions_incident_idx").on(table.incidentId),
    index("moderation_actions_moderator_idx").on(table.moderatorId),
  ],
);

/**
 * Transactional Outbox Events Table
 * Implements the Outbox Pattern to guarantee post-commit pipeline & notification dispatch.
 */
export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: varchar("event_type", { length: 100 }).notNull(), // 'report.ingested' | 'ai.completed' | 'incident.merged' | 'incident.published'
    aggregateType: varchar("aggregate_type", { length: 50 }).notNull().default("incident"),
    aggregateId: varchar("aggregate_id", { length: 128 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: varchar("status", { length: 50 }).notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'failed'
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(5),
    lastError: text("last_error"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("outbox_status_idx").on(table.status),
    index("outbox_created_idx").on(table.createdAt),
  ],
);

/**
 * Publication Records Table
 * Immutable snapshot of every atomic map publication event.
 */
export const publicationRecords = pgTable(
  "publication_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    publishedBy: varchar("published_by", { length: 255 }).notNull(),
    publicSnapshot: jsonb("public_snapshot").$type<Record<string, unknown>>().notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("publication_records_incident_idx").on(table.incidentId)],
);

/**
 * Community Verifications Table
 * Tracks citizen confirmations, still-there reports, resolved reports, and location corrections.
 */
export const communityVerifications = pgTable(
  "community_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    verificationType: varchar("verification_type", { length: 50 }).notNull(), // 'confirm_exists' | 'report_resolved' | 'flag_location'
    notes: text("notes"),
    evidencePhotoUrl: text("evidence_photo_url"),
    suggestedLatitude: numeric("suggested_latitude", { precision: 10, scale: 7 }),
    suggestedLongitude: numeric("suggested_longitude", { precision: 10, scale: 7 }),
    isFlaggedSuspicious: boolean("is_flagged_suspicious").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("community_verifications_incident_idx").on(table.incidentId),
    index("community_verifications_user_idx").on(table.userId),
  ],
);

/**
 * Incident Escalations Table
 * Tracks formal municipal SLA deadlines, multi-tier escalations (L1/L2/L3), and reminder histories.
 */
export const incidentEscalations = pgTable(
  "incident_escalations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    escalationLevel: integer("escalation_level").notNull().default(1), // 1 = Dept SLA breach, 2 = Senior Officer, 3 = Grievance Cell
    authorityId: varchar("authority_id", { length: 100 }).notNull(),
    targetOfficer: varchar("target_officer", { length: 255 }),
    triggerReason: text("trigger_reason").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("active"), // 'active' | 'acknowledged' | 'in-progress' | 'resolved'
    slaDays: integer("sla_days").notNull().default(7),
    slaDeadline: timestamp("sla_deadline", { withTimezone: true }).notNull(),
    lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true }),
    reminderCount: integer("reminder_count").notNull().default(0),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("incident_escalations_incident_idx").on(table.incidentId),
    index("incident_escalations_authority_idx").on(table.authorityId),
    index("incident_escalations_status_idx").on(table.status),
  ],
);

/**
 * User Notifications Table
 * Persists actionable citizen & reviewer notifications, follow-up alerts, and status changes.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    incidentId: uuid("incident_id").references(() => incidents.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(), // 'status_change' | 'escalation' | 'reminder' | 'verification' | 'system'
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    linkUrl: text("link_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_read_idx").on(table.isRead),
  ],
);

/**
 * Audit Logs Table
 * Immutable audit log for administrative, moderation, and verification activities.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: varchar("actor_id", { length: 255 }).notNull(),
    actorRole: varchar("actor_role", { length: 50 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    targetType: varchar("target_type", { length: 50 }).notNull(),
    targetId: varchar("target_id", { length: 255 }).notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().default({}),
    ipAddress: varchar("ip_address", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_actor_idx").on(table.actorId),
    index("audit_logs_action_idx").on(table.action),
  ],
);

// Type exports for application use
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;

export type IncidentReport = typeof incidentReports.$inferSelect;
export type NewIncidentReport = typeof incidentReports.$inferInsert;

export type ModerationAction = typeof moderationActions.$inferSelect;
export type NewModerationAction = typeof moderationActions.$inferInsert;

export type OutboxEvent = typeof outboxEvents.$inferSelect;
export type NewOutboxEvent = typeof outboxEvents.$inferInsert;

export type PublicationRecord = typeof publicationRecords.$inferSelect;
export type NewPublicationRecord = typeof publicationRecords.$inferInsert;

export type CommunityVerification = typeof communityVerifications.$inferSelect;
export type NewCommunityVerification = typeof communityVerifications.$inferInsert;

export type IncidentEscalation = typeof incidentEscalations.$inferSelect;
export type NewIncidentEscalation = typeof incidentEscalations.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
