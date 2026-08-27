import React, { useEffect, useMemo, useState } from 'react';
import {
  LocalShoppingItem,
  LocalShoppingList,
  ShoppingLocalState,
  createLocalId,
  loadLocalShoppingState,
  resetLocalShoppingState,
  saveLocalShoppingState
} from './services/localShoppingStore';

type View = 'listas' | 'lista' | 'mercado' | 'historico' | 'insights';

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const categories = ['Mercearia', 'Laticínios', 'Açougue', 'Hortifruti', 'Padaria', 'Bebidas', 'Limpeza', 'Higiene', 'Outros'];

const categoryRules: Array<{ words: string[]; category: string }> = [
  { words: ['arroz', 'feijao', 'cafe', 'acucar', 'sal', 'oleo', 'azeite', 'macarrao', 'farinha'], category: 'Mercearia' },
  { words: ['leite', 'queijo', 'iogurte', 'manteiga', 'requeijao'], category: 'Laticínios' },
  { words: ['carne', 'frango', 'peixe', 'linguica'], category: 'Açougue' },
  { words: ['banana', 'maca', 'laranja', 'tomate', 'alface', 'batata', 'cebola'], category: 'Hortifruti' },
  { words: ['pao', 'bolo', 'torrada'], category: 'Padaria' },
  { words: ['agua', 'suco', 'refrigerante', 'cerveja'], category: 'Bebidas' },
  { words: ['detergente', 'sabao', 'amaciante', 'desinfetante', 'multiuso'], category: 'Limpeza' },
  { words: ['papel higienico', 'sabonete', 'shampoo', 'creme dental', 'absorvente'], category: 'Higiene' }
];

function detectCategory(name: string) {
  const n = normalize(name);
  return categoryRules.find((rule) => rule.words.some((word) => n.includes(word)))?.category || 'Outros';
}

function parseNaturalItems(text: string) {
  return text
    .split(/,|\n|;/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const start = part.match(/^(\d+)\s*[xX]?\s+(.+)$/);
      const end = part.match(/^(.+?)\s+[xX](\d+)$/);
      const quantity = start ? Number(start[1]) : end ? Number(end[2]) : 1;
      const name = (start ? start[2] : end ? end[1] : part).trim();
      return { name, quantity: Math.max(1, quantity), category: detectCategory(name) };
    });
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg">{children}</span>;
}

