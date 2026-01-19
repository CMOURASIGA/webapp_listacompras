
import { ShoppingItem, Category, PurchaseGroup, DashboardStats, ItemStatus } from '../types';

/**
 * Em um cenário real de deploy no Vercel, estas chamadas seriam para /api/itens, /api/categorias, etc.
 * Abaixo simulamos a latência e o comportamento do Google Sheets.
 */

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class ShoppingAPI {
  // Simulação de banco de dados (Sheet Mock)
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

  async getMe() {
    await sleep(300);
    return { email: 'usuario@exemplo.com', name: 'Usuário Teste', picture: 'https://picsum.photos/100/100' };
  }

  async getCategories(): Promise<Category[]> {
    await sleep(400);
    return [...this.categories];
  }

  async getItems(): Promise<ShoppingItem[]> {
    await sleep(500);
    return [...this.items];
  }

  async addItem(item: Omit<ShoppingItem, 'id' | 'status' | 'dataAdicao'>): Promise<ShoppingItem> {
    await sleep(500);
    const newItem: ShoppingItem = {
      ...item,
      id: Date.now(),
      status: 'pendente',
      dataAdicao: new Date().toISOString()
    };
    this.items.push(newItem);
    return newItem;
  }

  async updateItem(id: string | number, updates: Partial<ShoppingItem>): Promise<void> {
    await sleep(400);
    const index = this.items.findIndex(i => i.id === id);
    if (index !== -1) {
      this.items[index] = { ...this.items[index], ...updates };
    }
  }

  async removeItem(id: string | number): Promise<void> {
    await sleep(400);
    this.items = this.items.filter(i => i.id !== id);
  }

  async toggleStatus(id: string | number): Promise<void> {
    const item = this.items.find(i => i.id === id);
    if (item) {
      await this.updateItem(id, { 
        status: item.status === 'pendente' ? 'comprado' : 'pendente' 
      });
    }
  }

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
  }

  async getHistory(): Promise<{ compras: PurchaseGroup[], stats: DashboardStats }> {
    await sleep(600);
    const totalGasto = this.history.reduce((acc, curr) => acc + curr.total, 0);
    const totalItens = this.history.reduce((acc, curr) => acc + curr.itens.length, 0);
    
    // Simple mock logic for cat favorita
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

  async reloadList(purchaseId: string | number): Promise<void> {
    await sleep(600);
    const purchase = this.history.find(p => p.id === purchaseId);
    if (purchase) {
      purchase.itens.forEach(item => {
        this.addItem({
          nome: item.nome || '',
          quantidade: item.quantidade || 1,
          categoria: item.categoria || 'Outros',
          precoEstimado: item.preco || 0
        });
      });
    }
  }
}

export const api = new ShoppingAPI();
