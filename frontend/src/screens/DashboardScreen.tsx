import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Card from '../components/Card';
import { AppIcon, IconButton, MetricTile, ProgressBar, StatusPill } from '../components/DesignSystem';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import { storageService } from '../services/storageService';
import type { ScanResult, ScreenProps, SkinProfile } from '../types';

const actionCards = [
  { label: 'Camera Scan', description: 'Capture a new image', icon: 'camera-outline', route: 'CameraCapture', tint: '#EAF3FF' },
  { label: 'Upload Image', description: 'Analyze from gallery', icon: 'cloud-upload-outline', route: 'UploadImage', tint: '#E8F7F0' },
  { label: 'Ingredients', description: 'Scan before model guidance', icon: 'flask-outline', route: 'UploadImage', tint: '#EDF7F6' },
  { label: 'History', description: 'Review past scans', icon: 'time-outline', route: 'History', tint: '#F2F6FA' },
] as const;

const menuItems = [
  { label: 'Camera Scan', description: 'Capture a live skin image', icon: 'camera-outline', route: 'CameraCapture' },
  { label: 'Upload Image', description: 'Analyze from gallery', icon: 'cloud-upload-outline', route: 'UploadImage' },
  { label: 'History', description: 'Saved scan results', icon: 'time-outline', route: 'History' },
  { label: 'Profile', description: 'View skin profile', icon: 'person-circle-outline', route: 'UserProfile' },
  { label: 'Settings', description: 'Theme, notifications, logout', icon: 'settings-outline', route: 'Settings' },
] as const;

