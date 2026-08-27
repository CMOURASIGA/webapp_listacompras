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

export interface LocalPurchase {
  id: string;
  listaId: string;
  listaNome: string;
  mercado?: string;
  data: string;
  itens: Array<{
    nome: string;
    quantidade: number;
    categoria: string;
    precoUnitario: number;
    total: number;
  }>;
  total: number;
}

export interface ShoppingLocalState {
  version: 2;
  activeListId: string;
  marketMode: boolean;
  budget?: number;
  lists: LocalShoppingList[];
  purchases: LocalPurchase[];
}

const STORAGE_KEY = 'shopping_pro_nova_visao_v2';

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const sampleState = (): ShoppingLocalState => {
  const current = now();
  const activeId = id('lista');
  return {
    version: 2,
    activeListId: activeId,
    marketMode: false,
    budget: 520,
    lists: [
      {
        id: activeId,
        nome: 'Compras do mês',
        descricao: 'Lista principal da casa',
        mercado: 'Mercado habitual',
        criadaEm: current,
        atualizadaEm: current,
        arquivada: false,
        itens: [
          { id: id('item'), nome: 'Arroz 5kg', quantidade: 1, categoria: 'Mercearia', precoEstimado: 29.9, precoReal: 31.49, status: 'comprado', favorito: true, criadoEm: current, compradoEm: current },
          { id: id('item'), nome: 'Feijão carioca', quantidade: 2, categoria: 'Mercearia', precoEstimado: 8.9, precoReal: 8.49, status: 'comprado', favorito: true, criadoEm: current, compradoEm: current },
          { id: id('item'), nome: 'Leite integral', quantidade: 6, categoria: 'Laticínios', precoEstimado: 5.2, status: 'pendente', favorito: true, criadoEm: current },
          { id: id('item'), nome: 'Café 500g', quantidade: 2, categoria: 'Mercearia', precoEstimado: 23.9, status: 'pendente', favorito: false, criadoEm: current },
          { id: id('item'), nome: 'Detergente', quantidade: 3, categoria: 'Limpeza', precoEstimado: 2.8, status: 'pendente', favorito: false, criadoEm: current },
          { id: id('item'), nome: 'Papel higiênico', quantidade: 1, categoria: 'Higiene', precoEstimado: 24.9, status: 'pendente', favorito: true, criadoEm: current }
        ]
      },
      {
        id: id('lista'),
        nome: 'Churrasco sábado',
        descricao: '12 pessoas',
        criadaEm: current,
        atualizadaEm: current,
        arquivada: false,
        itens: [
          { id: id('item'), nome: 'Carne', quantidade: 3, categoria: 'Açougue', precoEstimado: 54.9, status: 'pendente', favorito: false, criadoEm: current },
          { id: id('item'), nome: 'Pão de alho', quantidade: 4, categoria: 'Padaria', precoEstimado: 14.9, status: 'pendente', favorito: false, criadoEm: current }
        ]
      },
      {
        id: id('lista'),
        nome: 'Farmácia',
        criadaEm: current,
        atualizadaEm: current,
        arquivada: false,
        itens: []
      }
    ],
    purchases: [
      {
        id: id('compra'),
        listaId: activeId,
        listaNome: 'Compras do mês',
        mercado: 'Mercado habitual',
        data: new Date(Date.now() - 28 * 86400000).toISOString(),
        itens: [
          { nome: 'Arroz 5kg', quantidade: 1, categoria: 'Mercearia', precoUnitario: 27.9, total: 27.9 },
          { nome: 'Feijão carioca', quantidade: 2, categoria: 'Mercearia', precoUnitario: 8.1, total: 16.2 },
          { nome: 'Leite integral', quantidade: 6, categoria: 'Laticínios', precoUnitario: 4.99, total: 29.94 },
          { nome: 'Café 500g', quantidade: 2, categoria: 'Mercearia', precoUnitario: 21.9, total: 43.8 }
        ],
        total: 117.84
      },
      {
        id: id('compra'),
        listaId: activeId,
        listaNome: 'Compras do mês',
        mercado: 'Mercado habitual',
        data: new Date(Date.now() - 58 * 86400000).toISOString(),
        itens: [
          { nome: 'Arroz 5kg', quantidade: 1, categoria: 'Mercearia', precoUnitario: 26.9, total: 26.9 },
          { nome: 'Café 500g', quantidade: 2, categoria: 'Mercearia', precoUnitario: 19.9, total: 39.8 },
          { nome: 'Detergente', quantidade: 3, categoria: 'Limpeza', precoUnitario: 2.49, total: 7.47 }
        ],
        total: 74.17
      }
    ]
  };
};

export function loadLocalShoppingState(): ShoppingLocalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = sampleState();
      saveLocalShoppingState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as ShoppingLocalState;
    if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.lists) || !Array.isArray(parsed.purchases)) {
      throw new Error('state inválido');
    }
    return parsed;
  } catch {
    const initial = sampleState();
    saveLocalShoppingState(initial);
    return initial;
  }
}

export function saveLocalShoppingState(state: ShoppingLocalState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetLocalShoppingState() {
  const initial = sampleState();
  saveLocalShoppingState(initial);
  return initial;
}

export function createLocalId(prefix: string) {
  return id(prefix);
}
