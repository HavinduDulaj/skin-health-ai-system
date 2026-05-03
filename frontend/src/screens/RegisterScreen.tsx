import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
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

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing Fields', 'Please complete all registration fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Password and confirm password must match.');
      return;
    }

    try {
      setLoading(true);
      await registerAccount({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: palette.secondaryText }]}>
            Fill in your details to get started
          </Text>
        </View>

        <View style={styles.form}>
          <AppInput icon="U" onChangeText={setFullName} placeholder="Full Name" value={fullName} />
          <AppInput
            autoCapitalize="none"
            icon="@"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            value={email}
          />
          <AppInput
            autoCapitalize="none"
            icon="*"
            onChangeText={setPassword}
            placeholder="Password"
            rightIcon="o"
            secureTextEntry
            value={password}
          />
          <AppInput
            autoCapitalize="none"
            icon="*"
            onChangeText={setConfirmPassword}
            placeholder="Confirm Password"
            rightIcon="o"
            secureTextEntry
            value={confirmPassword}
          />
        </View>

        <View style={styles.footer}>
          <AppButton label="Register" loading={loading} onPress={handleRegister} />
          <Text style={[styles.footerText, { color: palette.secondaryText }]}>
            Already have an account?{' '}
            <Text style={[styles.inlineLink, { color: palette.primary }]} onPress={() => navigation.navigate('SignIn')}>
              Sign In
            </Text>
          </Text>
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
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
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
  footerText: {
    fontSize: 14,
    textAlign: 'center',
  },
  inlineLink: {
    fontWeight: '700',
  },
});
