
export type ItemStatus = 'pendente' | 'comprado';

export interface Category {
  id: string;
  nome: string;
  icone: string;
  cor: string;
}

export interface ShoppingItem {
  id: string | number;
  nome: string;
  quantidade: number;
  categoria: string;
  precoEstimado: number;
  status: ItemStatus;
  dataAdicao: string;
}

export interface PurchaseHistoryItem {
  idCompra: string | number;
  data: string;
  nome: string;
  quantidade: number;
  categoria: string;
  preco: number;
  total: number;
}

export interface PurchaseGroup {
  id: string | number;
  data: string;
  itens: Partial<PurchaseHistoryItem>[];
  total: number;
}

export interface DashboardStats {
  totalGasto: number;
  totalCompras: number;
  totalItens: number;
  gastoMedio: number;
  categoriaFavorita: string | null;
}

export interface UserSession {
  email: string;
  name: string;
  picture: string;
}
