import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { AppCard } from './AppCard';
import { AppText } from './AppText';
import { colors } from '@/theme/tokens';
type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
};
export function EmptyState({ icon, title, description }: Props) {
  return (
    <AppCard>
      <Ionicons
        name={icon}
        size={36}
        color={colors.primary}
        accessible={false}
      />
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      <AppText muted>{description}</AppText>
      <AppText variant="caption" muted>
        Planned for a future phase · No patient data
      </AppText>
    </AppCard>
  );
}
