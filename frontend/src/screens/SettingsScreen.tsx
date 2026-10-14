import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { AppIcon, IconButton, StatusPill } from '../components/DesignSystem';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import type { ScreenProps } from '../types';

export default function SettingsScreen({ navigation }: ScreenProps<'Settings'>) {
  const { logout, user } = useAuth();
  const { palette, mode, notificationsEnabled, toggleNotifications, toggleTheme } = useThemeContext();
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Dashboard');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconButton name="chevron-back-outline" label="Back" onPress={handleBack} />
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: palette.text }]}>App Settings</Text>
            <Text style={[styles.subtitle, { color: palette.secondaryText }]}>Preferences and account controls</Text>
          </View>
          <View style={[styles.headerIcon, { backgroundColor: palette.surface }]}>
            <AppIcon name="settings-outline" size={22} color={palette.primary} />
          </View>
        </View>

        <View style={[styles.accountCard, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
          <View style={[styles.avatar, { backgroundColor: palette.primarySoft }]}>
            <Text style={[styles.avatarText, { color: palette.primary }]}>{user?.fullName?.slice(0, 1).toUpperCase() ?? 'D'}</Text>
          </View>
          <View style={styles.accountCopy}>
            <Text style={[styles.accountName, { color: palette.text }]}>{user?.fullName ?? 'DermaSafe User'}</Text>
            <Text style={[styles.accountEmail, { color: palette.secondaryText }]}>{user?.email ?? 'Local account'}</Text>
            <StatusPill label="Signed in" tone="green" icon="checkmark-circle-outline" />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>App settings</Text>
        <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <SettingToggle
            description="Use a darker clinical interface for low-light review."
            icon="moon-outline"
            label="Dark mode"
            onValueChange={toggleTheme}
            value={mode === 'dark'}
          />
          <SettingToggle
            description="Keep scan reminders and status alerts enabled."
            icon="notifications-outline"
            label="Notifications"
            onValueChange={toggleNotifications}
            value={notificationsEnabled}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Profile and privacy</Text>
        <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <TouchableOpacity style={styles.infoRow} onPress={() => navigation.navigate('UserProfile')}>
            <View style={[styles.rowIcon, { backgroundColor: palette.primarySoft }]}>
              <AppIcon name="person-circle-outline" size={19} color={palette.primary} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={[styles.rowTitle, { color: palette.text }]}>Skin profile</Text>
              <Text style={[styles.rowDescription, { color: palette.secondaryText }]}>Review and edit Member 1 clinical metadata</Text>
            </View>
            <AppIcon name="chevron-forward-outline" size={18} color={palette.secondaryText} />
          </TouchableOpacity>
          <View style={[styles.infoRow, { borderTopColor: palette.border, borderTopWidth: 1 }]}>
            <View style={[styles.rowIcon, { backgroundColor: palette.primarySoft }]}>
              <AppIcon name="lock-closed-outline" size={19} color={palette.primary} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={[styles.rowTitle, { color: palette.text }]}>Local app data</Text>
              <Text style={[styles.rowDescription, { color: palette.secondaryText }]}>Profile and scan history are stored on this device/session</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Information</Text>
        <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {['Privacy Policy', 'Terms of Use', 'About DermaSafe AI'].map((item, index) => (
            <View
              key={item}
              style={[
                styles.infoRow,
                index > 0 && {
                  borderTopColor: palette.border,
                  borderTopWidth: 1,
                },
              ]}
            >
              <View style={[styles.rowIcon, { backgroundColor: palette.surface }]}>
                <AppIcon name={index === 0 ? 'shield-checkmark-outline' : index === 1 ? 'document-text-outline' : 'information-circle-outline'} size={19} color={palette.primary} />
              </View>
              <Text style={[styles.rowTitle, styles.infoOnlyTitle, { color: palette.text }]}>{item}</Text>
              <AppIcon name="chevron-forward-outline" size={18} color={palette.secondaryText} />
            </View>
          ))}
        </View>

        <View style={[styles.noteCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <AppIcon name="medical-outline" size={19} color={palette.primary} />
          <Text style={[styles.noteText, { color: palette.secondaryText }]}>
            DermaSafe AI is decision-support only. It does not replace a dermatologist or emergency care.
          </Text>
        </View>

        <AppButton icon="log-out-outline" label="Logout" onPress={logout} variant="secondary" style={styles.logoutButton} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingToggle({
  description,
  icon,
  label,
  onValueChange,
  value,
}: {
  description: string;
  icon: Parameters<typeof AppIcon>[0]['name'];
  label: string;
  onValueChange: () => Promise<void>;
  value: boolean;
}) {
  const { palette } = useThemeContext();

  return (
    <View style={[styles.toggleRow, { borderBottomColor: palette.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: palette.primarySoft }]}>
        <AppIcon name={icon} size={19} color={palette.primary} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={[styles.rowTitle, { color: palette.text }]}>{label}</Text>
        <Text style={[styles.rowDescription, { color: palette.secondaryText }]}>{description}</Text>
      </View>
      <Switch
        onValueChange={onValueChange}
        thumbColor="#FFFFFF"
        trackColor={{ false: palette.border, true: palette.teal }}
        value={value}
      />
    </View>
  );
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
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  headerIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  accountCard: {
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
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '900',
  },
  accountCopy: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 7,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '900',
  },
  accountEmail: {
    fontSize: 13,
    fontWeight: '700',
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
  toggleRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  infoCopy: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  infoOnlyTitle: {
    flex: 1,
  },
  rowDescription: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 3,
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
  logoutButton: {
    borderColor: '#FCA5A5',
    marginTop: 18,
  },
});
