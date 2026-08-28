export type ListStatus = 'active' | 'completed' | 'archived';
export type ItemStatus = 'pending' | 'purchased' | 'removed';
export type SessionStatus = 'active' | 'completed' | 'cancelled';

export interface Profile { id: string; email: string; nome: string; avatar_url: string | null }
export interface Category { id: string; user_id: string; name: string; icon: string | null; color: string | null; is_system: boolean }
export interface Market { id: string; user_id: string; name: string; address: string | null; city: string | null; state: string | null; favorite: boolean }
export interface Product { id: string; user_id: string; name: string; brand: string | null; ean: string | null; package_description: string | null; category_id: string | null; favorite: boolean }
export interface ShoppingList { id: string; user_id: string; name: string; description: string | null; budget: number | null; status: ListStatus; created_at: string; updated_at: string; archived_at: string | null }
export interface ShoppingListItem { id: string; list_id: string; product_id: string | null; user_id: string; name_snapshot: string; category_id: string | null; quantity: number; estimated_price: number | null; status: ItemStatus; favorite: boolean; created_at: string; updated_at: string }
export interface ShoppingSession { id: string; user_id: string; list_id: string; started_at: string; finished_at: string | null; initial_market_id: string | null; current_market_id: string | null; total: number | null; status: SessionStatus }
export interface PurchaseItem { id: string; shopping_session_id: string; shopping_list_item_id: string | null; product_id: string | null; user_id: string; product_name_snapshot: string; category_id: string | null; quantity: number; unit_price: number; total_price: number; market_id: string; purchased_at: string }

export interface AppData { profile: Profile | null; categories: Category[]; markets: Market[]; lists: ShoppingList[]; items: ShoppingListItem[]; sessions: ShoppingSession[]; purchases: PurchaseItem[] }
export interface HistorySummary { name: string; productId: string | null; count: number; average: number; minimum: number; maximum: number; lastPrice: number; lastPurchase: string; byMarket: Record<string, { average: number; count: number }> }
export interface PantryPrediction extends HistorySummary { averageIntervalDays: number; daysSinceLastPurchase: number; ratio: number; confidence: 'Baixa' | 'Média' | 'Alta' }

