import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { SignOutButton } from '@/features/auth/SignOutButton';
import { AppButton } from '@/components/ui/AppButton';
import { router } from 'expo-router';
import { useAppearance } from '@/theme/ThemeProvider';

export function MoreScreen() {
  const appearance = useAppearance();
  const { session } = useAuth();

  return (
    <Screen withPattern>
      <AppText
        variant="title"
        accessibilityRole="header"
        style={{ textAlign: 'center' }}
      >
        Profile
      </AppText>
      <AppCard>
        <AppText variant="heading" style={{ textAlign: 'center' }}>
          Your account
        </AppText>
        <AppText style={{ textAlign: 'center' }}>
          Username: {session?.user.username}
        </AppText>
        <AppText muted style={{ textAlign: 'center' }}>
          Email: {session?.user.email || 'None'}
        </AppText>
        <AppText muted style={{ textAlign: 'center' }}>
          Role: {session?.user.role}
        </AppText>
        {session?.user.doctorID && (
          <AppText muted style={{ textAlign: 'center' }}>
            Doctor ID: {session?.user.doctorID}
          </AppText>
        )}
        {session?.user.lab_name && (
          <AppText muted style={{ textAlign: 'center' }}>
            Lab Name: {session?.user.lab_name}
          </AppText>
        )}
        {session?.user.license_id && (
          <AppText muted style={{ textAlign: 'center' }}>
            License ID: {session?.user.license_id}
          </AppText>
        )}
        {session?.user.lab_address && (
          <AppText muted style={{ textAlign: 'center' }}>
            Lab Address: {session?.user.lab_address}
          </AppText>
        )}
      </AppCard>
      <AppCard>
        <AppText variant="heading" style={{ textAlign: 'center' }}>
          Built for healthcare research
        </AppText>
        <AppText muted style={{ textAlign: 'center' }}>
          Symptom intelligence, doctor matching, doctor-approved prescription
          support, adherence, recovery, disease intelligence, and laboratory
          workflows are planned for later phases.
        </AppText>
      </AppCard>
      <SignOutButton />
      <AppCard>
        <AppText variant="heading">Appearance</AppText>
        <AppText muted>
          Current mode: {appearance.mode}. Your choice is saved on this device.
        </AppText>
        <AppButton
          label={`Switch to ${appearance.mode === 'dark' ? 'light' : 'dark'} mode`}
          disabled={!appearance.ready}
          loading={appearance.saving}
          onPress={() => void appearance.toggle()}
        />
        {appearance.error && (
          <AppText accessibilityRole="alert">{appearance.error}</AppText>
        )}
      </AppCard>
      <AppButton
        label="Location & privacy"
        onPress={() => router.push('/tracking')}
      />
      <AppButton
        label="Nearby BLE devices"
        onPress={() => router.push('/nearby-devices')}
      />
    </Screen>
  );
}
