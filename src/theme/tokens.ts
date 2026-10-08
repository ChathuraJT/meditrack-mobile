export const colors = {
  primary: '#145DA0',
  accent: '#00A6AD',
  background: '#F3F8FC',
  surface: '#FFFFFF',
  text: '#10234B',
  secondary: '#64799A',
  border: '#DCE7F2',
  success: '#00AA8B',
  warning: '#F59E0B',
  error: '#B42318',
  onPrimary: '#FFFFFF',
};
export type ThemeColors = typeof colors;
export type ThemeMode = 'light' | 'dark';
export const darkColors: ThemeColors = {
  primary: '#8AC4FF',
  accent: '#53D5D9',
  background: '#0C1422',
  surface: '#172337',
  text: '#EDF4FF',
  secondary: '#A6B8D1',
  border: '#34465F',
  success: '#5DDFC1',
  warning: '#F9C464',
  error: '#FFADA5',
  onPrimary: '#10243C',
};
export const palettes = { light: colors, dark: darkColors };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 10, md: 18, lg: 26 };
export const typography = {
  title: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
  heading: { fontSize: 22, lineHeight: 30, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 25 },
  caption: { fontSize: 13, lineHeight: 20 },
};
