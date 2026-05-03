import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import type { ScreenProps } from '../types';

export default function SignInScreen({ navigation }: ScreenProps<'SignIn'>) {
  const { signIn } = useAuth();
  const { palette } = useThemeContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      await signIn(email, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in.';
      Alert.alert('Sign In Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: palette.secondaryText }]}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
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
          <TouchableOpacity style={styles.forgotWrap}>
            <Text style={[styles.forgotText, { color: palette.primary }]}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <AppButton label="Sign In" loading={loading} onPress={handleSignIn} />
          <Text style={[styles.footerText, { color: palette.secondaryText }]}>
            Don't have an account?{' '}
            <Text style={[styles.inlineLink, { color: palette.primary }]} onPress={() => navigation.navigate('Register')}>
              Register
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
  footerText: {
    fontSize: 14,
    textAlign: 'center',
  },
  inlineLink: {
    fontWeight: '700',
  },
});
