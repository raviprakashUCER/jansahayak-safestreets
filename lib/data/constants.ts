/**
 * Centralized Domain Constants for JanSahayak SafeStreets (Greater Noida Pilot)
 * These constants represent structural, non-removable configurations (coordinates,
 * pilot bounds, official authorities, category and status definitions).
 */

export const PILOT_CONFIG = {
  regionName: "Greater Noida, Uttar Pradesh",
  state: "Uttar Pradesh",
  country: "India",
  // MapLibre [longitude, latitude] center coordinates
  center: [77.504, 28.4744] as [number, number],
  defaultZoom: 13.5,
  minZoom: 10,
  maxZoom: 18,
  bounds: [
    [77.4, 28.38],
    [77.62, 28.58],
  ] as [[number, number], [number, number]],
} as const;

export const PILOT_SECTORS = [
  "Alpha I",
  "Alpha II",
  "Beta I",
  "Beta II",
  "Gamma I",
  "Gamma II",
  "Delta I",
  "Delta II",
  "Pari Chowk",
  "Knowledge Park I",
  "Knowledge Park II",
  "Knowledge Park III",
  "Surajpur",
  "Greater Noida West (Noida Ext.)",
  "Gautam Buddha University Corridor",
] as const;

export const OFFICIAL_AUTHORITIES = [
  {
    id: "gnida-civil",
    name: "GNIDA Civil Maintenance Division",
    jurisdiction: "Road surfaces, potholes, storm drains, and public walkways",
    slaDays: 7,
  },
  {
    id: "gnida-electrical",
    name: "GNIDA Electrical & Street Lighting Wing",
    jurisdiction: "Streetlights, high-mast illumination, and traffic blinkers",
    slaDays: 3,
  },
  {
    id: "gnida-pwd",
    name: "GNIDA Public Works Dept (PWD)",
    jurisdiction: "Major arterial roads, flyovers, and heavy carriageways",
    slaDays: 14,
  },
  {
    id: "traffic-police",
    name: "Noida-Greater Noida Traffic Police",
    jurisdiction: "Signal phases, pedestrian crosswalks, speed breakers, and signages",
    slaDays: 5,
  },
  {
    id: "drainage-cell",
    name: "Greater Noida Municipality Drainage Cell",
    jurisdiction: "Open culverts, manhole covers, and monsoon waterlogging",
    slaDays: 4,
  },
  {
    id: "horticulture",
    name: "GNIDA Horticulture & Green Belt Division",
    jurisdiction: "Median overgrowth, sight-line obstructions, and fallen tree hazards",
    slaDays: 5,
  },
] as const;

export const HAZARD_SEVERITY_META = {
  critical: {
    label: "Critical Hazard",
    tone: "destructive",
    badgeVariant: "destructive" as const,
    description: "Immediate threat to life or severe vehicular collision risk",
  },
  high: {
    label: "High Severity",
    tone: "destructive",
    badgeVariant: "destructive" as const,
    description: "Major pedestrian obstacle, deep pothole, or primary route blackout",
  },
  medium: {
    label: "Medium Severity",
    tone: "warning",
    badgeVariant: "secondary" as const,
    description: "Broken pavement, damaged signage, or localized lighting defect",
  },
  moderate: {
    label: "Moderate Severity",
    tone: "warning",
    badgeVariant: "secondary" as const,
    description: "Noticeable defect causing pedestrian diversion or vehicle slowdown",
  },
  low: {
    label: "Low / Cosmetic",
    tone: "muted",
    badgeVariant: "outline" as const,
    description: "Faded lane markings, cosmetic pavement chips",
  },
  minor: {
    label: "Minor Issue",
    tone: "muted",
    badgeVariant: "outline" as const,
    description: "Early-stage wear under observation",
  },
} as const;

export const HAZARD_STATUS_META = {
  open: {
    label: "Reported / Open",
    badgeVariant: "outline" as const,
    description: "Submitted by citizen, awaiting initial triage",
  },
  "under-review": {
    label: "Authority Notified",
    badgeVariant: "secondary" as const,
    description: "Queued for field inspection and duplicate corroboration",
  },
  assigned: {
    label: "Work Order Assigned",
    badgeVariant: "secondary" as const,
    description: "Routed to official contractor or municipal division",
  },
  "in-progress": {
    label: "In Progress",
    badgeVariant: "secondary" as const,
    description: "Crew dispatched or active repairs underway",
  },
  "community-verified": {
    label: "Community Verified",
    badgeVariant: "default" as const,
    description: "Corroborated by independent commuter verifications",
  },
  escalated: {
    label: "Formal Grievance Filed",
    badgeVariant: "destructive" as const,
    description: "Escalated to senior departmental executive engineer",
  },
  resolved: {
    label: "Action Logged & Fixed",
    badgeVariant: "default" as const,
    description: "Work completed with photo proof and archived",
  },
} as const;

export const HAZARD_FILTER_CATEGORIES = [
  { key: "all", label: "All hazards" },
  { key: "road-surface", label: "Road surface & craters" },
  { key: "lighting", label: "Lighting & signals" },
  { key: "footpath", label: "Broken footpaths" },
  { key: "crossing", label: "Unsafe crossings" },
  { key: "drainage", label: "Drainage & hazards" },
] as const;

// Backward-compatibility aliases for existing imports:
export const GREATER_NOIDA_CENTER = PILOT_CONFIG.center;
export const DEFAULT_MAP_ZOOM = PILOT_CONFIG.defaultZoom;
