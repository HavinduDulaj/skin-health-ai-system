import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import type { ScreenProps } from '../types';

const actionCards = [
  { label: 'Upload Image', icon: 'UP', route: 'UploadImage', tint: '#DCEAFE' },
  { label: 'Capture Image', icon: 'CAM', route: 'CameraCapture', tint: '#E3F7E9' },
  { label: 'View History', icon: 'HIS', route: 'History', tint: '#F0E7FF' },
  { label: 'Settings', icon: 'SET', route: 'Settings', tint: '#FFF0D9' },
] as const;

export default function DashboardScreen({ navigation }: ScreenProps<'Dashboard'>) {
  const { user } = useAuth();
  const { palette } = useThemeContext();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={[styles.topGlyph, { color: palette.text }]}>MENU</Text>
          <View style={styles.alertWrap}>
            <Text style={[styles.alertDot, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.topGlyph, { color: palette.text }]}>AL</Text>
          </View>
        </View>

        <Text style={[styles.hello, { color: palette.text }]}>Hello, {user?.fullName?.split(' ')[0] ?? 'Sarah'}</Text>
        <Text style={[styles.subtitle, { color: palette.secondaryText }]}>Take care of your skin today!</Text>

        <Card style={styles.profileCard}>
          <View style={styles.profileCopy}>
            <Text style={[styles.profileTitle, { color: palette.text }]}>Your Skin Profile</Text>
            <Text style={[styles.profileMeta, { color: palette.secondaryText }]}>
              {user?.profile?.skinType ?? 'Oily'} Skin • {user?.profile?.existingSkinIssue ?? 'Acne Prone'}
            </Text>
            <Text style={[styles.profileLink, { color: palette.primary }]} onPress={() => navigation.navigate('UserProfile')}>
              View Profile
            </Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: palette.primarySoft }]}>
            <Text style={styles.avatarText}>{user?.fullName?.slice(0, 1).toUpperCase() ?? 'S'}</Text>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>What would you like to do?</Text>
        <View style={styles.grid}>
          {actionCards.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => navigation.navigate(item.route)}
              style={[styles.actionCard, { backgroundColor: palette.card, shadowColor: palette.shadow }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: item.tint }]}>
                <Text style={[styles.actionGlyph, { color: palette.primary }]}>{item.icon}</Text>
              </View>
              <Text style={[styles.actionLabel, { color: palette.text }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('UserProfile')}>
          <Card style={styles.tipCard}>
            <View style={styles.tipCopy}>
              <Text style={[styles.tipTitle, { color: palette.text }]}>Daily Tip</Text>
              <Text style={[styles.tipText, { color: palette.secondaryText }]}>Drink enough water and get proper sleep for healthy skin.</Text>
            </View>
            <View style={[styles.tipIcon, { backgroundColor: palette.primarySoft }]}>
              <Text style={[styles.tipGlyph, { color: palette.primary }]}>H2O</Text>
            </View>
          </Card>
        </TouchableOpacity>
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
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
  },
  topGlyph: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  alertWrap: {
    position: 'relative',
  },
  alertDot: {
    borderRadius: 999,
    height: 8,
    position: 'absolute',
    right: 0,
    top: 2,
    width: 8,
    zIndex: 1,
  },
  hello: {
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  profileCard: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  profileCopy: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  profileMeta: {
    fontSize: 14,
    marginTop: 6,
  },
  profileLink: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 999,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    color: '#2563EB',
    fontSize: 24,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 14,
  },
  actionCard: {
    borderRadius: 20,
    minHeight: 116,
    padding: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    width: '47.8%',
  },
  actionIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 18,
  },
  actionGlyph: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  tipCard: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  tipCopy: {
    flex: 1,
    paddingRight: 18,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  tipIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  tipGlyph: {
    fontSize: 15,
    fontWeight: '800',
  },
});
