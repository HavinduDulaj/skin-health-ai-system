import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type DetectedCondition = 'Acne' | 'Burns' | 'Rashes' | 'Warts' | 'Healthy';
export type SkinType = 'Oily' | 'Dry' | 'Normal' | 'Combination' | 'Sensitive';
export type AuthStatus = 'unauthenticated' | 'profile-setup' | 'authenticated';
export type ThemeMode = 'light' | 'dark';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type RiskDecision = 'grade' | 'abstain' | 'quality_reject' | 'unavailable';

export interface UserAccount {
  fullName: string;
  email: string;
  password: string;
}

export interface SkinProfile {
  age: string;
  gender: string;
  skinType: SkinType;
  existingSkinIssue: string;
  skinAllergyHistory: string;
  skinAllergies: string;
  geneticSkinIssues: string;
  environment: string;
  usesSkincareProducts: string;
  currentProducts: string;
  skincareRoutineHabits: string;
  sunExposureLevel: string;
  sleepHours: string;
  waterIntake: string;
}

export interface ClinicalMetadata {
  durationDays: string;
  painLevel: number;
  itchingLevel: number;
  bleeding: boolean;
  spreading: boolean;
  fever: boolean;
  discharge: boolean;
  bodyLocation: string;
  skinType?: SkinType;
}

export interface AuthUser extends Omit<UserAccount, 'password'> {
  profile?: SkinProfile | null;
}

export interface ScanResult {
  id: string;
  date: string;
  condition: DetectedCondition;
  confidence: number;
  reviewRequired?: boolean;
  topPredictions?: {
    condition: string;
    confidence: number;
  }[];
  riskLevel?: RiskLevel;
  riskScore?: number;
  riskConfidence?: number;
  suggestedAction?: string;
  riskFactors?: string[];
  riskDecision?: RiskDecision;
  riskQuality?: {
    score?: number;
    flags?: string[];
    is_low_quality?: boolean;
  };
  uncertainty?: number;
  confidenceBand?: string;
  gradCamImage?: string;
  gradCamLayer?: string;
  imageUri?: string;
  source: 'mock' | 'api';
}

export interface AppSettings {
  themeMode: ThemeMode;
  notificationsEnabled: boolean;
}

export type RootStackParamList = {
  Landing: undefined;
  SignIn: undefined;
  Register: undefined;
  ProfileSetup: { mode: 'create' | 'edit' } | undefined;
  Dashboard: undefined;
  UploadImage: undefined;
  CameraCapture: undefined;
  Result: { result: ScanResult };
  RiskResult: { result: ScanResult };
  IngredientRecommendations: { result?: ScanResult } | undefined;
  History: undefined;
  UserProfile: undefined;
  Settings: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
