import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { getSupabaseClient } from '../../../shared/lib/supabase/client';
import { useAuth } from '../../auth/context/AuthContext';
import { mapPairingError } from '../lib/pairingErrors';
import { PairingContext, type PairingMember } from './PairingContext';

export function PairingProvider({ children }: PropsWithChildren) {
  const { user, isLoading: authLoading } = useAuth();
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [members, setMembers] = useState<PairingMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user) {
      setCoupleId(null);
      setMembers([]);
      setError('');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    const supabase = getSupabaseClient();
    const { data: membership, error: membershipError } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', user.id)
      .is('left_at', null)
      .maybeSingle();
    if (membershipError) {
      setError('ペアリング状態を取得できませんでした。');
      setIsLoading(false);
      return;
    }
    if (!membership) {
      setCoupleId(null);
      setMembers([]);
      setIsLoading(false);
      return;
    }
    const { data: memberRows, error: membersError } = await supabase
      .from('couple_members')
      .select('id,user_id,role_label,joined_at')
      .eq('couple_id', membership.couple_id)
      .is('left_at', null)
      .order('joined_at');
    if (membersError) {
      setError('メンバー情報を取得できませんでした。');
      setIsLoading(false);
      return;
    }
    setCoupleId(membership.couple_id);
    setMembers(
      memberRows.map((member) => ({
        id: member.id,
        userId: member.user_id,
        roleLabel: member.role_label,
        joinedAt: member.joined_at
      }))
    );
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, refresh]);

  const createCouple = useCallback(async () => {
    setError('');
    const { error: rpcError } = await getSupabaseClient().rpc('create_couple');
    if (rpcError) throw new Error(mapPairingError(rpcError));
    await refresh();
  }, [refresh]);

  const joinCouple = useCallback(
    async (code: string) => {
      setError('');
      const { error: rpcError } = await getSupabaseClient().rpc('join_couple', {
        invite_code: code.trim()
      });
      if (rpcError) throw new Error(mapPairingError(rpcError));
      await refresh();
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      coupleId,
      members,
      isLoading: authLoading || isLoading,
      error,
      refresh,
      createCouple,
      joinCouple
    }),
    [authLoading, coupleId, createCouple, error, isLoading, joinCouple, members, refresh]
  );
  return <PairingContext.Provider value={value}>{children}</PairingContext.Provider>;
}
