import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import { AppIcon } from '../components/DesignSystem';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import type { ScreenProps } from '../types';

export default function RegisterScreen({ navigation }: ScreenProps<'Register'>) {
  const { registerAccount } = useAuth();
  const { palette } = useThemeContext();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setFormError('Please complete all registration fields.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Password and confirm password must match.');
      return;
    }

    if (password.length < 6) {
      setFormError('Use at least 6 characters for your password.');
      return;
    }

    try {
      setFormError('');
      setLoading(true);
      await registerAccount({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create your account.';
      setFormError(message);
      Alert.alert('Registration Failed', message);
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
            <AppIcon name="person-add-outline" size={24} color={palette.teal} />
          </View>
          <Text style={[styles.title, { color: palette.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: palette.secondaryText }]}>
            Fill in your details to get started
          </Text>
        </View>

        <View style={styles.form}>
          <AppInput icon="person-outline" onChangeText={setFullName} placeholder="Full Name" value={fullName} />
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
          <AppInput
            autoCapitalize="none"
            icon="lock-closed-outline"
            onChangeText={setConfirmPassword}
            placeholder="Confirm Password"
            rightIcon="eye-off-outline"
            secureTextEntry
            value={confirmPassword}
          />
        </View>

        {formError ? (
          <View style={[styles.errorBox, { backgroundColor: '#FFECEC', borderColor: '#FCA5A5' }]}>
            <Text style={[styles.errorText, { color: palette.danger }]}>{formError}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <AppButton icon="arrow-forward-outline" label="Register" loading={loading} onPress={handleRegister} />
          <Text style={[styles.footerText, { color: palette.secondaryText }]}>
            Already have an account?{' '}
            <Text style={[styles.inlineLink, { color: palette.primary }]} onPress={() => navigation.navigate('SignIn')}>
              Sign In
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
