import { MedicalPatternBackground } from '@/components/MedicalPatternBackground';
import { colors, spacing } from '@/theme/tokens';
import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = PropsWithChildren<{
  withPattern?: boolean;
  patternDensity?: 'sparse' | 'balanced' | 'dense';
  patternOpacity?: number;
  edges?: readonly ('top' | 'left' | 'right' | 'bottom')[];
}>;

export function Screen({
  children,
  withPattern = false,
  patternDensity = 'sparse',
  patternOpacity = 0.06,
  edges = ['left', 'right'],
}: ScreenProps) {
  const content = (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: '#F8FAFC' },
      ]}
      edges={edges}
    >
      <KeyboardAvoidingView
        style={[styles.safe, { backgroundColor: 'transparent' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (withPattern) {
    return (
      <MedicalPatternBackground
        density={patternDensity}
        opacity={patternOpacity}
        backgroundColor="#F8FAFC"
      >
        {content}
      </MedicalPatternBackground>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: spacing.md,
  },
});


