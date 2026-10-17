import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { apiFetch } from '@/lib/api';
import { colors, radius, spacing } from '@/theme/tokens';
import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { useAuth } from './AuthProvider';
import {
  AuthScreen,
  Feedback,
  FormField,
  TextAction,
  formStyles,
  useSubmission,
} from './components';
import { loginSchema, parseIdentifier } from './model';

export function LoginScreen() {
  const isDark = useColorScheme() === 'dark';
  const primaryColor = isDark ? '#38BDF8' : colors.primary;
  const dividerLineColor = isDark ? '#1C4A75' : colors.border;
  const dividerTextColor = isDark ? '#94A3B8' : colors.secondary;

  const { available, signIn, setPendingPhone, setDraft } = useAuth();
  const [message, setMessage] = useState('');
  const { busy, run } = useSubmission();


  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const submit = form.handleSubmit((values) =>
    run(async () => {
      setMessage('');
      try {
        const data = await apiFetch('/login/', {
          method: 'POST',
          body: JSON.stringify({
            username: values.identifier.trim(),
            password: values.password,
          }),
        });

        if (!data?.id) {
          throw new Error('Invalid response from server');
        }

        await signIn();
        // Stack.Protected removes login history as the session changes.
      } catch (error: any) {
        if (error.status === 400) {
          setMessage(error.data?.error || 'Validation error. Please check your inputs.');
        } else if (error.status === 401) {
          setMessage('Invalid username or password.');
        } else if (error.status === 403) {
          setMessage(error.data?.error || 'The session could not be verified. Reload the app and try again.');
        } else if (error.status === 429) {
          setMessage('Too many attempts. Wait before trying again.');
        } else if (error.status === 408 || error.status === 0) {
          setMessage('Unable to reach the service. Check your connection and try again.');
        } else if (error.status >= 500) {
          setMessage('The server could not complete login. Please try again shortly.');
        } else if (error.status === 404) {
          setMessage('The login service was not found. Check the configured backend address.');
        } else {
          setMessage('Unable to sign in. The request could not be completed.');
        }
      } finally {
        form.setValue('password', '');
      }
    }),
  );

  function verifyExisting() {
    const identifier = parseIdentifier(form.getValues('identifier'));
    if (!identifier || !('phone' in identifier)) {
      form.setError(
        'identifier',
        { message: 'Enter your registered mobile number to verify it.' },
        { shouldFocus: true },
      );
      return;
    }
    form.setValue('password', '');
    setDraft({
      full_name: '',
      age: '',
      gender: '' as 'Female',
      email: '',
      country: 'LK',
      phone: identifier.phone,
    });
    setPendingPhone(identifier.phone);
    router.push('/verify-phone');
  }

  function handleSocialLogin(provider: 'Google' | 'Facebook') {
    Alert.alert(
      `${provider} Sign-In`,
      `${provider} authentication will be supported in an upcoming update.`,
      [{ text: 'OK' }],
    );
  }

  return (
    <AuthScreen
      title="Welcome back"
      description="Sign in to continue your care journey."
    >
      <View style={formStyles.stack}>
        <AppCard>
          <View style={formStyles.stack}>
            <FormField
              control={form.control}
              name="identifier"
              label="Username or email"
              keyboardType="default"
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => form.setFocus('password')}
            />
            <FormField
              control={form.control}
              name="password"
              label="Password"
              password
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Forgot password?"
              onPress={() => router.push('/forgot-password')}
              style={styles.forgotPassword}
            >
              <AppText variant="caption" style={{ color: primaryColor, fontWeight: '600' }}>
                Forgot password?
              </AppText>
            </Pressable>
            <Feedback message={message} />
            <AppButton
              label="Sign In"
              loading={busy}
              disabled={!available}
              onPress={submit}
            />

            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: dividerLineColor }]} />
              <AppText variant="caption" muted style={[styles.dividerText, { color: dividerTextColor }]}>
                or continue with
              </AppText>
              <View style={[styles.dividerLine, { backgroundColor: dividerLineColor }]} />
            </View>

            <View style={styles.socialRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in with Google"
                onPress={() => handleSocialLogin('Google')}
                style={({ pressed }) => [
                  styles.socialCircleButton,
                  { borderColor: primaryColor },
                  pressed && [
                    styles.socialCircleButtonPressed,
                    { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(20, 93, 160, 0.08)' }
                  ],
                ]}
              >
                <Ionicons name="logo-google" size={28} color={primaryColor} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in with Facebook"
                onPress={() => handleSocialLogin('Facebook')}
                style={({ pressed }) => [
                  styles.socialCircleButton,
                  { borderColor: primaryColor },
                  pressed && [
                    styles.socialCircleButtonPressed,
                    { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(20, 93, 160, 0.08)' }
                  ],
                ]}
              >
                <Ionicons name="logo-facebook" size={30} color={primaryColor} />
              </Pressable>
            </View>
          </View>
        </AppCard>

        <TextAction
          label="Don’t have an account? Sign Up"
          onPress={() => {
            form.setValue('password', '');
            router.push('/signup');
          }}
          disabled={busy}
        />
        <TextAction
          label="View introduction"
          onPress={() => {
            form.setValue('password', '');
            router.push('/introduction');
          }}
          disabled={busy}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgotPassword: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: spacing.xs,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xs,
  },
  socialCircleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialCircleButtonPressed: {
    opacity: 0.7,
    backgroundColor: 'rgba(20, 93, 160, 0.08)',
  },
});
