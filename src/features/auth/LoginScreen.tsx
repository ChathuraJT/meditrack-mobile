import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from './AuthProvider';
import { loginSchema, parseIdentifier, authErrorMessage } from './model';
import {
  AuthScreen,
  Feedback,
  FormField,
  TextAction,
  formStyles,
  useSubmission,
} from './components';
export function LoginScreen() {
  const { available, setPendingPhone, setDraft } = useAuth();
  const [message, setMessage] = useState('');
  const { busy, run } = useSubmission();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });
  const submit = form.handleSubmit((values) =>
    run(async () => {
      if (!supabase) return;
      setMessage('');
      const identifier = parseIdentifier(values.identifier);
      if (!identifier) return;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          ...identifier,
          password: values.password,
        });
        if (error) throw error;
        if (!data.session) throw new Error('No session');
        // Stack.Protected removes login history as the session changes.
      } catch (error) {
        setMessage(authErrorMessage(error, 'login'));
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
        <FormField
          control={form.control}
          name="identifier"
          label="Email or mobile number"
          keyboardType="default"
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => form.setFocus('password')}
        />
        <AppText variant="caption" muted>
          Phone numbers default to Sri Lanka (+94). For another country, include
          + and the country code.
        </AppText>
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
        <Feedback message={message} />
        <AppButton
          label="Sign In"
          loading={busy}
          disabled={!available}
          onPress={submit}
        />
        <TextAction
          label="Verify a pending phone registration"
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
