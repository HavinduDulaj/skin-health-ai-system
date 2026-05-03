import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { useThemeContext } from '../context/ThemeContext';
import type { ScreenProps } from '../types';

export default function LandingScreen({ navigation }: ScreenProps<'Landing'>) {
  const { palette } = useThemeContext();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={[styles.title, { color: palette.text }]}>
            DermaSafe <Text style={{ color: palette.primary }}>AI</Text>
          </Text>
          <Text style={[styles.tagline, { color: palette.text }]}>Scan your skin.</Text>
          <Text style={[styles.tagline, { color: palette.text }]}>Understand your condition.</Text>

          <View style={styles.illustrationWrap}>
            <View style={[styles.glow, { backgroundColor: palette.primarySoft }]} />
            <View style={[styles.phoneFrame, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
              <Image source={require('../../assets/logo.png')} resizeMode="contain" style={styles.logo} />
            </View>
            <View style={[styles.plusBadge, { backgroundColor: palette.primary }]}>
              <Text style={styles.plusText}>+</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton label="Get Started" onPress={() => navigation.navigate('Register')} />
          <AppButton label="Sign In" onPress={() => navigation.navigate('SignIn')} variant="secondary" />
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
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  hero: {
    alignItems: 'center',
    marginTop: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 14,
  },
  tagline: {
    fontSize: 17,
    lineHeight: 24,
  },
  illustrationWrap: {
    alignItems: 'center',
    height: 300,
    justifyContent: 'center',
    marginTop: 24,
    width: '100%',
  },
  glow: {
    borderRadius: 160,
    height: 240,
    opacity: 0.8,
    position: 'absolute',
    width: 240,
  },
  phoneFrame: {
    alignItems: 'center',
    borderRadius: 34,
    borderWidth: 1,
    height: 260,
    justifyContent: 'center',
    padding: 18,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 34,
    width: 180,
  },
  logo: {
    height: 220,
    width: 220,
  },
  plusBadge: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    bottom: 48,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: 66,
    width: 48,
  },
  plusText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginTop: -2,
  },
  actions: {
    gap: 12,
    marginBottom: 16,
  },
});
