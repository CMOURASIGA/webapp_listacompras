
import { ShoppingItem, Category, PurchaseGroup, DashboardStats } from '../types';

/**
 * SERVIÇO DE COMUNICAÇÃO REAL (VERCEL -> APPS SCRIPT)
 * Este serviço consome a URL definida na variável de ambiente VITE_APPS_SCRIPT_URL.
 */

const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

async function callScript(action: string, data: any = null) {
  // Fix: Ensure SCRIPT_URL is specifically a string and not empty to satisfy the URL constructor requirements.
  // The original check 'if (!SCRIPT_URL)' allowed a 'true' boolean value to pass through, leading to a type error.
  if (typeof SCRIPT_URL !== 'string' || !SCRIPT_URL) {
    console.warn("VITE_APPS_SCRIPT_URL não definida ou inválida. Usando modo de demonstração.");
    return null;
  }

  const url = new URL(SCRIPT_URL);
  url.searchParams.set('action', action);
  
  const options: RequestInit = {
    method: 'GET', // Usamos GET com parâmetros para evitar problemas de CORS simples em redirecionamentos do Google
    mode: 'cors',
  };

  if (data) {
    // Para simplificar e evitar pre-flight CORS complexo, passamos o payload como um parâmetro codificado
    url.searchParams.set('payload', JSON.stringify(data));
  }

  try {
    const response = await fetch(url.toString(), options);
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.data;
  } catch (error) {
    console.error(`Erro na ação ${action}:`, error);
    throw error;
  }
}

class ShoppingAPI {
  async getMe() {
    // Identificação do usuário via Google no Apps Script
    const email = await callScript('getUserEmail');
    return { 
      email: email || 'usuario@google.com', 
      name: email ? email.split('@')[0] : 'Usuário', 
      picture: `https://ui-avatars.com/api/?name=${email}&background=3b82f6&color=fff` 
    };
  }

  async getCategories(): Promise<Category[]> {
    const cats = await callScript('listarCategorias');
    return cats || [];
  }

  async getItems(): Promise<ShoppingItem[]> {
    const items = await callScript('listarItens');
    return items || [];
  }

  async addItem(item: Omit<ShoppingItem, 'id' | 'status' | 'dataAdicao'>): Promise<ShoppingItem> {
    return await callScript('adicionarItem', item);
  }

  async updateItem(id: string | number, updates: Partial<ShoppingItem>): Promise<void> {
    await callScript('editarItem', { id, ...updates });
  }

  async removeItem(id: string | number): Promise<void> {
    await callScript('removerItem', { id });
  }

  async toggleStatus(id: string | number): Promise<void> {
    // Lógica baseada no seu code.gs (marcarComoComprado)
    await callScript('marcarComoComprado', { id });
  }

  async finalizePurchase(): Promise<void> {
    await callScript('finalizarCompra');
  }

  async getHistory(): Promise<{ compras: PurchaseGroup[], stats: DashboardStats }> {
    const data = await callScript('obterHistorico');
    // Adaptamos o retorno do seu code.gs para o formato do App
    return {
      compras: data.compras || [],
      stats: {
        totalGasto: parseFloat(data.estatisticas.totalGasto),
        totalCompras: data.estatisticas.totalCompras,
        totalItens: data.estatisticas.totalItens,
        gastoMedio: parseFloat(data.estatisticas.gastoMedio),
        categoriaFavorita: data.estatisticas.categoriaFavorita
      }
    };
  }

  async reloadList(purchaseId: string | number): Promise<void> {
    await callScript('carregarListaDoHistorico', { idCompra: purchaseId });
  }
}

export const api = new ShoppingAPI();
