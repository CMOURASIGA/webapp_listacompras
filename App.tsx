import React, { useEffect, useMemo, useState } from 'react';
import {
  LocalMarket,
  LocalShoppingItem,
  LocalShoppingList,
  ShoppingLocalState,
  createLocalId,
  loadLocalShoppingState,
  resetLocalShoppingState,
  saveLocalShoppingState
} from './services/localShoppingStore';

type View = 'inicio' | 'listas' | 'lista' | 'mercado' | 'precos' | 'resumo';
const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const normalize = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const daysBetween = (a: string, b = new Date().toISOString()) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

const categoryRules: Array<{ words: string[]; category: string }> = [
  { words: ['arroz','feijao','cafe','acucar','sal','oleo','azeite','macarrao','farinha'], category: 'Mercearia' },
  { words: ['leite','queijo','iogurte','manteiga','requeijao'], category: 'Laticínios' },
  { words: ['carne','frango','peixe','linguica'], category: 'Açougue' },
  { words: ['banana','maca','laranja','tomate','alface','batata','cebola'], category: 'Hortifruti' },
  { words: ['pao','bolo','torrada'], category: 'Padaria' },
  { words: ['agua','suco','refrigerante','cerveja'], category: 'Bebidas' },
  { words: ['detergente','sabao','amaciante','desinfetante','multiuso'], category: 'Limpeza' },
  { words: ['papel higienico','sabonete','shampoo','creme dental','absorvente'], category: 'Higiene' }
];

function detectCategory(name: string, categories: string[]) {
  const n = normalize(name);
  const found = categoryRules.find(r => r.words.some(w => n.includes(w)))?.category;
  return found && categories.includes(found) ? found : categories.includes('Outros') ? 'Outros' : categories[0] || 'Outros';
}

function parseNaturalItems(text: string, categories: string[]) {
  return text.split(/,|\n|;/).map(p => p.trim()).filter(Boolean).map(part => {
    const start = part.match(/^(\d+)\s*[xX]?\s+(.+)$/);
    const end = part.match(/^(.+?)\s+[xX](\d+)$/);
    const quantity = start ? Number(start[1]) : end ? Number(end[2]) : 1;
    const name = (start ? start[2] : end ? end[1] : part).trim();
    return { name, quantity: Math.max(1, quantity), category: detectCategory(name, categories) };
  });
}

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
const Pill = ({ children, tone='slate' }: { children: React.ReactNode; tone?: 'slate'|'blue'|'green'|'amber'|'red' }) => {
  const tones = { slate:'bg-slate-100 text-slate-600', blue:'bg-blue-50 text-blue-700', green:'bg-emerald-50 text-emerald-700', amber:'bg-amber-50 text-amber-700', red:'bg-red-50 text-red-700' };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
};

