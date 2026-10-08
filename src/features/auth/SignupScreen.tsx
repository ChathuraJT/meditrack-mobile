import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { enrollmentClient } from '@/lib/supabase';
import { registerAccount } from './supabase-auth';
import { useAuth } from './AuthProvider';
import {
  signupSchema,
  emptySignup,
  signupPayload,
  signupOutcome,
  authErrorMessage,
  type SignupValues,
} from './model';
import { SelectField } from './SelectField';
import {
  AuthScreen,
  FormField,
  Feedback,
  TextAction,
  formStyles,
  useSubmission,
} from './components';
export function SignupScreen() {
  const { available } = useAuth();
  const [message, setMessage] = useState('');
  const [completed, setCompleted] = useState(false);
  const { busy, run } = useSubmission();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: emptySignup,
  });
  const role = useWatch({ control: form.control, name: 'role' });
  const submit = () =>
    form.handleSubmit((values) =>
      run(async () => {
        if (!available || completed) return;
        setMessage('');
        try {
          if (!enrollmentClient) return;
          const result = await registerAccount(
            enrollmentClient,
            signupPayload(values),
          );
          if (!mounted.current) return;
          const outcome = signupOutcome(values.role, result.needsConfirmation);
          setMessage(outcome.message);
          setCompleted(true);
          if (outcome.redirect)
            timer.current = setTimeout(() => router.replace('/login'), 2000);
        } catch (error) {
          if (mounted.current) setMessage(authErrorMessage(error));
        } finally {
          form.setValue('password', '');
          form.setValue('confirmPassword', '');
        }
      }),
    )();
  return (
    <AuthScreen
      title="Create your account"
      description="Start your MediTrack journey."
    >
      <View style={formStyles.stack}>
        {!completed && (
          <>
            <SelectField
              control={form.control}
              name="role"
              label="Account type"
              options={[
                { value: 'patient', label: 'Patient' },
                { value: 'doctor', label: 'Doctor' },
                { value: 'lab', label: 'Laboratory' },
              ]}
            />
            <FormField
              control={form.control}
              name="username"
              label="Username"
              maxLength={150}
              autoComplete="username"
            />
            <FormField
              control={form.control}
              name="email"
              label="Email"
              keyboardType="email-address"
              autoComplete="email"
              maxLength={254}
            />
            <FormField
              control={form.control}
              name="phone"
              label="Mobile number"
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={15}
            />
            <FormField
              control={form.control}
              name="birthday"
              label="Birthday (YYYY-MM-DD)"
              placeholder="1998-05-20"
              maxLength={10}
            />
            <FormField
              control={form.control}
              name="NIC_number"
              label="NIC number"
              maxLength={12}
            />
            {role === 'doctor' && (
              <>
                <FormField
                  control={form.control}
                  name="degrees"
                  label="Degrees (optional)"
                  maxLength={100}
                />
                <FormField
                  control={form.control}
                  name="university"
                  label="University (optional)"
                  maxLength={100}
                />
                <AppText variant="caption" muted>
                  Enter your university name.
                </AppText>
                <FormField
                  control={form.control}
                  name="working_hospital"
                  label="Working hospital (optional)"
                  maxLength={150}
                />
              </>
            )}
            {role === 'lab' && (
              <>
                <FormField
                  control={form.control}
                  name="lab_name"
                  label="Laboratory name"
                  maxLength={150}
                />
                <FormField
                  control={form.control}
                  name="lab_address"
                  label="Laboratory address"
                  maxLength={255}
                />
                <FormField
                  control={form.control}
                  name="license_id"
                  label="License ID"
                  maxLength={50}
                />
              </>
            )}
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
            {role !== 'patient' && (
              <AppText variant="caption" muted>
                Doctor and laboratory dashboards are available in the web
                application.
              </AppText>
            )}
            <AppButton
              label="Create Account"
              loading={busy}
              disabled={!available}
              onPress={submit}
            />
          </>
        )}
        <Feedback message={message} />
        {completed && (
          <TextAction
            label="Confirm email"
            onPress={() => router.push('/account-help')}
          />
        )}
        <TextAction
          label="Already have an account? Sign In"
          disabled={busy}
          onPress={() => {
            if (timer.current) clearTimeout(timer.current);
            form.reset();
            router.replace('/login');
          }}
        />
      </View>
    </AuthScreen>
  );
}
