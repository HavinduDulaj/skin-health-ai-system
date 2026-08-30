export type Decision = "grade" | "abstain" | "quality_reject" | "unavailable";

export interface HealthResponse {
  ok: boolean;
  name: string;
  version: string;
  model_loaded: boolean;
  model_kind?: string;
  samples: number;
}

export interface AnalyzeResponse {
  decision: Decision;
  risk?: string;
  probabilities: Record<string, number | null>;
  confidence?: number;
  margin?: number;
  entropy?: number;
  uncertain: boolean;
  caution?: boolean;
  lesion?: string;
  condition?: {
    used?: string;
    source?: string;
    note?: string;
  };
  indicators?: {
    texture_energy: number;
    color_variation: number;
    structural_irregularity: number;
    estimated_extent: number;
    notes?: string[];
  };
  quality: {
    score: number;
    flags: string[];
    blur: number;
    brightness: number;
    width: number;
    height: number;
  };
  guidance?: {
    headline: string;
    summary: string;
    steps: string[];
    alert?: string;
  };
  explainability?: {
    available: boolean;
    overlay_jpeg?: string;
    note?: string;
  };
  pipeline?: Array<{ title: string; status: string; detail: string }>;
  risk_module?: Array<{ title: string; status: string; detail?: string }>;
  lesion_effect?: { note?: string };
  model: { loaded: boolean; kind?: string };
  disclaimer: string;
}

export interface SessionRecord {
  name: string;
  accepted: boolean;
  at: number;
}

export interface ScreeningHistoryRow {
  id: number;
  created_at: string;
  display_name: string;
  lesion: string;
  decision: string;
  risk: string | null;
  confidence: number | null;
  condition: string | null;
  summary: string | null;
}

export interface IngredientRecommendation {
  condition: string;
  risk_level: string;
  ingredients: Array<{ name: string; benefit: string; caution?: string }>;
  note: string;
}
