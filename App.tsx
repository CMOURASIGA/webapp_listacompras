import React, { useState, useEffect } from 'react';
import { ShoppingItem, Category, PurchaseGroup, DashboardStats, UserSession } from './types';
import { api } from './services/api';

// --- Sub-components ---

const LoadingOverlay = ({ message = "Sincronizando..." }) => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-900 font-bold uppercase text-[10px] tracking-widest">{message}</p>
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
    <div className={`fixed bottom-20 sm:bottom-10 left-1/2 -translate-x-1/2 ${bg} text-white px-6 py-3 rounded-2xl shadow-2xl z-[10000] flex items-center gap-2 animate-bounce text-sm font-medium text-center min-w-[280px]`}>
      <span>{message}</span>
    </div>
  );
};

const DiagnosticModal = ({ isOpen, onClose, onRefresh }: { isOpen: boolean, onClose: () => void, onRefresh: () => void }) => {
  const [results, setResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  
  const [manualVars, setManualVars] = useState({
    APPS_SCRIPT_URL: localStorage.getItem('DEBUG_APPS_SCRIPT_URL') || 'https://script.google.com/macros/s/AKfycbxgt0XKD21dsD8EqMNQv0-8VFvBGjrktswc8t6FC8kwKdVsIZyoelpKO4rRiXOrXBQ/exec',
    API_KEY: localStorage.getItem('DEBUG_API_KEY') || '',
    CLIENT_ID: localStorage.getItem('DEBUG_CLIENT_ID') || ''
  });

  const saveManualVars = () => {
    localStorage.setItem('DEBUG_APPS_SCRIPT_URL', manualVars.APPS_SCRIPT_URL.trim());
    localStorage.setItem('DEBUG_API_KEY', manualVars.API_KEY.trim());
    localStorage.setItem('DEBUG_CLIENT_ID', manualVars.CLIENT_ID.trim());
    onRefresh(); // Dispara atualização de dados no App
    alert('Configurações salvas e dados atualizados!');
    onClose();
  };

  const runDiagnostic = async () => {
    setTesting(true);
    setResults(null);
    try {
      const isDev = (import.meta as any).env?.DEV === true;
      const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      const forceDirect = String((import.meta as any).env?.VITE_FORCE_DIRECT_SCRIPT || '').toLowerCase() === 'true';
      const useDirectScript = forceDirect || !(isDev && isLocalhost);
      const base = useDirectScript ? manualVars.APPS_SCRIPT_URL.trim() : new URL('/api', window.location.origin).toString();
      const url = new URL(base);
      url.searchParams.set('action', 'listarCategorias');
      url.searchParams.set('_t', Date.now().toString()); // Cache buster manual
      if (!useDirectScript) {
        if (manualVars.APPS_SCRIPT_URL) url.searchParams.set('override_url', manualVars.APPS_SCRIPT_URL.trim());
        if (manualVars.API_KEY) url.searchParams.set('override_key', manualVars.API_KEY.trim());
      }

      const response = await fetch(url.toString(), {
        cache: 'no-store',
        credentials: useDirectScript ? 'omit' : 'same-origin'
      });
      const status = response.status;
      const text = await response.text();
      const contentType = response.headers.get('content-type') || '';
      
      let json = null;
      try { json = JSON.parse(text); } catch (e) {}

      setResults({
        status,
        json,
        isJson: !!json,
        contentType,
        targetUrl: url.toString(),
        rawText: text.substring(0, 500)
      });
    } catch (e: any) {
      setResults({ error: e.message });
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[10001] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in border border-gray-200">
        <div className="p-8 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Painel de Controle</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-900 transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 tracking-widest">URL do Google Script (/exec)</label>
              <input 
                type="text" 
                className="w-full bg-white border border-gray-300 p-4 rounded-2xl text-[12px] font-mono focus:ring-4 focus:ring-blue-100 outline-none text-gray-900 placeholder-gray-400 shadow-inner"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={manualVars.APPS_SCRIPT_URL}
                onChange={e => setManualVars({...manualVars, APPS_SCRIPT_URL: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Gemini API Key</label>
                <input type="password" placeholder="AIza..." className="w-full bg-white border border-gray-300 p-4 rounded-2xl text-xs font-mono text-gray-900 shadow-inner" value={manualVars.API_KEY} onChange={e => setManualVars({...manualVars, API_KEY: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Google Client ID</label>
                <input type="text" placeholder="...apps" className="w-full bg-white border border-gray-300 p-4 rounded-2xl text-xs font-mono text-gray-900 shadow-inner" value={manualVars.CLIENT_ID} onChange={e => setManualVars({...manualVars, CLIENT_ID: e.target.value})} />
              </div>
            </div>
          </div>
          
          <button onClick={saveManualVars} className="w-full bg-black text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-gray-800 transition-all active:scale-95">
            Salvar e Atualizar Dados
          </button>

          <div className="h-px bg-gray-100 my-4"></div>

          <button onClick={runDiagnostic} disabled={testing} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all active:scale-95">
            {testing ? 'PROCESSANDO...' : 'VALIDAR CONEXÃO AGORA'}
          </button>

          {results && (
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 animate-fade-in">
              {results.json?.error ? (
                <div className="text-red-600">
                  <p className="font-black text-[10px] uppercase mb-1">ERRO:</p>
                  <p className="text-xs font-bold leading-tight">{results.json.error}</p>
                  <p className="text-[10px] mt-2 font-medium opacity-70 italic">{results.json.hint}</p>
                </div>
              ) : (results.status === 200 && results.isJson && Array.isArray(results.json?.data)) ? (
                <div className="text-green-600 flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <p className="font-black text-xs uppercase tracking-widest">Planilha Conectada com Sucesso!</p>
                </div>
              ) : (
                <div className="text-gray-500 text-[9px] font-mono bg-gray-900 p-4 rounded-xl">
                  <p className="text-gray-400 font-black mb-2 uppercase">Resposta Bruta:</p>
                  <p className="text-gray-400 mb-2">Status: {results.status} | Content-Type: {results.contentType || 'n/a'}</p>
                  <p className="text-gray-400 mb-2 break-all">URL: {results.targetUrl || 'n/a'}</p>
                  <pre className="whitespace-pre-wrap text-green-400 overflow-x-auto">{results.rawText}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Telas Principais ---

const LoginScreen = ({ onLogin }: { onLogin: (user: UserSession) => void }) => {
  const [hasClientId, setHasClientId] = useState(true);

  useEffect(() => {
    const manualId = localStorage.getItem('DEBUG_CLIENT_ID');
    const clientId = manualId || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId || clientId.includes("CLIENT_ID_AQUI")) {
      setHasClientId(false);
      return;
    }

    try {
      // @ts-ignore
      google.accounts.id.initialize({
        client_id: clientId,
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
    } catch (e) {
      setHasClientId(false);
    }
  }, [onLogin]);

  const handleDemoLogin = () => {
    const demoUser = {
      email: 'convidado@exemplo.com',
      name: 'Convidado',
      picture: 'https://ui-avatars.com/api/?name=Convidado&background=0D8ABC&color=fff'
    };
    localStorage.setItem('shopping_user', JSON.stringify(demoUser));
    onLogin(demoUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-12 rounded-[4rem] shadow-2xl shadow-blue-200 w-full max-w-md text-center border border-white">
        <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white font-black text-5xl shadow-xl mx-auto mb-8 border-4 border-white">L</div>
        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter">Shopping Pro</h1>
        <p className="text-gray-400 mb-12 font-bold uppercase text-[10px] tracking-[0.3em]">Gestão Inteligente</p>
        
        <div className="space-y-4">
          {hasClientId && <div className="flex justify-center" id="googleBtn"></div>}
          <button onClick={handleDemoLogin} className={`w-full py-5 rounded-2xl font-black transition-all ${hasClientId ? 'text-blue-600 text-sm hover:underline' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xl shadow-blue-100'}`}>
            {hasClientId ? 'Entrar como Convidado' : 'Acessar App'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<'lista' | 'carrinho' | 'historico'>('lista');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [historyData, setHistoryData] = useState<{ compras: PurchaseGroup[], stats: DashboardStats } | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [catFilter, setCatFilter] = useState('todos');
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  const [newItemName, setNewItemName] = useState('');
  const [newItemQtd, setNewItemQtd] = useState(1);
  const [newItemCat, setNewItemCat] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦');
  const [newCategoryColor, setNewCategoryColor] = useState('#9E9E9E');
  const [editingItemId, setEditingItemId] = useState<string | number | null>(null);
  const [editName, setEditName] = useState('');
  const [editQtd, setEditQtd] = useState(1);
  const [editCat, setEditCat] = useState('');
  const [editPrice, setEditPrice] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem('shopping_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    else setLoading(false);
  }, []);

  useEffect(() => { if (user) fetchInitialData(); }, [user]);

  useEffect(() => {
    if (!user) return;
    if ((activeTab === 'lista' || activeTab === 'carrinho') && !itemsLoaded) {
      fetchItems();
    }
  }, [activeTab, user, itemsLoaded]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      setItems([]);
      setItemsLoaded(false);
      setHistoryData(null);
      setHistoryLoaded(false);

      const bootstrap = await api.bootstrap();
      if (bootstrap?.spreadsheetId) {
        localStorage.setItem('shopping_spreadsheet_id', bootstrap.spreadsheetId);
      }
      if (bootstrap?.spreadsheetUrl) {
        localStorage.setItem('shopping_spreadsheet_url', bootstrap.spreadsheetUrl);
      }
      if (bootstrap?.created) {
        showToast('Planilha criada automaticamente para sua conta.', 'success');
      }

      const cats = await api.getCategories();
      setCategories(cats);
      setNewItemCat(cats[0]?.nome || '');
      if (!cats.length) {
        showToast('Nenhuma categoria encontrada na planilha.', 'info');
      }
    } catch (e: any) {
      setCategories([]);
      setItems([]);
      setItemsLoaded(false);
      setNewItemCat('');
      showToast(e?.message || 'Erro ao carregar dados da planilha', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const loadedItems = await api.getItems();
      setItems(loadedItems);
      setItemsLoaded(true);
      if (editingItemId !== null && !loadedItems.some(i => i.id === editingItemId)) {
        handleCancelEditItem();
      }
      if (!loadedItems.length) {
        showToast('Nenhum item encontrado na lista atual.', 'info');
      }
    } catch (e: any) {
      setItems([]);
      setItemsLoaded(false);
      showToast(e?.message || 'Erro ao carregar itens da planilha', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory();
      setHistoryData(data);
      setHistoryLoaded(true);
    } catch (e: any) {
      setHistoryData({ compras: [], stats: { totalGasto: 0, totalCompras: 0, totalItens: 0, gastoMedio: 0, categoriaFavorita: '' } });
      setHistoryLoaded(true);
      showToast(e?.message || 'Erro ao carregar histórico da planilha', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const handleLogout = () => {
    localStorage.removeItem('shopping_user');
    setItems([]);
    setItemsLoaded(false);
    setHistoryData(null);
    setHistoryLoaded(false);
    setUser(null);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemCat) {
      showToast('Informe nome e categoria para salvar na planilha.', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.addItem({ nome: newItemName, quantidade: newItemQtd, categoria: newItemCat, precoEstimado: newItemPrice });
      const updated = await api.getItems();
      setItems(updated);
      setItemsLoaded(true);
      setNewItemName(''); setNewItemQtd(1); setNewItemPrice(0);
      showToast('Item adicionado!', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Erro ao salvar item na planilha', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string | number) => {
    setLoading(true);
    try {
      const beforeStatus = items.find(i => String(i.id) === String(id))?.status;
      await api.toggleStatus(id);
      let refreshed = await api.getItems();
      let afterStatus = refreshed.find(i => String(i.id) === String(id))?.status;

      // Em alguns cenários a primeira leitura pode voltar sem atualização imediata.
      if (beforeStatus && afterStatus === beforeStatus) {
        refreshed = await api.getItems();
        afterStatus = refreshed.find(i => String(i.id) === String(id))?.status;
      }

      if (beforeStatus && afterStatus === beforeStatus) {
        throw new Error('Não foi possível mover o item entre lista e carrinho. Tente novamente.');
      }
      setItems(refreshed);
      setItemsLoaded(true);
      if (editingItemId === id) handleCancelEditItem();
      if (afterStatus === 'comprado') {
        showToast('Item movido para o carrinho.', 'success');
      } else if (afterStatus === 'pendente') {
        showToast('Item voltou para a lista.', 'info');
      }
    } catch (e: any) {
      showToast(e?.message || 'Erro ao atualizar status no servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (id: string | number) => {
    if (!confirm('Remover este item?')) return;
    setLoading(true);
    try {
      await api.removeItem(id);
      const refreshed = await api.getItems();
      setItems(refreshed);
      setItemsLoaded(true);
      if (editingItemId === id) handleCancelEditItem();
    } catch (e: any) {
      showToast(e?.message || 'Erro ao remover item na planilha', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditItem = (item: ShoppingItem) => {
    setEditingItemId(item.id);
    setEditName(item.nome || '');
    setEditQtd(Number(item.quantidade) || 1);
    setEditCat(item.categoria || categories[0]?.nome || '');
    setEditPrice(Number(item.precoEstimado) || 0);
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setEditName('');
    setEditQtd(1);
    setEditCat('');
    setEditPrice(0);
  };

  const handleSaveEditItem = async () => {
    if (editingItemId === null) return;
    if (!editName.trim() || !editCat.trim()) {
      showToast('Informe nome e categoria para editar o item.', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.updateItem(editingItemId, {
        nome: editName.trim(),
        quantidade: Number(editQtd) || 1,
        categoria: editCat,
        precoEstimado: Number(editPrice) || 0
      });
      const refreshed = await api.getItems();
      setItems(refreshed);
      setItemsLoaded(true);
      handleCancelEditItem();
      showToast('Item atualizado!', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Erro ao editar item na planilha', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast('Informe o nome da categoria.', 'error');
      return;
    }

    setLoading(true);
    try {
      const added = await api.addCategory({
        nome: newCategoryName.trim(),
        icone: (newCategoryIcon || '📦').trim(),
        cor: (newCategoryColor || '#9E9E9E').trim()
      });
      const updatedCats = await api.getCategories();
      setCategories(updatedCats);
      setNewItemCat(added?.nome || newCategoryName.trim());
      setNewCategoryName('');
      setNewCategoryIcon('📦');
      setNewCategoryColor('#9E9E9E');
      setShowNewCategoryForm(false);
      showToast('Categoria adicionada!', 'success');
    } catch (e: any) {
      const msg = e?.message || 'Erro ao adicionar categoria';
      if (msg.includes('Ação não reconhecida')) {
        showToast('Backend sem suporte a nova categoria. Reimplante o Apps Script atualizado.', 'error');
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReloadFromHistory = async (purchaseId: string | number) => {
    if (!confirm('Carregar os itens desta compra para a lista atual?')) return;
    setLoading(true);
    try {
      await api.reloadList(purchaseId);
      const [updatedItems, updatedHistory] = await Promise.all([
        api.getItems(),
        api.getHistory()
      ]);
      setItems(updatedItems);
      setItemsLoaded(true);
      setHistoryData(updatedHistory);
      setHistoryLoaded(true);
      setActiveTab('lista');
      showToast('Itens carregados do histórico para a lista.', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Erro ao carregar compra do histórico', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Salvar esta compra no Histórico?')) return;
    setLoading(true);
    try {
      await api.finalizePurchase();
      const updated = await api.getItems();
      setItems(updated);
      setItemsLoaded(true);
      setHistoryLoaded(false);
      setHistoryData(null);
      showToast('Finalizado! Clique em "Carregar Histórico" para atualizar os dados.', 'success');
      setActiveTab('historico');
    } catch (e: any) {
      showToast(e?.message || 'Erro ao finalizar compra na planilha', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await api.getSmartSuggestions(items, categories);
      setSuggestions(res);
    } catch (e) {
      setSuggestions(['Leite', 'Café', 'Arroz', 'Manteiga']);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddSuggestion = (suggestion: string) => {
    setNewItemName(suggestion);
    showToast(`Sugestão: ${suggestion}`, 'info');
  };

  if (!user && !loading) return (
    <>
      <LoginScreen onLogin={setUser} />
      <button onClick={() => setIsDebugOpen(true)} className="fixed bottom-8 right-8 bg-white/80 p-4 rounded-3xl border border-gray-200 shadow-2xl z-[9999] active:scale-90 flex items-center gap-2">
         <span className="text-xl">⚙️</span>
         <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Config</span>
      </button>
      <DiagnosticModal isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} onRefresh={fetchInitialData} />
    </>
  );

  const pendingItems = items.filter(i => i.status === 'pendente' && (catFilter === 'todos' || i.categoria === catFilter));
  const boughtItems = items.filter(i => i.status === 'comprado');
  const cartTotal = boughtItems.reduce((acc, curr) => acc + (curr.precoEstimado * curr.quantidade), 0);
  const effectiveHistory = historyData || { compras: [], stats: { totalGasto: 0, totalCompras: 0, totalItens: 0, gastoMedio: 0, categoriaFavorita: '' } };

  return (
    <div className="max-w-4xl mx-auto pb-24 min-h-screen flex flex-col bg-gray-50">
      {loading && <LoadingOverlay />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <DiagnosticModal isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} onRefresh={fetchInitialData} />

      <header className="bg-white/80 backdrop-blur-xl border-b px-6 py-5 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-200">L</div>
          <div>
            <h1 className="font-black text-gray-900 text-xl tracking-tighter">Shopping Pro</h1>
            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Sincronizado</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsDebugOpen(true)} className="p-3 hover:bg-gray-100 rounded-2xl group transition-all text-gray-900">
            <span className="text-xl opacity-40 group-hover:opacity-100">⚙️</span>
          </button>
          <button onClick={handleLogout} className="group relative">
            <img src={user?.picture} className="w-12 h-12 rounded-2xl border-4 border-white shadow-xl group-hover:ring-4 group-hover:ring-blue-50 transition-all" />
          </button>
        </div>
      </header>

      <nav className="flex border-b bg-white sticky top-[89px] z-40 px-4">
        {['lista', 'carrinho', 'historico'].map(t => (
          <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-6 font-black text-[10px] uppercase tracking-[0.2em] relative transition-all ${activeTab === t ? `text-${t === 'lista' ? 'blue' : t === 'carrinho' ? 'green' : 'purple'}-600` : 'text-gray-300 hover:text-gray-400'}`}>
            {t} {t === 'carrinho' && `(${boughtItems.length})`}
            {activeTab === t && <div className={`absolute bottom-0 left-4 right-4 h-1 rounded-t-full bg-${t === 'lista' ? 'blue' : t === 'carrinho' ? 'green' : 'purple'}-600 animate-pulse`}></div>}
          </button>
        ))}
      </nav>

      <main className="p-4 flex-1">
        {activeTab === 'lista' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-white">
              <form onSubmit={handleAddItem} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-300 uppercase ml-2 tracking-widest">O que você precisa?</label>
                  <input type="text" placeholder="Ex: Arroz 5kg" className="w-full px-8 py-6 bg-gray-50 rounded-[2rem] focus:ring-4 focus:ring-blue-100 outline-none font-black text-gray-900 text-lg shadow-inner border border-gray-100" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-300 uppercase ml-2 tracking-widest">Qtd</label>
                    <input type="number" min={1} className="w-full bg-gray-50 px-8 py-5 rounded-[2rem] font-black focus:ring-4 focus:ring-blue-100 outline-none text-gray-900 shadow-inner border border-gray-100" value={newItemQtd} onChange={e => setNewItemQtd(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-300 uppercase ml-2 tracking-widest">Categoria</label>
                    <select className="w-full bg-gray-50 px-8 py-5 rounded-[2rem] font-black focus:ring-4 focus:ring-blue-100 outline-none text-gray-900 shadow-inner border border-gray-100 appearance-none" value={newItemCat} onChange={e => setNewItemCat(e.target.value)}>
                      {categories.map(c => <option key={c.id} value={c.nome}>{c.icone} {c.nome}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowNewCategoryForm(v => !v)} className="w-full mt-2 bg-blue-50 text-blue-700 border border-blue-200 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all active:scale-95">
                      {showNewCategoryForm ? 'Fechar Cadastro de Categoria' : 'Cadastrar Nova Categoria'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-300 uppercase ml-2 tracking-widest">Preço Unitário</label>
                    <input type="number" min={0} step="0.01" className="w-full bg-gray-50 px-8 py-5 rounded-[2rem] font-black focus:ring-4 focus:ring-blue-100 outline-none text-gray-900 shadow-inner border border-gray-100" value={newItemPrice} onChange={e => setNewItemPrice(Number(e.target.value))} />
                  </div>
                </div>
                {showNewCategoryForm && (
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Adicionar Categoria</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <input type="text" placeholder="Nome" className="bg-white px-4 py-3 rounded-2xl border border-gray-200 text-sm font-black text-gray-900 outline-none focus:ring-4 focus:ring-blue-100" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                        <input type="text" placeholder="Ícone (ex: 🍞)" className="bg-white px-4 py-3 rounded-2xl border border-gray-200 text-sm font-black text-gray-900 outline-none focus:ring-4 focus:ring-blue-100" value={newCategoryIcon} onChange={e => setNewCategoryIcon(e.target.value)} />
                        <input type="color" className="w-full h-12 bg-white p-2 rounded-2xl border border-gray-200" value={newCategoryColor} onChange={e => setNewCategoryColor(e.target.value)} />
                      </div>
                      <button type="button" onClick={handleAddCategory} className="w-full bg-gray-900 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95">
                        Salvar Categoria
                      </button>
                    </div>
                  </div>
                )}
                <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest">Adicionar Agora</button>
              </form>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-blue-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black tracking-tighter">Sugestões de IA</h3>
                  <p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Google Gemini Pro</p>
                </div>
                <button onClick={handleGetSuggestions} disabled={loadingSuggestions} className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-white/30 transition-all active:scale-90">
                  {loadingSuggestions ? 'Gerando...' : 'Pedir'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => handleAddSuggestion(s)} className="bg-white/10 hover:bg-white text-white hover:text-blue-600 px-5 py-2.5 rounded-2xl text-xs font-black transition-all border border-white/10 shadow-sm">+ {s}</button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-4">
                 <h2 className="font-black text-gray-900 uppercase text-xs tracking-widest">Sua Lista ({pendingItems.length})</h2>
                 <select className="text-[10px] font-black bg-white px-3 py-1.5 rounded-full border border-gray-100 outline-none text-gray-900" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                    <option value="todos">Todas Categorias</option>
                    {categories.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                 </select>
              </div>
              {pendingItems.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-gray-200">
                  <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.3em]">Nada pendente por aqui!</p>
                </div>
              )}
              {pendingItems.map(it => (
                <div key={it.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-gray-100 border border-white flex items-center justify-between group hover:border-blue-200 transition-all hover:scale-[1.01]">
                  <div className="flex items-center gap-6">
                    <button onClick={() => handleToggleStatus(it.id)} className="w-10 h-10 rounded-[1.2rem] border-4 border-blue-50 hover:bg-blue-50 transition-colors flex items-center justify-center bg-gray-50"></button>
                    <div>
                      <h3 className="font-black text-gray-900 text-lg leading-tight">{it.nome}</h3>
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">
                        {it.quantidade}x • {it.categoria} • R$ {Number(it.precoEstimado || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleStartEditItem(it)} className="p-3 text-gray-300 hover:text-blue-600 active:scale-90">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                    <button onClick={() => handleRemoveItem(it.id)} className="p-3 text-gray-300 hover:text-red-500 active:scale-90">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
              {editingItemId !== null && (
                <div className="bg-white p-6 rounded-[2.5rem] border-2 border-blue-200 shadow-lg space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-widest text-blue-600">Editar Item</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Nome</label>
                      <input type="text" className="w-full bg-gray-50 px-5 py-4 rounded-2xl font-black outline-none border border-gray-100 text-gray-900 focus:ring-4 focus:ring-blue-100" placeholder="Nome do item" value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Categoria</label>
                      <select className="w-full bg-gray-50 px-5 py-4 rounded-2xl font-black outline-none border border-gray-100 text-gray-900 focus:ring-4 focus:ring-blue-100" value={editCat} onChange={e => setEditCat(e.target.value)}>
                        {categories.map(c => <option key={c.id} value={c.nome}>{c.icone} {c.nome}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Quantidade</label>
                      <input type="number" min={1} className="w-full bg-gray-50 px-5 py-4 rounded-2xl font-black outline-none border border-gray-100 text-gray-900 focus:ring-4 focus:ring-blue-100" placeholder="Ex: 2" value={editQtd} onChange={e => setEditQtd(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Valor Unitário (R$)</label>
                      <input type="number" min={0} step="0.01" className="w-full bg-gray-50 px-5 py-4 rounded-2xl font-black outline-none border border-gray-100 text-gray-900 focus:ring-4 focus:ring-blue-100" placeholder="Ex: 12.50" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={handleSaveEditItem} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95">Salvar Alterações</button>
                    <button type="button" onClick={handleCancelEditItem} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-300 transition-all active:scale-95">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'carrinho' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-green-600 p-12 rounded-[4rem] text-white shadow-2xl shadow-green-100 border-4 border-white">
              <p className="text-green-100 text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Subtotal Selecionado</p>
              <h2 className="text-6xl font-black mt-3 tracking-tighter">R$ {cartTotal.toFixed(2)}</h2>
            </div>
            
            <div className="space-y-4">
              {boughtItems.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-gray-300 font-black uppercase text-[10px] tracking-widest">O carrinho está vazio</p>
                </div>
              )}
              {boughtItems.map(it => (
                <div key={it.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex items-center gap-6 shadow-sm group hover:scale-[1.01] transition-all">
                  <button onClick={() => handleToggleStatus(it.id)} className="w-10 h-10 rounded-[1.2rem] bg-green-500 flex items-center justify-center text-white shadow-lg active:scale-90 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-400 line-through text-lg">{it.nome}</h3>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs font-black text-green-600 uppercase tracking-widest">{it.quantidade}x Unidades</p>
                      <p className="text-lg font-black text-gray-900">R$ {(it.precoEstimado * it.quantidade).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {boughtItems.length > 0 && (
              <button onClick={handleFinalize} className="w-full bg-green-600 text-white py-8 rounded-[3rem] font-black text-2xl hover:bg-green-700 shadow-2xl shadow-green-100 transition-all border-b-8 border-green-800 tracking-tighter uppercase active:scale-95">
                FINALIZAR E SALVAR
              </button>
            )}
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-6 animate-fade-in">
            {!historyLoaded && (
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm text-center">
                <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-5">Histórico sob demanda</p>
                <button onClick={fetchHistory} className="bg-purple-600 text-white py-4 px-8 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all active:scale-95">
                  Carregar Histórico
                </button>
              </div>
            )}

            {historyLoaded && (
              <>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-600 p-8 rounded-[3rem] text-white shadow-2xl">
                  <p className="text-purple-100 text-[9px] font-black uppercase tracking-widest opacity-70">Gasto Acumulado</p>
                  <h2 className="text-3xl font-black mt-2 tracking-tighter">R$ {Number(effectiveHistory.stats.totalGasto).toFixed(2)}</h2>
                </div>
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col justify-center">
                  <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Categoria Top</p>
                  <h2 className="text-xl font-black mt-2 text-gray-900 truncate tracking-tight">{effectiveHistory.stats.categoriaFavorita || 'Sem Dados'}</h2>
                </div>
             </div>
             
             {effectiveHistory.compras.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-gray-300 font-black uppercase text-[10px] tracking-widest">Nenhuma compra registrada</p>
                </div>
             )}
             
             {effectiveHistory.compras.map(p => (
               <div key={p.id} className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-xl group hover:border-purple-200 transition-all">
                 <div className="p-8 bg-gray-50 flex justify-between items-center border-b border-gray-100 text-gray-900">
                   <div>
                     <span className="font-black block text-lg tracking-tighter">{p.data}</span>
                     <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest">ID: {p.id}</span>
                   </div>
                   <div className="text-right">
                     <span className="font-black text-purple-600 text-2xl block tracking-tighter">R$ {Number(p.total).toFixed(2)}</span>
                     <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{p.itens.length} ITENS</span>
                   </div>
                 </div>
                 <div className="p-8 space-y-4">
                   {p.itens.map((it, idx) => (
                     <div key={idx} className="flex justify-between items-center text-sm">
                       <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-purple-200"></div>
                         <span className="font-bold text-gray-700">{it.quantidade}x {it.nome}</span>
                       </div>
                       <span className="font-black text-gray-400 text-xs tracking-widest">R$ {Number(it.total).toFixed(2)}</span>
                     </div>
                   ))}
                   <button onClick={() => handleReloadFromHistory(p.id)} className="w-full mt-2 bg-purple-100 text-purple-700 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-200 transition-all active:scale-95">
                     Carregar Esta Compra Na Lista
                   </button>
                 </div>
               </div>
             ))}
             </>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t px-10 py-6 sm:hidden flex justify-around items-center z-50 rounded-t-[3rem] shadow-2xl">
          {['lista', 'carrinho', 'historico'].map(t => (
            <button key={t} onClick={() => setActiveTab(t as any)} className={`flex flex-col items-center gap-2 relative transition-all ${activeTab === t ? 'scale-110' : 'grayscale opacity-40 hover:opacity-100'}`}>
              <div className="text-3xl">{t === 'lista' ? '📋' : t === 'carrinho' ? '🛒' : '📅'}</div>
              <span className={`text-[9px] font-black uppercase tracking-tighter ${activeTab === t ? `text-${t === 'lista' ? 'blue' : t === 'carrinho' ? 'green' : 'purple'}-600` : 'text-gray-500'}`}>{t}</span>
              {t === 'carrinho' && boughtItems.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg">{boughtItems.length}</span>
              )}
            </button>
          ))}
      </footer>
    </div>
  );
}
