export type HazardSeverity = "critical" | "high" | "moderate" | "medium" | "minor" | "low";

export type HazardCategoryKey =
  | "road-surface"
  | "lighting"
  | "footpath"
  | "crossing"
  | "drainage"
  | "other";

export type HazardStatusKey =
  | "open"
  | "under-review"
  | "assigned"
  | "in-progress"
  | "community-verified"
  | "escalated"
  | "resolved";

export interface HazardReport {
  id: string;
  title: string;
  category: string;
  categoryLabel?: string;
  location?: string;
  landmark?: string;
  longitude: number;
  latitude: number;
  reportedAt?: string;
  time?: string;
  hoursAgo?: number;
  severity: "critical" | "high" | "medium" | "moderate" | "low" | "minor";
  status:
    | "open"
    | "in-progress"
    | "escalated"
    | "resolved"
    | "under-review"
    | "assigned"
    | "community-verified";
  statusLabel?: string;
  votes?: number;
  verificationsCount?: number;
  coordinates?: string;
  officialRouting?: string;
  authority?: string;
  description: string;
}

export interface ModerationQueueItem {
  id: string;
  title: string;
  type: "duplicate" | "location" | "scope";
  flagLabel: string;
  detail: string;
  reporter: string;
  time: string;
  badgeVariant: "secondary" | "destructive" | "outline" | "default";
  iconName: "copy" | "map-off" | "alert" | "question";
  status: "pending" | "approved" | "merged" | "rejected" | "needs_evidence" | "suspended";
  metadata?: Record<string, unknown>;
}

export interface EscalationDocket {
  id: string;
  title: string;
  summary: string;
  authority: string;
  officer: string;
  status: "awaiting-response" | "acknowledged" | "in-progress" | "resolved";
  statusLabel: string;
  statusVariant: "destructive" | "secondary" | "default";
  daysOpen: number;
  linkedReports: number;
  lastUpdate: string;
  originReportId: string;
}

export interface CivicAnalytics {
  kpis: {
    totalReports: number;
    resolvedCount: number;
    resolvedRate: number;
    meanResolutionDays: number;
    activeReporters: number;
  };
  monthlyTrends: { month: string; filed: number; resolved: number }[];
  categoryDistribution: { label: string; count: number; pct: number }[];
  sectorDistribution: { sector: string; count: number; pct: number }[];
}

export type TimeWindowFilter = "12h" | "24h" | "all";
