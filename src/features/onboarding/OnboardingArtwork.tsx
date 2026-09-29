import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius } from '@/theme/tokens';

export type Scene = 'consultation' | 'recovery' | 'privacy';
const art = { blueWash: '#E5F0FB', tealWash: '#DAF4F2', blueLight: '#B7D4EC' };

export function OnboardingArtwork({
  scene,
  animate,
}: {
  scene: Scene;
  animate: boolean;
}) {
  const [float] = useState(() => new Animated.Value(0));
  const [entrance] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!animate) {
      float.setValue(0);
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    const reveal = Animated.timing(entrance, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    reveal.start();
    drift.start();
    return () => {
      reveal.stop();
      drift.stop();
    };
  }, [animate, entrance, float]);
  const floating = {
    transform: [
      {
        translateY: float.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -9],
        }),
      },
    ],
  };
  const counterFloat = {
    transform: [
      {
        translateY: float.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 7],
        }),
      },
    ],
  };
  return (
    <View
      style={styles.stage}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <View style={[styles.blob, scene === 'privacy' && styles.tealBlob]} />
      <View style={styles.orbit} />
      <View style={styles.dotOne} />
      <View style={styles.dotTwo} />
      <Animated.View
        style={[
          styles.scene,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
              {
                scale: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.94, 1],
                }),
              },
            ],
          },
        ]}
      >
        {scene === 'consultation' && (
          <>
            <View style={styles.consultationCard}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={70} color={colors.primary} />
              </View>
              <View style={styles.coatBadge}>
                <Ionicons name="medical" size={18} color={colors.surface} />
              </View>
              <View style={styles.lineLong} />
              <View style={styles.lineShort} />
              <View style={styles.cardFoot}>
                <View style={styles.smallDot} />
                <View style={styles.footLine} />
              </View>
            </View>
            <Animated.View style={[styles.speech, floating]}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={38}
                color={colors.accent}
              />
            </Animated.View>
            <Animated.View style={[styles.medicalTile, counterFloat]}>
              <Ionicons
                name="medkit-outline"
                size={35}
                color={colors.primary}
              />
            </Animated.View>
            <View style={styles.leafStem} />
            <View style={styles.leafOne} />
            <View style={styles.leafTwo} />
          </>
        )}
        {scene === 'recovery' && (
          <>
            <View style={styles.calendar}>
              <View style={styles.calendarTop}>
                <View style={styles.binding} />
                <View style={styles.binding} />
              </View>
              <View style={styles.calendarGrid}>
                {Array.from({ length: 9 }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.calendarCell,
                      i === 4 && styles.calendarChecked,
                    ]}
                  >
                    {i === 4 && (
                      <Ionicons
                        name="checkmark"
                        size={17}
                        color={colors.surface}
                      />
                    )}
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.bottle}>
              <View style={styles.bottleCap} />
              <View style={styles.bottleLabel}>
                <Ionicons name="medical" size={39} color={colors.accent} />
              </View>
              <View style={styles.bottleLine} />
            </View>
            <Animated.View style={[styles.heartTile, floating]}>
              <Ionicons name="heart-outline" size={33} color={colors.accent} />
            </Animated.View>
            <Animated.View style={[styles.capsule, counterFloat]}>
              <View style={styles.capsuleHalf} />
              <View style={styles.capsuleHalfWhite} />
            </Animated.View>
          </>
        )}
        {scene === 'privacy' && (
          <>
            <View style={styles.map}>
              <View style={styles.roadOne} />
              <View style={styles.roadTwo} />
              <View style={styles.roadThree} />
              <View style={styles.park} />
            </View>
            <View style={styles.shield}>
              <Ionicons
                name="shield-checkmark"
                size={98}
                color={colors.primary}
              />
            </View>
            <Animated.View style={[styles.pin, floating]}>
              <Ionicons name="location" size={54} color={colors.accent} />
            </Animated.View>
            <Animated.View style={[styles.lockTile, counterFloat]}>
              <Ionicons
                name="lock-closed-outline"
                size={28}
                color={colors.primary}
              />
            </Animated.View>
            <View style={styles.mapDot} />
          </>
        )}
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  stage: {
    width: '100%',
    maxWidth: 350,
    aspectRatio: 1.12,
    alignSelf: 'center',
  },
  scene: { ...StyleSheet.absoluteFill },
  blob: {
    position: 'absolute',
    left: '9%',
    top: '10%',
    width: '82%',
    height: '77%',
    backgroundColor: art.blueWash,
    borderTopLeftRadius: 110,
    borderTopRightRadius: 135,
    borderBottomLeftRadius: 130,
    borderBottomRightRadius: 90,
    transform: [{ rotate: '-12deg' }],
  },
  tealBlob: { backgroundColor: art.tealWash },
  orbit: {
    position: 'absolute',
    left: '4%',
    top: '5%',
    width: '92%',
    height: '88%',
    borderRadius: 160,
    borderWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '-18deg' }, { scaleY: 0.84 }],
  },
  dotOne: {
    position: 'absolute',
    top: '13%',
    left: '17%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  dotTwo: {
    position: 'absolute',
    bottom: '14%',
    right: '15%',
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: art.blueLight,
  },
  consultationCard: {
    position: 'absolute',
    left: '24%',
    top: '16%',
    width: '53%',
    height: '69%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    transform: [{ rotate: '-6deg' }],
  },
  avatar: {
    width: '65%',
    aspectRatio: 1,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: art.blueWash,
    overflow: 'hidden',
  },
  coatBadge: {
    position: 'absolute',
    right: '16%',
    top: '42%',
    borderRadius: 24,
    backgroundColor: colors.accent,
    padding: 8,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  lineLong: {
    width: '52%',
    height: 7,
    borderRadius: 4,
    backgroundColor: art.blueLight,
  },
  lineShort: {
    width: '35%',
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  cardFoot: {
    width: '72%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
  },
  smallDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  footLine: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  speech: {
    position: 'absolute',
    right: '5%',
    top: '16%',
    padding: 15,
    backgroundColor: colors.surface,
    borderRadius: 23,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '8deg' }],
  },
  medicalTile: {
    position: 'absolute',
    left: '5%',
    bottom: '18%',
    padding: 17,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leafStem: {
    position: 'absolute',
    left: '86%',
    bottom: '13%',
    width: 3,
    height: '20%',
    backgroundColor: colors.accent,
    transform: [{ rotate: '16deg' }],
  },
  leafOne: {
    position: 'absolute',
    left: '81%',
    bottom: '23%',
    width: 22,
    height: 12,
    borderRadius: 12,
    backgroundColor: colors.accent,
    transform: [{ rotate: '40deg' }],
  },
  leafTwo: {
    position: 'absolute',
    left: '86%',
    bottom: '28%',
    width: 23,
    height: 12,
    borderRadius: 12,
    backgroundColor: colors.accent,
    transform: [{ rotate: '-35deg' }],
  },
  calendar: {
    position: 'absolute',
    right: '10%',
    top: '12%',
    width: '52%',
    height: '56%',
    backgroundColor: colors.surface,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    transform: [{ rotate: '8deg' }],
  },
  calendarTop: {
    backgroundColor: colors.primary,
    height: '25%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  binding: {
    width: 7,
    height: 20,
    borderRadius: 4,
    backgroundColor: art.blueLight,
  },
  calendarGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: '10%',
    gap: '8%',
  },
  calendarCell: {
    width: '25%',
    height: '23%',
    borderRadius: 4,
    backgroundColor: art.blueWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarChecked: { backgroundColor: colors.accent },
  bottle: {
    position: 'absolute',
    left: '18%',
    top: '32%',
    width: '34%',
    height: '53%',
    backgroundColor: colors.surface,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  bottleCap: {
    position: 'absolute',
    top: '-10%',
    width: '92%',
    height: '20%',
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  bottleLabel: {
    marginTop: '38%',
    width: '100%',
    paddingVertical: 9,
    backgroundColor: art.tealWash,
    alignItems: 'center',
  },
  bottleLine: {
    width: '40%',
    height: 4,
    marginTop: 12,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  heartTile: {
    position: 'absolute',
    left: '7%',
    top: '13%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  capsule: {
    position: 'absolute',
    right: '16%',
    bottom: '17%',
    width: '27%',
    height: '12%',
    borderRadius: 40,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  capsuleHalf: { flex: 1, backgroundColor: colors.accent },
  capsuleHalfWhite: { flex: 1, backgroundColor: colors.surface },
  map: {
    position: 'absolute',
    top: '19%',
    left: '16%',
    width: '68%',
    height: '65%',
    borderRadius: 24,
    backgroundColor: art.blueWash,
    borderWidth: 5,
    borderColor: colors.surface,
    overflow: 'hidden',
    transform: [{ rotate: '-8deg' }],
  },
  roadOne: {
    position: 'absolute',
    left: '35%',
    top: '-10%',
    width: 14,
    height: '130%',
    backgroundColor: colors.surface,
    transform: [{ rotate: '28deg' }],
  },
  roadTwo: {
    position: 'absolute',
    left: '-15%',
    top: '40%',
    width: '130%',
    height: 13,
    backgroundColor: colors.surface,
    transform: [{ rotate: '-10deg' }],
  },
  roadThree: {
    position: 'absolute',
    right: '10%',
    top: '-10%',
    width: 10,
    height: '130%',
    backgroundColor: colors.surface,
    transform: [{ rotate: '-17deg' }],
  },
  park: {
    position: 'absolute',
    left: '5%',
    bottom: '8%',
    width: '25%',
    height: '28%',
    backgroundColor: '#B8E6DC',
    borderRadius: 14,
  },
  shield: {
    position: 'absolute',
    top: '24%',
    left: '28%',
    width: '44%',
    aspectRatio: 1,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pin: { position: 'absolute', right: '9%', top: '10%' },
  lockTile: {
    position: 'absolute',
    left: '7%',
    bottom: '16%',
    borderRadius: 19,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapDot: {
    position: 'absolute',
    right: '24%',
    bottom: '23%',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.surface,
  },
});