function App() {
  const [state, setState] = useState<ShoppingLocalState>(() => loadLocalShoppingState());
  const [view, setView] = useState<View>('lista');
  const [quickText, setQuickText] = useState('');
  const [search, setSearch] = useState('');
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [editing, setEditing] = useState<LocalShoppingItem | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => saveLocalShoppingState(state), [state]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const activeList = useMemo(
    () => state.lists.find((list) => list.id === state.activeListId) || state.lists[0],
    [state]
  );

  const activeItems = activeList?.itens || [];
  const pending = activeItems.filter((item) => item.status === 'pendente');
  const bought = activeItems.filter((item) => item.status === 'comprado');
  const estimated = activeItems.reduce((sum, item) => sum + item.precoEstimado * item.quantidade, 0);
  const actual = bought.reduce((sum, item) => sum + (item.precoReal ?? item.precoEstimado) * item.quantidade, 0);
  const projected = actual + pending.reduce((sum, item) => sum + item.precoEstimado * item.quantidade, 0);
  const progress = activeItems.length ? Math.round((bought.length / activeItems.length) * 100) : 0;

  const updateActiveList = (updater: (list: LocalShoppingList) => LocalShoppingList) => {
    setState((current) => ({
      ...current,
      lists: current.lists.map((list) => list.id === current.activeListId ? updater(list) : list)
    }));
  };

  const addParsedItems = () => {
    const parsed = parseNaturalItems(quickText);
    if (!parsed.length) return;
    updateActiveList((list) => {
      const next = [...list.itens];
      parsed.forEach((entry) => {
        const existing = next.find((item) => normalize(item.nome) === normalize(entry.name) && item.status === 'pendente');
        if (existing) {
          existing.quantidade += entry.quantity;
        } else {
          next.push({
            id: createLocalId('item'),
            nome: entry.name,
            quantidade: entry.quantity,
            categoria: entry.category,
            precoEstimado: 0,
            status: 'pendente',
            favorito: false,
            criadoEm: new Date().toISOString()
          });
        }
      });
      return { ...list, itens: next, atualizadaEm: new Date().toISOString() };
    });
    setQuickText('');
    setNotice(`${parsed.length} item(ns) adicionado(s)`);
  };

  const toggleItem = (itemId: string) => {
    updateActiveList((list) => ({
      ...list,
      atualizadaEm: new Date().toISOString(),
      itens: list.itens.map((item) => item.id === itemId ? {
        ...item,
        status: item.status === 'pendente' ? 'comprado' : 'pendente',
        compradoEm: item.status === 'pendente' ? new Date().toISOString() : undefined
      } : item)
    }));
  };

  const removeItem = (itemId: string) => {
    updateActiveList((list) => ({ ...list, itens: list.itens.filter((item) => item.id !== itemId), atualizadaEm: new Date().toISOString() }));
    setEditing(null);
  };

  const saveEditing = () => {
    if (!editing) return;
    updateActiveList((list) => ({
      ...list,
      atualizadaEm: new Date().toISOString(),
      itens: list.itens.map((item) => item.id === editing.id ? editing : item)
    }));
    setEditing(null);
    setNotice('Item atualizado');
  };

  const createList = () => {
    const name = newListName.trim();
    if (!name) return;
    const newList: LocalShoppingList = {
      id: createLocalId('lista'),
      nome: name,
      criadaEm: new Date().toISOString(),
      atualizadaEm: new Date().toISOString(),
      arquivada: false,
      itens: []
    };
    setState((current) => ({ ...current, activeListId: newList.id, lists: [newList, ...current.lists] }));
    setNewListName('');
    setShowNewList(false);
    setView('lista');
  };

  const finishPurchase = () => {
    if (!bought.length) {
      setNotice('Marque itens como comprados primeiro');
      return;
    }
    const purchase = {
      id: createLocalId('compra'),
      listaId: activeList.id,
      listaNome: activeList.nome,
      mercado: activeList.mercado,
      data: new Date().toISOString(),
      itens: bought.map((item) => {
        const unit = item.precoReal ?? item.precoEstimado;
        return { nome: item.nome, quantidade: item.quantidade, categoria: item.categoria, precoUnitario: unit, total: unit * item.quantidade };
      }),
      total: actual
    };
    setState((current) => ({
      ...current,
      marketMode: false,
      purchases: [purchase, ...current.purchases],
      lists: current.lists.map((list) => list.id === current.activeListId ? {
        ...list,
        atualizadaEm: new Date().toISOString(),
        itens: list.itens.filter((item) => item.status !== 'comprado')
      } : list)
    }));
    setView('historico');
    setNotice('Compra finalizada e salva no histórico');
  };

  const frequentSuggestions = useMemo(() => {
    const counts = new Map<string, { name: string; count: number; price: number; category: string }>();
    state.purchases.forEach((purchase) => purchase.itens.forEach((item) => {
      const key = normalize(item.nome);
      const current = counts.get(key) || { name: item.nome, count: 0, price: 0, category: item.categoria };
      counts.set(key, { ...current, count: current.count + 1, price: item.precoUnitario });
    }));
    const existing = new Set(activeItems.map((item) => normalize(item.nome)));
    return [...counts.values()].filter((item) => !existing.has(normalize(item.name))).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [state.purchases, activeItems]);

  const priceHistory = useMemo(() => {
    const map = new Map<string, number[]>();
    state.purchases.forEach((purchase) => purchase.itens.forEach((item) => {
      const key = normalize(item.nome);
      map.set(key, [...(map.get(key) || []), item.precoUnitario]);
    }));
    return map;
  }, [state.purchases]);

  const filteredItems = activeItems.filter((item) => normalize(item.nome).includes(normalize(search)));

  const navigation: Array<{ key: View; label: string; icon: string }> = [
    { key: 'listas', label: 'Listas', icon: '☷' },
    { key: 'lista', label: 'Compras', icon: '🛒' },
    { key: 'mercado', label: 'Mercado', icon: '✓' },
    { key: 'historico', label: 'Histórico', icon: '◷' },
    { key: 'insights', label: 'Resumo', icon: '▥' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-sm">🛍</div>
            <div>
              <h1 className="font-bold leading-tight">Shopping Pro</h1>
              <p className="text-xs text-slate-500">Nova visão local-first</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline">● dados locais</span>
            <button onClick={() => { if (confirm('Restaurar os dados de demonstração?')) setState(resetLocalShoppingState()); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">Restaurar demo</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5">
        {view !== 'listas' && activeList && (
          <section className="mb-5 rounded-3xl bg-gradient-to-br from-blue-700 to-blue-500 p-5 text-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm text-blue-100">Lista ativa</p>
                <h2 className="mt-1 text-2xl font-bold">{activeList.nome}</h2>
                <p className="mt-1 text-sm text-blue-100">{activeList.mercado || 'Mercado não definido'} · {activeItems.length} itens</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-2xl bg-white/12 px-4 py-3"><span className="block text-blue-100">Estimado</span><strong>{money(estimated)}</strong></div>
                <div className="rounded-2xl bg-white/12 px-4 py-3"><span className="block text-blue-100">Projetado</span><strong>{money(projected)}</strong></div>
                <div className="col-span-2 rounded-2xl bg-white/12 px-4 py-3 sm:col-span-1"><span className="block text-blue-100">Progresso</span><strong>{progress}%</strong></div>
              </div>
            </div>
          </section>
        )}

        {view === 'listas' && (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="text-2xl font-bold">Minhas listas</h2><p className="text-sm text-slate-500">Separe compras mensais, eventos, farmácia ou qualquer outro contexto.</p></div>
              <button onClick={() => setShowNewList(true)} className="rounded-2xl bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-700">+ Nova lista</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {state.lists.filter((list) => !list.arquivada).map((list) => {
                const done = list.itens.filter((i) => i.status === 'comprado').length;
                const total = list.itens.reduce((sum, i) => sum + i.precoEstimado * i.quantidade, 0);
                return <button key={list.id} onClick={() => { setState((s) => ({ ...s, activeListId: list.id })); setView('lista'); }} className={`rounded-3xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${list.id === state.activeListId ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start justify-between"><Icon>🧾</Icon><span className="text-xs font-semibold text-slate-400">{list.itens.length} itens</span></div>
                  <h3 className="mt-5 text-lg font-bold">{list.nome}</h3>
                  <p className="mt-1 min-h-5 text-sm text-slate-500">{list.descricao || 'Sem descrição'}</p>
                  <div className="mt-5 flex items-center justify-between text-sm"><span className="text-slate-500">{done} comprados</span><strong>{money(total)}</strong></div>
                </button>;
              })}
            </div>
          </section>
        )}

        {view === 'lista' && activeList && (
          <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <label className="text-sm font-semibold">Adição rápida</label>
                <p className="mb-3 text-xs text-slate-500">Digite naturalmente: 2 leite, arroz 5kg, 3 detergentes</p>
                <div className="flex gap-2">
                  <input value={quickText} onChange={(e) => setQuickText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addParsedItems()} placeholder="O que está faltando em casa?" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" />
                  <button onClick={addParsedItems} className="rounded-2xl bg-blue-600 px-5 font-semibold text-white">Adicionar</button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar na lista" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-400" />
              </div>

              <div className="mt-4 space-y-3">
                {filteredItems.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Sua lista está vazia. Use a adição rápida acima.</div>}
                {filteredItems.map((item) => {
                  const history = priceHistory.get(normalize(item.nome)) || [];
                  const average = history.length ? history.reduce((a, b) => a + b, 0) / history.length : 0;
                  return <div key={item.id} className={`flex items-center gap-3 rounded-3xl border bg-white p-4 shadow-sm ${item.status === 'comprado' ? 'border-emerald-200 opacity-70' : 'border-slate-200'}`}>
                    <button onClick={() => toggleItem(item.id)} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-lg ${item.status === 'comprado' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>{item.status === 'comprado' ? '✓' : ''}</button>
                    <button onClick={() => setEditing({ ...item })} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2"><h3 className={`truncate font-semibold ${item.status === 'comprado' ? 'line-through' : ''}`}>{item.nome}</h3>{item.favorito && <span>★</span>}</div>
                      <p className="mt-1 text-xs text-slate-500">{item.quantidade} un · {item.categoria}{average > 0 ? ` · média histórica ${money(average)}` : ''}</p>
                    </button>
                    <div className="text-right"><strong className="block">{money((item.precoReal ?? item.precoEstimado) * item.quantidade)}</strong><span className="text-xs text-slate-400">{item.precoReal != null ? 'real' : 'estimado'}</span></div>
                  </div>;
                })}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold">Sugestões pelo histórico</h3>
                <p className="mt-1 text-xs text-slate-500">Sem IA externa. O app usa suas compras anteriores.</p>
                <div className="mt-4 space-y-2">
                  {frequentSuggestions.length === 0 && <p className="text-sm text-slate-400">Nenhuma sugestão por enquanto.</p>}
                  {frequentSuggestions.map((suggestion) => <button key={suggestion.name} onClick={() => { setQuickText(suggestion.name); setNotice('Sugestão pronta para adicionar'); }} className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-left text-sm hover:bg-blue-50"><span><strong className="block">{suggestion.name}</strong><small className="text-slate-500">comprado {suggestion.count}x</small></span><span>+</span></button>)}
                </div>
              </div>
              <div className="rounded-3xl bg-slate-900 p-5 text-white">
                <p className="text-sm text-slate-300">Orçamento da lista</p>
                <div className="mt-2 flex items-end justify-between"><strong className="text-2xl">{money(state.budget || 0)}</strong><span className={`text-sm font-semibold ${projected <= (state.budget || 0) ? 'text-emerald-400' : 'text-amber-300'}`}>{projected <= (state.budget || 0) ? 'dentro do previsto' : 'acima do limite'}</span></div>
                <input type="number" value={state.budget || 0} onChange={(e) => setState((s) => ({ ...s, budget: Number(e.target.value) }))} className="mt-4 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm outline-none" />
              </div>
            </aside>
          </section>
        )}

        {view === 'mercado' && activeList && (
          <section className="mx-auto max-w-3xl">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">Modo mercado</h2><p className="text-sm text-slate-500">Tela simplificada para usar com uma mão durante a compra.</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">{bought.length}/{activeItems.length}</span></div>
            <div className="mb-5 h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>
            <div className="space-y-3">
              {activeItems.map((item) => <div key={item.id} className={`rounded-3xl border p-4 ${item.status === 'comprado' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleItem(item.id)} className={`h-14 w-14 shrink-0 rounded-2xl text-2xl font-bold ${item.status === 'comprado' ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300 bg-white'}`}>{item.status === 'comprado' ? '✓' : ''}</button>
                  <div className="min-w-0 flex-1"><h3 className="truncate text-lg font-bold">{item.nome}</h3><p className="text-sm text-slate-500">Quantidade {item.quantidade} · {item.categoria}</p></div>
                  <label className="w-28"><span className="mb-1 block text-right text-xs text-slate-400">Preço unit.</span><input type="number" step="0.01" value={item.precoReal ?? ''} placeholder={String(item.precoEstimado || 0)} onChange={(e) => updateActiveList((list) => ({ ...list, itens: list.itens.map((i) => i.id === item.id ? { ...i, precoReal: e.target.value === '' ? undefined : Number(e.target.value) } : i) }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-right font-semibold outline-none focus:border-blue-400" /></label>
                </div>
              </div>)}
            </div>
            <div className="sticky bottom-20 mt-5 rounded-3xl bg-slate-900 p-5 text-white shadow-xl"><div className="flex items-center justify-between"><div><span className="text-sm text-slate-400">Total atual</span><strong className="block text-2xl">{money(actual)}</strong></div><div className="text-right"><span className="text-sm text-slate-400">Projeção final</span><strong className="block text-lg">{money(projected)}</strong></div></div><button onClick={finishPurchase} className="mt-4 w-full rounded-2xl bg-emerald-500 py-3 font-bold text-white">Finalizar compra</button></div>
          </section>
        )}

        {view === 'historico' && (
          <section>
            <div className="mb-5"><h2 className="text-2xl font-bold">Histórico de compras</h2><p className="text-sm text-slate-500">O histórico alimenta preços médios, frequência e sugestões.</p></div>
            <div className="space-y-4">
              {state.purchases.map((purchase) => <details key={purchase.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer list-none"><div className="flex items-center justify-between gap-4"><div><strong className="block">{purchase.listaNome}</strong><span className="text-sm text-slate-500">{new Date(purchase.data).toLocaleDateString('pt-BR')} · {purchase.mercado || 'Mercado não informado'} · {purchase.itens.length} itens</span></div><strong className="text-lg">{money(purchase.total)}</strong></div></summary><div className="mt-4 border-t border-slate-100 pt-3">{purchase.itens.map((item, index) => <div key={`${item.nome}-${index}`} className="flex justify-between py-2 text-sm"><span>{item.quantidade}x {item.nome}</span><span>{money(item.total)}</span></div>)}</div></details>)}
            </div>
          </section>
        )}

        {view === 'insights' && (
          <section>
            <div className="mb-5"><h2 className="text-2xl font-bold">Resumo de consumo</h2><p className="text-sm text-slate-500">Indicadores calculados exclusivamente com os dados armazenados neste navegador.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Total histórico" value={money(state.purchases.reduce((sum, p) => sum + p.total, 0))} helper={`${state.purchases.length} compras`} />
              <Metric label="Ticket médio" value={money(state.purchases.length ? state.purchases.reduce((sum, p) => sum + p.total, 0) / state.purchases.length : 0)} helper="por compra" />
              <Metric label="Lista atual" value={money(projected)} helper={`${pending.length} pendentes`} />
              <Metric label="Orçamento" value={money(state.budget || 0)} helper={projected <= (state.budget || 0) ? 'projeção dentro do limite' : 'atenção ao limite'} />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold">Produtos com histórico de preço</h3><div className="mt-4 space-y-3">{[...priceHistory.entries()].slice(0, 8).map(([key, prices]) => { const latest = prices[0]; const avg = prices.reduce((a, b) => a + b, 0) / prices.length; return <div key={key} className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm"><span className="capitalize">{key}</span><span className="text-right"><strong className="block">{money(latest)}</strong><small className="text-slate-500">média {money(avg)}</small></span></div>; })}</div></div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold">Leitura da lista atual</h3><div className="mt-4 space-y-3"><Insight title="Projeção" text={`A compra deve terminar perto de ${money(projected)} com os preços informados.`} /><Insight title="Diferença para o orçamento" text={`${projected <= (state.budget || 0) ? 'Ainda há' : 'A projeção ultrapassa em'} ${money(Math.abs((state.budget || 0) - projected))}.`} /><Insight title="Sugestões automáticas" text={`${frequentSuggestions.length} produto(s) recorrente(s) ainda não estão na lista atual.`} /></div></div>
            </div>
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5 px-2 py-2">
          {navigation.map((item) => <button key={item.key} onClick={() => setView(item.key)} className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold ${view === item.key ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}><span className="text-lg">{item.icon}</span>{item.label}</button>)}
        </div>
      </nav>

      {showNewList && <Modal onClose={() => setShowNewList(false)}><h3 className="text-xl font-bold">Nova lista</h3><p className="mt-1 text-sm text-slate-500">Crie listas independentes para contextos diferentes.</p><input autoFocus value={newListName} onChange={(e) => setNewListName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createList()} placeholder="Ex.: Compras de setembro" className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" /><div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowNewList(false)} className="rounded-xl px-4 py-2">Cancelar</button><button onClick={createList} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">Criar lista</button></div></Modal>}

      {editing && <Modal onClose={() => setEditing(null)}><div className="flex items-center justify-between"><h3 className="text-xl font-bold">Editar item</h3><button onClick={() => setEditing(null)} className="text-slate-400">✕</button></div><div className="mt-5 grid gap-4"><Field label="Nome"><input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value, categoria: detectCategory(e.target.value) })} className="input" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Quantidade"><input type="number" min="1" value={editing.quantidade} onChange={(e) => setEditing({ ...editing, quantidade: Math.max(1, Number(e.target.value)) })} className="input" /></Field><Field label="Preço estimado"><input type="number" step="0.01" value={editing.precoEstimado} onChange={(e) => setEditing({ ...editing, precoEstimado: Number(e.target.value) })} className="input" /></Field></div><Field label="Categoria"><select value={editing.categoria} onChange={(e) => setEditing({ ...editing, categoria: e.target.value })} className="input">{categories.map((category) => <option key={category}>{category}</option>)}</select></Field><label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm"><input type="checkbox" checked={editing.favorito} onChange={(e) => setEditing({ ...editing, favorito: e.target.checked })} /> Favorito</label></div><div className="mt-5 flex items-center justify-between"><button onClick={() => removeItem(editing.id)} className="rounded-xl px-3 py-2 text-sm font-semibold text-red-600">Remover</button><button onClick={saveEditing} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white">Salvar alterações</button></div></Modal>}

      {notice && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}

      <style>{`.input{width:100%;border:1px solid rgb(226 232 240);border-radius:1rem;padding:.75rem 1rem;outline:none}.input:focus{border-color:rgb(96 165 250)}`}</style>
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><strong className="mt-2 block text-2xl">{value}</strong><span className="mt-1 block text-xs text-slate-400">{helper}</span></div>;
}

function Insight({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><strong className="text-sm">{title}</strong><p className="mt-1 text-sm text-slate-600">{text}</p></div>;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}><div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">{children}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-sm font-semibold">{label}</span>{children}</label>;
}

export default App;
