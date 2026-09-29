import { Text, type TextProps } from 'react-native';
import { colors, typography } from '@/theme/tokens';

type Props = TextProps & { variant?: keyof typeof typography; muted?: boolean };
export function AppText({
  variant = 'body',
  muted = false,
  style,
  ...props
}: Props) {
  return (
    <Text
      {...props}
      style={[
        typography[variant],
        { color: muted ? colors.secondary : colors.text },
        style,
      ]}
    />
  );
}
