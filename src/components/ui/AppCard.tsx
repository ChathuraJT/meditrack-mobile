import type { ComponentProps } from 'react';
import CareCard from './CareCard';

// Keep existing AppCard callers on the same reusable surface as care screens.
export function AppCard(props: ComponentProps<typeof CareCard>) {
  return <CareCard {...props} />;
}
