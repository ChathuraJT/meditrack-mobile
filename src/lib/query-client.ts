import { QueryClient } from '@tanstack/react-query';

// Memory only. Clear user-specific data on sign-out when auth is introduced.
export const queryClient = new QueryClient();
