import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import { AppIcon } from '../components/DesignSystem';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import type { ScreenProps } from '../types';

export default function SignInScreen({ navigation }: ScreenProps<'SignIn'>) {
  const { signIn } = useAuth();
  const { palette } = useThemeContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setFormError('Enter your email and password to continue.');
      return;
    }

    try {
      setFormError('');
      setLoading(true);
      await signIn(email, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in.';
      setFormError(message);
      Alert.alert('Sign In Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: palette.surface }]}>
            <AppIcon name="shield-checkmark-outline" size={24} color={palette.teal} />
          </View>
          <Text style={[styles.title, { color: palette.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: palette.secondaryText }]}>Sign in to continue to DermaSafe AI</Text>
        </View>

        <View style={styles.form}>
          <AppInput
            autoCapitalize="none"
            icon="mail-outline"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            value={email}
          />
          <AppInput
            autoCapitalize="none"
            icon="lock-closed-outline"
            onChangeText={setPassword}
            placeholder="Password"
            rightIcon="eye-off-outline"
            secureTextEntry
            value={password}
          />
          <TouchableOpacity
            style={styles.forgotWrap}
            onPress={() => Alert.alert('Password Recovery', 'Password recovery is not connected yet. Use the password you registered with.')}
          >
            <Text style={[styles.forgotText, { color: palette.primary }]}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {formError ? (
          <View style={[styles.errorBox, { backgroundColor: '#FFECEC', borderColor: '#FCA5A5' }]}>
            <Text style={[styles.errorText, { color: palette.danger }]}>{formError}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <AppButton icon="log-in-outline" label="Sign In" loading={loading} onPress={handleSignIn} />
          <Text style={[styles.footerText, { color: palette.secondaryText }]}>
            Don't have an account?{' '}
            <Text style={[styles.inlineLink, { color: palette.primary }]} onPress={() => navigation.navigate('Register')}>
              Register
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    marginBottom: 16,
    width: 52,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 6,
  },
  form: {
    gap: 14,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: -2,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    gap: 16,
    marginTop: 28,
  },
  errorBox: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
  },
  inlineLink: {
    fontWeight: '700',
  },
});
