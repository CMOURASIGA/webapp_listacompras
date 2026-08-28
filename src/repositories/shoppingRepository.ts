import { supabase } from '../lib/supabase';
import type { AppData, Market, ShoppingList, ShoppingListItem } from '../types/domain';

const unwrap = <T,>(result: { data: T | null; error: { message: string } | null }): T => {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
};

export const shoppingRepository = {
  async load(userId: string): Promise<AppData> {
    const [profile, categories, markets, lists, items, sessions, purchases] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('categories').select('*').order('is_system', { ascending: false }).order('name'),
      supabase.from('markets').select('*').order('favorite', { ascending: false }).order('name'),
      supabase.from('shopping_lists').select('*').neq('status', 'archived').order('updated_at', { ascending: false }),
      supabase.from('shopping_list_items').select('*').neq('status', 'removed').order('created_at'),
      supabase.from('shopping_sessions').select('*').order('started_at', { ascending: false }),
      supabase.from('purchase_items').select('*').order('purchased_at', { ascending: false }),
    ]);
    return {
      profile: unwrap(profile), categories: unwrap(categories) || [], markets: unwrap(markets) || [],
      lists: unwrap(lists) || [], items: unwrap(items) || [], sessions: unwrap(sessions) || [], purchases: unwrap(purchases) || [],
    } as AppData;
  },

  async createList(userId: string, values: Pick<ShoppingList, 'name' | 'description' | 'budget'>) {
    return unwrap(await supabase.from('shopping_lists').insert({ ...values, user_id: userId }).select().single()) as ShoppingList;
  },
  async updateList(id: string, values: Partial<Pick<ShoppingList, 'name' | 'description' | 'budget' | 'status'>>) {
    return unwrap(await supabase.from('shopping_lists').update(values).eq('id', id).select().single()) as ShoppingList;
  },
  async addItems(userId: string, listId: string, items: Array<Pick<ShoppingListItem, 'name_snapshot' | 'quantity' | 'category_id' | 'estimated_price' | 'product_id'>>) {
    return unwrap(await supabase.from('shopping_list_items').insert(items.map(i => ({ ...i, user_id: userId, list_id: listId }))).select()) as ShoppingListItem[];
  },
  async updateItem(id: string, values: Partial<Pick<ShoppingListItem, 'name_snapshot' | 'quantity' | 'category_id' | 'estimated_price' | 'status'>>) {
    return unwrap(await supabase.from('shopping_list_items').update(values).eq('id', id).select().single()) as ShoppingListItem;
  },
  async removeItem(id: string) { unwrap(await supabase.from('shopping_list_items').update({ status: 'removed' }).eq('id', id).select().single()); },

  async addMarket(userId: string, name: string) {
    return unwrap(await supabase.from('markets').insert({ user_id: userId, name }).select().single()) as Market;
  },
  async removeMarket(id: string) { unwrap(await supabase.from('markets').delete().eq('id', id).select().single()); },
  async addCategory(userId: string, name: string) { return unwrap(await supabase.from('categories').insert({ user_id: userId, name }).select().single()); },
  async removeCategory(id: string) { unwrap(await supabase.from('categories').delete().eq('id', id).select().single()); },

  async startSession(userId: string, listId: string, marketId: string) {
    return unwrap(await supabase.from('shopping_sessions').insert({ user_id: userId, list_id: listId, initial_market_id: marketId, current_market_id: marketId }).select().single());
  },
  async changeSessionMarket(sessionId: string, marketId: string) {
    return unwrap(await supabase.from('shopping_sessions').update({ current_market_id: marketId }).eq('id', sessionId).select().single());
  },
  async purchaseItem(userId: string, sessionId: string, item: ShoppingListItem, marketId: string, unitPrice: number) {
    const purchase = unwrap(await supabase.from('purchase_items').insert({
      user_id: userId, shopping_session_id: sessionId, shopping_list_item_id: item.id, product_id: item.product_id,
      product_name_snapshot: item.name_snapshot, category_id: item.category_id, quantity: item.quantity, unit_price: unitPrice, market_id: marketId,
    }).select().single());
    await this.updateItem(item.id, { status: 'purchased' });
    return purchase;
  },
  async undoPurchase(itemId: string, purchaseId: string) {
    unwrap(await supabase.from('purchase_items').delete().eq('id', purchaseId).select().single());
    return this.updateItem(itemId, { status: 'pending' });
  },
  async finishSession(sessionId: string, total: number) {
    return unwrap(await supabase.from('shopping_sessions').update({ status: 'completed', total, finished_at: new Date().toISOString() }).eq('id', sessionId).select().single());
  },
};

