import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  Pattern,
  Rect,
  Use,
} from 'react-native-svg';

type MedicalPatternBackgroundProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  density?: 'sparse' | 'balanced' | 'dense';
  opacity?: number;
  backgroundColor?: string;
};

type IconName =
  | 'capsule'
  | 'cross'
  | 'bottle'
  | 'kit'
  | 'syringe'
  | 'heart'
  | 'ecg'
  | 'molecule'
  | 'stethoscope'
  | 'thermometer';

const ICONS: IconName[] = [
  'capsule',
  'cross',
  'bottle',
  'kit',
  'syringe',
  'heart',
  'ecg',
  'molecule',
  'stethoscope',
  'thermometer',
];

const TILE_SIZE = 360;
const DENSITY_COUNTS = { sparse: 32, balanced: 48, dense: 65 };

// Seeded PRNG: same icon positions on every render.
function createRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type IconPlacement = {
  id: number;
  icon: IconName;
  x: number;
  y: number;
  rotation: number;
  scale: number;
};

function generatePlacements(count: number): IconPlacement[] {
  const random = createRandom(1729);
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const cellWidth = TILE_SIZE / columns;
  const cellHeight = TILE_SIZE / rows;
  const cells: { row: number; col: number }[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      cells.push({ row, col });
    }
  }

  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  return cells.slice(0, count).map(({ row, col }, index) => ({
    id: index,
    icon: ICONS[Math.floor(random() * ICONS.length)],
    x: (col + 0.2 + random() * 0.6) * cellWidth,
    y: (row + 0.2 + random() * 0.6) * cellHeight,
    rotation: Math.floor(random() * 360),
    scale: 0.65 + random() * 0.35,
  }));
}

function MedicalIconDefinitions() {
  return (
    <>
      <G id="mt-capsule">
        <Rect x={-14} y={-6} width={28} height={12} rx={6} />
        <Path d="M0 -6 V6" />
      </G>
      <G id="mt-cross">
        <Path d="M-5 -14 H5 V-5 H14 V5 H5 V14 H-5 V5 H-14 V-5 H-5 Z" />
      </G>
      <G id="mt-bottle">
        <Rect x={-11} y={-11} width={22} height={29} rx={3} />
        <Rect x={-7} y={-17} width={14} height={6} rx={1} />
        <Path d="M0 -3 V10 M-6 3.5 H6" />
      </G>
      <G id="mt-kit">
        <Rect x={-17} y={-11} width={34} height={25} rx={4} />
        <Path d="M-7 -11 V-16 H7 V-11 M0 -5 V8 M-6 1.5 H6" />
      </G>
      <G id="mt-syringe">
        <Rect x={-6} y={-15} width={12} height={28} rx={2} />
        <Path d="M-4 -20 H4 V-15 M0 13 V25 M-5 25 H5 M-6 6 H6 M-2 -9 H3 M-2 -3 H3" />
      </G>
      <G id="mt-heart">
        <Path d="M0 17 L-17 0 C-28 -12 -12 -23 0 -9 C12 -23 28 -12 17 0 Z" />
        <Path d="M-12 0 H-6 L-2 -6 L3 8 L7 0 H12" />
      </G>
      <G id="mt-ecg">
        <Path d="M-21 0 H-12 L-7 -6 L-1 10 L5 -12 L11 0 H21" />
      </G>
      <G id="mt-molecule">
        <Circle cx={-12} cy={1} r={4} />
        <Circle cx={9} cy={-12} r={4} />
        <Circle cx={14} cy={13} r={4} />
        <Path d="M-8 -1 L5 -10 M-8 3 L10 11" />
      </G>
      <G id="mt-stethoscope">
        <Path d="M-13 -16 V-2 Q-13 12 0 12 Q13 12 13 -2 V-16 M0 12 V19 Q0 27 9 27 Q18 27 18 19" />
        <Circle cx={-13} cy={-16} r={3} />
        <Circle cx={13} cy={-16} r={3} />
        <Circle cx={18} cy={15} r={5} />
      </G>
      <G id="mt-thermometer">
        <Path d="M-4 9 V-15 A4 4 0 0 1 4 -15 V9 A9 9 0 1 1 -4 9 Z" />
        <Path d="M0 -9 V15" />
        <Circle cx={0} cy={16} r={3} />
      </G>
    </>
  );
}

export function MedicalPatternBackground({
  children,
  style,
  density = 'balanced',
  opacity = 0.35,
  backgroundColor: customBg,
}: MedicalPatternBackgroundProps) {
  const systemTheme = useColorScheme();
  const isDark = systemTheme === 'dark';
  const defaultBg = isDark ? '#082B50' : '#FFFFFF';
  const backgroundColor = customBg !== undefined ? customBg : defaultBg;
  const iconColor = isDark ? '#43BAD3' : '#86CFE0';
  const placements = useMemo(
    () => generatePlacements(DENSITY_COUNTS[density]),
    [density],
  );

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <MedicalIconDefinitions />
            <Pattern
              id="mt-medical-pattern"
              x={0}
              y={0}
              width={TILE_SIZE}
              height={TILE_SIZE}
              patternUnits="userSpaceOnUse"
            >
              <G
                fill="none"
                stroke={iconColor}
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={opacity}
              >
                {placements.flatMap((item) =>
                  [-TILE_SIZE, 0, TILE_SIZE].flatMap((dx) =>
                    [-TILE_SIZE, 0, TILE_SIZE].map((dy) => (
                      <Use
                        key={`${item.id}-${dx}-${dy}`}
                        href={`#mt-${item.icon}`}
                        transform={
                          `translate(${item.x + dx} ${item.y + dy}) ` +
                          `rotate(${item.rotation}) ` +
                          `scale(${item.scale})`
                        }
                      />
                    )),
                  ),
                )}
              </G>
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#mt-medical-pattern)" />
        </Svg>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export default MedicalPatternBackground;

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  content: { flex: 1 },
});
