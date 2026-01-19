
import { ShoppingItem, Category, PurchaseGroup, DashboardStats, ItemStatus } from '../types';

/**
 * SERVIÇO DE COMUNICAÇÃO (BRIDGE VERCEL -> GOOGLE SHEETS)
 * No ambiente Vercel, estas funções disparam chamadas HTTP para /api/...
 * O backend (Next.js API Routes) por sua vez utiliza a biblioteca 'googleapis'
 * para ler/escrever na sua planilha atual usando uma Service Account.
 */

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class ShoppingAPI {
  // Simulação de banco de dados (Representa o que está no Google Sheets agora)
  private items: ShoppingItem[] = [];
  private categories: Category[] = [
    { id: '1', nome: 'Grãos e Cereais', icone: '🌾', cor: '#FFB74D' },
    { id: '2', nome: 'Carnes e Peixes', icone: '🥩', cor: '#EF5350' },
    { id: '3', nome: 'Laticínios', icone: '🥛', cor: '#42A5F5' },
    { id: '4', nome: 'Frutas', icone: '🍎', cor: '#66BB6A' },
    { id: '5', nome: 'Verduras e Legumes', icone: '🥬', cor: '#26A69A' },
    { id: '6', nome: 'Bebidas', icone: '🥤', cor: '#AB47BC' },
    { id: '7', nome: 'Limpeza', icone: '🧹', cor: '#FFA726' },
    { id: '8', nome: 'Higiene', icone: '🧴', cor: '#EC407A' }
  ];
  private history: PurchaseGroup[] = [];

  // Pega o e-mail do usuário logado via Google OAuth no Vercel
  async getMe() {
    await sleep(300);
    // Em produção: fetch('/api/auth/me')
    return { 
      email: 'usuario@exemplo.com', 
      name: 'Usuário Teste', 
      picture: 'https://ui-avatars.com/api/?name=Usuario+Teste&background=3b82f6&color=fff' 
    };
  }

  // Lê a aba "Categorias" da sua planilha
  async getCategories(): Promise<Category[]> {
    await sleep(400);
    // Em produção: fetch('/api/categories')
    return [...this.categories];
  }

  // Lê a aba "Lista_Atual" (ou similar) filtrando por status
  async getItems(): Promise<ShoppingItem[]> {
    await sleep(500);
    // Em produção: fetch('/api/items')
    return [...this.items];
  }

  // Grava uma nova linha na aba "Lista_Atual"
  async addItem(item: Omit<ShoppingItem, 'id' | 'status' | 'dataAdicao'>): Promise<ShoppingItem> {
    await sleep(500);
    const newItem: ShoppingItem = {
      ...item,
      id: Date.now(), // No Sheets, o ID pode ser a linha ou um UUID
      status: 'pendente',
      dataAdicao: new Date().toISOString()
    };
    this.items.push(newItem);
    // Em produção: fetch('/api/items', { method: 'POST', body: JSON.stringify(item) })
    return newItem;
  }

  // Atualiza uma célula específica (ex: coluna Status na linha X)
  async updateItem(id: string | number, updates: Partial<ShoppingItem>): Promise<void> {
    await sleep(400);
    const index = this.items.findIndex(i => i.id === id);
    if (index !== -1) {
      this.items[index] = { ...this.items[index], ...updates };
    }
    // Em produção: fetch(`/api/items/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
  }

  async removeItem(id: string | number): Promise<void> {
    await sleep(400);
    this.items = this.items.filter(i => i.id !== id);
    // Em produção: fetch(`/api/items/${id}`, { method: 'DELETE' })
  }

  async toggleStatus(id: string | number): Promise<void> {
    const item = this.items.find(i => i.id === id);
    if (item) {
      await this.updateItem(id, { 
        status: item.status === 'pendente' ? 'comprado' : 'pendente' 
      });
    }
  }

  // Move linhas da aba "Lista_Atual" para a aba "Historico"
  async finalizePurchase(): Promise<void> {
    await sleep(800);
    const boughtItems = this.items.filter(i => i.status === 'comprado');
    if (boughtItems.length === 0) return;

    const total = boughtItems.reduce((acc, curr) => acc + (curr.precoEstimado * curr.quantidade), 0);
    
    const purchase: PurchaseGroup = {
      id: Date.now(),
      data: new Date().toLocaleDateString('pt-BR'),
      itens: boughtItems.map(i => ({
        nome: i.nome,
        quantidade: i.quantidade,
        categoria: i.categoria,
        preco: i.precoEstimado,
        total: i.precoEstimado * i.quantidade
      })),
      total
    };

    this.history.unshift(purchase);
    this.items = this.items.filter(i => i.status !== 'comprado');
    // Em produção: fetch('/api/finalize', { method: 'POST' })
  }

  // Lê a aba "Historico" e processa os totais (como o seu code.gs faz hoje)
  async getHistory(): Promise<{ compras: PurchaseGroup[], stats: DashboardStats }> {
    await sleep(600);
    const totalGasto = this.history.reduce((acc, curr) => acc + curr.total, 0);
    const totalItens = this.history.reduce((acc, curr) => acc + curr.itens.length, 0);
    
    const catMap: Record<string, number> = {};
    this.history.forEach(p => p.itens.forEach(i => {
      if (i.categoria) catMap[i.categoria] = (catMap[i.categoria] || 0) + 1;
    }));
    const favorite = Object.entries(catMap).sort((a,b) => b[1] - a[1])[0]?.[0] || null;

    return {
      compras: this.history,
      stats: {
        totalGasto,
        totalCompras: this.history.length,
        totalItens,
        gastoMedio: this.history.length > 0 ? totalGasto / this.history.length : 0,
        categoriaFavorita: favorite
      }
    };
  }

  // Copia itens de uma compra antiga de volta para "Lista_Atual"
  async reloadList(purchaseId: string | number): Promise<void> {
    await sleep(600);
    const purchase = this.history.find(p => p.id === purchaseId);
    if (purchase) {
      for (const item of purchase.itens) {
        await this.addItem({
          nome: item.nome || '',
          quantidade: item.quantidade || 1,
          categoria: item.categoria || 'Outros',
          precoEstimado: item.preco || 0
        });
      }
    }
  }
}

export const api = new ShoppingAPI();