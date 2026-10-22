import { Text, type TextProps } from 'react-native';
import { typography, useThemeColors } from '@/theme/tokens';
import { useContext } from 'react';
import { CareCardTextContext } from './CareCard';

type Props = TextProps & { variant?: keyof typeof typography; muted?: boolean };
export function AppText({
  variant = 'body',
  muted = false,
  style,
  ...props
}: Props) {
  const colors = useThemeColors();
  const card = useContext(CareCardTextContext);
  const defaultColor = muted ? colors.secondary : colors.text;

  return (
    <Text
      {...props}
      style={[
        typography[variant],
        {
          color: card ? (muted ? card.supporting : card.heading) : defaultColor,
        },
        style,
      ]}
    />
  );
}
