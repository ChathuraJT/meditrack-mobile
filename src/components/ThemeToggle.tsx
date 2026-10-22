import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppearance } from '@/theme/ThemeProvider';
import { useThemeColors } from '@/theme/tokens';

export function ThemeToggle() {
  const { mode, ready, saving, toggle } = useAppearance();
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
      accessibilityState={{ disabled: !ready || saving }}
      disabled={!ready || saving}
      hitSlop={6}
      onPress={() => void toggle()}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed || saving ? 0.6 : 1,
      })}
    >
      <Ionicons
        name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
        size={18}
        color={colors.primary}
      />
    </Pressable>
  );
}
