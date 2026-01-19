
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingItem, Category, PurchaseGroup, DashboardStats, UserSession } from './types';
import { api } from './services/api';

// --- Sub-components ---

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600 font-medium">Carregando dados...</p>
    </div>
  </div>
);

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 ${bg} text-white px-6 py-3 rounded-full shadow-lg z-[10000] flex items-center gap-2 animate-bounce`}>
      <span>{message}</span>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'lista' | 'carrinho' | 'historico'>('lista');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [historyData, setHistoryData] = useState<{ compras: PurchaseGroup[], stats: DashboardStats } | null>(null);
  const [user, setUser] = useState<UserSession | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  // Filters
  const [catFilter, setCatFilter] = useState('todos');

  // Form states
  const [newItemName, setNewItemName] = useState('');
  const [newItemQtd, setNewItemQtd] = useState(1);
  const [newItemCat, setNewItemCat] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(0);

  // Initial Load
  useEffect(() => {
    const init = async () => {
      try {
        const [me, cats, initialItems] = await Promise.all([
          api.getMe(),
          api.getCategories(),
          api.getItems()
        ]);
        setUser(me);
        setCategories(cats);
        setItems(initialItems);
        if (cats.length > 0) setNewItemCat(cats[0].nome);
      } catch (e) {
        showToast('Erro ao carregar dados iniciais', 'error');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Fetch history when tab changes
  useEffect(() => {
    if (activeTab === 'historico') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory();
      setHistoryData(data);
    } catch (e) {
      showToast('Erro ao carregar histórico', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;
    setLoading(true);
    try {
      await api.addItem({
        nome: newItemName,
        quantidade: newItemQtd,
        categoria: newItemCat,
        precoEstimado: newItemPrice
      });
      const updated = await api.getItems();
      setItems(updated);
      setNewItemName('');
      setNewItemQtd(1);
      setNewItemPrice(0);
      showToast('Item adicionado!', 'success');
    } catch (e) {
      showToast('Erro ao adicionar item', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string | number) => {
    try {
      await api.toggleStatus(id);
      const updated = await api.getItems();
      setItems(updated);
    } catch (e) {
      showToast('Erro ao atualizar item', 'error');
    }
  };

  const handleRemoveItem = async (id: string | number) => {
    if (!confirm('Deseja remover este item?')) return;
    setLoading(true);
    try {
      await api.removeItem(id);
      const updated = await api.getItems();
      setItems(updated);
      showToast('Item removido');
    } catch (e) {
      showToast('Erro ao remover item', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Finalizar compra e mover para histórico?')) return;
    setLoading(true);
    try {
      await api.finalizePurchase();
      const updated = await api.getItems();
      setItems(updated);
      showToast('Compra finalizada com sucesso!', 'success');
      setActiveTab('historico');
    } catch (e) {
      showToast('Erro ao finalizar compra', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReload = async (purchaseId: string | number) => {
    setLoading(true);
    try {
      await api.reloadList(purchaseId);
      const updated = await api.getItems();
      setItems(updated);
      showToast('Itens adicionados à lista!', 'success');
      setActiveTab('lista');
    } catch (e) {
      showToast('Erro ao recarregar lista', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Logic splits
  const pendingItems = items.filter(i => i.status === 'pendente' && (catFilter === 'todos' || i.categoria === catFilter));
  const boughtItems = items.filter(i => i.status === 'comprado');
  const cartTotal = boughtItems.reduce((acc, curr) => acc + (curr.precoEstimado * curr.quantidade), 0);

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {loading && <LoadingOverlay />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
            L
          </div>
          <h1 className="font-bold text-gray-800 text-lg hidden sm:block">Lista de Compras</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500">Logado como</p>
            <p className="text-sm font-semibold text-gray-700">{user?.email}</p>
          </div>
          <img src={user?.picture} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="User" />
        </div>
      </header>

      {/* Main Navigation */}
      <nav className="flex border-b bg-white sticky top-[73px] z-40">
        <button 
          onClick={() => setActiveTab('lista')}
          className={`flex-1 py-4 font-semibold text-sm transition-all ${activeTab === 'lista' ? 'tab-active-blue' : 'text-gray-500'}`}
        >
          Minha Lista
        </button>
        <button 
          onClick={() => setActiveTab('carrinho')}
          className={`flex-1 py-4 font-semibold text-sm transition-all ${activeTab === 'carrinho' ? 'tab-active-green' : 'text-gray-500'}`}
        >
          Carrinho ({boughtItems.length})
        </button>
        <button 
          onClick={() => setActiveTab('historico')}
          className={`flex-1 py-4 font-semibold text-sm transition-all ${activeTab === 'historico' ? 'tab-active-purple' : 'text-gray-500'}`}
        >
          Histórico
        </button>
      </nav>

      {/* Content Area */}
      <main className="p-4 animate-in fade-in duration-500">
        {activeTab === 'lista' && (
          <div className="space-y-6">
            {/* Quick Add Form */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="Nome do item (ex: Arroz 5kg)" 
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Qtd" 
                      className="w-20 px-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newItemQtd}
                      onChange={e => setNewItemQtd(Number(e.target.value))}
                    />
                    <select 
                      className="flex-1 px-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newItemCat}
                      onChange={e => setNewItemCat(e.target.value)}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.nome}>{c.icone} {c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4">
                   <div className="flex-1 flex items-center bg-gray-50 px-4 py-3 rounded-xl">
                      <span className="text-gray-400 mr-2">R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="Preço estimado" 
                        className="w-full bg-transparent outline-none"
                        value={newItemPrice}
                        onChange={e => setNewItemPrice(Number(e.target.value))}
                      />
                   </div>
                   <button 
                    type="submit"
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                   >
                     Adicionar
                   </button>
                </div>
              </form>
            </div>

            {/* Cat Filter */}
            <div className="flex overflow-x-auto gap-2 py-2 no-scrollbar">
              <button 
                onClick={() => setCatFilter('todos')}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${catFilter === 'todos' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 border'}`}
              >
                Todos
              </button>
              {categories.map(c => (
                <button 
                  key={c.id}
                  onClick={() => setCatFilter(c.nome)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${catFilter === c.nome ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 border'}`}
                >
                  {c.icone} {c.nome}
                </button>
              ))}
            </div>

            {/* Items List */}
            <div className="space-y-3">
              {pendingItems.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                   <div className="text-4xl mb-3">🛒</div>
                   <p className="text-gray-500 font-medium">Sua lista está vazia</p>
                   <p className="text-sm text-gray-400">Adicione itens acima para começar</p>
                </div>
              ) : (
                pendingItems.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleToggleStatus(item.id)}
                        className="w-6 h-6 rounded-md border-2 border-blue-200 flex items-center justify-center hover:bg-blue-50 transition-colors"
                      >
                      </button>
                      <div>
                        <h3 className="font-semibold text-gray-800">{item.nome}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-medium">
                            {item.quantidade}x
                          </span>
                          <span className="text-xs text-gray-400 font-medium">•</span>
                          <span className="text-xs text-gray-400 font-medium">{item.categoria}</span>
                          <span className="text-xs text-blue-600 font-bold ml-1">R$ {item.precoEstimado.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'carrinho' && (
          <div className="space-y-6">
            {/* Cart Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-600 p-6 rounded-3xl text-white shadow-xl shadow-green-200 relative overflow-hidden">
                <p className="text-green-100 text-sm font-medium">Total Carrinho</p>
                <h2 className="text-3xl font-bold mt-1">R$ {cartTotal.toFixed(2)}</h2>
                <div className="absolute top-[-20%] right-[-10%] opacity-20 transform rotate-12">
                  <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-gray-400 text-sm font-medium">Itens Comprados</p>
                <h2 className="text-3xl font-bold mt-1 text-gray-800">{boughtItems.length}</h2>
              </div>
            </div>

            {/* Cart Items */}
            <div className="space-y-3">
              {boughtItems.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                   <div className="text-4xl mb-3">🛒</div>
                   <p className="text-gray-500 font-medium">Carrinho vazio</p>
                   <p className="text-sm text-gray-400">Marque itens na lista para trazê-los para cá</p>
                </div>
              ) : (
                boughtItems.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleToggleStatus(item.id)}
                        className="w-6 h-6 rounded-md bg-green-500 border-2 border-green-500 flex items-center justify-center text-white"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <div>
                        <h3 className="font-semibold text-gray-800 line-through decoration-gray-300">{item.nome}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-green-50 px-2 py-0.5 rounded text-green-600 font-medium">
                            {item.quantidade}x
                          </span>
                          <span className="text-xs text-gray-400 font-medium">{item.categoria}</span>
                          <span className="text-xs text-green-600 font-bold ml-1">R$ {(item.precoEstimado * item.quantidade).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Finalize Button */}
            {boughtItems.length > 0 && (
              <button 
                onClick={handleFinalize}
                className="w-full bg-green-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all shadow-xl shadow-green-100 active:scale-[0.98]"
              >
                Finalizar Compra
              </button>
            )}
          </div>
        )}

        {activeTab === 'historico' && historyData && (
          <div className="space-y-6">
            {/* History Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-purple-600 p-6 rounded-3xl text-white shadow-xl shadow-purple-100">
                <p className="text-purple-100 text-xs font-medium uppercase tracking-wider">Total Acumulado</p>
                <h2 className="text-2xl font-bold mt-1">R$ {historyData.stats.totalGasto.toFixed(2)}</h2>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Média p/ Compra</p>
                <h2 className="text-2xl font-bold mt-1 text-gray-800">R$ {historyData.stats.gastoMedio.toFixed(2)}</h2>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Compras</p>
                <h2 className="text-2xl font-bold mt-1 text-gray-800">{historyData.stats.totalCompras}</h2>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Cat. Favorita</p>
                <h2 className="text-xl font-bold mt-1 text-gray-800 truncate">{historyData.stats.categoriaFavorita || '---'}</h2>
              </div>
            </div>

            {/* Purchases List */}
            <div className="space-y-6">
              <h3 className="font-bold text-gray-700 text-lg">Compras Recentes</h3>
              {historyData.compras.length === 0 ? (
                 <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-gray-500 font-medium">Nenhuma compra no histórico</p>
                    <p className="text-sm text-gray-400">Suas compras finalizadas aparecerão aqui</p>
                 </div>
              ) : (
                historyData.compras.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gray-50 flex items-center justify-between border-b">
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Data da Compra</p>
                        <p className="font-bold text-gray-800">{p.data}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Pago</p>
                        <p className="font-black text-purple-600 text-lg">R$ {p.total.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      {p.itens.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                          <span className="text-gray-600">
                            <span className="font-bold text-gray-400 mr-2">{item.quantidade}x</span>
                            {item.nome}
                          </span>
                          <span className="text-gray-400 text-xs">{item.categoria}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-white">
                       <button 
                        onClick={() => handleReload(p.id)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-purple-50 text-purple-600 font-bold hover:bg-purple-50 transition-colors"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                         Recarregar Itens na Lista
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Persistent Call-to-Action / Tab Bar for Mobile Experience */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t px-6 py-4 sm:hidden flex justify-around items-center z-50">
          <button onClick={() => setActiveTab('lista')} className={`flex flex-col items-center gap-1 ${activeTab === 'lista' ? 'text-blue-600' : 'text-gray-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/></svg>
            <span className="text-[10px] font-bold">LISTA</span>
          </button>
          <button onClick={() => setActiveTab('carrinho')} className={`relative flex flex-col items-center gap-1 ${activeTab === 'carrinho' ? 'text-green-600' : 'text-gray-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            <span className="text-[10px] font-bold">CARRINHO</span>
            {boughtItems.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                {boughtItems.length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('historico')} className={`flex flex-col items-center gap-1 ${activeTab === 'historico' ? 'text-purple-600' : 'text-gray-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span className="text-[10px] font-bold">HISTÓRICO</span>
          </button>
      </footer>
    </div>
  );
}
