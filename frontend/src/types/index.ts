import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type DetectedCondition = 'Acne' | 'Burns' | 'Rashes' | 'Warts';
export type SkinType = 'Oily' | 'Dry' | 'Normal' | 'Combination' | 'Sensitive';
export type AuthStatus = 'unauthenticated' | 'profile-setup' | 'authenticated';
export type ThemeMode = 'light' | 'dark';

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
  skincareRoutineHabits: string;
  sunExposureLevel: string;
  sleepHours: string;
  waterIntake: string;
}

export interface AuthUser extends Omit<UserAccount, 'password'> {
  profile?: SkinProfile | null;
}

export interface ScanResult {
  id: string;
  date: string;
  condition: DetectedCondition;
  confidence: number;
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
  History: undefined;
  UserProfile: undefined;
  Settings: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
