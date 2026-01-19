
import { ShoppingItem, Category, PurchaseGroup, DashboardStats } from '../types';
import { GoogleGenAI } from "@google/genai";

/**
 * SERVIÇO DE COMUNICAÇÃO REAL (VERCEL -> APPS SCRIPT)
 * Este serviço consome a URL definida na variável de ambiente VITE_APPS_SCRIPT_URL.
 */

// Fix: Utiliza a interface global ImportMetaEnv agora definida em vite-env.d.ts
const getEnvVariable = (key: string): string | undefined => {
  try {
    return (import.meta.env as any)[key];
  } catch (e) {
    return undefined;
  }
};

const SCRIPT_URL = getEnvVariable('VITE_APPS_SCRIPT_URL');

async function callScript(action: string, data: any = null) {
  if (typeof SCRIPT_URL !== 'string' || !SCRIPT_URL) {
    console.warn("VITE_APPS_SCRIPT_URL não definida ou inválida. Verifique as variáveis de ambiente no Vercel.");
    return null;
  }

  const url = new URL(SCRIPT_URL);
  url.searchParams.set('action', action);
  
  const options: RequestInit = {
    method: 'GET',
    mode: 'cors',
  };

  if (data) {
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
  /**
   * Fix: Integração com Gemini API para sugerir itens inteligentes baseados no contexto da lista.
   */
  async getSmartSuggestions(items: ShoppingItem[], categories: Category[]): Promise<string[]> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentItems = items.map(i => i.nome).join(", ");
      const categoryNames = categories.map(c => c.nome).join(", ");
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Com base na minha lista de compras atual: [${currentItems || 'vazia'}], sugira 5 itens adicionais comuns que podem estar faltando. Considere estas categorias: [${categoryNames}]. Responda apenas com os nomes dos itens separados por vírgula, sem explicações.`,
      });

      const text = response.text || "";
      return text.split(',').map(s => s.trim()).filter(s => s.length > 0 && s !== 'vazia');
    } catch (error) {
      console.error("Erro ao obter sugestões de IA:", error);
      return [];
    }
  }

  async getMe() {
    try {
      const email = await callScript('getUserEmail');
      return { 
        email: email || 'usuario@google.com', 
        name: email ? email.split('@')[0] : 'Usuário', 
        picture: `https://ui-avatars.com/api/?name=${email || 'User'}&background=3b82f6&color=fff` 
      };
    } catch (e) {
      return { email: 'erro@api.com', name: 'Erro', picture: '' };
    }
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
    await callScript('marcarComoComprado', { id });
  }

  async finalizePurchase(): Promise<void> {
    await callScript('finalizarCompra');
  }

  async getHistory(): Promise<{ compras: PurchaseGroup[], stats: DashboardStats }> {
    const data = await callScript('obterHistorico');
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
    await callScript('carregarListaDoHistorico', { idCompra: purchaseId });
  }
}

export const api = new ShoppingAPI();
