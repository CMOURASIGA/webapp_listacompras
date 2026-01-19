import { ShoppingItem, Category, PurchaseGroup, DashboardStats } from '../types';

/**
 * SERVIÇO DE COMUNICAÇÃO (REACT -> VERCEL BACKEND)
 * Todas as chamadas passam pelo proxy local em /api para evitar CORS e ocultar chaves.
 */

async function callBackend(action: string, data: any = null) {
  const url = new URL('/api', window.location.origin);
  url.searchParams.set('action', action);
  
  if (data) {
    url.searchParams.set('payload', JSON.stringify(data));
  }

  try {
    const response = await fetch(url.toString());
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      if (!response.ok) {
        const errorMsg = result.details 
          ? `${result.error} \n\nDetalhes: ${result.details}`
          : (result.error || `Erro do Servidor (${response.status})`);
        throw new Error(errorMsg);
      }
      return result.data !== undefined ? result.data : result;
    } else {
      const text = await response.text();
      console.error(`Erro: Recebido conteúdo inesperado para '${action}':`, text.substring(0, 200));
      throw new Error(`O servidor retornou um formato inválido (HTML). Verifique se a URL do Google Apps Script nas variáveis de ambiente do Vercel termina em '/exec' e está publicada corretamente.`);
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
    try {
      const email = await callBackend('getUserEmail');
      return { 
        email: email || 'usuario@google.com', 
        name: email ? email.split('@')[0] : 'Usuário', 
        picture: `https://ui-avatars.com/api/?name=${email || 'User'}&background=3b82f6&color=fff` 
      };
    } catch (e) {
      return { email: 'convidado@google.com', name: 'Convidado', picture: 'https://ui-avatars.com/api/?name=C&background=ccc' };
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const cats = await callBackend('listarCategorias');
      return Array.isArray(cats) ? cats : [];
    } catch (e) {
      return [];
    }
  }

  async getItems(): Promise<ShoppingItem[]> {
    try {
      const items = await callBackend('listarItens');
      return Array.isArray(items) ? items : [];
    } catch (e) {
      return [];
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
      return { compras: [], stats: { totalGasto: 0, totalCompras: 0, totalItens: 0, gastoMedio: 0, categoriaFavorita: '' } };
    }
  }

  async reloadList(purchaseId: string | number): Promise<void> {
    await callBackend('carregarListaDoHistorico', { idCompra: purchaseId });
  }
}

export const api = new ShoppingAPI();