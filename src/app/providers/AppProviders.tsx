import type { PropsWithChildren } from 'react';
import { AuthProvider } from '../../features/auth/context/AuthProvider';
import { PairingProvider } from '../../features/pairing/context/PairingProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <PairingProvider>{children}</PairingProvider>
    </AuthProvider>
  );
}
