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
import { Alert, Pressable, StyleSheet, View } from 'react-native';
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
        const data = await apiFetch('/mobile/auth/login/', {
          method: 'POST',
          body: JSON.stringify({
            username: values.identifier.trim(),
            password: values.password,
          }),
        });

        if (!data || !data.access_token || !data.user) {
          throw new Error('Invalid response from server');
        }

        await signIn(data);
        // Stack.Protected removes login history as the session changes.
      } catch (error: any) {
        if (error.status === 400) {
          setMessage(error.data?.error || 'Validation error. Please check your inputs.');
        } else if (error.status === 401) {
          setMessage('Invalid username or password.');
        } else if (error.status === 403) {
          setMessage('Your account is pending administrator approval.');
        } else if (error.status === 429) {
          setMessage('Too many attempts. Wait before trying again.');
        } else if (error.status === 408 || error.status === 0) {
          setMessage('Unable to reach the service. Check your connection and try again.');
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
              <AppText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
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
              <View style={styles.dividerLine} />
              <AppText variant="caption" muted style={styles.dividerText}>
                or continue with
              </AppText>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in with Google"
                onPress={() => handleSocialLogin('Google')}
                style={({ pressed }) => [
                  styles.socialCircleButton,
                  pressed && styles.socialCircleButtonPressed,
                ]}
              >
                <Ionicons name="logo-google" size={28} color={colors.primary} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in with Facebook"
                onPress={() => handleSocialLogin('Facebook')}
                style={({ pressed }) => [
                  styles.socialCircleButton,
                  pressed && styles.socialCircleButtonPressed,
                ]}
              >
                <Ionicons name="logo-facebook" size={30} color={colors.primary} />
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
