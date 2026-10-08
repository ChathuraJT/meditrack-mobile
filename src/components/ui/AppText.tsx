import { useTheme } from '@/theme/ThemeProvider';
import { Text, type TextProps } from 'react-native';
import { typography } from '@/theme/tokens';

type Props = TextProps & { variant?: keyof typeof typography; muted?: boolean };
export function AppText({
  variant = 'body',
  muted = false,
  style,
  ...props
}: Props) {
  const { colors } = useTheme();
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
