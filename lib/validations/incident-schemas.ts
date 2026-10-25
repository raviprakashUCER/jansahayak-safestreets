import { z } from "zod";

export const ComplaintAssistantSchema = z.object({
  query: z.string().min(1, "Problem description is required").max(1000),
  language: z.enum(["en", "hi", "auto"]).default("auto"),
  currentCategory: z.string().optional(),
  currentDescription: z.string().optional(),
  sector: z.string().optional(),
  latitude: z.number().min(20).max(35).optional(),
  longitude: z.number().min(68).max(98).optional(),
});

export const CommunityVerificationSchema = z.object({
  incidentId: z.string().uuid("Invalid incident ID format").optional(),
  verificationType: z.enum([
    "confirm_exists",
    "report_resolved",
    "flag_location",
    "still_present",
    "reported_resolved",
    "incorrect_location",
    "duplicate",
  ]),
  notes: z.string().max(500).optional(),
  evidencePhotoUrl: z.string().url().optional().or(z.literal("")),
  suggestedLatitude: z.number().min(28.0).max(29.0).optional(),
  suggestedLongitude: z.number().min(77.0).max(78.0).optional(),
});
export const CreateVerificationSchema = CommunityVerificationSchema;

export const OfflineDraftSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(255),
  category: z.string().min(1),
  description: z.string().min(1),
  latitude: z.number().min(28.0).max(29.0),
  longitude: z.number().min(77.0).max(78.0),
  savedAt: z.string(),
  photos: z.array(z.any()).default([]),
});

export const RouteAdvisoryQuerySchema = z.object({
  originLat: z.coerce.number().min(28.0).max(29.0),
  originLng: z.coerce.number().min(77.0).max(78.0),
  destLat: z.coerce.number().min(28.0).max(29.0),
  destLng: z.coerce.number().min(77.0).max(78.0),
  corridorMeters: z.coerce.number().min(50).max(1000).default(150),
});

export const EscalationActionSchema = z.object({
  incidentId: z.string().uuid("Invalid incident ID format"),
  targetOfficer: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(["active", "acknowledged", "in-progress", "resolved"]).default("active"),
});

export const HeatmapFilterSchema = z.object({
  category: z.string().default("all"),
  dateRange: z.enum(["24h", "7d", "30d", "all"]).default("all"),
  status: z.enum(["all", "open", "in_progress", "resolved"]).default("all"),
  verifiedOnly: z.enum(["true", "false"]).default("false"),
});
