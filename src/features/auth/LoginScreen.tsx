import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { View, Pressable, StyleSheet } from 'react-native';
import { apiFetch } from '@/lib/api';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from './AuthProvider';
import { loginSchema, parseIdentifier } from './model';
import { AppCard } from '@/components/ui/AppCard';
import { colors, spacing } from '@/theme/tokens';
import {
  AuthScreen,
  Feedback,
  FormField,
  TextAction,
  formStyles,
  useSubmission,
} from './components';

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
          </View>
        </AppCard>
        <TextAction
          label="Verify a pending phone registration (Unsupported)"
          onPress={verifyExisting}
          disabled={busy}
        />
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
});
