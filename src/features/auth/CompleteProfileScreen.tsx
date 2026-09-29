import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { queryClient } from '@/lib/query-client';
import { useAuth } from './AuthProvider';
import { profileSchema, genders, type ProfileValues } from './model';
import { createProfile } from './profile';
import { AuthScreen, Feedback, FormField, useSubmission } from './components';
import { SelectField } from './SelectField';
import { SignOutButton } from './SignOutButton';
export function CompleteProfileScreen() {
  const { session } = useAuth();
  const { busy, run } = useSubmission();
  const [message, setMessage] = useState('');
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      age: '',
      gender: '' as ProfileValues['gender'],
    },
  });
  return (
    <AuthScreen
      title="Complete your profile"
      description="Your phone account is ready. Add the remaining patient details."
    >
      <FormField
        control={form.control}
        name="full_name"
        label="Full name"
        autoComplete="name"
        autoCapitalize="words"
      />
      <FormField
        control={form.control}
        name="age"
        label="Age at registration"
        keyboardType="number-pad"
        maxLength={3}
      />
      <SelectField
        control={form.control}
        name="gender"
        label="Gender"
        options={genders.map((g) => ({ value: g, label: g }))}
      />
      <AppText variant="caption" muted>
        Age is recorded as a reported value with a timestamp. This prototype
        range is not an eligibility or consent policy.
      </AppText>
      <Feedback message={message} />
      <AppButton
        label="Save profile"
        loading={busy}
        onPress={form.handleSubmit((values) =>
          run(async () => {
            setMessage('');
            try {
              const profile = await createProfile(values);
              queryClient.setQueryData(
                ['patient-profile', session!.user.id],
                profile,
              );
            } catch {
              setMessage(
                'Could not save your profile. Check your connection or contact the team if setup is still pending. Your phone account remains valid.',
              );
            }
          }),
        )}
      />
      <SignOutButton disabled={busy} />
    </AuthScreen>
  );
}
