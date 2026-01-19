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

  // Recupera o email do usuário do localStorage para autenticação no GAS
  const savedUser = localStorage.getItem('shopping_user');
  const user: UserSession | null = savedUser ? JSON.parse(savedUser) : null;
  
  const headers: HeadersInit = {
    'Accept': 'application/json'
  };

  if (user?.email) {
    url.searchParams.set('userEmail', user.email); // O GAS usará isso para validar permissões
  }

  try {
    const response = await fetch(url.toString(), { headers });
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.details || result.error || `Erro (${response.status})`);
      }
      return result.data !== undefined ? result.data : result;
    } else {
      throw new Error(`Erro de Servidor: Ocorreu uma falha ao conectar com o Google Sheets. Verifique se o script está publicado como 'App da Web' para 'Qualquer pessoa'.`);
    }
  } catch (error: any) {
    console.error(`Erro na ação ${action}:`, error);
    throw error;
  }
}

class ShoppingAPI {
  async getSmartSuggestions(items: ShoppingItem[], categories: Category[]): Promise<string[]> {
    try {
      const suggestions = await callBackend('getSmartSuggestions', { items, categories });
      return suggestions || [];
    } catch (error) {
      console.error("Erro ao obter sugestões de IA:", error);
      return [];
    }
  }

  async getMe() {
    // Agora o "me" é gerenciado no App.tsx via localStorage e Google Auth
    const savedUser = localStorage.getItem('shopping_user');
    return savedUser ? JSON.parse(savedUser) : null;
  }

  async getCategories(): Promise<Category[]> {
    try {
      const cats = await callBackend('listarCategorias');
      return Array.isArray(cats) ? cats : [];
    } catch (e) {
      throw e;
    }
  }

  async getItems(): Promise<ShoppingItem[]> {
    try {
      const items = await callBackend('listarItens');
      return Array.isArray(items) ? items : [];
    } catch (e) {
      throw e;
    }
  }

  async addItem(item: Omit<ShoppingItem, 'id' | 'status' | 'dataAdicao'>): Promise<ShoppingItem> {
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
    try {
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
    } catch (e) {
      throw e;
    }
  }

  async reloadList(purchaseId: string | number): Promise<void> {
    await callBackend('carregarListaDoHistorico', { idCompra: purchaseId });
  }
}

export const api = new ShoppingAPI();