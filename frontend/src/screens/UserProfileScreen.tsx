import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import type { ScreenProps } from '../types';

export default function UserProfileScreen({ navigation }: ScreenProps<'UserProfile'>) {
  const { user } = useAuth();
  const { palette } = useThemeContext();

  const rows = [
    ['Age', user?.profile?.age],
    ['Gender', user?.profile?.gender],
    ['Skin Type', user?.profile?.skinType],
    ['Existing Skin Issue', user?.profile?.existingSkinIssue],
    ['Skin Allergy History', user?.profile?.skinAllergyHistory],
    ['Skincare Routine', user?.profile?.skincareRoutineHabits],
    ['Sun Exposure Level', user?.profile?.sunExposureLevel],
    ['Sleep Hours', user?.profile?.sleepHours],
    ['Daily Water Intake', user?.profile?.waterIntake],
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: palette.text }]}>My Profile</Text>

        <Card style={styles.heroCard}>
          <View style={[styles.avatar, { backgroundColor: palette.primarySoft }]}>
            <Text style={styles.avatarText}>{user?.fullName?.slice(0, 1).toUpperCase() ?? 'S'}</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.name, { color: palette.text }]}>{user?.fullName}</Text>
            <Text style={[styles.email, { color: palette.secondaryText }]}>{user?.email}</Text>
          </View>
        </Card>

        <Card style={styles.detailCard}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Profile Details</Text>
          {rows.map(([label, value]) => (
            <View key={label} style={[styles.detailRow, { borderBottomColor: palette.border }]}>
              <Text style={[styles.detailLabel, { color: palette.secondaryText }]}>{label}</Text>
              <Text style={[styles.detailValue, { color: palette.text }]}>{value ?? '-'}</Text>
            </View>
          ))}
        </Card>

        <AppButton label="Edit Profile" onPress={() => navigation.navigate('ProfileSetup', { mode: 'edit' })} />
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
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  heroCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 999,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  avatarText: {
    color: '#2563EB',
    fontSize: 24,
    fontWeight: '800',
  },
  heroCopy: {
    flex: 1,
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
  },
  email: {
    fontSize: 14,
    marginTop: 4,
  },
  detailCard: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  detailRow: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
    paddingRight: 12,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '45%',
    textAlign: 'right',
  },
});
