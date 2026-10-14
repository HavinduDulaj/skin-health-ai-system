import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { AppIcon, IconButton, ProgressBar, StatusPill } from '../components/DesignSystem';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import type { ScreenProps, SkinProfile } from '../types';

type ProfileRow = {
  label: string;
  value?: string;
  icon: Parameters<typeof AppIcon>[0]['name'];
};

export default function UserProfileScreen({ navigation }: ScreenProps<'UserProfile'>) {
  const { user } = useAuth();
  const { palette } = useThemeContext();
  const profile = user?.profile;
  const profileScore = calculateProfileScore(profile);
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Dashboard');
  };

  const personalRows: ProfileRow[] = [
    { label: 'Age', value: profile?.age, icon: 'person-outline' },
    { label: 'Gender', value: profile?.gender, icon: 'male-female-outline' },
    { label: 'Skin type', value: profile?.skinType, icon: 'water-outline' },
  ];
  const clinicalRows: ProfileRow[] = [
    { label: 'Existing skin issue', value: profile?.existingSkinIssue, icon: 'medical-outline' },
    { label: 'Allergy history', value: profile?.skinAllergyHistory, icon: 'shield-outline' },
    { label: 'Skincare routine', value: profile?.skincareRoutineHabits, icon: 'sparkles-outline' },
  ];
  const lifestyleRows: ProfileRow[] = [
    { label: 'Sun exposure', value: profile?.sunExposureLevel, icon: 'sunny-outline' },
    { label: 'Sleep', value: profile?.sleepHours, icon: 'moon-outline' },
    { label: 'Water intake', value: profile?.waterIntake, icon: 'water-outline' },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconButton name="chevron-back-outline" label="Back" onPress={handleBack} />
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: palette.text }]}>Skin Profile</Text>
            <Text style={[styles.subtitle, { color: palette.secondaryText }]}>{user?.email ?? 'Local account'}</Text>
          </View>
          <IconButton name="settings-outline" label="Settings" onPress={() => navigation.navigate('Settings')} />
        </View>

        <View style={[styles.heroCard, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
          <View style={[styles.avatar, { backgroundColor: palette.primarySoft }]}>
            <Text style={[styles.avatarText, { color: palette.primary }]}>{user?.fullName?.slice(0, 1).toUpperCase() ?? 'D'}</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.name, { color: palette.text }]}>{user?.fullName ?? 'DermaSafe User'}</Text>
            <Text style={[styles.heroMeta, { color: palette.secondaryText }]}>Member 1 skin detection profile</Text>
            <View style={styles.pillRow}>
              <StatusPill label="Profile active" tone="green" icon="checkmark-circle-outline" />
              <StatusPill label={`${profileScore}% ready`} tone={profileScore >= 80 ? 'green' : 'amber'} icon="analytics-outline" />
            </View>
          </View>
        </View>

        <View style={[styles.readinessCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.readinessHead}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Profile readiness</Text>
            <Text style={[styles.scoreText, { color: profileScore >= 80 ? palette.teal : palette.warning }]}>{profileScore}%</Text>
          </View>
          <ProgressBar value={profileScore} color={profileScore >= 80 ? palette.teal : palette.warning} />
          <Text style={[styles.readinessText, { color: palette.secondaryText }]}>
            This data is used as clinical metadata during scan analysis and risk interpretation.
          </Text>
        </View>

        <ProfileSection title="Personal details" rows={personalRows} />
        <ProfileSection title="Clinical history" rows={clinicalRows} />
        <ProfileSection title="Lifestyle" rows={lifestyleRows} />

        <TouchableOpacity
          style={[styles.settingsPreview, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={[styles.settingsIcon, { backgroundColor: palette.primarySoft }]}>
            <AppIcon name="settings-outline" size={20} color={palette.primary} />
          </View>
          <View style={styles.settingsCopy}>
            <Text style={[styles.settingsTitle, { color: palette.text }]}>App settings</Text>
            <Text style={[styles.settingsText, { color: palette.secondaryText }]}>Theme, notifications, account actions</Text>
          </View>
          <AppIcon name="chevron-forward-outline" size={18} color={palette.secondaryText} />
        </TouchableOpacity>

        <AppButton icon="create-outline" label="Edit Skin Profile" onPress={() => navigation.navigate('ProfileSetup', { mode: 'edit' })} style={styles.cta} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileSection({ title, rows }: { title: string; rows: ProfileRow[] }) {
  const { palette } = useThemeContext();

  return (
    <>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        {rows.map((row, index) => (
          <View key={row.label} style={[styles.profileRow, index < rows.length - 1 && { borderBottomColor: palette.border, borderBottomWidth: 1 }]}>
            <View style={[styles.rowIcon, { backgroundColor: palette.primarySoft }]}>
              <AppIcon name={row.icon} size={18} color={palette.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: palette.text }]}>{row.label}</Text>
            <Text style={[styles.rowValue, { color: palette.secondaryText }]}>{row.value || 'Not set'}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function calculateProfileScore(profile?: SkinProfile | null) {
  if (!profile) {
    return 0;
  }

  const fields: Array<keyof SkinProfile> = [
    'age',
    'gender',
    'skinType',
    'existingSkinIssue',
    'skinAllergyHistory',
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
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  heroCard: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
    padding: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 999,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    fontSize: 25,
    fontWeight: '900',
  },
  heroCopy: {
    flex: 1,
  },
  name: {
    fontSize: 19,
    fontWeight: '900',
  },
  heroMeta: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  readinessCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginTop: 14,
    padding: 14,
  },
  readinessHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '900',
  },
  readinessText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
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
    overflow: 'hidden',
  },
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 62,
    paddingHorizontal: 12,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  rowValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
    maxWidth: '42%',
    textAlign: 'right',
  },
  settingsPreview: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    padding: 14,
  },
  settingsIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  settingsCopy: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  settingsText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  cta: {
    marginTop: 18,
  },
});
