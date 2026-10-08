import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { useAuth } from './AuthProvider';
import { loginSchema, authErrorMessage } from './model';
import {
  AuthScreen,
  Feedback,
  FormField,
  TextAction,
  formStyles,
  useSubmission,
} from './components';
export function LoginScreen() {
  const { available, signIn } = useAuth();
  const [message, setMessage] = useState('');
  const { busy, run } = useSubmission();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });
  const submit = form.handleSubmit((values) =>
    run(async () => {
      if (!available) return;
      setMessage('');
      try {
        await signIn(values.identifier, values.password);
      } catch (error) {
        setMessage(authErrorMessage(error));
      } finally {
        form.setValue('password', '');
      }
    }),
  );
  return (
    <AuthScreen
      title="Welcome back"
      description="Sign in to continue your care journey."
    >
      <View style={formStyles.stack}>
        <FormField
          control={form.control}
          name="identifier"
          label="Email"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
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
        <Feedback message={message} />
        <TextAction
          label="Confirm email or reset password"
          disabled={busy}
          onPress={() => router.push('/account-help')}
        />
        <AppButton
          label="Sign In"
          loading={busy}
          disabled={!available}
          onPress={submit}
        />
        <TextAction
          label="Don't have an account? Sign Up"
          disabled={busy}
          onPress={() => {
            form.setValue('password', '');
            router.push('/signup');
          }}
        />
        <TextAction
          label="View introduction"
          disabled={busy}
          onPress={() => {
            form.setValue('password', '');
            router.push('/introduction');
          }}
        />
      </View>
    </AuthScreen>
  );
}
