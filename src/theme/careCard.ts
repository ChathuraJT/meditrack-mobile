import { useColorScheme } from 'react-native';
import { darkColors } from './tokens';

export const careCardAccents = {
  blue: '#5875D6',
  amber: '#C28A4E',
  mint: '#449587',
  purple: '#9872B7',
} as const;
export type CardTone = keyof typeof careCardAccents;
export function useCareCardColors() {
  const dark = useColorScheme() === 'dark';
  return {
    surface: dark ? darkColors.surface : '#FFFFFF',
    border: dark ? darkColors.border : '#E8ECF2',
    heading: dark ? darkColors.text : '#24364B',
    supporting: dark ? darkColors.secondary : '#64748B',
    subtle: dark ? '#133E68' : '#F3F6FA',
    accents: dark
      ? {
          blue: '#9BADF0',
          amber: '#E3B783',
          mint: '#7CC7B8',
          purple: '#C7A5E1',
        }
      : careCardAccents,
  };
}
