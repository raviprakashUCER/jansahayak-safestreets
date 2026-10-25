CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'citizen',
  phone_number VARCHAR(50),
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number VARCHAR(64) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'medium',
  status VARCHAR(50) NOT NULL DEFAULT 'under_review',
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  canonical_geom geometry(Point, 4326),
  spatial_uncertainty_meters NUMERIC(8, 2) NOT NULL DEFAULT 10.00,
  report_count INTEGER NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  published_by VARCHAR(255),
  moderation_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  moderated_by VARCHAR(255),
  moderated_at TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents(status);
CREATE INDEX IF NOT EXISTS incidents_category_idx ON incidents(category);
CREATE INDEX IF NOT EXISTS incidents_published_idx ON incidents(is_published);
CREATE INDEX IF NOT EXISTS incidents_spatial_idx ON incidents USING GIST(canonical_geom);

CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  report_id VARCHAR(128) NOT NULL,
  user_id VARCHAR(255) REFERENCES users(id),
  match_score NUMERIC(5, 4),
  match_reason TEXT,
  is_primary_report BOOLEAN NOT NULL DEFAULT FALSE,
  associated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS incident_reports_incident_idx ON incident_reports(incident_id);
CREATE INDEX IF NOT EXISTS incident_reports_report_idx ON incident_reports(report_id);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  report_id VARCHAR(128),
  moderator_id VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  reason TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS moderation_actions_incident_idx ON moderation_actions(incident_id);
CREATE INDEX IF NOT EXISTS moderation_actions_moderator_idx ON moderation_actions(moderator_id);

CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL DEFAULT 'incident',
  aggregate_id VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS outbox_status_idx ON outbox_events(status);
CREATE INDEX IF NOT EXISTS outbox_created_idx ON outbox_events(created_at);

CREATE TABLE IF NOT EXISTS publication_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  published_by VARCHAR(255) NOT NULL,
  public_snapshot JSONB NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS publication_records_incident_idx ON publication_records(incident_id);

CREATE TABLE IF NOT EXISTS community_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  verification_type VARCHAR(50) NOT NULL,
  notes TEXT,
  evidence_photo_url TEXT,
  suggested_latitude NUMERIC(10, 7),
  suggested_longitude NUMERIC(10, 7),
  is_flagged_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_verifications_incident_idx ON community_verifications(incident_id);
CREATE INDEX IF NOT EXISTS community_verifications_user_idx ON community_verifications(user_id);

CREATE TABLE IF NOT EXISTS incident_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  escalation_level INTEGER NOT NULL DEFAULT 1,
  authority_id VARCHAR(100) NOT NULL,
  target_officer VARCHAR(255),
  trigger_reason TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  sla_days INTEGER NOT NULL DEFAULT 7,
  sla_deadline TIMESTAMPTZ NOT NULL,
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS incident_escalations_incident_idx ON incident_escalations(incident_id);
CREATE INDEX IF NOT EXISTS incident_escalations_authority_idx ON incident_escalations(authority_id);
CREATE INDEX IF NOT EXISTS incident_escalations_status_idx ON incident_escalations(status);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  link_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(is_read);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id VARCHAR(255) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
