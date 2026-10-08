import { Pressable, View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { radius, spacing } from './tokens';
import { useTheme } from './ThemeProvider';

export function AppearanceSetting() {
  const { mode, colors, setMode, ready, saving, error } = useTheme();
  return (
    <AppCard>
      <AppText variant="heading">Appearance</AppText>
      <AppText muted>Choose how MediTrack looks on this device.</AppText>
      <View style={styles.options}>
        {(['light', 'dark'] as const).map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={`${option === 'light' ? 'Light' : 'Dark'} mode`}
            accessibilityState={{
              checked: mode === option,
              disabled: !ready || saving,
            }}
            disabled={!ready || saving}
            onPress={() => {
              void setMode(option);
            }}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor:
                  mode === option ? colors.background : colors.surface,
                borderColor: mode === option ? colors.primary : colors.border,
                opacity: pressed || saving ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons
              name={option === 'light' ? 'sunny-outline' : 'moon-outline'}
              size={24}
              color={colors.primary}
              accessible={false}
            />
            <AppText>{option === 'light' ? 'Light' : 'Dark'}</AppText>
            <Ionicons
              name={mode === option ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={mode === option ? colors.primary : colors.secondary}
              accessible={false}
            />
          </Pressable>
        ))}
      </View>
      {error && (
        <AppText accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </AppText>
      )}
    </AppCard>
  );
}
const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: 64,
    padding: spacing.md,
    borderWidth: 2,
    borderRadius: radius.sm,
    alignItems: 'center',
    gap: spacing.sm,
  },
});
