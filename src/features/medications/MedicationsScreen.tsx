import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
export function MedicationsScreen() {
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Medications
      </AppText>
      <AppText muted>A place for clearer medication routines.</AppText>
      <EmptyState
        icon="medical-outline"
        title="Your medication space is taking shape"
        description="Future versions will support doctor-approved prescriptions and medication adherence. Medication lists and reminders are not available yet."
      />
    </Screen>
  );
}
