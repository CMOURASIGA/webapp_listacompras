export type LocalItemStatus = 'pendente' | 'comprado';

export interface LocalShoppingItem {
  id: string;
  nome: string;
  quantidade: number;
  categoria: string;
  precoEstimado: number;
  precoReal?: number;
  status: LocalItemStatus;
  favorito: boolean;
  criadoEm: string;
  compradoEm?: string;
  mercadoCompra?: string;
  ean?: string;
}

export interface LocalShoppingList {
  id: string;
  nome: string;
  descricao?: string;
  mercado?: string;
  criadaEm: string;
  atualizadaEm: string;
  arquivada: boolean;
  itens: LocalShoppingItem[];
}

export interface LocalPurchaseItem {
  nome: string;
  quantidade: number;
  categoria: string;
  precoUnitario: number;
  total: number;
  mercado?: string;
  ean?: string;
}

export interface LocalPurchase {
  id: string;
  listaId: string;
  listaNome: string;
  mercado?: string;
  data: string;
  itens: LocalPurchaseItem[];
  total: number;
}

export interface LocalMarket {
  id: string;
  nome: string;
}

export interface ShoppingLocalState {
  version: 3;
  activeListId: string;
  marketMode: boolean;
  currentMarket?: string;
  budget?: number;
  lists: LocalShoppingList[];
  purchases: LocalPurchase[];
  categories: string[];
  markets: LocalMarket[];
}

const STORAGE_KEY = 'shopping_pro_nova_visao_v3';
const LEGACY_KEY = 'shopping_pro_nova_visao_v2';

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const defaultCategories = ['Mercearia', 'Laticínios', 'Açougue', 'Hortifruti', 'Padaria', 'Bebidas', 'Limpeza', 'Higiene', 'Farmácia', 'Outros'];
const defaultMarkets: LocalMarket[] = ['Mundial', 'Guanabara', 'Assaí', 'Prezunic'].map((nome) => ({ id: id('mercado'), nome }));

const sampleState = (): ShoppingLocalState => {
  const current = now();
  const activeId = id('lista');
  return {
    version: 3,
    activeListId: activeId,
    marketMode: false,
    currentMarket: 'Mundial',
    budget: 520,
    categories: defaultCategories,
    markets: defaultMarkets,
    lists: [
      {
        id: activeId,
        nome: 'Compras do mês',
        descricao: 'Lista principal da casa',
        mercado: 'Mundial',
        criadaEm: current,
        atualizadaEm: current,
        arquivada: false,
        itens: [
          { id: id('item'), nome: 'Arroz 5kg', quantidade: 1, categoria: 'Mercearia', precoEstimado: 29.9, precoReal: 31.49, status: 'comprado', favorito: true, criadoEm: current, compradoEm: current, mercadoCompra: 'Mundial' },
          { id: id('item'), nome: 'Feijão carioca', quantidade: 2, categoria: 'Mercearia', precoEstimado: 8.9, precoReal: 8.49, status: 'comprado', favorito: true, criadoEm: current, compradoEm: current, mercadoCompra: 'Mundial' },
          { id: id('item'), nome: 'Leite integral', quantidade: 6, categoria: 'Laticínios', precoEstimado: 5.2, status: 'pendente', favorito: true, criadoEm: current },
          { id: id('item'), nome: 'Café 500g', quantidade: 2, categoria: 'Mercearia', precoEstimado: 23.9, status: 'pendente', favorito: false, criadoEm: current },
          { id: id('item'), nome: 'Detergente', quantidade: 3, categoria: 'Limpeza', precoEstimado: 2.8, status: 'pendente', favorito: false, criadoEm: current },
          { id: id('item'), nome: 'Papel higiênico', quantidade: 1, categoria: 'Higiene', precoEstimado: 24.9, status: 'pendente', favorito: true, criadoEm: current }
        ]
      },
      { id: id('lista'), nome: 'Churrasco sábado', descricao: '12 pessoas', criadaEm: current, atualizadaEm: current, arquivada: false, itens: [] },
      { id: id('lista'), nome: 'Farmácia', criadaEm: current, atualizadaEm: current, arquivada: false, itens: [] }
    ],
    purchases: [
      {
        id: id('compra'), listaId: activeId, listaNome: 'Compras do mês', mercado: 'Guanabara', data: new Date(Date.now() - 28 * 86400000).toISOString(), total: 117.84,
        itens: [
          { nome: 'Arroz 5kg', quantidade: 1, categoria: 'Mercearia', precoUnitario: 27.9, total: 27.9, mercado: 'Guanabara' },
          { nome: 'Feijão carioca', quantidade: 2, categoria: 'Mercearia', precoUnitario: 8.1, total: 16.2, mercado: 'Guanabara' },
          { nome: 'Leite integral', quantidade: 6, categoria: 'Laticínios', precoUnitario: 4.99, total: 29.94, mercado: 'Guanabara' },
          { nome: 'Café 500g', quantidade: 2, categoria: 'Mercearia', precoUnitario: 21.9, total: 43.8, mercado: 'Guanabara' }
        ]
      },
      {
        id: id('compra'), listaId: activeId, listaNome: 'Compras do mês', mercado: 'Mundial', data: new Date(Date.now() - 58 * 86400000).toISOString(), total: 74.17,
        itens: [
          { nome: 'Arroz 5kg', quantidade: 1, categoria: 'Mercearia', precoUnitario: 26.9, total: 26.9, mercado: 'Mundial' },
          { nome: 'Café 500g', quantidade: 2, categoria: 'Mercearia', precoUnitario: 19.9, total: 39.8, mercado: 'Mundial' },
          { nome: 'Detergente', quantidade: 3, categoria: 'Limpeza', precoUnitario: 2.49, total: 7.47, mercado: 'Mundial' }
        ]
      }
    ]
  };
};

function migrateLegacy(raw: string): ShoppingLocalState | null {
  try {
    const old = JSON.parse(raw);
    if (!old || !Array.isArray(old.lists) || !Array.isArray(old.purchases)) return null;
    const markets = Array.from(new Set(old.purchases.map((p: any) => p.mercado).filter(Boolean) as string[]));
    const next: ShoppingLocalState = {
      ...old,
      version: 3,
      categories: defaultCategories,
      markets: (markets.length ? markets : ['Mundial']).map((nome) => ({ id: id('mercado'), nome })),
      currentMarket: old.lists.find((l: any) => l.id === old.activeListId)?.mercado || markets[0],
      purchases: old.purchases.map((p: any) => ({ ...p, itens: p.itens.map((i: any) => ({ ...i, mercado: i.mercado || p.mercado })) }))
    };
    return next;
  } catch { return null; }
}

export function loadLocalShoppingState(): ShoppingLocalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ShoppingLocalState;
      if (parsed?.version === 3 && Array.isArray(parsed.lists) && Array.isArray(parsed.purchases)) return parsed;
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    const migrated = legacy ? migrateLegacy(legacy) : null;
    if (migrated) { saveLocalShoppingState(migrated); return migrated; }
  } catch {}
  const initial = sampleState();
  saveLocalShoppingState(initial);
  return initial;
}

export function saveLocalShoppingState(state: ShoppingLocalState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
export function resetLocalShoppingState() { const initial = sampleState(); saveLocalShoppingState(initial); return initial; }
export function createLocalId(prefix: string) { return id(prefix); }
