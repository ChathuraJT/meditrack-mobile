import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { SignOutButton } from '@/features/auth/SignOutButton';

export function MoreScreen() {
  const { session } = useAuth();

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        More
      </AppText>
      <AppCard>
        <AppText variant="heading">Your account</AppText>
        <AppText>Username: {session?.user.username}</AppText>
        <AppText muted>Email: {session?.user.email || 'None'}</AppText>
        <AppText muted>Role: {session?.user.role}</AppText>
        {session?.user.doctorID && <AppText muted>Doctor ID: {session?.user.doctorID}</AppText>}
        {session?.user.lab_name && <AppText muted>Lab Name: {session?.user.lab_name}</AppText>}
        {session?.user.license_id && <AppText muted>License ID: {session?.user.license_id}</AppText>}
        {session?.user.lab_address && <AppText muted>Lab Address: {session?.user.lab_address}</AppText>}
      </AppCard>
      <AppCard>
        <AppText variant="heading">Built for healthcare research</AppText>
        <AppText muted>
          Symptom intelligence, doctor matching, doctor-approved prescription
          support, adherence, recovery, disease intelligence, and laboratory
          workflows are planned for later phases.
        </AppText>
      </AppCard>
      <SignOutButton />
    </Screen>
  );
}
