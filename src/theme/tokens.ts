import { useColorScheme } from '@/theme/ThemeProvider';

export const colors = {
  primary: '#145DA0',
  accent: '#00A6AD',
  background: '#F3F8FC',
  surface: '#FFFFFF',
  text: '#10234B',
  secondary: '#536884',
  border: '#DCE7F2',
  success: '#00AA8B',
  warning: '#F59E0B',
  error: '#B42318',
  button: '#145DA0',
  subtle: '#E8F4FB',
  selected: '#D9F1F2',
  warningSurface: '#FFF7DE',
  warningText: '#8A5A00',
  successSurface: '#DDF7EE',
  successText: '#087A5B',
  successButton: '#087A5B',
  errorSurface: '#FDE4E1',
  errorText: '#9F1239',
};

export const darkColors = {
  primary: '#38BDF8',
  accent: '#2DD4BF',
  background: '#082B50',
  surface: '#0C3154',
  text: '#FFFFFF',
  secondary: '#B8C8DB',
  border: '#1C4A75',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  button: '#1669A8',
  subtle: '#133E68',
  selected: '#144D55',
  warningSurface: '#49391C',
  warningText: '#FDE68A',
  successSurface: '#123F39',
  successText: '#8DE4C5',
  successButton: '#12634F',
  errorSurface: '#4A2738',
  errorText: '#FFB5C3',
};

export function useThemeColors() {
  const isDark = useColorScheme() === 'dark';
  return isDark ? darkColors : colors;
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 10, md: 18, lg: 26 };
export const typography = {
  title: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
  heading: { fontSize: 22, lineHeight: 30, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 25 },
  caption: { fontSize: 13, lineHeight: 20 },
};
