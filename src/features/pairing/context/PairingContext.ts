import { createContext, useContext } from 'react';

export interface PairingMember {
  id: string;
  userId: string;
  roleLabel: string | null;
  joinedAt: string;
}

export interface PairingState {
  coupleId: string | null;
  members: PairingMember[];
  isLoading: boolean;
  error: string;
  refresh: () => Promise<void>;
  createCouple: () => Promise<void>;
  joinCouple: (code: string) => Promise<void>;
}

export const PairingContext = createContext<PairingState | null>(null);

export function usePairing() {
  const value = useContext(PairingContext);
  if (!value) throw new Error('usePairing must be used within PairingProvider');
  return value;
}
