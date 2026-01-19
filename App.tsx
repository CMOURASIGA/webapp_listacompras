import React, { useState, useEffect } from 'react';
import { ShoppingItem, Category, PurchaseGroup, DashboardStats, UserSession } from './types';
import { api } from './services/api';

// --- Sub-components ---

const LoadingOverlay = ({ message = "Carregando dados..." }) => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600 font-medium">{message}</p>
    </div>
  </div>
);

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';

  return (
    <div className={`fixed bottom-20 sm:bottom-10 left-1/2 -translate-x-1/2 ${bg} text-white px-6 py-3 rounded-2xl shadow-2xl z-[10000] flex items-center gap-2 animate-bounce text-sm font-medium`}>
      <span>{message}</span>
    </div>
  );
};

const LoginScreen = ({ onLogin }: { onLogin: (user: UserSession) => void }) => {
  useEffect(() => {
    /* global google */
    // @ts-ignore
    google.accounts.id.initialize({
      client_id: "732049983942-0fpgrebuqit06v819d26s6psv093i3u8.apps.googleusercontent.com", // Client ID genérico para demonstração ou via env
      callback: (response: any) => {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        const user: UserSession = {
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        };
        localStorage.setItem('shopping_user', JSON.stringify(user));
        onLogin(user);
      }
    });
    // @ts-ignore
    google.accounts.id.renderButton(
      document.getElementById("googleBtn"),
      { theme: "outline", size: "large", width: 280, text: "signin_with", shape: "pill" }
    );
  }, [onLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-blue-200 w-full max-w-md text-center animate-fade-in border border-white">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white font-bold text-4xl shadow-xl shadow-blue-200 mx-auto mb-6">
          L
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Bem-vindo!</h1>
        <p className="text-gray-500 mb-10 font-medium">Sua lista de compras inteligente e compartilhada.</p>
        
        <div className="flex justify-center mb-8" id="googleBtn"></div>
        
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
          Dados salvos com segurança no Google Sheets
        </p>
      </div>
    </div>
  );
};

const ConfigErrorScreen = () => (
  <div className="min-h-screen flex items-center justify-center p-6 bg-red-50">
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl w-full max-w-md text-center border-2 border-red-100">
      <div className="text-5xl mb-6">⚠️</div>
      <h1 className="text-2xl font-bold text-red-600 mb-4">Configuração Pendente</h1>
      <p className="text-gray-600 mb-6 text-sm">A URL do seu Google Apps Script não foi encontrada nas variáveis de ambiente do Vercel.</p>
      <div className="bg-gray-50 p-4 rounded-2xl text-left text-xs font-mono text-gray-500 break-all mb-6">
        Variável: APPS_SCRIPT_URL
      </div>
      <p className="text-gray-400 text-xs italic">Verifique o README para saber como configurar.</p>
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<'lista' | 'carrinho' | 'historico'>('lista');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [historyData, setHistoryData] = useState<{ compras: PurchaseGroup[], stats: DashboardStats } | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [catFilter, setCatFilter] = useState('todos');

  // Form states
  const [newItemName, setNewItemName] = useState('');
  const [newItemQtd, setNewItemQtd] = useState(1);
  const [newItemCat, setNewItemCat] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(0);

  // Check Session on Load
  useEffect(() => {
    const savedUser = localStorage.getItem('shopping_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch data when user is authenticated
  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [cats, initialItems] = await Promise.all([
        api.getCategories(),
        api.getItems()
      ]);
      setCategories(cats);
      setItems(initialItems);
      if (cats.length > 0) setNewItemCat(cats[0].nome);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'historico' && user) {
      fetchHistory();
    }
  }, [activeTab, user]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory();
      setHistoryData(data);
    } catch (e: any) {
      showToast('Erro ao carregar histórico', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const handleLogout = () => {
    localStorage.removeItem('shopping_user');
    setUser(null);
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
    } catch (e: any) {
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

  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await api.getSmartSuggestions(items, categories);
      setSuggestions(res);
      if (res.length === 0) showToast('Nenhuma sugestão encontrada', 'info');
    } catch (e) {
      showToast('Erro ao obter sugestões', 'error');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddSuggestion = (name: string) => {
    setNewItemName(name);
    setSuggestions(prev => prev.filter(s => s !== name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!user && !loading) return <LoginScreen onLogin={setUser} />;
  
  // Logic splits
  const pendingItems = items.filter(i => i.status === 'pendente' && (catFilter === 'todos' || i.categoria === catFilter));
  const boughtItems = items.filter(i => i.status === 'comprado');
  const cartTotal = boughtItems.reduce((acc, curr) => acc + (curr.precoEstimado * curr.quantidade), 0);

  return (
    <div className="max-w-4xl mx-auto pb-24 min-h-screen flex flex-col">
      {loading && <LoadingOverlay />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b px-4 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
            L
          </div>
          <h1 className="font-bold text-gray-800 text-lg hidden sm:block">Lista de Compras</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Logado como</p>
            <p className="text-sm font-bold text-gray-700">{user?.name}</p>
          </div>
          <button onClick={handleLogout} className="group relative">
            <img src={user?.picture} className="w-10 h-10 rounded-full border-2 border-white shadow-sm ring-2 ring-transparent group-hover:ring-blue-100 transition-all" alt="User" />
            <div className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
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
      <main className="p-4 flex-1">
        {activeTab === 'lista' && (
          <div className="space-y-6 animate-fade-in">
            {/* Quick Add Form */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="Nome do item (ex: Arroz 5kg)" 
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-700 placeholder:text-gray-300 transition-all border border-transparent focus:border-blue-100"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Qtd" 
                      className="w-24 px-5 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-700 border border-transparent"
                      value={newItemQtd}
                      onChange={e => setNewItemQtd(Number(e.target.value))}
                    />
                    <select 
                      className="flex-1 px-5 py-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-700 border border-transparent appearance-none"
                      value={newItemCat}
                      onChange={e => setNewItemCat(e.target.value)}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.nome}>{c.icone} {c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                   <div className="flex-1 flex items-center bg-gray-50 px-5 py-4 rounded-2xl border border-transparent">
                      <span className="text-gray-400 font-bold mr-2">R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="Preço estimado" 
                        className="w-full bg-transparent outline-none font-medium text-gray-700"
                        value={newItemPrice}
                        onChange={e => setNewItemPrice(Number(e.target.value))}
                      />
                   </div>
                   <button 
                    type="submit"
                    className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                   >
                     Adicionar
                   </button>
                </div>
              </form>
            </div>

            {/* Smart Suggestions Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-[2rem] border border-blue-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-blue-800 flex items-center gap-2 uppercase tracking-wider">
                  <span className="text-xl">✨</span> Sugestões da IA
                </h3>
                <button 
                  onClick={handleGetSuggestions}
                  disabled={loadingSuggestions}
                  className="text-xs font-black text-blue-600 hover:text-blue-800 disabled:opacity-50 bg-white px-3 py-1 rounded-full shadow-sm border border-blue-100 uppercase tracking-tighter"
                >
                  {loadingSuggestions ? 'Pensando...' : 'Ver sugestões'}
                </button>
              </div>
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                  {suggestions.map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleAddSuggestion(s)}
                      className="bg-white px-4 py-2 rounded-xl border border-blue-100 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all hover:scale-105 shadow-sm"
                    >
                      + {s}
                    </button>
                  ))}
                  <button onClick={() => setSuggestions([])} className="text-[10px] font-black text-gray-400 px-2 uppercase hover:text-red-400">Limpar</button>
                </div>
              )}
              {suggestions.length === 0 && !loadingSuggestions && (
                <p className="text-[10px] text-blue-400 font-medium">Use a inteligência artificial para completar sua lista com itens essenciais.</p>
              )}
            </div>

            {/* Cat Filter */}
            <div className="flex overflow-x-auto gap-2 py-2 no-scrollbar px-1">
              <button 
                onClick={() => setCatFilter('todos')}
                className={`whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-bold transition-all uppercase tracking-widest ${catFilter === 'todos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-400 border border-gray-100'}`}
              >
                Todos
              </button>
              {categories.map(c => (
                <button 
                  key={c.id}
                  onClick={() => setCatFilter(c.nome)}
                  className={`whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-bold transition-all uppercase tracking-widest ${catFilter === c.nome ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-400 border border-gray-100'}`}
                >
                  {c.icone} {c.nome}
                </button>
              ))}
            </div>

            {/* Items List */}
            <div className="space-y-3">
              {pendingItems.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                   <div className="text-6xl mb-4">🛒</div>
                   <p className="text-gray-800 font-bold">Sua lista está pronta!</p>
                   <p className="text-sm text-gray-400">Adicione itens acima ou use a IA ✨</p>
                </div>
              ) : (
                pendingItems.map(item => (
                  <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between group hover:border-blue-100 transition-all">
                    <div className="flex items-center gap-5">
                      <button 
                        onClick={() => handleToggleStatus(item.id)}
                        className="w-7 h-7 rounded-xl border-2 border-blue-100 flex items-center justify-center hover:bg-blue-50 transition-all"
                      >
                      </button>
                      <div>
                        <h3 className="font-bold text-gray-800">{item.nome}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-lg text-gray-500 font-black uppercase">
                            {item.quantidade}x
                          </span>
                          <span className="text-[10px] text-gray-300 font-black uppercase tracking-tighter">{item.categoria}</span>
                          <span className="text-xs text-blue-600 font-black">R$ {item.precoEstimado.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-3 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'carrinho' && (
          <div className="space-y-6 animate-fade-in">
            {/* Cart Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-green-100 relative overflow-hidden border border-green-500">
                <p className="text-green-100 text-xs font-black uppercase tracking-widest">Total</p>
                <h2 className="text-4xl font-black mt-2">R$ {cartTotal.toFixed(2)}</h2>
                <div className="absolute top-[-20%] right-[-10%] opacity-10 transform rotate-12">
                  <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-center">
                <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Itens</p>
                <h2 className="text-4xl font-black mt-2 text-gray-800">{boughtItems.length}</h2>
              </div>
            </div>

            {/* Cart Items */}
            <div className="space-y-3">
              {boughtItems.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                   <div className="text-6xl mb-4">🛒</div>
                   <p className="text-gray-800 font-bold">O carrinho está vazio</p>
                   <p className="text-sm text-gray-400">Marque os itens conforme for pegando</p>
                </div>
              ) : (
                boughtItems.map(item => (
                  <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-5">
                      <button 
                        onClick={() => handleToggleStatus(item.id)}
                        className="w-7 h-7 rounded-xl bg-green-500 border-2 border-green-500 flex items-center justify-center text-white shadow-lg shadow-green-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <div>
                        <h3 className="font-bold text-gray-400 line-through decoration-gray-200">{item.nome}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] bg-green-50 px-2 py-0.5 rounded-lg text-green-600 font-black uppercase">
                            {item.quantidade}x
                          </span>
                          <span className="text-[10px] text-gray-300 font-black uppercase tracking-tighter">{item.categoria}</span>
                          <span className="text-xs text-green-600 font-black">R$ {(item.precoEstimado * item.quantidade).toFixed(2)}</span>
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
                className="w-full bg-green-600 text-white py-6 rounded-3xl font-black text-xl hover:bg-green-700 transition-all shadow-2xl shadow-green-100 active:scale-95 flex items-center justify-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                Finalizar Compra
              </button>
            )}
          </div>
        )}

        {activeTab === 'historico' && historyData && (
          <div className="space-y-6 animate-fade-in">
            {/* History Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-purple-600 p-5 rounded-[2rem] text-white shadow-xl shadow-purple-100">
                <p className="text-purple-100 text-[10px] font-black uppercase tracking-widest">Gasto Total</p>
                <h2 className="text-xl font-black mt-1">R$ {historyData.stats.totalGasto.toFixed(2)}</h2>
              </div>
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Média</p>
                <h2 className="text-xl font-black mt-1 text-gray-800">R$ {historyData.stats.gastoMedio.toFixed(2)}</h2>
              </div>
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Compras</p>
                <h2 className="text-xl font-black mt-1 text-gray-800">{historyData.stats.totalCompras}</h2>
              </div>
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Preferida</p>
                <h2 className="text-sm font-black mt-1 text-gray-800 truncate">{historyData.stats.categoriaFavorita || '---'}</h2>
              </div>
            </div>

            {/* Purchases List */}
            <div className="space-y-6">
              <h3 className="font-black text-gray-900 text-lg uppercase tracking-tighter">Compras Passadas</h3>
              {historyData.compras.length === 0 ? (
                 <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                    <div className="text-6xl mb-4">📅</div>
                    <p className="text-gray-800 font-bold">Nenhum registro encontrado</p>
                    <p className="text-sm text-gray-400">Finalize uma compra para gerar histórico</p>
                 </div>
              ) : (
                historyData.compras.map(p => (
                  <div key={p.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 bg-gray-50 flex items-center justify-between border-b border-gray-100">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Data</p>
                        <p className="font-black text-gray-800 text-lg">{p.data}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Investimento</p>
                        <p className="font-black text-purple-600 text-2xl">R$ {p.total.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="p-6 space-y-3">
                      {p.itens.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                          <span className="text-gray-600 font-medium">
                            <span className="font-black text-gray-300 mr-3">{item.quantidade}x</span>
                            {item.nome}
                          </span>
                          <span className="text-[10px] text-gray-400 font-black uppercase">{item.categoria}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-white">
                       <button 
                        onClick={() => handleReload(p.id)}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-purple-50 text-purple-600 font-black text-xs uppercase tracking-widest hover:bg-purple-50 transition-all active:scale-95"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                         Recuperar Itens
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
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t px-8 py-4 sm:hidden flex justify-around items-center z-50">
          <button onClick={() => setActiveTab('lista')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'lista' ? 'text-blue-600 scale-110' : 'text-gray-300'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/></svg>
            <span className="text-[9px] font-black uppercase tracking-tighter">LISTA</span>
          </button>
          <button onClick={() => setActiveTab('carrinho')} className={`relative flex flex-col items-center gap-1 transition-all ${activeTab === 'carrinho' ? 'text-green-600 scale-110' : 'text-gray-300'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            <span className="text-[9px] font-black uppercase tracking-tighter">CARRINHO</span>
            {boughtItems.length > 0 && (
              <span className="absolute -top-3 -right-3 bg-red-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                {boughtItems.length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('historico')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'historico' ? 'text-purple-600 scale-110' : 'text-gray-300'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span className="text-[9px] font-black uppercase tracking-tighter">HISTÓRICO</span>
          </button>
      </footer>
    </div>
  );
}