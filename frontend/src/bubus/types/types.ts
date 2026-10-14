export type Gender = "Male" | "Female" | "Other";
export type SkinType = "Oily" | "Dry" | "Sensitive" | "Combination" | "Normal";
export type LesionType = "Acne" | "Burn" | "Rash" | "Wart";
export type SeverityLevel = "Low" | "Medium" | "High";
export type EnvironmentType = "Humid" | "Hot" | "Dry" | "Polluted";
export type SunExposure = "Low" | "Medium" | "High";
export type EvidenceLevel = "High" | "Medium" | "Low";
export type IngredientCategory = "Active" | "Soothing" | "Barrier" | "Hydrating";

export interface UserProfile {
  age: number;
  gender: Gender;
  skinType: SkinType;
  lesion: LesionType;
  severity: SeverityLevel;
  environment: EnvironmentType;
  allergies: string[];
  previousSkinIssues: string[];
  geneticIssues: string[];
  usesSkincareProducts: boolean;
  sunExposure: SunExposure;
}

export interface IngredientKnowledge {
  name: string;
  suitableFor: string[];
  avoidFor: string[];
  riskSafe: string[];
  skinTypeSuitable: string[];
  environmentSuitable: string[];
  productType: string[];
  recommendedPercentage: Record<string, string>;
  benefits: string[];
  irritationScore: number;
  evidenceLevel: EvidenceLevel;
  conflictsWith: string[];
  category: IngredientCategory;
}

export interface IngredientRecommendation {
  name: string;
  productType: string;
  percentage: string;
  confidence: number;
  benefits: string[];
  reason: string;
  cautions: string[];
  profileFactorsConsidered: string[];
}

export type Ingredient = IngredientRecommendation;

export interface AvoidItem {
  name: string;
  reason: string;
}

export interface Conflict {
  message: string;
}

export interface RecommendationResult {
  recommended: IngredientRecommendation[];
  avoid: AvoidItem[];
  conflicts: string[];
  profileWarnings: string[];
  disclaimer: string;
  knowledgeBaseType?: string;
  modelInfo?: {
    modelAvailable?: boolean;
    modelType?: string;
    trainedAt?: string;
    trainingRows?: number;
    metrics?: unknown;
  };
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "rebeka";
}

export type RootStackParamList = {
  Recommendation: { profile: UserProfile };
  Avoid: { avoid: AvoidItem[] };
  Conflict: { conflicts: string[] };
  IngredientDetail: { ingredient: Ingredient };
  Chat: { profile: UserProfile };
  IngredientKnowledgeBase: undefined;
  Report: { result: RecommendationResult; profile: UserProfile };
};
