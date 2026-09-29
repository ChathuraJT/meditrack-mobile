import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
export function RecoveryScreen() {
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Recovery
      </AppText>
      <AppText muted>Room to reflect on your care journey.</AppText>
      <EmptyState
        icon="heart-outline"
        title="Recovery starts with understanding"
        description="Future versions will bring recovery check-ins and progress tracking into one place. No health measurements or recovery assessments are collected in this preview."
      />
    </Screen>
  );
}
