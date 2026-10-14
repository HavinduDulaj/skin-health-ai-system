import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import { AppIcon, IconButton, ProgressBar, StatusPill } from '../components/DesignSystem';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import type { ScreenProps, SkinProfile, SkinType } from '../types';

const skinTypes: SkinType[] = ['Normal', 'Dry', 'Sensitive', 'Combination', 'Oily'];
const genders = ['Female', 'Male', 'Other'];
const yesNo = ['Yes', 'No'];
const routineOptions = ['Daily', 'Weekly', 'Occasionally', 'Rarely'];
const sunExposureOptions = ['Low', 'Medium', 'High'];
const environmentOptions = ['Humid', 'Hot', 'Dry', 'Polluted'];
const sleepOptions = ['Less than 6 hours', '6-7 hours', '7-8 hours', '8+ hours'];
const waterIntakeOptions = ['Less than 1 Liter', '1-2 Liters', '2-3 Liters', '3+ Liters'];

type IconName = Parameters<typeof AppIcon>[0]['name'];

type ChoiceFieldProps = {
  label: string;
  icon: IconName;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
};

export default function ProfileSetupScreen({ navigation, route }: ScreenProps<'ProfileSetup'>) {
  const { user, saveProfile, logout } = useAuth();
  const { palette } = useThemeContext();
  const mode = route.params?.mode ?? 'create';
  const existingProfile = user?.profile;
  const [profile, setProfile] = useState<SkinProfile>({
    age: existingProfile?.age ?? '',
    gender: existingProfile?.gender ?? 'Female',
    skinType: existingProfile?.skinType ?? 'Normal',
    existingSkinIssue: existingProfile?.existingSkinIssue ?? '',
    skinAllergyHistory: existingProfile?.skinAllergyHistory ?? 'No',
    skinAllergies: existingProfile?.skinAllergies ?? '',
    geneticSkinIssues: existingProfile?.geneticSkinIssues ?? '',
    environment: existingProfile?.environment ?? 'Humid',
    usesSkincareProducts: existingProfile?.usesSkincareProducts ?? 'Yes',
    currentProducts: existingProfile?.currentProducts ?? '',
    skincareRoutineHabits: existingProfile?.skincareRoutineHabits ?? 'Daily',
    sunExposureLevel: existingProfile?.sunExposureLevel ?? 'Medium',
    sleepHours: existingProfile?.sleepHours ?? '7-8 hours',
    waterIntake: existingProfile?.waterIntake ?? '2-3 Liters',
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const profileScore = useMemo(() => calculateProfileScore(profile), [profile]);

  const updateField = (key: keyof SkinProfile, value: string) => {
    setFormError('');
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!profile.age.trim() || !profile.gender.trim() || !profile.skinType.trim()) {
      setFormError('Please enter your age and select your gender and skin type.');
      return;
    }

    const age = Number(profile.age);
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      setFormError('Please enter a valid age between 1 and 120.');
      return;
    }

    try {
      setLoading(true);
      setFormError('');
      await saveProfile(profile);

      if (mode === 'edit') {
        navigation.goBack();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save your profile right now.';
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = async () => {
    if (mode === 'edit') {
      navigation.goBack();
      return;
    }

    // A newly registered user has no previous route in the profile-setup
    // navigator. Cancel setup by ending that new session and return to Landing.
    await logout();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <IconButton name="chevron-back-outline" label="Back" onPress={() => void handleBack()} />
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: palette.text }]}>Skin Profile</Text>
            <Text style={[styles.subtitle, { color: palette.secondaryText }]}>Real clinical context for Member 1 analysis</Text>
          </View>
          <View style={[styles.headerIcon, { backgroundColor: palette.surface }]}>
            <AppIcon name="shield-checkmark-outline" size={22} color={palette.teal} />
          </View>
        </View>

        <View style={[styles.readinessCard, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
          <View style={[styles.scoreRing, { borderColor: profileScore >= 80 ? palette.teal : palette.warning }]}>
            <Text style={[styles.scoreNumber, { color: palette.text }]}>{profileScore}%</Text>
          </View>
          <View style={styles.readinessCopy}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>Profile readiness</Text>
            <Text style={[styles.cardText, { color: palette.secondaryText }]}>
              {profileScore >= 90
                ? 'Great job. Your profile is almost complete.'
                : 'Complete more fields to improve risk and ingredient guidance.'}
            </Text>
            <ProgressBar value={profileScore} color={profileScore >= 80 ? palette.teal : palette.warning} />
          </View>
          <Text style={[styles.scoreSmall, { color: profileScore >= 80 ? palette.teal : palette.warning }]}>{profileScore}%</Text>
        </View>

        {formError ? (
          <View style={[styles.errorCard, { backgroundColor: palette.surface, borderColor: palette.danger }]}>
            <AppIcon name="alert-circle-outline" size={19} color={palette.danger} />
            <Text style={[styles.errorText, { color: palette.danger }]}>{formError}</Text>
          </View>
        ) : null}

        <SectionTitle label="Personal details" />
        <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.inputGrid}>
            <AppInput
              icon="person-outline"
              keyboardType="number-pad"
              label="Age *"
              onChangeText={(value) => updateField('age', value.replace(/[^0-9]/g, ''))}
              placeholder="Enter your age (required)"
              returnKeyType="done"
              onSubmitEditing={handleSave}
              value={profile.age}
            />
            <ChoiceField icon="male-female-outline" label="Gender" onChange={(value) => updateField('gender', value)} options={genders} value={profile.gender} compact />
          </View>
          <ChoiceField icon="water-outline" label="Skin type" onChange={(value) => updateField('skinType', value)} options={skinTypes} value={profile.skinType} />
        </View>

        <SectionTitle label="Clinical history" />
        <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <AppInput
            icon="medical-outline"
            label="Existing skin issue"
            onChangeText={(value) => updateField('existingSkinIssue', value)}
            placeholder="Example: Acne, redness, none"
            value={profile.existingSkinIssue}
          />
          <ChoiceField
            icon="shield-outline"
            label="Allergy history"
            onChange={(value) => updateField('skinAllergyHistory', value)}
            options={yesNo}
            value={profile.skinAllergyHistory}
            compact
          />
          <AppInput
            icon="warning-outline"
            label="Exact ingredient allergies"
            onChangeText={(value) => updateField('skinAllergies', value)}
            placeholder="Example: Fragrance, Tea Tree Oil, none"
            value={profile.skinAllergies}
          />
          <AppInput
            icon="git-branch-outline"
            label="Family or genetic skin issues"
            onChangeText={(value) => updateField('geneticSkinIssues', value)}
            placeholder="Example: Eczema, sensitivity, none"
            value={profile.geneticSkinIssues}
          />
          <ChoiceField
            icon="flask-outline"
            label="Currently uses skincare products"
            onChange={(value) => updateField('usesSkincareProducts', value)}
            options={yesNo}
            value={profile.usesSkincareProducts}
            compact
          />
          <AppInput
            icon="list-outline"
            label="Current products"
            onChangeText={(value) => updateField('currentProducts', value)}
            placeholder="Example: Cleanser, moisturizer, sunscreen"
            value={profile.currentProducts}
          />
          <ChoiceField
            icon="sparkles-outline"
            label="Skincare routine"
            onChange={(value) => updateField('skincareRoutineHabits', value)}
            options={routineOptions}
            value={profile.skincareRoutineHabits}
          />
        </View>

        <SectionTitle label="Lifestyle" />
        <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ChoiceField
            icon="earth-outline"
            label="Usual environment"
            onChange={(value) => updateField('environment', value)}
            options={environmentOptions}
            value={profile.environment}
          />
          <ChoiceField
            icon="sunny-outline"
            label="Sun exposure"
            onChange={(value) => updateField('sunExposureLevel', value)}
            options={sunExposureOptions}
            value={profile.sunExposureLevel}
            compact
          />
          <ChoiceField
            icon="moon-outline"
            label="Sleep"
            onChange={(value) => updateField('sleepHours', value)}
            options={sleepOptions}
            value={profile.sleepHours}
          />
          <ChoiceField
            icon="water-outline"
            label="Water intake"
            onChange={(value) => updateField('waterIntake', value)}
            options={waterIntakeOptions}
            value={profile.waterIntake}
          />
        </View>

        <View style={[styles.noteCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <AppIcon name="lock-closed-outline" size={19} color={palette.primary} />
          <Text style={[styles.noteText, { color: palette.secondaryText }]}>
            This profile is saved to your real app account/session and used by the scan risk metadata.
          </Text>
        </View>

        <AppButton
          icon="save-outline"
          label={mode === 'edit' ? 'Save Changes' : 'Create Profile'}
          loading={loading}
          onPress={handleSave}
          style={styles.cta}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ label }: { label: string }) {
  const { palette } = useThemeContext();
  return <Text style={[styles.sectionTitle, { color: palette.text }]}>{label}</Text>;
}

function ChoiceField({ label, icon, options, value, onChange, compact }: ChoiceFieldProps) {
  const { palette } = useThemeContext();

  return (
    <View style={styles.fieldBlock}>
      <View style={styles.fieldHeader}>
        <View style={[styles.fieldIcon, { backgroundColor: palette.primarySoft }]}>
          <AppIcon name={icon} size={18} color={palette.primary} />
        </View>
        <Text style={[styles.fieldLabel, { color: palette.text }]}>{label}</Text>
        <StatusPill label={value || 'Not set'} tone={value ? 'green' : 'amber'} />
      </View>
      <View style={compact ? styles.compactChoices : styles.choicesWrap}>
        {options.map((option) => {
          const active = value === option;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => onChange(option)}
              style={[
                styles.choiceChip,
                compact && styles.compactChoice,
                {
                  backgroundColor: active ? palette.primary : palette.subtleSurface,
                  borderColor: active ? palette.primary : palette.border,
                },
              ]}
            >
              <Text style={[styles.choiceText, { color: active ? '#FFFFFF' : palette.text }]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function calculateProfileScore(profile: SkinProfile) {
  const fields: Array<keyof SkinProfile> = [
    'age',
    'gender',
    'skinType',
    'existingSkinIssue',
    'skinAllergyHistory',
    'skinAllergies',
    'geneticSkinIssues',
    'environment',
    'usesSkincareProducts',
    'currentProducts',
    'skincareRoutineHabits',
    'sunExposureLevel',
    'sleepHours',
    'waterIntake',
  ];
  const completed = fields.filter((field) => String(profile[field] ?? '').trim().length > 0).length;
  return Math.round((completed / fields.length) * 100);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 3,
  },
  headerIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  readinessCard: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
  },
  scoreRing: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 8,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  scoreNumber: {
    fontSize: 21,
    fontWeight: '900',
  },
  readinessCopy: {
    flex: 1,
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  cardText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  scoreSmall: {
    fontSize: 14,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 22,
  },
  sectionCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    padding: 14,
  },
  inputGrid: {
    gap: 14,
  },
  fieldBlock: {
    gap: 10,
  },
  fieldHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  fieldIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  fieldLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  choicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  compactChoices: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceChip: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 104,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  compactChoice: {
    flex: 1,
    minWidth: 0,
  },
  choiceText: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  noteCard: {
    alignItems: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    padding: 14,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  errorCard: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  cta: {
    marginTop: 18,
  },
});
