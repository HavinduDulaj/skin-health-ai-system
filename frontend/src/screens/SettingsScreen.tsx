import { StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';

export default function SettingsScreen() {
  const { logout } = useAuth();
  const { palette, mode, notificationsEnabled, toggleNotifications, toggleTheme } = useThemeContext();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: palette.text }]}>Settings</Text>

        <Text style={[styles.sectionTitle, { color: palette.secondaryText }]}>Preferences</Text>
        <Card style={styles.sectionCard}>
          <View style={[styles.row, { borderBottomColor: palette.border }]}>
            <View style={styles.rowCopy}>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowGlyph, { color: palette.text }]}>DM</Text>
                <Text style={[styles.label, { color: palette.text }]}>Dark Mode</Text>
              </View>
            </View>
            <Switch
              onValueChange={toggleTheme}
              thumbColor="#FFFFFF"
              trackColor={{ false: palette.border, true: palette.primary }}
              value={mode === 'dark'}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowGlyph, { color: palette.text }]}>NT</Text>
                <Text style={[styles.label, { color: palette.text }]}>Notifications</Text>
              </View>
            </View>
            <Switch
              onValueChange={toggleNotifications}
              thumbColor="#FFFFFF"
              trackColor={{ false: palette.border, true: palette.primary }}
              value={notificationsEnabled}
            />
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: palette.secondaryText }]}>Information</Text>
        <Card style={styles.sectionCard}>
          {['Privacy Policy', 'Terms of Use', 'About DermaSafe AI'].map((item, index) => (
            <View
              key={item}
              style={[
                styles.infoRow,
                {
                  borderBottomWidth: index === 2 ? 0 : 1,
                  borderBottomColor: palette.border,
                },
              ]}
              >
                <Text style={[styles.infoLabel, { color: palette.text }]}>{item}</Text>
                <Text style={[styles.chevron, { color: palette.secondaryText }]}>{'>'}</Text>
              </View>
            ))}
        </Card>

        <Text style={[styles.note, { color: palette.secondaryText }]}>
          Profile details and scan history are stored locally on this device for now.
        </Text>

        <AppButton label="Logout" onPress={logout} variant="secondary" style={styles.logoutButton} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionCard: {
    marginBottom: 20,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowCopy: {
    flex: 1,
  },
  rowLabelWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  rowGlyph: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 18,
    fontWeight: '700',
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  logoutButton: {
    borderColor: '#FCA5A5',
    marginTop: 'auto',
    marginBottom: 24,
  },
});
