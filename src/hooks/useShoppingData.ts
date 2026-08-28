import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { friendlyError } from '../lib/errors';
import { shoppingRepository } from '../repositories/shoppingRepository';
import type { AppData } from '../types/domain';

const empty: AppData = { profile: null, categories: [], markets: [], lists: [], items: [], sessions: [], purchases: [] };
export function useShoppingData(user: User | null) {
  const [data, setData] = useState<AppData>(empty);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState('');
  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user) { setData(empty); setLoading(false); return; }
    try { if (!opts?.silent) setLoading(true); setError(''); setData(await shoppingRepository.load(user.id)); }
    catch (err) { setError(friendlyError(err)); }
    finally { setLoading(false); }
  }, [user]);
  // Recarrega os dados após uma ação do usuário sem trocar a tela inteira por um spinner:
  // a tela atual continua visível e só é substituída quando os dados novos chegam.
  const reload = useCallback(() => fetchData({ silent: true }), [fetchData]);
  useEffect(() => { void fetchData(); }, [fetchData]);
  return { data, loading, error, reload };
}

