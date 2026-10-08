import { useState } from 'react';
import { View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from './AuthProvider';
import {
  signupSchema,
  genders,
  type SignupValues,
} from './model';
import { SelectField, countryOptions } from './SelectField';
import { AppCard } from '@/components/ui/AppCard';
import {
  AuthScreen,
  FormField,
  Feedback,
  TextAction,
  formStyles,
  useSubmission,
} from './components';

export function SignupScreen() {
  const { draft, setDraft, available } = useAuth();
  const [message, setMessage] = useState('');
  const { busy, run } = useSubmission();

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { ...draft, password: '', confirmPassword: '' },
  });

  const submit = form.handleSubmit((values) =>
    run(async () => {
      setMessage('');
      const { password, confirmPassword: _confirmPassword, ...nonSecret } = values;
      setDraft(nonSecret);
      
      // Simulate network request delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setMessage('Registration integration is pending. Please sign in with an existing approved account for now.');
      form.setValue('password', '');
      form.setValue('confirmPassword', '');
    }),
  );

  return (
    <AuthScreen
      title="Create your account"
      description="Start your MediTrack journey."
    >
      <View style={formStyles.stack}>
        <AppCard>
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
            <Feedback message={message} />
            <AppButton
              label="Create Account"
              loading={busy}
              disabled={!available}
              onPress={submit}
            />
          </View>
        </AppCard>
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
