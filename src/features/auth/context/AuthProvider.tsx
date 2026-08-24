import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../shared/lib/supabase/client';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setIsLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, isLoading, signOut }),
    [isLoading, session, signOut]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
