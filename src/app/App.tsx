import { useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { BarChart3, Home, ListChecks, LogOut, Settings, ShoppingCart, Tags } from 'lucide-react';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { AuthPage } from '../features/auth/AuthPage';
import { useShoppingData } from '../hooks/useShoppingData';
import { Dashboard } from '../features/dashboard/Dashboard';
import { ListsPage } from '../features/shopping-lists/ListsPage';
import { ShoppingMode } from '../features/shopping-mode/ShoppingMode';
import { PricesPage } from '../features/prices/PricesPage';
import { InsightsPage } from '../features/insights/InsightsPage';
import { SettingsDrawer } from '../features/settings/SettingsDrawer';
import { ErrorState, LoadingState } from '../components/ui';
import { pantryPredictions, priceHistory } from '../services/shoppingIntelligence';

type View = 'home' | 'lists' | 'shopping' | 'prices' | 'insights';
export default function App() {
  const [session, setSession] = useState<Session | null>(null); const [authLoading, setAuthLoading] = useState(true); const [view, setView] = useState<View>('home'); const [activeListId, setActiveListId] = useState(''); const [notice, setNotice] = useState(''); const [settings, setSettings] = useState(false);
  const user: User | null = session?.user || null; const { data, loading, error, reload } = useShoppingData(user);
  useEffect(() => { void supabase.auth.getSession().then(({ data: result }) => { setSession(result.session); setAuthLoading(false); }); const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => { setSession(current); setAuthLoading(false); }); return () => listener.subscription.unsubscribe(); }, []);
  useEffect(() => { if (!activeListId && data.lists[0]) setActiveListId(data.lists[0].id); }, [data.lists, activeListId]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 3000); return () => window.clearTimeout(timer); }, [notice]);
  const activeList = data.lists.find(list => list.id === activeListId) || data.lists[0]; const history = useMemo(() => priceHistory(data.purchases, data.markets), [data.purchases, data.markets]); const pantry = useMemo(() => pantryPredictions(history, data.purchases), [history, data.purchases]);
  if (!hasSupabaseConfig) return <main className="grid min-h-screen place-items-center bg-slate-50 p-5"><div className="max-w-lg rounded-3xl border bg-white p-6 text-center"><h1 className="text-xl font-bold">Configuração pendente</h1><p className="mt-2 text-sm text-slate-600">Defina VITE_SUPABASE_URL e VITE_SUPABASE_KEY no ambiente da branch develop.</p></div></main>;
  if (authLoading) return <LoadingState/>; if (!user) return <AuthPage/>;
  const nav: Array<[View, string, typeof Home]> = [['home', 'Início', Home], ['lists', 'Listas', ListChecks], ['shopping', 'Comprar', ShoppingCart], ['prices', 'Preços', Tags], ['insights', 'Resumo', BarChart3]];
  return <div className="min-h-screen bg-slate-50 text-slate-900"><header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-blue-100 bg-white shadow-sm"><span className="text-xl">🛒</span></div><div><div className="flex items-center gap-2"><h1 className="font-bold">7Compras</h1><span className="hidden text-xs text-slate-400 sm:inline">Consult Services</span></div><p className="text-xs text-slate-500">{view === 'home' ? 'Visão geral' : view === 'lists' ? 'Planejamento' : view === 'shopping' ? 'Modo mercado' : view === 'prices' ? 'Inteligência de preços' : 'Resumo e despensa'}</p></div></div><div className="flex items-center gap-1"><button onClick={() => setSettings(true)} className="rounded-xl p-2.5 text-slate-600" aria-label="Configurações"><Settings size={19}/></button><button onClick={() => void supabase.auth.signOut()} className="rounded-xl p-2.5 text-slate-600" aria-label="Sair"><LogOut size={19}/></button></div></div></header>
    {notice && <div className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 whitespace-nowrap rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xl">{notice}</div>}
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-5">{loading ? <LoadingState/> : error ? <ErrorState message={error} retry={() => void reload()}/> : <>{view === 'home' && <Dashboard data={data} activeList={activeList} history={history} pantry={pantry} openList={() => setView('lists')} startShopping={() => setView('shopping')} openInsights={() => setView('insights')}/>} {view === 'lists' && <ListsPage userId={user.id} data={data} activeList={activeList} selectList={setActiveListId} reload={reload} startShopping={() => setView('shopping')} notify={setNotice}/>} {view === 'shopping' && <ShoppingMode userId={user.id} data={data} list={activeList} history={history} reload={reload} notify={setNotice} done={() => setView('insights')}/>} {view === 'prices' && <PricesPage data={data} history={history} list={activeList}/>} {view === 'insights' && <InsightsPage data={data} pantry={pantry}/>}</>}</main>
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto grid max-w-3xl grid-cols-5">{nav.map(([key, label, Icon]) => <button key={key} onClick={() => setView(key)} className={`flex flex-col items-center gap-1 py-3 text-xs font-semibold ${view === key ? 'text-blue-700' : 'text-slate-500'}`}><Icon size={21}/>{label}</button>)}</div></nav>
    {settings && <SettingsDrawer userId={user.id} data={data} close={() => setSettings(false)} reload={reload} notify={setNotice}/>}</div>;
}