function App() {
  const [state, setState] = useState<ShoppingLocalState>(() => loadLocalShoppingState());
  const [view, setView] = useState<View>('inicio');
  const [quickText, setQuickText] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<LocalShoppingItem | null>(null);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newMarket, setNewMarket] = useState('');
  const [showMarketStart, setShowMarketStart] = useState(false);
  const [notice, setNotice] = useState('');
  const [historyMode, setHistoryMode] = useState<'frequentes'|'recentes'>('frequentes');

  useEffect(() => saveLocalShoppingState(state), [state]);
  useEffect(() => { if (!notice) return; const t = window.setTimeout(() => setNotice(''), 2600); return () => window.clearTimeout(t); }, [notice]);

  const activeList = useMemo(() => state.lists.find(l => l.id === state.activeListId) || state.lists[0], [state]);
  const items = activeList?.itens || [];
  const pending = items.filter(i => i.status === 'pendente');
  const bought = items.filter(i => i.status === 'comprado');
  const estimated = items.reduce((s,i) => s + i.precoEstimado * i.quantidade, 0);
  const actual = bought.reduce((s,i) => s + (i.precoReal ?? i.precoEstimado) * i.quantidade, 0);
  const projected = actual + pending.reduce((s,i) => s + i.precoEstimado * i.quantidade, 0);
  const progress = items.length ? Math.round(bought.length / items.length * 100) : 0;

  const updateActiveList = (updater: (l: LocalShoppingList) => LocalShoppingList) => setState(s => ({ ...s, lists: s.lists.map(l => l.id === s.activeListId ? updater(l) : l) }));

  const historyStats = useMemo(() => {
    const map = new Map<string, { name:string; category:string; count:number; qty:number; prices:number[]; dates:string[]; markets:Map<string, number[]> }>();
    state.purchases.forEach(p => p.itens.forEach(i => {
      const key = normalize(i.nome); const cur = map.get(key) || { name:i.nome, category:i.categoria, count:0, qty:0, prices:[], dates:[], markets:new Map() };
      cur.count += 1; cur.qty += i.quantidade; cur.prices.push(i.precoUnitario); cur.dates.push(p.data);
      const market = i.mercado || p.mercado || 'Não informado'; cur.markets.set(market, [...(cur.markets.get(market)||[]), i.precoUnitario]); map.set(key, cur);
    }));
    return map;
  }, [state.purchases]);

  const historySuggestions = useMemo(() => {
    const existing = new Set(items.map(i => normalize(i.nome)));
    return [...historyStats.values()].filter(x => !existing.has(normalize(x.name))).sort((a,b) => historyMode === 'frequentes' ? b.count-a.count : new Date(b.dates[0]).getTime()-new Date(a.dates[0]).getTime()).slice(0,10);
  }, [historyStats, items, historyMode]);

  const pantry = useMemo(() => [...historyStats.values()].map(x => {
    const dates = [...x.dates].sort((a,b) => new Date(b).getTime()-new Date(a).getTime());
    let avgInterval = 30;
    if (dates.length > 1) {
      const intervals = dates.slice(0,-1).map((d,idx) => daysBetween(d, dates[idx+1]));
      avgInterval = Math.max(7, Math.round(intervals.reduce((a,b)=>a+b,0)/intervals.length));
    }
    const since = daysBetween(dates[0]);
    const ratio = since / avgInterval;
    return { ...x, avgInterval, since, ratio, avgQty: Math.max(1, Math.round(x.qty/x.count)) };
  }).sort((a,b)=>b.ratio-a.ratio), [historyStats]);

  const addHistoryItem = (name:string, qty:number, category:string, price:number) => {
    updateActiveList(l => ({ ...l, atualizadaEm:new Date().toISOString(), itens:[...l.itens, { id:createLocalId('item'), nome:name, quantidade:qty, categoria:category, precoEstimado:price, status:'pendente', favorito:false, criadoEm:new Date().toISOString() }] }));
    setNotice(`${name} adicionado`);
  };

  const addParsedItems = () => {
    const parsed = parseNaturalItems(quickText, state.categories); if (!parsed.length) return;
    updateActiveList(list => {
      const next = list.itens.map(i=>({...i}));
      parsed.forEach(entry => {
        const existing = next.find(i => normalize(i.nome)===normalize(entry.name) && i.status==='pendente');
        const hist = historyStats.get(normalize(entry.name));
        const avg = hist?.prices.length ? hist.prices.reduce((a,b)=>a+b,0)/hist.prices.length : 0;
        if (existing) existing.quantidade += entry.quantity;
        else next.push({ id:createLocalId('item'), nome:entry.name, quantidade:entry.quantity, categoria:entry.category, precoEstimado:Number(avg.toFixed(2)), status:'pendente', favorito:false, criadoEm:new Date().toISOString() });
      });
      return { ...list, itens:next, atualizadaEm:new Date().toISOString() };
    });
    setQuickText(''); setNotice(`${parsed.length} item(ns) adicionado(s)`);
  };

  const toggleItem = (itemId:string) => updateActiveList(list => ({ ...list, atualizadaEm:new Date().toISOString(), itens:list.itens.map(i => i.id===itemId ? { ...i, status:i.status==='pendente'?'comprado':'pendente', compradoEm:i.status==='pendente'?new Date().toISOString():undefined, mercadoCompra:i.status==='pendente'?(state.currentMarket||list.mercado):undefined } : i) }));

  const setMarket = (name:string) => {
    setState(s => ({ ...s, currentMarket:name, marketMode:true, lists:s.lists.map(l => l.id===s.activeListId ? {...l, mercado:name} : l) }));
    setShowMarketStart(false); setView('mercado'); setNotice(`Comprando em ${name}`);
  };

  const finishPurchase = () => {
    if (!bought.length) return setNotice('Marque os itens comprados primeiro');
    const purchase = { id:createLocalId('compra'), listaId:activeList.id, listaNome:activeList.nome, mercado:activeList.mercado, data:new Date().toISOString(), itens:bought.map(i => { const unit=i.precoReal??i.precoEstimado; return { nome:i.nome, quantidade:i.quantidade, categoria:i.categoria, precoUnitario:unit, total:unit*i.quantidade, mercado:i.mercadoCompra||state.currentMarket||activeList.mercado, ean:i.ean }; }), total:actual };
    setState(s => ({ ...s, marketMode:false, purchases:[purchase,...s.purchases], lists:s.lists.map(l => l.id===s.activeListId ? {...l, atualizadaEm:new Date().toISOString(), itens:l.itens.filter(i=>i.status!=='comprado')} : l) }));
    setView('resumo'); setNotice('Compra finalizada e base de preços atualizada');
  };

  const createList = () => {
    const name=newListName.trim(); if(!name)return; const now=new Date().toISOString();
    const list:LocalShoppingList={id:createLocalId('lista'),nome:name,criadaEm:now,atualizadaEm:now,arquivada:false,itens:[]};
    setState(s=>({...s,activeListId:list.id,lists:[list,...s.lists]})); setNewListName('');setShowNewList(false);setView('lista');
  };

  const marketComparison = useMemo(() => {
    const markets = new Map<string,{sum:number; count:number; coverage:Set<string>}>();
    state.purchases.forEach(p=>p.itens.forEach(i=>{ const m=i.mercado||p.mercado; if(!m)return; const cur=markets.get(m)||{sum:0,count:0,coverage:new Set<string>()}; cur.sum+=i.precoUnitario;cur.count++;cur.coverage.add(normalize(i.nome));markets.set(m,cur); }));
    return [...markets.entries()].map(([name,data])=>{
      let total=0, covered=0;
      items.forEach(item=>{ const hist=historyStats.get(normalize(item.nome)); const prices=hist?.markets.get(name); if(prices?.length){ total += prices.reduce((a,b)=>a+b,0)/prices.length*item.quantidade; covered++; }});
      return {name,total,covered,avg:data.sum/data.count};
    }).filter(x=>x.covered>0).sort((a,b)=>b.covered-a.covered || a.total-b.total);
  },[state.purchases,items,historyStats]);

  const totalSpent = state.purchases.reduce((s,p)=>s+p.total,0);
  const avgTicket = state.purchases.length ? totalSpent/state.purchases.length : 0;
  const likelyNeeded = pantry.filter(x=>x.ratio>=.8 && !items.some(i=>normalize(i.nome)===normalize(x.name))).slice(0,6);
  const topMarket = marketComparison[0];

  const navigation: Array<{key:View;label:string;icon:string}> = [
    {key:'inicio',label:'Início',icon:'⌂'},{key:'listas',label:'Listas',icon:'☷'},{key:'lista',label:'Lista',icon:'＋'},{key:'mercado',label:'Comprar',icon:'✓'},{key:'precos',label:'Preços',icon:'↕'}
  ];

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white">🛒</div><div><h1 className="font-bold leading-tight">Shopping Pro</h1><p className="text-xs text-slate-500">Inteligência de consumo</p></div></div>
        <button onClick={()=>setShowSettings(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">Configurar</button>
      </div>
    </header>

    <main className="mx-auto max-w-6xl px-4 pb-28 pt-5">
      {notice && <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xl">{notice}</div>}

      {view==='inicio' && <div className="space-y-5">
        <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-blue-500 p-5 text-white shadow-sm">
          <p className="text-sm text-blue-100">Próxima compra</p><h2 className="mt-1 text-2xl font-bold">{activeList.nome}</h2>
          <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/10 p-3"><span className="text-xs text-blue-100">Estimativa</span><strong className="mt-1 block text-xl">{money(projected)}</strong></div><div className="rounded-2xl bg-white/10 p-3"><span className="text-xs text-blue-100">Orçamento</span><strong className="mt-1 block text-xl">{money(state.budget||0)}</strong></div></div>
          <button onClick={()=>setShowMarketStart(true)} className="mt-4 w-full rounded-2xl bg-white px-4 py-3 font-bold text-blue-700">Iniciar compra</button>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><div className="flex items-center justify-between"><h3 className="font-bold">Assistente de compra</h3><Pill tone="blue">local</Pill></div><p className="mt-3 text-sm text-slate-600">{likelyNeeded.length ? `Há ${likelyNeeded.length} produto(s) que provavelmente estão próximos da reposição.` : 'Ainda não há reposições urgentes pelo seu histórico.'}</p>{topMarket && <p className="mt-2 text-sm text-slate-600">Para a lista atual, <strong>{topMarket.name}</strong> tem histórico para {topMarket.covered} item(ns).</p>}</Card>
          <Card><h3 className="font-bold">Despensa estimada</h3><p className="mt-2 text-3xl font-bold">{likelyNeeded.length}</p><p className="text-sm text-slate-500">provavelmente acabando</p><button onClick={()=>setView('resumo')} className="mt-3 text-sm font-semibold text-blue-700">Ver previsão →</button></Card>
          <Card><h3 className="font-bold">Seu consumo</h3><p className="mt-2 text-3xl font-bold">{money(avgTicket)}</p><p className="text-sm text-slate-500">ticket médio histórico</p><button onClick={()=>setView('resumo')} className="mt-3 text-sm font-semibold text-blue-700">Abrir resumo →</button></Card>
        </div>

        <Card><div className="flex items-center justify-between"><div><h3 className="font-bold">Sugestão para a próxima compra</h3><p className="text-sm text-slate-500">Baseada na frequência e na última compra.</p></div><Pill tone="green">aprendizado</Pill></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{likelyNeeded.map(x=><button key={x.name} onClick={()=>addHistoryItem(x.name,x.avgQty,x.category,x.prices.reduce((a,b)=>a+b,0)/x.prices.length)} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3 text-left"><div><strong className="text-sm">{x.name}</strong><p className="text-xs text-slate-500">a cada ~{x.avgInterval} dias · {x.since} dias desde a última</p></div><span className="text-blue-600">＋</span></button>)}</div></Card>
      </div>}

      {view==='listas' && <section><div className="mb-5 flex items-center justify-between"><div><h2 className="text-2xl font-bold">Minhas listas</h2><p className="text-sm text-slate-500">Uma lista para cada contexto.</p></div><button onClick={()=>setShowNewList(true)} className="rounded-2xl bg-blue-600 px-4 py-2.5 font-semibold text-white">+ Nova</button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{state.lists.filter(l=>!l.arquivada).map(l=><button key={l.id} onClick={()=>{setState(s=>({...s,activeListId:l.id}));setView('lista')}} className={`rounded-3xl border p-5 text-left ${l.id===state.activeListId?'border-blue-300 bg-blue-50':'border-slate-200 bg-white'}`}><div className="flex justify-between"><span className="text-2xl">🧾</span><Pill tone={l.id===state.activeListId?'blue':'slate'}>{l.itens.length} itens</Pill></div><h3 className="mt-4 text-lg font-bold">{l.nome}</h3><p className="mt-1 text-sm text-slate-500">{l.descricao||'Sem descrição'}</p><p className="mt-4 text-sm font-semibold">{money(l.itens.reduce((s,i)=>s+i.precoEstimado*i.quantidade,0))}</p></button>)}</div></section>}

      {view==='lista' && <div className="space-y-4">
        <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-blue-500 p-5 text-white"><div className="flex items-start justify-between"><div><p className="text-sm text-blue-100">Lista ativa</p><h2 className="text-2xl font-bold">{activeList.nome}</h2><p className="text-sm text-blue-100">{items.length} itens · {money(projected)}</p></div><button onClick={()=>setShowMarketStart(true)} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-blue-700">Comprar</button></div></section>
        <Card><h3 className="font-bold">Adição rápida</h3><p className="mb-3 text-sm text-slate-500">Digite vários itens ou aproveite seu histórico abaixo.</p><div className="flex gap-2"><input value={quickText} onChange={e=>setQuickText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addParsedItems()}} placeholder="2 leite, arroz 5kg, 3 detergentes" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"/><button onClick={addParsedItems} className="rounded-2xl bg-blue-600 px-4 font-bold text-white">Adicionar</button></div>
          <div className="mt-4 flex gap-2"><button onClick={()=>setHistoryMode('frequentes')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${historyMode==='frequentes'?'bg-blue-600 text-white':'bg-slate-100'}`}>Mais frequentes</button><button onClick={()=>setHistoryMode('recentes')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${historyMode==='recentes'?'bg-blue-600 text-white':'bg-slate-100'}`}>Comprados recentemente</button></div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{historySuggestions.map(x=><button key={x.name} onClick={()=>addHistoryItem(x.name,Math.max(1,Math.round(x.qty/x.count)),x.category,x.prices.reduce((a,b)=>a+b,0)/x.prices.length)} className="min-w-[160px] rounded-2xl border border-slate-200 p-3 text-left"><strong className="block text-sm">{x.name}</strong><span className="text-xs text-slate-500">{x.count} compra(s) · {money(x.prices[x.prices.length-1])}</span></button>)}</div>
        </Card>
        <Card><div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Itens</h3><span className="text-sm text-slate-500">{pending.length} pendentes</span></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar item" className="mb-3 w-full rounded-2xl border border-slate-200 px-4 py-2.5"/><div className="space-y-2">{items.filter(i=>normalize(i.nome).includes(normalize(search))).map(i=>{const hist=historyStats.get(normalize(i.nome));const avg=hist?.prices.length?hist.prices.reduce((a,b)=>a+b,0)/hist.prices.length:0;return <button key={i.id} onClick={()=>setEditing({...i})} className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-3 text-left"><div><strong className={i.status==='comprado'?'text-slate-400 line-through':''}>{i.quantidade}x {i.nome}</strong><p className="text-xs text-slate-500">{i.categoria}{avg?` · média ${money(avg)}`:''}</p></div><span className="font-semibold">{money((i.precoReal??i.precoEstimado)*i.quantidade)}</span></button>})}</div></Card>
      </div>}

      {view==='mercado' && <div className="space-y-4">
        <Card className="sticky top-20 z-20"><div className="flex items-center justify-between gap-3"><div><p className="text-xs text-slate-500">Comprando em</p><h2 className="text-xl font-bold">{state.currentMarket||activeList.mercado||'Selecione o mercado'}</h2></div><button onClick={()=>setShowMarketStart(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">Trocar mercado</button></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-600" style={{width:`${progress}%`}}/></div><div className="mt-2 flex justify-between text-xs text-slate-500"><span>{bought.length}/{items.length} itens</span><span>{money(actual)} já comprado</span></div></Card>
        <div className="space-y-2">{items.map(i=>{const hist=historyStats.get(normalize(i.nome));const avg=hist?.prices.length?hist.prices.reduce((a,b)=>a+b,0)/hist.prices.length:0;const current=i.precoReal??i.precoEstimado;const high=avg>0&&current>avg*1.1;return <Card key={i.id} className={i.status==='comprado'?'opacity-75':''}><div className="flex gap-3"><button onClick={()=>toggleItem(i.id)} className={`mt-1 h-8 w-8 shrink-0 rounded-xl border text-lg font-bold ${i.status==='comprado'?'border-blue-600 bg-blue-600 text-white':'border-slate-300'}`}>{i.status==='comprado'?'✓':''}</button><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><strong>{i.quantidade}x {i.nome}</strong><p className="text-xs text-slate-500">{i.categoria}{i.mercadoCompra?` · ${i.mercadoCompra}`:''}</p></div>{high&&<Pill tone="red">acima do histórico</Pill>}</div><div className="mt-3 flex items-center gap-2"><span className="text-sm text-slate-500">Preço unit.</span><input type="number" step="0.01" value={i.precoReal??''} placeholder={i.precoEstimado?String(i.precoEstimado):'0,00'} onChange={e=>updateActiveList(l=>({...l,itens:l.itens.map(x=>x.id===i.id?{...x,precoReal:Number(e.target.value)}:x)}))} className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-right font-semibold"/></div>{avg>0&&<p className="mt-2 text-xs text-slate-500">Sua média: {money(avg)}</p>}</div></div></Card>})}</div>
        <button onClick={finishPurchase} className="w-full rounded-2xl bg-blue-600 px-4 py-4 font-bold text-white">Finalizar compra · {money(actual)}</button>
      </div>}

      {view==='precos' && <div className="space-y-4"><div><h2 className="text-2xl font-bold">Inteligência de preços</h2><p className="text-sm text-slate-500">Comparação construída com as suas compras reais.</p></div>
        <Card><h3 className="font-bold">Onde sua lista tende a custar menos</h3><div className="mt-3 space-y-2">{marketComparison.length?marketComparison.map((m,idx)=><div key={m.name} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"><div><div className="flex items-center gap-2"><strong>{m.name}</strong>{idx===0&&<Pill tone="green">melhor cobertura</Pill>}</div><p className="text-xs text-slate-500">{m.covered}/{items.length} produtos com histórico</p></div><strong>{money(m.total)}</strong></div>):<p className="text-sm text-slate-500">Finalize mais compras para comparar mercados.</p>}</div></Card>
        <div className="grid gap-3 md:grid-cols-2">{[...historyStats.values()].sort((a,b)=>b.count-a.count).map(x=>{const avg=x.prices.reduce((a,b)=>a+b,0)/x.prices.length;const min=Math.min(...x.prices);const latest=x.prices[0];const best=[...x.markets.entries()].map(([m,p])=>[m,p.reduce((a,b)=>a+b,0)/p.length] as const).sort((a,b)=>a[1]-b[1])[0];return <Card key={x.name}><div className="flex justify-between"><div><h3 className="font-bold">{x.name}</h3><p className="text-xs text-slate-500">{x.count} compra(s)</p></div><Pill tone="blue">{x.category}</Pill></div><div className="mt-4 grid grid-cols-3 gap-2 text-sm"><div><span className="text-xs text-slate-500">Média</span><strong className="block">{money(avg)}</strong></div><div><span className="text-xs text-slate-500">Menor</span><strong className="block">{money(min)}</strong></div><div><span className="text-xs text-slate-500">Melhor mercado</span><strong className="block truncate">{best?.[0]||'-'}</strong></div></div></Card>})}</div>
      </div>}

      {view==='resumo' && <div className="space-y-4"><div><h2 className="text-2xl font-bold">Resumo e despensa</h2><p className="text-sm text-slate-500">O sistema aprende sua frequência sem exigir controle manual de estoque.</p></div><div className="grid gap-3 sm:grid-cols-3"><Card><span className="text-sm text-slate-500">Total histórico</span><strong className="mt-1 block text-2xl">{money(totalSpent)}</strong></Card><Card><span className="text-sm text-slate-500">Ticket médio</span><strong className="mt-1 block text-2xl">{money(avgTicket)}</strong></Card><Card><span className="text-sm text-slate-500">Compras registradas</span><strong className="mt-1 block text-2xl">{state.purchases.length}</strong></Card></div>
        <Card><h3 className="font-bold">Despensa estimada</h3><div className="mt-3 space-y-2">{pantry.slice(0,12).map(x=>{const tone=x.ratio>=1?'red':x.ratio>=.8?'amber':'green';const label=x.ratio>=1?'provavelmente acabou':x.ratio>=.8?'provavelmente acabando':'provavelmente ainda possui';return <div key={x.name} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"><div><strong className="text-sm">{x.name}</strong><p className="text-xs text-slate-500">última há {x.since} dias · ciclo ~{x.avgInterval} dias</p></div><Pill tone={tone}>{label}</Pill></div>})}</div></Card>
        <Card><h3 className="font-bold">Histórico de compras</h3><div className="mt-3 space-y-2">{state.purchases.map(p=><details key={p.id} className="rounded-2xl border border-slate-200 p-3"><summary className="cursor-pointer list-none"><div className="flex justify-between"><div><strong>{p.mercado||p.listaNome}</strong><p className="text-xs text-slate-500">{new Date(p.data).toLocaleDateString('pt-BR')} · {p.itens.length} itens</p></div><strong>{money(p.total)}</strong></div></summary><div className="mt-3 border-t border-slate-100 pt-2">{p.itens.map((i,idx)=><div key={idx} className="flex justify-between py-1 text-sm"><span>{i.quantidade}x {i.nome} <span className="text-slate-400">{i.mercado&&i.mercado!==p.mercado?`(${i.mercado})`:''}</span></span><span>{money(i.total)}</span></div>)}</div></details>)}</div></Card>
      </div>}
    </main>

    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto grid max-w-3xl grid-cols-5">{navigation.map(n=><button key={n.key} onClick={()=>setView(n.key)} className={`flex flex-col items-center gap-1 px-1 py-3 text-xs font-semibold ${view===n.key?'text-blue-700':'text-slate-500'}`}><span className="text-xl">{n.icon}</span>{n.label}</button>)}</div></nav>

    {showNewList&&<div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 sm:items-center sm:justify-center"><div className="w-full rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl"><h3 className="text-xl font-bold">Nova lista</h3><input autoFocus value={newListName} onChange={e=>setNewListName(e.target.value)} placeholder="Ex.: Compras de setembro" className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3"/><div className="mt-4 flex gap-2"><button onClick={()=>setShowNewList(false)} className="flex-1 rounded-2xl border px-4 py-3 font-semibold">Cancelar</button><button onClick={createList} className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white">Criar</button></div></div></div>}

    {showMarketStart&&<div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 sm:items-center sm:justify-center"><div className="w-full rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl"><h3 className="text-xl font-bold">Onde você está comprando?</h3><p className="mt-1 text-sm text-slate-500">Esse mercado será aplicado automaticamente aos próximos itens. Você pode trocar a qualquer momento.</p><div className="mt-4 grid grid-cols-2 gap-2">{state.markets.map(m=><button key={m.id} onClick={()=>setMarket(m.nome)} className={`rounded-2xl border p-4 text-left font-semibold ${state.currentMarket===m.nome?'border-blue-400 bg-blue-50 text-blue-700':'border-slate-200'}`}>{m.nome}</button>)}</div><button onClick={()=>setShowMarketStart(false)} className="mt-4 w-full rounded-2xl border px-4 py-3 font-semibold">Cancelar</button></div></div>}

    {editing&&<div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 sm:items-center sm:justify-center"><div className="w-full rounded-t-3xl bg-white p-5 sm:max-w-lg sm:rounded-3xl"><div className="flex items-center justify-between"><h3 className="text-xl font-bold">Editar item</h3><button onClick={()=>setEditing(null)}>✕</button></div><div className="mt-4 grid gap-3"><input value={editing.nome} onChange={e=>setEditing({...editing,nome:e.target.value})} className="rounded-2xl border px-4 py-3"/><div className="grid grid-cols-2 gap-2"><input type="number" min="1" value={editing.quantidade} onChange={e=>setEditing({...editing,quantidade:Number(e.target.value)})} className="rounded-2xl border px-4 py-3"/><input type="number" step="0.01" value={editing.precoEstimado} onChange={e=>setEditing({...editing,precoEstimado:Number(e.target.value)})} className="rounded-2xl border px-4 py-3"/></div><select value={editing.categoria} onChange={e=>setEditing({...editing,categoria:e.target.value})} className="rounded-2xl border px-4 py-3">{state.categories.map(c=><option key={c}>{c}</option>)}</select><input value={editing.ean||''} onChange={e=>setEditing({...editing,ean:e.target.value})} placeholder="EAN / código de barras (opcional)" className="rounded-2xl border px-4 py-3"/></div><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={()=>{updateActiveList(l=>({...l,itens:l.itens.filter(i=>i.id!==editing.id)}));setEditing(null)}} className="rounded-2xl border border-red-200 px-4 py-3 font-semibold text-red-600">Remover</button><button onClick={()=>{updateActiveList(l=>({...l,itens:l.itens.map(i=>i.id===editing.id?editing:i)}));setEditing(null);setNotice('Item atualizado')}} className="rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white">Salvar</button></div></div></div>}

    {showSettings&&<div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 sm:items-center sm:justify-center"><div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-lg sm:rounded-3xl"><div className="flex justify-between"><div><h3 className="text-xl font-bold">Configurações</h3><p className="text-sm text-slate-500">Categorias, mercados e orçamento.</p></div><button onClick={()=>setShowSettings(false)}>✕</button></div>
      <div className="mt-5"><label className="text-sm font-semibold">Orçamento da compra</label><input type="number" value={state.budget||''} onChange={e=>setState(s=>({...s,budget:Number(e.target.value)}))} className="mt-2 w-full rounded-2xl border px-4 py-3"/></div>
      <div className="mt-5"><h4 className="font-bold">Categorias</h4><div className="mt-2 flex flex-wrap gap-2">{state.categories.map(c=><span key={c} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm">{c}<button onClick={()=>{if(state.categories.length<=1)return;setState(s=>({...s,categories:s.categories.filter(x=>x!==c)}))}} className="text-slate-400">×</button></span>)}</div><div className="mt-3 flex gap-2"><input value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="Nova categoria" className="min-w-0 flex-1 rounded-2xl border px-4 py-3"/><button onClick={()=>{const c=newCategory.trim();if(c&&!state.categories.some(x=>normalize(x)===normalize(c))){setState(s=>({...s,categories:[...s.categories,c]}));setNewCategory('')}}} className="rounded-2xl bg-blue-600 px-4 font-bold text-white">Adicionar</button></div></div>
      <div className="mt-5"><h4 className="font-bold">Meus mercados</h4><div className="mt-2 space-y-2">{state.markets.map(m=><div key={m.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2"><span>{m.nome}</span><button onClick={()=>setState(s=>({...s,markets:s.markets.filter(x=>x.id!==m.id)}))} className="text-sm text-red-500">Remover</button></div>)}</div><div className="mt-3 flex gap-2"><input value={newMarket} onChange={e=>setNewMarket(e.target.value)} placeholder="Novo mercado" className="min-w-0 flex-1 rounded-2xl border px-4 py-3"/><button onClick={()=>{const n=newMarket.trim();if(n&&!state.markets.some(x=>normalize(x.nome)===normalize(n))){const m:LocalMarket={id:createLocalId('mercado'),nome:n};setState(s=>({...s,markets:[...s.markets,m]}));setNewMarket('')}}} className="rounded-2xl bg-blue-600 px-4 font-bold text-white">Adicionar</button></div></div>
      <button onClick={()=>{if(confirm('Restaurar os dados de demonstração?'))setState(resetLocalShoppingState())}} className="mt-6 w-full rounded-2xl border border-red-200 px-4 py-3 font-semibold text-red-600">Restaurar demonstração</button>
    </div></div>}
  </div>;
}

export default App;
