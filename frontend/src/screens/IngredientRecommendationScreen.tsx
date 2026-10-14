import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';

import BuBusAppNavigator from '../bubus/navigation/AppNavigator';
import type { LesionType, SeverityLevel, UserProfile } from '../bubus/types/types';
import { useAuth } from '../context/AuthContext';
import type { DetectedCondition, ScreenProps, SkinProfile } from '../types';

function toLesionType(condition?: DetectedCondition | string): LesionType {
  const normalized = (condition || '').toLowerCase();

  if (normalized.includes('burn')) return 'Burn';
  if (normalized.includes('rash')) return 'Rash';
  if (normalized.includes('wart')) return 'Wart';

  return 'Acne';
}

function toSeverityLevel(value?: string): SeverityLevel {
  if (value === 'Low' || value === 'Medium' || value === 'High') {
    return value;
  }

  return 'Low';
}

function parseAge(value?: string) {
  const age = Number.parseInt(value || '', 10);
  return Number.isFinite(age) && age > 0 ? age : 22;
}

function parseList(value?: string) {
  if (!value || value.trim().toLowerCase() === 'none') return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function toBuBusProfile(profile?: SkinProfile | null, condition?: DetectedCondition, riskLevel?: string): UserProfile {
  const existingIssue = profile?.existingSkinIssue || condition || 'Acne';

  return {
    age: parseAge(profile?.age),
    gender: profile?.gender === 'Male' || profile?.gender === 'Other' ? profile.gender : 'Female',
    skinType: profile?.skinType || 'Oily',
    lesion: toLesionType(condition || existingIssue),
    severity: toSeverityLevel(riskLevel),
    environment:
      profile?.environment === 'Hot' || profile?.environment === 'Dry' || profile?.environment === 'Polluted'
        ? profile.environment
        : 'Humid',
    allergies: profile?.skinAllergyHistory === 'Yes' ? parseList(profile.skinAllergies) : [],
    previousSkinIssues: parseList(profile?.existingSkinIssue || existingIssue),
    geneticIssues: parseList(profile?.geneticSkinIssues),
    usesSkincareProducts: profile?.usesSkincareProducts !== 'No',
    sunExposure: toSeverityLevel(profile?.sunExposureLevel),
  };
}

export default function IngredientRecommendationScreen({ navigation, route }: ScreenProps<'IngredientRecommendations'>) {
  const { user } = useAuth();
  const scanResult = route.params?.result;
  const initialProfile = useMemo(
    () => toBuBusProfile(user?.profile, scanResult?.condition, scanResult?.riskLevel),
    [scanResult?.condition, scanResult?.riskLevel, user?.profile],
  );

  function handleExit() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Dashboard');
  }

  const supportedCondition = /^(acne|burns?|rashes|rash|warts?)$/i.test(scanResult?.condition || '');
  const supportedRisk = ['Low', 'Medium', 'High'].includes(scanResult?.riskLevel || '');
  if (scanResult && (!supportedCondition || !supportedRisk)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 28, gap: 16, backgroundColor: '#F6FAFC' }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#102033' }}>Recommendations unavailable for this result</Text>
        <Text style={{ fontSize: 16, lineHeight: 24, color: '#526376' }}>This scan does not have a supported condition and risk assessment. We cannot create a matching ingredient recommendation from it.</Text>
        <Pressable accessibilityRole="button" onPress={handleExit} style={{ backgroundColor: '#0F62D9', padding: 16, borderRadius: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Back to results</Text>
        </Pressable>
      </View>
    );
  }
  return <BuBusAppNavigator initialProfile={initialProfile} onExit={handleExit} />;
}
