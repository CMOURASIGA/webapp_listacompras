import { useMemo, useState } from 'react';
import type { AppData, ShoppingList, ShoppingListItem } from '../../types/domain';
import { shoppingRepository } from '../../repositories/shoppingRepository';
import { friendlyError } from '../../lib/errors';
import { parseNaturalItems } from '../../services/shoppingIntelligence';
import { Card, EmptyState, Pill } from '../../components/ui';

export function ListsPage({ userId, data, activeList, selectList, reload, startShopping, notify }: { userId: string; data: AppData; activeList?: ShoppingList; selectList: (id: string) => void; reload: () => Promise<void>; startShopping: () => void; notify: (text: string) => void }) {
  const [showNew, setShowNew] = useState(false); const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [budget, setBudget] = useState(''); const [quick, setQuick] = useState(''); const [busy, setBusy] = useState(false); const [busyItem, setBusyItem] = useState('');
  const [newItem, setNewItem] = useState(false); const [itemName, setItemName] = useState(''); const [itemQty, setItemQty] = useState('1'); const [itemPrice, setItemPrice] = useState('');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const items = useMemo(() => data.items.filter(i => i.list_id === activeList?.id && i.status !== 'removed'), [data.items, activeList]);
  const createList = async () => { if (!name.trim()) return; try { setBusy(true); const list = await shoppingRepository.createList(userId, { name: name.trim(), description: description.trim() || null, budget: budget ? Number(budget) : null }); await reload(); selectList(list.id); setShowNew(false); setName(''); notify('Lista criada'); } catch (e) { notify(friendlyError(e)); } finally { setBusy(false); } };
  const addQuick = async () => { const parsed = parseNaturalItems(quick); if (!activeList || !parsed.length) return; try { setBusy(true); await shoppingRepository.addItems(userId, activeList.id, parsed.map(item => ({ name_snapshot: item.name, quantity: item.quantity, category_id: null, estimated_price: null, product_id: null }))); setQuick(''); await reload(); notify(`${parsed.length} item(ns) adicionado(s)`); } catch (e) { notify(friendlyError(e)); } finally { setBusy(false); } };
  const addItem = async () => {
    if (!activeList || !itemName.trim()) return;
    const quantity = Number(itemQty.replace(',', '.')) || 1;
    const price = itemPrice.trim() ? Number(itemPrice.replace(',', '.')) : null;
    if (itemPrice.trim() && Number.isNaN(price)) return notify('Preço inválido');
    try {
      setBusy(true);
      await shoppingRepository.addItems(userId, activeList.id, [{ name_snapshot: itemName.trim(), quantity, category_id: null, estimated_price: price, product_id: null }]);
      await reload(); setNewItem(false); setItemName(''); setItemQty('1'); setItemPrice(''); notify('Item adicionado');
    } catch (e) { notify(friendlyError(e)); } finally { setBusy(false); }
  };
  const changeQuantity = async (item: ShoppingListItem, delta: number) => {
    const next = Math.max(1, Number(item.quantity) + delta);
    if (next === Number(item.quantity)) return;
    try { setBusyItem(item.id); await shoppingRepository.updateItem(item.id, { quantity: next }); await reload(); } catch (e) { notify(friendlyError(e)); } finally { setBusyItem(''); }
  };
  const commitPrice = async (item: ShoppingListItem) => {
    const raw = priceDrafts[item.id]; if (raw === undefined) return;
    const trimmed = raw.trim(); const value = trimmed ? Number(trimmed.replace(',', '.')) : null;
    if (trimmed && Number.isNaN(value)) { notify('Preço inválido'); return; }
    if (value === (item.estimated_price ?? null)) return;
    try { setBusyItem(item.id); await shoppingRepository.updateItem(item.id, { estimated_price: value }); await reload(); } catch (e) { notify(friendlyError(e)); } finally { setBusyItem(''); }
  };
  const remove = async (id: string) => { try { setBusyItem(id); await shoppingRepository.removeItem(id); await reload(); } catch (e) { notify(friendlyError(e)); } finally { setBusyItem(''); } };
  return <div className="space-y-4"><div className="flex items-start justify-between"><div><h2 className="text-2xl font-bold">Minhas listas</h2><p className="text-sm text-slate-500">Planeje diferentes tipos de compra.</p></div><button onClick={() => setShowNew(true)} className="rounded-2xl bg-brand-600 px-4 py-2.5 font-bold text-white">+ Nova</button></div>
    {data.lists.length ? <div className="flex gap-2 overflow-x-auto pb-1">{data.lists.map(list => <button key={list.id} onClick={() => selectList(list.id)} className={`min-w-[190px] rounded-2xl border p-3 text-left ${activeList?.id === list.id ? 'border-brand-400 bg-brand-50' : 'bg-white'}`}><div className="flex justify-between"><strong>{list.name}</strong><Pill tone={activeList?.id === list.id ? 'brand' : 'neutral'}>{data.items.filter(i => i.list_id === list.id && i.status === 'pending').length}</Pill></div><p className="mt-1 truncate text-xs text-slate-500">{list.description || 'Sem descrição'}</p></button>)}</div> : <EmptyState title="Nenhuma lista criada" description="Crie uma lista para começar a planejar."/>}
    {activeList && <><Card><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Lista ativa</p><h3 className="text-xl font-bold">{activeList.name}</h3></div><button onClick={startShopping} disabled={!items.some(i => i.status === 'pending')} className="rounded-2xl bg-brand-600 px-4 py-2.5 font-bold text-white disabled:opacity-40">Comprar</button></div></Card>
      <Card><h3 className="font-bold">Adição rápida</h3><p className="mb-3 text-sm text-slate-500">Ex.: 2 leite, arroz 5kg, 3 detergentes — depois ajuste quantidade e preço na lista abaixo.</p><div className="flex gap-2"><input value={quick} onChange={e => setQuick(e.target.value)} onKeyDown={e => e.key === 'Enter' && void addQuick()} className="min-w-0 flex-1 rounded-2xl border px-4 py-3" placeholder="Digite os produtos"/><button disabled={busy} onClick={() => void addQuick()} className="rounded-2xl bg-brand-600 px-4 font-bold text-white">Adicionar</button></div><button onClick={() => setNewItem(true)} className="mt-3 w-full rounded-2xl border border-dashed border-slate-300 py-2.5 text-sm font-semibold text-slate-600">+ Adicionar item com quantidade e preço</button></Card>
      <Card><div className="mb-3 flex justify-between"><h3 className="font-bold">Itens</h3><span className="text-sm text-slate-500">{items.filter(i => i.status === 'pending').length} pendentes</span></div><div className="space-y-2">{items.length ? items.map(item => {
        const pending = item.status === 'pending';
        const priceValue = priceDrafts[item.id] ?? (item.estimated_price != null ? String(item.estimated_price) : '');
        return <div key={item.id} className={`rounded-2xl border border-slate-100 p-3 ${busyItem === item.id ? 'opacity-60' : ''}`}>
          <div className="flex items-start justify-between gap-2"><strong className={!pending ? 'text-slate-400 line-through' : ''}>{item.name_snapshot}</strong>{pending && <button onClick={() => void remove(item.id)} className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-danger-600">Remover</button>}</div>
          {pending ? <div className="mt-2 flex flex-wrap items-center gap-3"><div className="flex items-center gap-1 rounded-xl border border-slate-200"><button onClick={() => void changeQuantity(item, -1)} disabled={Number(item.quantity) <= 1} className="grid h-11 w-11 place-items-center text-lg font-bold text-slate-600 disabled:opacity-30">−</button><span className="min-w-[2ch] text-center font-semibold">{item.quantity}</span><button onClick={() => void changeQuantity(item, 1)} className="grid h-11 w-11 place-items-center text-lg font-bold text-slate-600">+</button></div><label className="flex items-center gap-2 text-sm text-slate-500">R$<input inputMode="decimal" value={priceValue} onChange={e => setPriceDrafts(current => ({ ...current, [item.id]: e.target.value }))} onBlur={() => void commitPrice(item)} placeholder="0,00" className="w-24 rounded-xl border px-3 py-2 text-right font-semibold"/></label></div>
            : <p className="mt-1 text-xs text-slate-500">{item.quantity}x · {item.estimated_price ? `R$ ${Number(item.estimated_price).toFixed(2)}` : 'sem preço'}</p>}
        </div>;
      }) : <p className="py-6 text-center text-sm text-slate-500">Adicione o primeiro item acima.</p>}</div></Card></>}
    {showNew && <div onClick={() => setShowNew(false)} className="fixed inset-0 z-50 flex items-end bg-slate-950/40 sm:items-center sm:justify-center"><div onClick={e => e.stopPropagation()} className="w-full rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl"><h3 className="text-xl font-bold">Nova lista</h3><div className="mt-4 space-y-3"><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Compra do mês" className="w-full rounded-2xl border px-4 py-3"/><input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição opcional" className="w-full rounded-2xl border px-4 py-3"/><input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Orçamento opcional" className="w-full rounded-2xl border px-4 py-3"/></div><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => setShowNew(false)} className="rounded-2xl border py-3 font-semibold">Cancelar</button><button disabled={busy} onClick={() => void createList()} className="rounded-2xl bg-brand-600 py-3 font-bold text-white">Criar</button></div></div></div>}
    {newItem && <div onClick={() => setNewItem(false)} className="fixed inset-0 z-50 flex items-end bg-slate-950/40 sm:items-center sm:justify-center"><div onClick={e => e.stopPropagation()} className="w-full rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl"><h3 className="text-xl font-bold">Novo item</h3><div className="mt-4 space-y-3"><input autoFocus value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Ex.: Arroz 5kg" className="w-full rounded-2xl border px-4 py-3"/><div className="flex gap-3"><label className="flex-1 text-sm font-semibold text-slate-600">Quantidade<input inputMode="decimal" value={itemQty} onChange={e => setItemQty(e.target.value)} className="mt-1 w-full rounded-2xl border px-4 py-3 text-center font-normal"/></label><label className="flex-1 text-sm font-semibold text-slate-600">Preço estimado<input inputMode="decimal" value={itemPrice} onChange={e => setItemPrice(e.target.value)} placeholder="Opcional" className="mt-1 w-full rounded-2xl border px-4 py-3 text-center font-normal"/></label></div></div><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => setNewItem(false)} className="rounded-2xl border py-3 font-semibold">Cancelar</button><button disabled={busy} onClick={() => void addItem()} className="rounded-2xl bg-brand-600 py-3 font-bold text-white">Adicionar</button></div></div></div>}
  </div>;
}

