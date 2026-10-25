export interface ComplaintAssistantRequest {
  query: string;
  language?: "en" | "hi" | "auto";
  currentCategory?: string;
  currentDescription?: string;
  latitude?: number;
  longitude?: number;
  sector?: string;
}

export interface ComplaintAssistantSuggestion {
  suggestedTitle: string;
  suggestedCategory: string;
  improvedDescription: string;
  suggestedEvidence: string[];
  suggestedDepartment: {
    id: string;
    name: string;
    jurisdiction: string;
    slaDays: number;
  };
  suggestedSeverity: "critical" | "high" | "medium" | "low";
  priorityReasoning: string;
  isAIGenerated: boolean;
  provider: "openrouter" | "gemini" | "rule-based-fallback";
  modelUsed?: string;
  disclaimer: string;
}

export interface DamageDetectionBox {
  category: "pothole" | "road_crack" | "damaged_surface" | "manhole_drainage" | "broken_footpath" | "debris_hazard";
  label: string;
  confidence: number;
  // Normalized coordinates [ymin, xmin, ymax, xmax] between 0 and 1
  box: [number, number, number, number];
  severity: "critical" | "high" | "medium" | "low";
  reason: string;
}

export interface RoadDamageDetectionResult {
  imageValid: boolean;
  fileSizeBytes: number;
  mimeType: string;
  detectedHazards: DamageDetectionBox[];
  primaryHazard?: DamageDetectionBox;
  overallSeverity: "critical" | "high" | "medium" | "low";
  overallConfidence: number;
  needsHumanReview: boolean;
  reviewReason?: string;
  isModelInference: boolean;
  provider: "multimodal-vision" | "telemetry-inspector" | "rule-based";
  modelVersion: string;
  notes: string[];
  disclaimer: string;
}

export interface IncidentAdminSummary {
  incidentId: string;
  summaryText: string;
  commonIssuesIdentified: string[];
  missingInformationNeeded: string[];
  suggestedNextSteps: string[];
  suggestedPriority: string;
  underlyingCitations: string[];
  isAiGenerated: boolean;
}
