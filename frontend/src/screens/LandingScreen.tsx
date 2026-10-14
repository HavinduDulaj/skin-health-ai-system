import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { AppIcon } from '../components/DesignSystem';
import { useThemeContext } from '../context/ThemeContext';
import type { ScreenProps } from '../types';

const benefits = [
  ['scan-outline', 'Analyze skin lesions'],
  ['pulse-outline', 'Get risk insights'],
  ['leaf-outline', 'Personalized ingredient guidance'],
  ['time-outline', 'Track skin health over time'],
] as const;

export default function LandingScreen({ navigation }: ScreenProps<'Landing'>) {
  const { palette } = useThemeContext();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.container}>
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: palette.surface }]}>
            <AppIcon name="shield-checkmark-outline" size={21} color={palette.teal} />
          </View>
          <Text style={[styles.brand, { color: palette.text }]}>
            DermaSafe <Text style={{ color: palette.teal }}>AI</Text>
          </Text>
        </View>

        <View style={styles.hero}>
          <Text style={[styles.title, { color: palette.text }]}>Scan your skin with calm confidence.</Text>
          <Text style={[styles.tagline, { color: palette.secondaryText }]}>
            AI-powered skin analysis, risk support, and skincare ingredient guidance in one place.
          </Text>

          <View style={styles.illustrationWrap}>
            <View style={[styles.phoneFrame, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
              <Image source={require('../../assets/logo.png')} resizeMode="contain" style={styles.logo} />
              <View style={[styles.scanCard, { backgroundColor: palette.subtleSurface, borderColor: palette.border }]}>
                <AppIcon name="checkmark-circle-outline" size={18} color={palette.success} />
                <Text style={[styles.scanText, { color: palette.text }]}>Ready to scan</Text>
              </View>
            </View>
          </View>

          <View style={styles.benefits}>
            {benefits.map(([icon, label]) => (
              <View key={label} style={styles.benefitRow}>
                <AppIcon name={icon} size={17} color={palette.teal} />
                <Text style={[styles.benefitText, { color: palette.secondaryText }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton icon="arrow-forward-outline" label="Get Started" onPress={() => navigation.navigate('Register')} />
          <AppButton icon="log-in-outline" label="Sign In" onPress={() => navigation.navigate('SignIn')} variant="secondary" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  brandMark: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  brand: {
    fontSize: 17,
    fontWeight: '800',
  },
  hero: {
    marginTop: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  illustrationWrap: {
    alignItems: 'center',
    height: 245,
    justifyContent: 'center',
    marginTop: 14,
    width: '100%',
  },
  phoneFrame: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 220,
    justifyContent: 'center',
    padding: 18,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 34,
    width: '100%',
  },
  logo: {
    height: 150,
    opacity: 0.96,
    width: 150,
  },
  scanCard: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    bottom: 16,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    position: 'absolute',
    right: 16,
  },
  scanText: {
    fontSize: 13,
    fontWeight: '800',
  },
  benefits: {
    gap: 10,
    marginTop: 12,
  },
  benefitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
    marginBottom: 16,
  },
});
