import type { Market, PantryPrediction, PurchaseItem, ShoppingList, ShoppingListItem, HistorySummary } from '../types/domain';

const DAY = 86_400_000;
export const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
/** Listas criadas pela migra\u00e7\u00e3o de hist\u00f3rico (uma por compra antiga importada), n\u00e3o listas de planejamento reais. */
export const isImportedHistoryList = (list: ShoppingList) => (list.description || '').startsWith('Hist\u00f3rico importado');
export const confidence = (count: number): 'Baixa' | 'Média' | 'Alta' => count >= 6 ? 'Alta' : count >= 3 ? 'Média' : 'Baixa';

export function priceHistory(purchases: PurchaseItem[], markets: Market[]): HistorySummary[] {
  const marketNames = new Map(markets.map(m => [m.id, m.name]));
  const groups = new Map<string, PurchaseItem[]>();
  for (const purchase of purchases) {
    const key = purchase.product_id || normalize(purchase.product_name_snapshot);
    groups.set(key, [...(groups.get(key) || []), purchase]);
  }
  return [...groups.values()].map(rows => {
    const sorted = [...rows].sort((a, b) => +new Date(b.purchased_at) - +new Date(a.purchased_at));
    const prices = rows.map(r => Number(r.unit_price));
    const marketGroups = new Map<string, number[]>();
    rows.forEach(r => {
      const name = marketNames.get(r.market_id) || 'Não informado';
      marketGroups.set(name, [...(marketGroups.get(name) || []), Number(r.unit_price)]);
    });
    return {
      name: sorted[0].product_name_snapshot,
      productId: rows[0].product_id,
      count: rows.length,
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
      minimum: Math.min(...prices), maximum: Math.max(...prices), lastPrice: Number(sorted[0].unit_price),
      lastPurchase: sorted[0].purchased_at,
      byMarket: Object.fromEntries([...marketGroups].map(([name, values]) => [name, { average: values.reduce((a, b) => a + b, 0) / values.length, count: values.length }])),
    } satisfies HistorySummary;
  });
}

export function pantryPredictions(history: HistorySummary[], purchases: PurchaseItem[], now = new Date()): PantryPrediction[] {
  return history.map(item => {
    const dates = purchases.filter(p => (item.productId ? p.product_id === item.productId : normalize(p.product_name_snapshot) === normalize(item.name))).map(p => +new Date(p.purchased_at)).sort((a, b) => b - a);
    const intervals = dates.slice(0, -1).map((date, index) => Math.max(1, Math.round((date - dates[index + 1]) / DAY)));
    const averageIntervalDays = intervals.length ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : 30;
    const daysSinceLastPurchase = Math.max(0, Math.floor((+now - dates[0]) / DAY));
    return { ...item, averageIntervalDays, daysSinceLastPurchase, ratio: daysSinceLastPurchase / averageIntervalDays, confidence: confidence(item.count) };
  }).sort((a, b) => b.ratio - a.ratio);
}

export function estimateList(items: ShoppingListItem[], history: HistorySummary[], marketName?: string) {
  let total = 0; let covered = 0;
  for (const item of items.filter(i => i.status === 'pending')) {
    const h = history.find(x => x.productId && x.productId === item.product_id) || history.find(x => normalize(x.name) === normalize(item.name_snapshot));
    const price = marketName && h?.byMarket[marketName]?.average || h?.average || Number(item.estimated_price || 0);
    if (price > 0) covered++;
    total += price * Number(item.quantity);
  }
  return { total, covered, itemCount: items.filter(i => i.status === 'pending').length };
}

export function compareMarkets(items: ShoppingListItem[], history: HistorySummary[], markets: Market[]) {
  return markets.map(market => ({ market, ...estimateList(items, history, market.name) })).filter(x => x.covered > 0).sort((a, b) => b.covered - a.covered || a.total - b.total);
}

export function parseNaturalItems(text: string) {
  return text.split(/[,;\n]/).map(x => x.trim()).filter(Boolean).map(part => {
    const leading = part.match(/^(\d+(?:[.,]\d+)?)\s*(?:x\s*)?(.+)$/i);
    const trailing = part.match(/^(.+?)\s+x\s*(\d+(?:[.,]\d+)?)$/i);
    return { name: (leading?.[2] || trailing?.[1] || part).trim(), quantity: Number((leading?.[1] || trailing?.[2] || '1').replace(',', '.')) };
  });
}