export default function DashboardScreen({ navigation }: ScreenProps<'Dashboard'>) {
  const { user, logout } = useAuth();
  const { palette } = useThemeContext();
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = user?.profile;
  const profileScore = useMemo(() => calculateProfileScore(profile), [profile]);
  const latestScan = history[0];
  const reviewCount = history.filter((item) => item.reviewRequired).length;
  const latestCondition = latestScan?.condition ?? 'No scans';
  const readinessLabel = profileScore >= 85 ? 'Strong' : profileScore >= 60 ? 'Partial' : 'Setup';
  const nextStep = getNextStep(profileScore, history.length, reviewCount);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      storageService.getHistory().then((items) => {
        if (active) {
          setHistory(items);
        }
      });

      return () => {
        active = false;
      };
    }, [])
  );

  const openMenuRoute = (route: (typeof menuItems)[number]['route']) => {
    setMenuOpen(false);
    navigation.navigate(route);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <IconButton name="menu-outline" label="Menu" onPress={() => setMenuOpen(true)} />
          <View style={styles.alertWrap}>
            <Text style={[styles.alertDot, { backgroundColor: '#EF4444' }]} />
            <IconButton name="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Settings')} />
          </View>
        </View>

        <Text style={[styles.hello, { color: palette.text }]}>Skin Health Dashboard</Text>
        <Text style={[styles.subtitle, { color: palette.secondaryText }]}>
          Hello, {user?.fullName?.split(' ')[0] ?? 'there'}. Start a scan or review your skin profile.
        </Text>

        <Card style={styles.healthCard}>
          <View style={styles.scoreRing}>
            <Text style={[styles.scoreNumber, { color: palette.text }]}>{profileScore}</Text>
            <Text style={[styles.scoreTotal, { color: palette.secondaryText }]}>/100</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={[styles.profileTitle, { color: palette.text }]}>Profile Readiness Score</Text>
            <Text style={[styles.profileMeta, { color: palette.secondaryText }]}>
              {profile?.skinType ?? 'Unknown'} skin - Age {profile?.age || '-'} - {profile?.sunExposureLevel || 'Sun exposure not set'}
            </Text>
            <ProgressBar value={profileScore} color={profileScore >= 70 ? palette.teal : palette.warning} />
            <View style={styles.pillRow}>
              <StatusPill
                label={profile?.existingSkinIssue || 'No issue set'}
                tone={profileScore >= 70 ? 'green' : 'amber'}
                icon="shield-checkmark-outline"
              />
              <StatusPill label={`${history.length} saved scans`} tone="blue" icon="time-outline" />
            </View>
          </View>
        </Card>

        <View style={styles.metricRow}>
          <MetricTile label="Latest" value={latestCondition} tone="blue" icon="scan-outline" />
          <MetricTile label="Reviews" value={`${reviewCount}`} tone={reviewCount > 0 ? 'amber' : 'green'} icon="warning-outline" />
          <MetricTile label="Profile" value={readinessLabel} tone={profileScore >= 70 ? 'green' : 'amber'} icon="person-circle-outline" />
        </View>

        <Card style={styles.researchCard}>
          <View style={styles.researchHead}>
            <View style={[styles.researchIcon, { backgroundColor: palette.primarySoft }]}>
              <AppIcon name="analytics-outline" size={22} color={palette.primary} />
            </View>
            <View style={styles.researchCopy}>
              <Text style={[styles.researchTitle, { color: palette.text }]}>Member 1 AI Pipeline</Text>
              <Text style={[styles.researchText, { color: palette.secondaryText }]}>
                MobileNetV2 prediction, uncertainty check, top-3 classes, Grad-CAM focus map, and clinical risk metadata.
              </Text>
            </View>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Quick Actions</Text>
        <View style={styles.grid}>
          {actionCards.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => navigation.navigate(item.route)}
              style={[styles.actionCard, { backgroundColor: palette.card, shadowColor: palette.shadow }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: item.tint }]}>
                <AppIcon name={item.icon} size={24} color={palette.primary} />
              </View>
              <Text style={[styles.actionLabel, { color: palette.text }]}>{item.label}</Text>
              <Text style={[styles.actionDescription, { color: palette.secondaryText }]}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('UserProfile')}>
          <Card style={styles.scanCard}>
            <View style={styles.tipCopy}>
              <Text style={[styles.tipTitle, { color: palette.text }]}>Next Best Step</Text>
              <Text style={[styles.tipText, { color: palette.secondaryText }]}>{nextStep}</Text>
              <ProgressBar value={profileScore} color={profileScore >= 70 ? palette.teal : palette.warning} />
            </View>
            <View style={[styles.tipIcon, { backgroundColor: palette.primarySoft }]}>
              <AppIcon name="sunny-outline" size={26} color={palette.primary} />
            </View>
          </Card>
        </TouchableOpacity>
      </ScrollView>

      <Modal animationType="fade" transparent visible={menuOpen} onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={[styles.menuPanel, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.menuHeader}>
              <View style={[styles.menuAvatar, { backgroundColor: palette.primarySoft }]}>
                <AppIcon name="person-outline" size={22} color={palette.primary} />
              </View>
              <View style={styles.menuUserCopy}>
                <Text style={[styles.menuName, { color: palette.text }]}>{user?.fullName ?? 'DermaSafe User'}</Text>
                <Text style={[styles.menuEmail, { color: palette.secondaryText }]}>{user?.email ?? 'Local account'}</Text>
              </View>
              <IconButton name="close-outline" label="Close menu" onPress={() => setMenuOpen(false)} />
            </View>

            <View style={[styles.menuDivider, { backgroundColor: palette.border }]} />

            {menuItems.map((item) => (
              <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => openMenuRoute(item.route)}>
                <View style={[styles.menuItemIcon, { backgroundColor: palette.primarySoft }]}>
                  <AppIcon name={item.icon} size={19} color={palette.primary} />
                </View>
                <View style={styles.menuItemCopy}>
                  <Text style={[styles.menuItemTitle, { color: palette.text }]}>{item.label}</Text>
                  <Text style={[styles.menuItemText, { color: palette.secondaryText }]}>{item.description}</Text>
                </View>
                <AppIcon name="chevron-forward-outline" size={18} color={palette.secondaryText} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.logoutItem, { borderColor: palette.border, backgroundColor: palette.subtleSurface }]}
              onPress={() => {
                setMenuOpen(false);
                logout();
              }}
            >
              <AppIcon name="log-out-outline" size={19} color={palette.danger} />
              <Text style={[styles.logoutText, { color: palette.danger }]}>Logout</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
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

function getNextStep(profileScore: number, scanCount: number, reviewCount: number) {
  if (profileScore < 70) {
    return 'Complete your profile details first so the risk analysis can use better clinical context.';
  }

  if (scanCount === 0) {
    return 'Upload a clear, close image with good lighting to create your first AI-supported skin assessment.';
  }

  if (reviewCount > 0) {
    return 'Review low-certainty scans and compare the top predictions before using ingredient recommendations.';
  }

  return 'Your profile and scan history are ready. Continue with a new scan or open ingredient guidance.';
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
  menuBackdrop: {
    backgroundColor: 'rgba(8, 19, 29, 0.44)',
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 42,
  },
  menuPanel: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
  },
  menuHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  menuAvatar: {
    alignItems: 'center',
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  menuUserCopy: {
    flex: 1,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '900',
  },
  menuEmail: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    marginVertical: 12,
  },
  menuItem: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  menuItemIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  menuItemCopy: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  menuItemText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 2,
  },
  logoutItem: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 46,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '900',
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
  healthCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  scoreRing: {
    alignItems: 'center',
    borderColor: '#BFE8E4',
    borderWidth: 8,
    borderRadius: 999,
    height: 92,
    justifyContent: 'center',
    width: 92,
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: '900',
  },
  scoreTotal: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: -2,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  researchCard: {
    marginTop: 14,
  },
  researchHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  researchIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  researchCopy: {
    flex: 1,
  },
  researchTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  researchText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 4,
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
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 116,
    padding: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    width: '47.8%',
  },
  actionIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 18,
  },
  actionDescription: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 4,
  },
  scanCard: {
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
    borderRadius: 8,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
});
