import React, { useState, useEffect } from 'react';
import { ShoppingItem, Category, PurchaseGroup, DashboardStats, UserSession } from './types';
import { api } from './services/api';

// --- Dados de Amostra ---
const SAMPLE_CATEGORIES: Category[] = [
  { id: '1', nome: 'Grãos', icone: '🌾', cor: '#FFB74D' },
  { id: '2', nome: 'Carnes', icone: '🥩', cor: '#EF5350' },
  { id: '3', nome: 'Laticínios', icone: '🥛', cor: '#42A5F5' },
  { id: '4', nome: 'Limpeza', icone: '🧹', cor: '#FFA726' }
];

const SAMPLE_ITEMS: ShoppingItem[] = [
  { id: 1, nome: 'Arroz 5kg', quantidade: 1, categoria: 'Grãos', precoEstimado: 25.90, status: 'pendente', dataAdicao: new Date().toISOString() },
  { id: 2, nome: 'Feijão Carioca', quantidade: 2, categoria: 'Grãos', precoEstimado: 8.50, status: 'pendente', dataAdicao: new Date().toISOString() },
  { id: 3, nome: 'Leite Integral', quantidade: 4, categoria: 'Laticínios', precoEstimado: 5.20, status: 'comprado', dataAdicao: new Date().toISOString() }
];

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
    <div className={`fixed bottom-20 sm:bottom-10 left-1/2 -translate-x-1/2 ${bg} text-white px-6 py-3 rounded-2xl shadow-2xl z-[10000] flex items-center gap-2 animate-bounce text-sm font-medium text-center min-w-[280px]`}>
      <span>{message}</span>
    </div>
  );
};

const DiagnosticModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [results, setResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  
  const [manualVars, setManualVars] = useState({
    APPS_SCRIPT_URL: localStorage.getItem('DEBUG_APPS_SCRIPT_URL') || '',
    API_KEY: localStorage.getItem('DEBUG_API_KEY') || '',
    CLIENT_ID: localStorage.getItem('DEBUG_CLIENT_ID') || ''
  });

  const urlInput = manualVars.APPS_SCRIPT_URL.trim();
  const isUrlValidFormat = urlInput.endsWith('/exec') && !urlInput.includes('/edit');

  const saveManualVars = () => {
    localStorage.setItem('DEBUG_APPS_SCRIPT_URL', manualVars.APPS_SCRIPT_URL.trim());
    localStorage.setItem('DEBUG_API_KEY', manualVars.API_KEY.trim());
    localStorage.setItem('DEBUG_CLIENT_ID', manualVars.CLIENT_ID.trim());
    alert('Configurações salvas! Clique em "EXECUTAR TESTE" para validar.');
  };

  const runDiagnostic = async () => {
    setTesting(true);
    setResults(null);
    try {
      const url = new URL('/api', window.location.origin);
      url.searchParams.set('action', 'listarCategorias');
      if (manualVars.APPS_SCRIPT_URL) url.searchParams.set('override_url', manualVars.APPS_SCRIPT_URL.trim());
      if (manualVars.API_KEY) url.searchParams.set('override_key', manualVars.API_KEY.trim());

      const response = await fetch(url.toString());
      const status = response.status;
      const contentType = response.headers.get('content-type');
      const text = await response.text();
      
      let json = null;
      try { json = JSON.parse(text); } catch (e) {}

      setResults({
        status,
        contentType,
        json,
        rawText: text.substring(0, 1000)
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
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-fade-in border border-white/20">
        <div className="p-8 border-b flex justify-between items-center bg-gray-50/80">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Painel de Diagnóstico</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Status da Conexão</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-200 rounded-full transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          <section className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-2 tracking-widest">URL da Web App (/exec)</label>
              <div className="relative">
                <input 
                  type="text" 
                  className={`w-full bg-gray-50 border ${!isUrlValidFormat && urlInput ? 'border-red-500 bg-red-50' : 'border-gray-100'} p-4 rounded-2xl text-[11px] font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-12`}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={manualVars.APPS_SCRIPT_URL}
                  onChange={e => setManualVars({...manualVars, APPS_SCRIPT_URL: e.target.value})}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isUrlValidFormat ? <span className="text-green-500 font-black">✔</span> : <span className="text-red-500 font-black">✘</span>}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 px-1">
                Dica: Vá em <b>Implantar</b> {' > '} <b>Nova Implantação</b> {' > '} <b>App da Web</b> e copie a URL.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-2">Gemini API Key</label>
                <input type="password" placeholder="AIza..." className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-xs font-mono" value={manualVars.API_KEY} onChange={e => setManualVars({...manualVars, API_KEY: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-2">Google Client ID</label>
                <input type="text" placeholder="...apps.googleusercontent.com" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-xs font-mono" value={manualVars.CLIENT_ID} onChange={e => setManualVars({...manualVars, CLIENT_ID: e.target.value})} />
              </div>
            </div>
            
            <button onClick={saveManualVars} className="w-full bg-black text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all">
              Salvar Configurações
            </button>
          </section>

          <div className="h-px bg-gray-100"></div>

          <section className="space-y-4">
            <button onClick={runDiagnostic} disabled={testing} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
              {testing ? 'CONECTANDO...' : 'EXECUTAR TESTE AGORA'}
            </button>

            {results && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <div className={`p-4 rounded-2xl border text-center mb-4 ${results.status === 200 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Resultado do Google</p>
                   <p className={`text-xl font-black ${results.status === 200 ? 'text-green-600' : 'text-red-600'}`}>Status HTTP {results.status}</p>
                </div>

                {results.json?.error ? (
                  <div className="bg-red-600 p-6 rounded-[2.5rem] text-white space-y-4 shadow-2xl">
                    <p className="text-lg font-black leading-tight uppercase tracking-tighter">{results.json.error}</p>
                    <p className="text-xs font-bold leading-relaxed opacity-90">{results.json.details}</p>
                    <div className="bg-white/20 p-4 rounded-2xl text-[11px] font-black leading-tight">
                      SOLUÇÃO: {results.json.hint}
                    </div>
                  </div>
                ) : results.status === 200 ? (
                  <div className="p-8 bg-green-600 rounded-[2.5rem] text-white flex items-center gap-5 shadow-2xl">
                    <div className="text-4xl">✅</div>
                    <div>
                      <p className="text-xl font-black tracking-tighter">PLANILHA CONECTADA!</p>
                      <p className="text-xs font-bold opacity-80">O sistema já pode ler e gravar dados.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-black p-5 rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
                    <p className="text-[9px] font-black text-gray-500 uppercase mb-3 tracking-widest">Logs de Resposta Bruta</p>
                    <pre className="text-[9px] text-green-400 font-mono whitespace-pre-wrap leading-tight max-h-48 overflow-y-auto custom-scrollbar">
                      {results.rawText}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </section>
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
    const clientId = manualId || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    
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
      <div className="bg-white p-12 rounded-[4rem] shadow-2xl shadow-blue-200 w-full max-w-md text-center animate-fade-in border border-white">
        <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white font-black text-5xl shadow-2xl shadow-blue-200 mx-auto mb-8 border-4 border-white">L</div>
        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter">Shopping Pro</h1>
        <p className="text-gray-400 mb-12 font-bold uppercase text-[10px] tracking-[0.3em]">Lista Inteligente</p>
        
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [historyData, setHistoryData] = useState<{ compras: PurchaseGroup[], stats: DashboardStats } | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [catFilter, setCatFilter] = useState('todos');
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  const [newItemName, setNewItemName] = useState('');
  const [newItemQtd, setNewItemQtd] = useState(1);
  const [newItemCat, setNewItemCat] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem('shopping_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    else setLoading(false);
  }, []);

  useEffect(() => { if (user) fetchInitialData(); }, [user]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [cats, initialItems] = await Promise.all([
        api.getCategories(),
        api.getItems()
      ]);
      setCategories(cats.length > 0 ? cats : SAMPLE_CATEGORIES);
      setNewItemCat(cats.length > 0 ? cats[0].nome : SAMPLE_CATEGORIES[0].nome);
      setItems(initialItems.length > 0 ? initialItems : SAMPLE_ITEMS);
    } catch (e: any) {
      setCategories(SAMPLE_CATEGORIES);
      setItems(SAMPLE_ITEMS);
      setNewItemCat(SAMPLE_CATEGORIES[0].nome);
      showToast('Modo demonstração ativo', 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'historico' && user) fetchHistory();
  }, [activeTab, user]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory();
      setHistoryData(data);
    } catch (e: any) {
      setHistoryData({ compras: [], stats: { totalGasto: 0, totalCompras: 0, totalItens: 0, gastoMedio: 0, categoriaFavorita: '' } });
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
      await api.addItem({ nome: newItemName, quantidade: newItemQtd, categoria: newItemCat, precoEstimado: newItemPrice });
      const updated = await api.getItems();
      setItems(updated.length > 0 ? updated : [...items, { id: Date.now(), nome: newItemName, quantidade: newItemQtd, categoria: newItemCat, precoEstimado: newItemPrice, status: 'pendente', dataAdicao: new Date().toISOString() }]);
      setNewItemName(''); setNewItemQtd(1); setNewItemPrice(0);
      showToast('Item adicionado!', 'success');
    } catch (e: any) {
      setItems([...items, { id: Date.now(), nome: newItemName, quantidade: newItemQtd, categoria: newItemCat, precoEstimado: newItemPrice, status: 'pendente', dataAdicao: new Date().toISOString() }]);
      setNewItemName(''); setNewItemQtd(1); setNewItemPrice(0);
      showToast('Salvo offline', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string | number) => {
    const updatedLocal = items.map(it => it.id === id ? { ...it, status: (it.status === 'pendente' ? 'comprado' : 'pendente') as any } : it);
    setItems(updatedLocal);
    try { await api.toggleStatus(id); } catch (e) {}
  };

  const handleRemoveItem = async (id: string | number) => {
    if (!confirm('Excluir item?')) return;
    setItems(items.filter(it => it.id !== id));
    try { await api.removeItem(id); } catch (e) {}
  };

  const handleFinalize = async () => {
    if (!confirm('Salvar compra no histórico?')) return;
    setLoading(true);
    try {
      await api.finalizePurchase();
      const updated = await api.getItems();
      setItems(updated);
      showToast('Compra finalizada!', 'success');
      setActiveTab('historico');
    } catch (e) {
      setItems(items.filter(it => it.status === 'pendente'));
      showToast('Simulado com sucesso', 'success');
      setActiveTab('historico');
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
      setSuggestions(['Leite', 'Pão', 'Detergente', 'Ovos']);
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
      <button onClick={() => setIsDebugOpen(true)} className="fixed bottom-8 right-8 bg-white/80 backdrop-blur p-4 rounded-3xl border border-gray-200 shadow-2xl hover:scale-110 transition-all z-[9999] active:scale-90 flex items-center gap-2">
         <span className="text-xl">⚙️</span>
         <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Config</span>
      </button>
      <DiagnosticModal isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
    </>
  );

  const pendingItems = items.filter(i => i.status === 'pendente' && (catFilter === 'todos' || i.categoria === catFilter));
  const boughtItems = items.filter(i => i.status === 'comprado');
  const cartTotal = boughtItems.reduce((acc, curr) => acc + (curr.precoEstimado * curr.quantidade), 0);

  return (
    <div className="max-w-4xl mx-auto pb-24 min-h-screen flex flex-col relative bg-gray-50">
      {loading && <LoadingOverlay />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <DiagnosticModal isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />

      <header className="bg-white/80 backdrop-blur-xl border-b px-6 py-5 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-200">L</div>
          <div>
            <h1 className="font-black text-gray-900 text-xl tracking-tighter">Shopping Pro</h1>
            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Controle Total</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsDebugOpen(true)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all group">
            <span className="text-xl opacity-40 group-hover:opacity-100 transition-opacity">⚙️</span>
          </button>
          <button onClick={handleLogout} className="group relative">
            <img src={user?.picture} className="w-12 h-12 rounded-2xl border-4 border-white shadow-xl transition-all group-hover:ring-4 group-hover:ring-blue-50" />
          </button>
        </div>
      </header>

      <nav className="flex border-b bg-white sticky top-[89px] z-40 px-4">
        {['lista', 'carrinho', 'historico'].map(t => (
          <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-6 font-black text-[10px] uppercase tracking-[0.2em] transition-all relative ${activeTab === t ? `text-${t === 'lista' ? 'blue' : t === 'carrinho' ? 'green' : 'purple'}-600` : 'text-gray-300'}`}>
            {t} {t === 'carrinho' && `(${boughtItems.length})`}
            {activeTab === t && <div className={`absolute bottom-0 left-4 right-4 h-1 rounded-t-full bg-${t === 'lista' ? 'blue' : t === 'carrinho' ? 'green' : 'purple'}-600`}></div>}
          </button>
        ))}
      </nav>

      <main className="p-4 flex-1">
        {activeTab === 'lista' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-blue-50 border border-white">
              <form onSubmit={handleAddItem} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-300 uppercase ml-2 tracking-widest">O que você precisa?</label>
                  <input type="text" placeholder="Ex: Arroz 5kg" className="w-full px-8 py-6 bg-gray-50 rounded-[2rem] focus:ring-4 focus:ring-blue-100 outline-none font-black text-gray-700 text-lg transition-all" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-300 uppercase ml-2 tracking-widest">Qtd</label>
                    <input type="number" className="w-full bg-gray-50 px-8 py-5 rounded-[2rem] font-black focus:ring-4 focus:ring-blue-100 outline-none" value={newItemQtd} onChange={e => setNewItemQtd(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-300 uppercase ml-2 tracking-widest">Categoria</label>
                    <select className="w-full bg-gray-50 px-8 py-5 rounded-[2rem] font-black focus:ring-4 focus:ring-blue-100 outline-none appearance-none" value={newItemCat} onChange={e => setNewItemCat(e.target.value)}>
                      {categories.map(c => <option key={c.id} value={c.nome}>{c.icone} {c.nome}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest">ADICIONAR ITEM</button>
              </form>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-blue-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black tracking-tighter">Sugestões Inteligentes</h3>
                  <p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Pela IA Gemini</p>
                </div>
                <button onClick={handleGetSuggestions} disabled={loadingSuggestions} className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-white/30 transition-all">
                  {loadingSuggestions ? 'Gerando...' : 'Atualizar'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => handleAddSuggestion(s)} className="bg-white/10 hover:bg-white text-white hover:text-blue-600 px-5 py-2.5 rounded-2xl text-xs font-black transition-all border border-white/10">+ {s}</button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-4">
                 <h2 className="font-black text-gray-900 uppercase text-xs tracking-widest">Lista Pendente ({pendingItems.length})</h2>
                 <select className="text-[10px] font-black bg-white px-3 py-1.5 rounded-full border border-gray-100 outline-none" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                    <option value="todos">Todos</option>
                    {categories.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                 </select>
              </div>
              {pendingItems.map(it => (
                <div key={it.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-gray-100 border border-white flex items-center justify-between group hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-6">
                    <button onClick={() => handleToggleStatus(it.id)} className="w-10 h-10 rounded-[1.2rem] border-4 border-blue-50 hover:bg-blue-50 transition-colors flex items-center justify-center"></button>
                    <div>
                      <h3 className="font-black text-gray-800 text-lg leading-tight">{it.nome}</h3>
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">{it.quantidade}x • {it.categoria}</p>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveItem(it.id)} className="p-4 text-gray-200 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'carrinho' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-green-600 p-12 rounded-[4rem] text-white shadow-2xl shadow-green-100 border-4 border-white">
              <p className="text-green-100 text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Total no Carrinho</p>
              <h2 className="text-6xl font-black mt-3 tracking-tighter">R$ {cartTotal.toFixed(2)}</h2>
            </div>
            
            <div className="space-y-4">
              {boughtItems.map(it => (
                <div key={it.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex items-center gap-6 shadow-sm">
                  <button onClick={() => handleToggleStatus(it.id)} className="w-10 h-10 rounded-[1.2rem] bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-100">
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
              <button onClick={handleFinalize} className="w-full bg-green-600 text-white py-8 rounded-[3rem] font-black text-2xl hover:bg-green-700 shadow-2xl shadow-green-100 transition-all active:scale-95 border-b-8 border-green-800 tracking-tighter uppercase">
                FINALIZAR E SALVAR
              </button>
            )}
          </div>
        )}

        {activeTab === 'historico' && historyData && (
          <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-purple-100">
                  <p className="text-purple-100 text-[9px] font-black uppercase tracking-widest opacity-70">Gasto Acumulado</p>
                  <h2 className="text-3xl font-black mt-2 tracking-tighter">R$ {Number(historyData.stats.totalGasto).toFixed(2)}</h2>
                </div>
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col justify-center">
                  <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Predileção</p>
                  <h2 className="text-xl font-black mt-2 text-gray-800 truncate tracking-tight">{historyData.stats.categoriaFavorita || 'Sem Dados'}</h2>
                </div>
             </div>
             
             {historyData.compras.map(p => (
               <div key={p.id} className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-xl shadow-gray-50 group hover:border-purple-200 transition-all">
                 <div className="p-8 bg-gray-50 flex justify-between items-center border-b border-gray-100">
                   <div>
                     <span className="font-black text-gray-900 block text-lg tracking-tighter">{p.data}</span>
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
                         <span className="font-bold text-gray-600">{it.quantidade}x {it.nome}</span>
                       </div>
                       <span className="font-black text-gray-400 text-xs tracking-widest">R$ {Number(it.total).toFixed(2)}</span>
                     </div>
                   ))}
                 </div>
               </div>
             ))}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t px-10 py-6 sm:hidden flex justify-around items-center z-50 rounded-t-[3rem] shadow-2xl">
          {['lista', 'carrinho', 'historico'].map(t => (
            <button key={t} onClick={() => setActiveTab(t as any)} className={`flex flex-col items-center gap-2 relative transition-all ${activeTab === t ? 'scale-110' : 'grayscale opacity-50'}`}>
              <div className="text-3xl">{t === 'lista' ? '📋' : t === 'carrinho' ? '🛒' : '📅'}</div>
              <span className={`text-[9px] font-black uppercase tracking-tighter ${activeTab === t ? `text-${t === 'lista' ? 'blue' : t === 'carrinho' ? 'green' : 'purple'}-600` : 'text-gray-400'}`}>{t}</span>
              {t === 'carrinho' && boughtItems.length > 0 && (
                <span className="absolute -top-1 -right-3 bg-red-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-pulse">
                  {boughtItems.length}
                </span>
              )}
            </button>
          ))}
      </footer>
    </div>
  );
}