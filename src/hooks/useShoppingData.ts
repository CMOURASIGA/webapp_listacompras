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
  const reload = useCallback(async () => {
    if (!user) { setData(empty); setLoading(false); return; }
    try { setLoading(true); setError(''); setData(await shoppingRepository.load(user.id)); }
    catch (err) { setError(friendlyError(err)); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, error, reload };
}

