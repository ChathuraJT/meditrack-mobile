import { MedicalPatternBackground } from '@/components/MedicalPatternBackground';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, spacing } from '@/theme/tokens';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingArtwork, type Scene } from './OnboardingArtwork';
import { useOnboardingMotion } from './useOnboardingMotion';

const slides: {
  title: string;
  description: string;
  scene: Scene;
  label: string;
}[] = [
    {
      title: 'Smarter healthcare starts here',
      description:
        'Record your symptoms and connect with suitable doctors for your next step.',
      scene: 'consultation',
      label: 'CARE THAT STARTS WITH YOU',
    },
    {
      title: 'Stay on track with your recovery',
      description:
        'Keep track of prescribed medicines, record your progress, and share recovery updates.',
      scene: 'recovery',
      label: 'SMALL STEPS, STEADY SUPPORT',
    },
    {
      title: 'Stay informed. Stay in control.',
      description:
        'Choose whether to enable nearby exposure alerts and explore privacy-aware area risk information.',
      scene: 'privacy',
      label: 'YOUR CHOICES COME FIRST',
    },
  ];
export function OnboardingScreen({ onComplete }: { onComplete?: () => void }) {
  const { width: windowWidth } = useWindowDimensions();
  const [width, setWidth] = useState(windowWidth);
  const pager = useRef<ScrollView>(null);
  const [scrollX] = useState(() => new Animated.Value(0));
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const finishing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { completeOnboarding } = useAuth();
  const { reduceMotion, animate } = useOnboardingMotion();
  useEffect(() => {
    pager.current?.scrollTo({ x: indexRef.current * width, animated: false });
    scrollX.setValue(indexRef.current * width);
  }, [width, scrollX]);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  function trackPage(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.max(
      0,
      Math.min(2, Math.round(event.nativeEvent.contentOffset.x / width)),
    );
    setIndex(page);
  }
  function goTo(page: number) {
    const next = Math.max(0, Math.min(2, page));
    pager.current?.scrollTo({ x: next * width, animated: !reduceMotion });
    if (reduceMotion) {
      scrollX.setValue(next * width);
      indexRef.current = next;
      setIndex(next);
    }
  }
  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    setBusy(true);
    setError('');
    try {
      await completeOnboarding();
      onComplete?.();
    } catch {
      setError('Could not save your preference. Please try again.');
    } finally {
      finishing.current = false;
      setBusy(false);
    }
  }
  return (
    <MedicalPatternBackground density="balanced" opacity={0.35}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          {index > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous onboarding page"
              onPress={() => goTo(index - 1)}
              disabled={busy}
              style={styles.headerAction}
            >
              <Ionicons name="arrow-back" size={23} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={styles.headerAction}>
              <Ionicons
                name="medical-outline"
                size={24}
                color={colors.primary}
                accessible={false}
              />
            </View>
          )}
          <AppText style={styles.brand}>MediTrack</AppText>
          {index < 2 ? (
            <Pressable
              accessibilityRole="button"
              onPress={finish}
              disabled={busy}
              style={styles.headerAction}
            >
              <AppText variant="caption" style={{ color: colors.primary }}>
                Skip
              </AppText>
            </Pressable>
          ) : (
            <View style={styles.headerAction} />
          )}
        </View>
        <Animated.ScrollView
          ref={pager}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.pager}
          scrollEnabled={!busy}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: Platform.OS !== 'web', listener: trackPage },
          )}
          onMomentumScrollEnd={trackPage}
        >
          {slides.map((slide, page) => {
            const inputRange = [
              (page - 1) * width,
              page * width,
              (page + 1) * width,
            ];
            const fade = scrollX.interpolate({
              inputRange,
              outputRange: [0.15, 1, 0.15],
              extrapolate: 'clamp',
            });
            const artworkMotion = reduceMotion
              ? undefined
              : {
                opacity: fade,
                transform: [
                  {
                    translateX: scrollX.interpolate({
                      inputRange,
                      outputRange: [-width * 0.14, 0, width * 0.14],
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    scale: scrollX.interpolate({
                      inputRange,
                      outputRange: [0.9, 1, 0.9],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              };
            const textMotion = reduceMotion
              ? undefined
              : {
                opacity: fade,
                transform: [
                  {
                    translateX: scrollX.interpolate({
                      inputRange,
                      outputRange: [-width * 0.05, 0, width * 0.05],
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    translateY: scrollX.interpolate({
                      inputRange,
                      outputRange: [22, 0, 22],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              };
            return (
              <ScrollView
                key={slide.scene}
                style={{ width }}
                contentContainerStyle={styles.slide}
                showsVerticalScrollIndicator={false}
                accessibilityElementsHidden={page !== index}
                importantForAccessibility={
                  page !== index ? 'no-hide-descendants' : 'auto'
                }
              >
                <Animated.View style={[styles.artwork, artworkMotion]}>
                  <OnboardingArtwork
                    scene={slide.scene}
                    animate={animate && page === index}
                  />
                </Animated.View>
                <Animated.View style={[styles.copy, textMotion]}>
                  <AppText variant="caption" style={styles.eyebrow}>
                    {slide.label}
                  </AppText>
                  <AppText
                    variant="title"
                    accessibilityRole="header"
                    style={styles.title}
                  >
                    {slide.title}
                  </AppText>
                  <AppText muted style={styles.description}>
                    {slide.description}
                  </AppText>
                </Animated.View>
              </ScrollView>
            );
          })}
        </Animated.ScrollView>
        <View style={styles.footer}>
          <View
            style={styles.dots}
            accessibilityLabel={`Page ${index + 1} of 3`}
            accessibilityLiveRegion="polite"
          >
            {slides.map((slide, page) => (
              <Pressable
                key={slide.scene}
                accessibilityRole="button"
                accessibilityLabel={`Go to onboarding page ${page + 1}`}
                accessibilityState={{ selected: index === page }}
                disabled={busy}
                onPress={() => goTo(page)}
                style={styles.dotTarget}
              >
                <View style={styles.dotTrack} />
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      opacity: reduceMotion
                        ? index === page
                          ? 1
                          : 0
                        : scrollX.interpolate({
                          inputRange: [
                            (page - 1) * width,
                            page * width,
                            (page + 1) * width,
                          ],
                          outputRange: [0, 1, 0],
                          extrapolate: 'clamp',
                        }),
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>
          {!!error && (
            <AppText accessibilityRole="alert" style={{ color: colors.error }}>
              {error}
            </AppText>
          )}
          <AppButton
            label={index === 2 ? 'Get Started' : 'Next'}
            loading={busy}
            onPress={() => (index === 2 ? void finish() : goTo(index + 1))}
          />
          <AppText variant="caption" muted style={styles.note}>
            {index === 2
              ? 'Continuing does not grant location or health-data consent.'
              : 'A thoughtful start to your care journey.'}
          </AppText>
        </View>
      </SafeAreaView>
    </MedicalPatternBackground>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    minHeight: 64,
  },
  headerAction: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  pager: { flex: 1 },
  slide: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  artwork: { width: '100%', maxWidth: 370 },
  copy: { width: '100%', maxWidth: 450, gap: spacing.md, alignItems: 'center' },
  eyebrow: {
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  title: { textAlign: 'center', maxWidth: 360 },
  description: { textAlign: 'center', maxWidth: 380 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    gap: spacing.sm,
  },
  dots: { flexDirection: 'row', justifyContent: 'center' },
  dotTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotTrack: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dot: {
    position: 'absolute',
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  note: { textAlign: 'center', fontSize: 11, lineHeight: 17 },
});
