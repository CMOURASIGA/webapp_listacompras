import { ShoppingItem, Category, PurchaseGroup, DashboardStats, UserSession } from '../types';

/**
 * SERVIÇO DE COMUNICAÇÃO (REACT -> VERCEL BACKEND)
 */

async function callBackend(action: string, data: any = null) {
  const url = new URL('/api', window.location.origin);
  url.searchParams.set('action', action);
  
  if (data) {
    url.searchParams.set('payload', JSON.stringify(data));
  }

  // Verifica se há overrides manuais no localStorage para facilitar o debug
  const manualUrl = localStorage.getItem('DEBUG_APPS_SCRIPT_URL');
  const manualKey = localStorage.getItem('DEBUG_API_KEY');
  
  if (manualUrl) url.searchParams.set('override_url', manualUrl);
  if (manualKey) url.searchParams.set('override_key', manualKey);

  const savedUser = localStorage.getItem('shopping_user');
  const user: UserSession | null = savedUser ? JSON.parse(savedUser) : null;
  
  if (user?.email) {
    url.searchParams.set('userEmail', user.email);
  }

  try {
    const response = await fetch(url.toString());
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.details || result.error || `Erro (${response.status})`);
    }
    
    return result.data;
  } catch (error: any) {
    console.error(`Erro na ação ${action}:`, error);
    throw error;
  }
}

class ShoppingAPI {
  async getSmartSuggestions(items: ShoppingItem[], categories: Category[]): Promise<string[]> {
    return await callBackend('getSmartSuggestions', { items, categories }) || [];
  }

  async getCategories(): Promise<Category[]> {
    return await callBackend('listarCategorias') || [];
  }

  async getItems(): Promise<ShoppingItem[]> {
    return await callBackend('listarItens') || [];
  }

  async addItem(item: Omit<ShoppingItem, 'id' | 'status' | 'dataAdicao'>): Promise<any> {
    return await callBackend('adicionarItem', item);
  }

  async updateItem(id: string | number, updates: Partial<ShoppingItem>): Promise<void> {
    await callBackend('editarItem', { id, ...updates });
  }

  async removeItem(id: string | number): Promise<void> {
    await callBackend('removerItem', { id });
  }

  async toggleStatus(id: string | number): Promise<void> {
    await callBackend('marcarComoComprado', { id });
  }

  async finalizePurchase(): Promise<void> {
    await callBackend('finalizarCompra');
  }

  async getHistory(): Promise<{ compras: PurchaseGroup[], stats: DashboardStats }> {
    const data = await callBackend('obterHistorico');
    if (!data) return { compras: [], stats: { totalGasto: 0, totalCompras: 0, totalItens: 0, gastoMedio: 0, categoriaFavorita: '' } };
    
    return {
      compras: data.compras || [],
      stats: {
        totalGasto: parseFloat(data.estatisticas?.totalGasto || 0),
        totalCompras: data.estatisticas?.totalCompras || 0,
        totalItens: data.estatisticas?.totalItens || 0,
        gastoMedio: parseFloat(data.estatisticas?.gastoMedio || 0),
        categoriaFavorita: data.estatisticas?.categoriaFavorita || ''
      }
    };
  }

  async reloadList(purchaseId: string | number): Promise<void> {
    await callBackend('carregarListaDoHistorico', { idCompra: purchaseId });
  }
}

export const api = new ShoppingAPI();