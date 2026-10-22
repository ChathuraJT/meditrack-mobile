import type { Scanner } from './controller';
export const availabilityMessage: string | null =
  'Bluetooth scanning is available in the Android or iOS app using a native build, not in this browser.';
export function createScanner(): Scanner {
  return {
    start: async () => {
      throw new Error(availabilityMessage!);
    },
    stop: async () => {},
  };
}
