import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
export function MedicationsScreen() {
  return (
    <Screen>
      <AppText muted style={{ textAlign: 'center' }}>A place for clearer medication routines.</AppText>
      <EmptyState
        icon="medical-outline"
        title="Your medication space is taking shape"
        description="Future versions will support doctor-approved prescriptions and medication adherence. Medication lists and reminders are not available yet."
      />
    </Screen>
  );
}
