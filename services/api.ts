
import { ShoppingItem, Category, PurchaseGroup, DashboardStats, UserSession } from '../types';

async function callBackend(action: string, data: any = null) {
  const url = new URL('/api', window.location.origin);
  url.searchParams.set('action', action);
  
  if (data) {
    url.searchParams.set('payload', JSON.stringify(data));
  }

  const manualUrl = localStorage.getItem('DEBUG_APPS_SCRIPT_URL');
  const manualKey = localStorage.getItem('DEBUG_API_KEY');
  
  if (manualUrl) url.searchParams.set('override_url', manualUrl.trim());
  if (manualKey) url.searchParams.set('override_key', manualKey.trim());

  const savedUser = localStorage.getItem('shopping_user');
  const user: UserSession | null = savedUser ? JSON.parse(savedUser) : null;
  
  if (user?.email) {
    url.searchParams.set('userEmail', user.email);
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    const text = await response.text();
    
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error("O servidor retornou uma página HTML (Erro de Roteamento ou 404). Verifique se a URL do Script está correta no ícone de engrenagem.");
      }
      throw new Error(`Resposta inválida: ${text.substring(0, 50)}`);
    }
    
    if (!response.ok) {
      throw new Error(result.details || result.error || `Erro HTTP ${response.status}`);
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
