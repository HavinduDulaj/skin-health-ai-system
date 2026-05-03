import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import type { ScreenProps, SkinProfile, SkinType } from '../types';

const skinTypes: SkinType[] = ['Oily', 'Dry', 'Normal', 'Combination', 'Sensitive'];
const genders = ['Female', 'Male', 'Other'];
const yesNo = ['Yes', 'No'];
const routineOptions = ['Daily', 'Weekly', 'Occasionally', 'Rarely'];
const sunExposureOptions = ['Low', 'Medium', 'High'];
const sleepOptions = ['Less than 6 hours', '6-7 hours', '7-8 hours', '8+ hours'];
const waterIntakeOptions = ['Less than 1 Liter', '1-2 Liters', '2-3 Liters', '3+ Liters'];

type ChoiceFieldProps = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  palette: ReturnType<typeof useThemeContext>['palette'];
};

function ChoiceField({ label, options, value, onChange, palette }: ChoiceFieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: palette.text }]}>{label}</Text>
      <View style={styles.choicesWrap}>
        {options.map((option) => {
          const active = value === option;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => onChange(option)}
              style={[
                styles.choiceChip,
                {
                  backgroundColor: active ? palette.primary : palette.card,
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

export default function ProfileSetupScreen({ navigation, route }: ScreenProps<'ProfileSetup'>) {
  const { user, saveProfile } = useAuth();
  const { palette } = useThemeContext();
  const mode = route.params?.mode ?? 'create';
  const existingProfile = user?.profile;
  const [profile, setProfile] = useState<SkinProfile>({
    age: existingProfile?.age ?? '',
    gender: existingProfile?.gender ?? 'Female',
    skinType: existingProfile?.skinType ?? 'Oily',
    existingSkinIssue: existingProfile?.existingSkinIssue ?? 'Acne',
    skinAllergyHistory: existingProfile?.skinAllergyHistory ?? 'No',
    skincareRoutineHabits: existingProfile?.skincareRoutineHabits ?? 'Daily',
    sunExposureLevel: existingProfile?.sunExposureLevel ?? 'Medium',
    sleepHours: existingProfile?.sleepHours ?? '7-8 hours',
    waterIntake: existingProfile?.waterIntake ?? '2-3 Liters',
  });
  const [loading, setLoading] = useState(false);

  const updateField = (key: keyof SkinProfile, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!profile.age.trim() || !profile.gender.trim() || !profile.existingSkinIssue.trim()) {
      Alert.alert('Missing Fields', 'Please complete the required profile details.');
      return;
    }

    try {
      setLoading(true);
      await saveProfile(profile);

      if (mode === 'edit') {
        navigation.goBack();
        return;
      }

      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }, 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save your profile right now.';
      Alert.alert('Save Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stepper}>
          {[0, 1, 2].map((step) => (
            <View
              key={step}
              style={[
                styles.stepDot,
                {
                  backgroundColor: step < 2 ? palette.primary : palette.border,
                },
              ]}
            />
          ))}
        </View>

        <Text style={[styles.title, { color: palette.text }]}>Let's set up your{"\n"}skin profile</Text>
        <Text style={[styles.subtitle, { color: palette.secondaryText }]}>This helps us give better insights</Text>

        <View style={styles.form}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: palette.text }]}>Age</Text>
            <View style={styles.rowControl}>
              <AppInput
                keyboardType="number-pad"
                onChangeText={(value) => updateField('age', value)}
                placeholder="22"
                value={profile.age}
              />
            </View>
          </View>

          <ChoiceField
            label="Gender"
            onChange={(value) => updateField('gender', value)}
            options={genders}
            palette={palette}
            value={profile.gender}
          />

          <ChoiceField
            label="Skin Type"
            onChange={(value) => updateField('skinType', value)}
            options={skinTypes}
            palette={palette}
            value={profile.skinType}
          />

          <AppInput
            label="Existing Skin Issue"
            onChangeText={(value) => updateField('existingSkinIssue', value)}
            placeholder="Acne"
            value={profile.existingSkinIssue}
          />

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: palette.text }]}>Skin Allergy History</Text>
            <View style={[styles.segment, { backgroundColor: palette.card, borderColor: palette.border }]}>
              {yesNo.map((option) => {
                const active = profile.skinAllergyHistory === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => updateField('skinAllergyHistory', option)}
                    style={[
                      styles.segmentButton,
                      {
                        backgroundColor: active ? palette.primary : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[styles.segmentText, { color: active ? '#FFFFFF' : palette.text }]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <ChoiceField
            label="Skincare Routine"
            onChange={(value) => updateField('skincareRoutineHabits', value)}
            options={routineOptions}
            palette={palette}
            value={profile.skincareRoutineHabits}
          />

          <ChoiceField
            label="Sun Exposure Level"
            onChange={(value) => updateField('sunExposureLevel', value)}
            options={sunExposureOptions}
            palette={palette}
            value={profile.sunExposureLevel}
          />

          <ChoiceField
            label="Sleep Hours"
            onChange={(value) => updateField('sleepHours', value)}
            options={sleepOptions}
            palette={palette}
            value={profile.sleepHours}
          />

          <ChoiceField
            label="Daily Water Intake"
            onChange={(value) => updateField('waterIntake', value)}
            options={waterIntakeOptions}
            palette={palette}
            value={profile.waterIntake}
          />
        </View>

        <AppButton
          label={mode === 'edit' ? 'Save Profile' : 'Next'}
          loading={loading}
          onPress={handleSave}
          style={styles.cta}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  stepDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    gap: 18,
    marginTop: 28,
  },
  row: {
    gap: 10,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowControl: {
    width: 110,
  },
  fieldBlock: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  choicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceChip: {
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 110,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  segment: {
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 4,
  },
  segmentButton: {
    borderRadius: 999,
    flex: 1,
    paddingVertical: 10,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  cta: {
    marginTop: 26,
  },
});
