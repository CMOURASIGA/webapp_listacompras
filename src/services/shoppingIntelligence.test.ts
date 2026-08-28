import { describe, expect, it } from 'vitest';
import { compareMarkets, confidence, estimateList, pantryPredictions, parseNaturalItems, priceHistory } from './shoppingIntelligence';
import type { Market, PurchaseItem, ShoppingListItem } from '../types/domain';

const markets = [{ id: 'm1', name: 'Mundial' }, { id: 'm2', name: 'Assaí' }] as Market[];
const purchases = [
  { id: 'p1', product_id: 'cafe', product_name_snapshot: 'Café', unit_price: 24, quantity: 1, total_price: 24, market_id: 'm1', purchased_at: '2026-08-01T12:00:00Z' },
  { id: 'p2', product_id: 'cafe', product_name_snapshot: 'Café', unit_price: 20, quantity: 1, total_price: 20, market_id: 'm2', purchased_at: '2026-07-01T12:00:00Z' },
  { id: 'p3', product_id: 'cafe', product_name_snapshot: 'Café', unit_price: 22, quantity: 1, total_price: 22, market_id: 'm2', purchased_at: '2026-06-01T12:00:00Z' },
] as PurchaseItem[];
const items = [{ id: 'i1', name_snapshot: 'Café', product_id: 'cafe', quantity: 2, status: 'pending', estimated_price: 30 }] as ShoppingListItem[];

describe('shopping intelligence', () => {
  it('calculates averages, minimums and confidence', () => { const [h] = priceHistory(purchases, markets); expect(h.average).toBe(22); expect(h.minimum).toBe(20); expect(h.byMarket['Assaí'].average).toBe(21); expect(confidence(h.count)).toBe('Média'); });
  it('prioritizes market history when estimating', () => { const history = priceHistory(purchases, markets); expect(estimateList(items, history, 'Assaí')).toMatchObject({ total: 42, covered: 1 }); });
  it('compares markets without hiding coverage', () => { const result = compareMarkets(items, priceHistory(purchases, markets), markets); expect(result[0].covered).toBe(1); expect(result.map(x => x.market.name)).toContain('Assaí'); });
  it('calculates recurrence and pantry state', () => { const [prediction] = pantryPredictions(priceHistory(purchases, markets), purchases, new Date('2026-08-28T12:00:00Z')); expect(prediction.averageIntervalDays).toBeGreaterThanOrEqual(30); expect(prediction.daysSinceLastPurchase).toBe(27); });
  it('parses natural multi-item input', () => { expect(parseNaturalItems('2 leite, arroz 5kg, detergente x3')).toEqual([{ name: 'leite', quantity: 2 }, { name: 'arroz 5kg', quantity: 1 }, { name: 'detergente', quantity: 3 }]); });
});

