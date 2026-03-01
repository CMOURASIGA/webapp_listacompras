
import { ShoppingItem, Category, PurchaseGroup, DashboardStats, UserSession } from '../types';

const FALLBACK_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxgt0XKD21dsD8EqMNQv0-8VFvBGjrktswc8t6FC8kwKdVsIZyoelpKO4rRiXOrXBQ/exec";

function buildRequestUrl(baseUrl: string, action: string, data: any, user: UserSession | null, options?: { manualUrl?: string; manualKey?: string; includeOverrides?: boolean }) {
  const url = new URL(baseUrl);
  url.searchParams.set('action', action);
  url.searchParams.set('_t', Date.now().toString());

  if (data) {
    url.searchParams.set('payload', JSON.stringify(data));
  }

  if (options?.includeOverrides) {
    if (options.manualUrl) url.searchParams.set('override_url', options.manualUrl);
    if (options.manualKey) url.searchParams.set('override_key', options.manualKey);
  }

  if (user?.email) {
    url.searchParams.set('userEmail', user.email);
  }

  return url;
}

async function requestJson(url: string, credentials: RequestCredentials, redirect: RequestRedirect = 'manual') {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      credentials,
      redirect
    });
  } catch (err: any) {
    throw new Error(
      "Falha ao conectar com o Google Apps Script. Verifique a implantação /exec e se sua conta Google está autenticada no navegador."
    );
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location') || '';
    const isGoogleLogin = /accounts\.google\.com\/ServiceLogin/i.test(location);
    throw new Error(
      isGoogleLogin
        ? "Google Apps Script redirecionou para login. Verifique a implantação (App da Web) e o acesso da conta."
        : `Redirecionamento inesperado (${response.status}).`
    );
  }

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

  if (result === null || typeof result !== 'object') {
    throw new Error("Resposta JSON inválida do backend (objeto ausente).");
  }

  if (result?.error) {
    const hint = result?.hint ? ` (${result.hint})` : '';
    throw new Error(`${result.error}${hint}`);
  }

  if (!Object.prototype.hasOwnProperty.call(result, 'data')) {
    throw new Error("Backend respondeu sem o campo 'data'. Verifique a implantação do Apps Script.");
  }

  return result.data;
}

async function callBackend(action: string, data: any = null) {
  const manualUrl = localStorage.getItem('DEBUG_APPS_SCRIPT_URL')?.trim();
  const manualKey = localStorage.getItem('DEBUG_API_KEY')?.trim();

  // Em dev local usamos /api (proxy do Vite -> Apps Script) para evitar CORS no redirect 302.
  const isDev = (import.meta as any).env?.DEV === true;
  const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const forceDirect = String((import.meta as any).env?.VITE_FORCE_DIRECT_SCRIPT || '').toLowerCase() === 'true';
  const useDirectScript = forceDirect || !(isDev && isLocalhost);
  const scriptBase = manualUrl || (import.meta as any).env?.VITE_APPS_SCRIPT_URL || FALLBACK_SCRIPT_URL;
  const proxyBase = new URL('/api', window.location.origin).toString();

  const savedUser = localStorage.getItem('shopping_user');
  const user: UserSession | null = savedUser ? JSON.parse(savedUser) : null;

  const proxyUrl = buildRequestUrl(proxyBase, action, data, user, { manualUrl, manualKey, includeOverrides: true });
  const directUrl = buildRequestUrl(scriptBase, action, data, user);

  try {
    if (useDirectScript) {
      // Para Apps Script com acesso anônimo (ACAO=*), não usar credentials 'include'.
      // No endpoint direto (/exec), seguimos redirect até o /macros/echo para obter JSON.
      return await requestJson(directUrl.toString(), 'omit', 'follow');
    }

    // Em dev/local priorizamos exclusivamente o proxy para evitar instabilidade
    // de redirect cross-origin em alguns navegadores (especialmente mobile Safari).
    const proxyData = await requestJson(proxyUrl.toString(), 'same-origin', 'follow');
    if (
      action !== 'getSmartSuggestions' &&
      proxyData &&
      typeof proxyData === 'object' &&
      Object.prototype.hasOwnProperty.call(proxyData, 'sucesso') &&
      (proxyData as any).sucesso === false
    ) {
      throw new Error((proxyData as any).error || `Falha no proxy para ${action}.`);
    }
    return proxyData;
  } catch (error: any) {
    console.error(`Erro na ação ${action}:`, error);
    throw error;
  }
}

function assertMutationSuccess(action: string, result: any) {
  if (!result || typeof result !== 'object') return;
  if (result.error) {
    throw new Error(String(result.error));
  }
  if (Object.prototype.hasOwnProperty.call(result, 'sucesso') && result.sucesso === false) {
    throw new Error(result.error || `Falha ao executar ${action}.`);
  }
}

class ShoppingAPI {
  async bootstrap(): Promise<{ ok: boolean; email: string; spreadsheetId: string; spreadsheetUrl: string; created: boolean }> {
    return await callBackend('bootstrap');
  }

  async getSmartSuggestions(items: ShoppingItem[], categories: Category[]): Promise<string[]> {
    return await callBackend('getSmartSuggestions', { items, categories }) || [];
  }

  async getCategories(): Promise<Category[]> {
    return await callBackend('listarCategorias') || [];
  }

  async addCategory(category: { nome: string; icone?: string; cor?: string }): Promise<Category> {
    return await callBackend('adicionarCategoria', category);
  }

  async getItems(): Promise<ShoppingItem[]> {
    return await callBackend('listarItens') || [];
  }

  async addItem(item: Omit<ShoppingItem, 'id' | 'status' | 'dataAdicao' | 'isFavorito'>): Promise<any> {
    const result = await callBackend('adicionarItem', item);
    assertMutationSuccess('adicionarItem', result);
    return result;
  }

  async updateItem(id: string | number, updates: Partial<ShoppingItem>): Promise<void> {
    const result = await callBackend('editarItem', { id, ...updates });
    assertMutationSuccess('editarItem', result);
  }

  async removeItem(id: string | number): Promise<void> {
    const result = await callBackend('removerItem', { id });
    assertMutationSuccess('removerItem', result);
  }

  async toggleStatus(id: string | number): Promise<void> {
    const result = await callBackend('marcarComoComprado', { id });
    assertMutationSuccess('marcarComoComprado', result);
  }

  async finalizePurchase(): Promise<void> {
    const result = await callBackend('finalizarCompra');
    assertMutationSuccess('finalizarCompra', result);
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
    const result = await callBackend('carregarListaDoHistorico', { idCompra: purchaseId });
    assertMutationSuccess('carregarListaDoHistorico', result);
  }
}

export const api = new ShoppingAPI();
