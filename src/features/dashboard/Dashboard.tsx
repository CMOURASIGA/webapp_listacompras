import type { AppData, PantryPrediction, ShoppingList } from '../../types/domain';
import { Card, EmptyState, Pill } from '../../components/ui';
import { estimateList, money, type priceHistory } from '../../services/shoppingIntelligence';

type History = ReturnType<typeof priceHistory>;
export function Dashboard({ data, activeList, history, pantry, openList, startShopping, openInsights }: { data: AppData; activeList?: ShoppingList; history: History; pantry: PantryPrediction[]; openList: () => void; startShopping: () => void; openInsights: () => void }) {
  const items = data.items.filter(i => i.list_id === activeList?.id && i.status === 'pending');
  const estimate = estimateList(items, history);
  const likely = pantry.filter(p => p.ratio >= .8).slice(0, 5);
  const activeSession = data.sessions.find(s => s.status === 'active');
  const sessionPurchases = data.purchases.filter(p => p.shopping_session_id === activeSession?.id);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthSpent = data.purchases.filter(p => new Date(p.purchased_at) >= monthStart).reduce((sum, p) => sum + Number(p.total_price), 0);
  if (!activeList) return <EmptyState title="Crie sua primeira lista" description="A inteligência de consumo começa quando você planeja e registra uma compra." action={<button onClick={openList} className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white">Criar lista</button>}/>;
  return <div className="space-y-4">
    <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-500 p-5 text-white"><p className="text-sm text-brand-100">Próxima compra</p><h2 className="mt-1 text-2xl font-bold">{activeList.name}</h2><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/10 p-3"><span className="text-xs text-brand-100">{items.length} itens sugeridos</span><strong className="block text-xl">{money(estimate.total)}</strong><span className="text-xs text-brand-100">estimativa</span></div><div className="rounded-2xl bg-white/10 p-3"><span className="text-xs text-brand-100">Cobertura</span><strong className="block text-xl">{estimate.covered}/{estimate.itemCount}</strong><span className="text-xs text-brand-100">com referência</span></div></div><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={openList} className="rounded-2xl bg-white/10 py-3 font-bold">Revisar lista</button><button onClick={startShopping} className="rounded-2xl bg-white py-3 font-bold text-brand-700">Iniciar compra</button></div></section>
    {activeSession && <Card className="border-brand-200"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase text-brand-600">Compra atual</p><h3 className="font-bold">{sessionPurchases.length} itens registrados</h3><p className="text-sm text-slate-500">{money(sessionPurchases.reduce((s, p) => s + Number(p.total_price), 0))} gastos até agora</p></div><Pill tone="brand">em andamento</Pill></div></Card>}
    <div className="grid gap-4 md:grid-cols-3"><Card><p className="text-sm text-slate-500">Gasto do mês</p><strong className="mt-1 block text-2xl">{money(monthSpent)}</strong></Card><Card><p className="text-sm text-slate-500">Provavelmente acabando</p><strong className="mt-1 block text-2xl">{likely.length} produtos</strong></Card><Card><p className="text-sm text-slate-500">Compras registradas</p><strong className="mt-1 block text-2xl">{data.sessions.filter(s => s.status === 'completed').length}</strong></Card></div>
    <Card><div className="flex items-center justify-between"><div><h3 className="font-bold">Atenção</h3><p className="text-sm text-slate-500">Sinais calculados pelo seu histórico.</p></div><Pill tone="success">dados reais</Pill></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{likely.length ? likely.map(p => <div key={p.name} className="rounded-2xl bg-warning-50 p-3"><strong className="text-sm">{p.name}</strong><p className="text-xs text-warning-700">Última compra há {p.daysSinceLastPurchase} dias, ciclo médio de {p.averageIntervalDays} dias.</p></div>) : <p className="text-sm text-slate-500">Ainda não há histórico suficiente para prever reposições.</p>}</div></Card>
    <button onClick={openInsights} className="w-full rounded-2xl border border-brand-200 bg-brand-50 py-3 font-bold text-brand-700">Abrir resumo e despensa</button>
  </div>;
}

