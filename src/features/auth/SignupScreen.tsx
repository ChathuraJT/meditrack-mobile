import { useState } from 'react';
import { View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import type { CountryCode } from 'libphonenumber-js';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import {
  signupSchema,
  genders,
  normalizePhone,
  authErrorMessage,
  type SignupValues,
} from './model';
import { SelectField, countryOptions } from './SelectField';
import {
  AuthScreen,
  FormField,
  Feedback,
  TextAction,
  formStyles,
  useSubmission,
} from './components';
export function SignupScreen() {
  const { draft, setDraft, setPendingPhone, setSmsSentAt, available } =
    useAuth();
  const [message, setMessage] = useState('');
  const { busy, run } = useSubmission();
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { ...draft, password: '', confirmPassword: '' },
  });
  const submit = form.handleSubmit((values) =>
    run(async () => {
      if (!supabase) return;
      setMessage('');
      const {
        password,
        confirmPassword: _confirmPassword,
        ...nonSecret
      } = values;
      setDraft(nonSecret);
      const phone = normalizePhone(
        values.phone,
        values.country as CountryCode,
      )!;
      setPendingPhone(phone);
      try {
        const { data, error } = await supabase.auth.signUp({
          phone,
          password,
          options: {
            channel: 'sms',
            data: {
              full_name: values.full_name,
              age_at_registration: Number(values.age),
              gender: values.gender,
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSmsSentAt(Date.now());
          router.replace('/verify-phone');
        }
      } catch (error) {
        setMessage(authErrorMessage(error, 'signup'));
      } finally {
        form.setValue('password', '');
        form.setValue('confirmPassword', '');
      }
    }),
  );
  return (
    <AuthScreen
      title="Create your account"
      description="Start your MediTrack journey."
    >
      <View style={formStyles.stack}>
        <FormField
          control={form.control}
          name="full_name"
          label="Full name"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
        <FormField
          control={form.control}
          name="age"
          label="Age"
          keyboardType="number-pad"
          maxLength={3}
        />
        <SelectField
          control={form.control}
          name="gender"
          label="Gender"
          options={genders.map((g) => ({ value: g, label: g }))}
        />
        <FormField
          control={form.control}
          name="email"
          label="Email (optional)"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <View style={formStyles.stack}>
          <SelectField
            control={form.control}
            name="country"
            label="Mobile country"
            options={countryOptions}
          />
          <FormField
            control={form.control}
            name="phone"
            label="Mobile number"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />
        </View>
        <FormField
          control={form.control}
          name="password"
          label="Create password"
          password
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          label="Confirm password"
          password
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <AppText variant="caption" muted>
          Use at least 8 characters. Your account may require a stronger
          password. We’ll verify your mobile first; email can be verified later.
        </AppText>
        <Feedback message={message} />
        <AppButton
          label="Create Account"
          loading={busy}
          disabled={!available}
          onPress={submit}
        />
        <TextAction
          label="Already have an account? Sign In"
          disabled={busy}
          onPress={() => {
            form.setValue('password', '');
            form.setValue('confirmPassword', '');
            router.replace('/login');
          }}
        />
      </View>
    </AuthScreen>
  );
}
