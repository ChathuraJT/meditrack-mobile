import { Text, useColorScheme, type TextProps } from 'react-native';
import { colors, typography } from '@/theme/tokens';
import { useContext } from 'react';
import { CareCardTextContext } from './CareCard';

type Props = TextProps & { variant?: keyof typeof typography; muted?: boolean };
export function AppText({
  variant = 'body',
  muted = false,
  style,
  ...props
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const card = useContext(CareCardTextContext);
  const defaultColor = muted
    ? isDark
      ? '#94A3B8'
      : colors.secondary
    : isDark
      ? '#FFFFFF'
      : colors.text;

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
