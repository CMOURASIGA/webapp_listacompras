import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingItem, Category, PurchaseGroup, DashboardStats, UserSession, AIProvider, AppSettings } from './types';
import { api } from './services/api';
import { generateSuggestions as generateAISuggestions } from './services/ai/aiService';
import { useAppSettings } from './store/appSettingsStore';
import HelpLayout from './help/HelpLayout';
import EditItemPanel, { Item as EditPanelItem } from './components/EditItemPanel';
import CategoryPanel from './components/CategoryPanel';

// --- Sub-components ---
type TabKey = 'lista' | 'carrinho' | 'historico';
type SuggestionsTab = 'frequentes' | 'ultima_compra' | 'ia';
type HistoryQuickFilter = 'todos' | '7d' | '30d' | 'maior' | 'menor';
const QUICK_ADD_HISTORY_KEY = 'shopping_quick_add_history';
const ONBOARDING_FLAG_KEY = 'hasSeenOnboarding';
const BASE_ITEM_DICTIONARY = [
  'arroz 5kg',
  'feijao carioca',
  'leite integral',
  'cafe',
  'acucar',
  'sal',
  'oleo',
  'azeite',
  'macarrao',
  'molho de tomate',
  'pao de forma',
  'detergente',
  'sabao em po',
  'amaciante',
  'papel higienico',
  'creme dental',
  'frango',
  'carne moida',
  'queijo',
  'presunto',
  'manteiga',
  'banana',
  'maca',
  'ovo'
];

const CATEGORY_RULES = [
  { keywords: ['arroz', 'feijao', 'acucar', 'sal', 'oleo', 'azeite', 'farinha', 'macarrao', 'cafe', 'molho'], hints: ['mercearia', 'despensa', 'secos', 'graos', 'alimentos'] },
  { keywords: ['detergente', 'sabao', 'amaciante', 'desinfetante', 'agua sanitaria', 'multiuso'], hints: ['limpeza', 'higiene', 'casa', 'utilidades'] },
  { keywords: ['leite', 'queijo', 'iogurte', 'manteiga', 'requeijao'], hints: ['laticinio', 'laticinios', 'frios', 'geladeira', 'refrigerados'] },
  { keywords: ['carne', 'frango', 'peixe', 'linguica'], hints: ['acougue', 'proteinas', 'carnes', 'aves'] },
  { keywords: ['banana', 'maca', 'laranja', 'uva', 'alface', 'tomate', 'cebola', 'batata'], hints: ['hortifruti', 'frutas', 'verduras', 'legumes', 'feira'] },
  { keywords: ['papel higienico', 'absorvente', 'creme dental', 'shampoo', 'sabonete'], hints: ['higiene', 'pessoal', 'banheiro'] },
  { keywords: ['refrigerante', 'suco', 'agua', 'cerveja'], hints: ['bebidas', 'liquidos'] }
];

type ConfirmDialogConfig = {
  title: string;
  message: string;
  details?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: 'danger' | 'primary';
};

type OnboardingStep = {
  title: string;
  description: string;
};

const normalizeText = (value: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const parseQuickItemInput = (rawValue: string, fallbackQty: number) => {
  const raw = (rawValue || '').trim();
  if (!raw) return { nome: '', quantidade: Math.max(1, Number(fallbackQty) || 1) };

  const startsWithQty = raw.match(/^(\d+)\s+(.+)$/);
  if (startsWithQty) {
    return {
      quantidade: Math.max(1, Number(startsWithQty[1]) || 1),
      nome: startsWithQty[2].trim().replace(/\s{2,}/g, ' ')
    };
  }

  return {
    quantidade: Math.max(1, Number(fallbackQty) || 1),
    nome: raw.replace(/\s{2,}/g, ' ')
  };
};

const parsePurchaseDate = (rawDate: string) => {
  const normalized = (rawDate || '').trim();
  if (!normalized) return null;

  const directDate = new Date(normalized);
  if (!Number.isNaN(directDate.getTime())) return directDate;

  const match = normalized.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const hour = Number(match[4] || '0');
  const minute = Number(match[5] || '0');
  const second = Number(match[6] || '0');
  const parsed = new Date(year, month, day, hour, minute, second);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const QuantityStepper = ({
  value,
  onChange,
  min = 1
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
}) => {
  const safeValue = Math.max(min, Number(value) || min);

  const decrease = () => onChange(Math.max(min, safeValue - 1));
  const increase = () => onChange(safeValue + 1);

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={decrease} className="w-10 h-10 rounded-xl border border-gray-300 bg-white text-gray-700 font-black text-xl leading-none hover:bg-gray-50 active:scale-95">-</button>
      <input
        type="number"
        min={min}
        value={safeValue}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
        className="w-16 h-10 text-center rounded-xl border border-gray-300 bg-white text-sm font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-100"
      />
      <button type="button" onClick={increase} className="w-10 h-10 rounded-xl border border-gray-300 bg-white text-gray-700 font-black text-xl leading-none hover:bg-gray-50 active:scale-95">+</button>
    </div>
  );
};

const QuickAddInput = ({
  value,
  quantity,
  inferredCategoryName,
  suggestions,
  loading,
  onChangeValue,
  onChangeQuantity,
  onPickSuggestion,
  onSubmit
}: {
  value: string;
  quantity: number;
  inferredCategoryName: string;
  suggestions: string[];
  loading: boolean;
  onChangeValue: (next: string) => void;
  onChangeQuantity: (next: number) => void;
  onPickSuggestion: (suggestion: string) => void;
  onSubmit: () => void;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const trimmed = value.trim();
  const normalizedTrimmed = normalizeText(trimmed);
  const hasExactSuggestion = suggestions.some((item) => normalizeText(item) === normalizedTrimmed);
  const showCreateOption = !!trimmed && !hasExactSuggestion;
  const visibleOptions = showCreateOption ? [`__create__:${trimmed}`, ...suggestions] : suggestions;
  const showDropdown = isFocused && (visibleOptions.length > 0);

  useEffect(() => {
    setHighlighted(0);
  }, [value, suggestions.length]);

  const pickOption = (option: string) => {
    if (option.startsWith('__create__:')) {
      onSubmit();
      return;
    }
    onPickSuggestion(option);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && visibleOptions.length > 0) {
      e.preventDefault();
      setHighlighted((prev) => (prev + 1) % visibleOptions.length);
      return;
    }
    if (e.key === 'ArrowUp' && visibleOptions.length > 0) {
      e.preventDefault();
      setHighlighted((prev) => (prev - 1 + visibleOptions.length) % visibleOptions.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showDropdown && visibleOptions[highlighted]) {
        pickOption(visibleOptions[highlighted]);
        return;
      }
      onSubmit();
      return;
    }
    if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
        Adição rápida
      </label>

      <div className="relative">
        <input
          type="text"
          value={value}
          placeholder="Ex: arroz 5kg, 2 leite, detergente"
          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-gray-200 font-black text-gray-900 text-base outline-none focus:ring-4 focus:ring-blue-100"
          onChange={(e) => onChangeValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 120)}
          onKeyDown={onInputKeyDown}
        />

        {showDropdown && (
          <div className="absolute z-30 mt-2 w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            {visibleOptions.map((option, idx) => {
              const isCreate = option.startsWith('__create__:');
              const label = isCreate ? option.replace('__create__:', '') : option;
              const isActive = idx === highlighted;
              return (
                <button
                  key={`${option}-${idx}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickOption(option);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {isCreate ? `Criar novo item: "${label}"` : label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantidade</span>
          <QuantityStepper value={quantity} onChange={onChangeQuantity} />
        </div>
        <div className="text-[11px] font-black text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
          Categoria auto: {inferredCategoryName || 'A definir'}
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={onSubmit}
        className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70"
      >
        {loading ? 'Adicionando...' : 'Adicionar Rápido'}
      </button>
    </div>
  );
};

const SuggestionsPanel = ({
  activeTab,
  onChangeTab,
  frequentSuggestions,
  latestPurchaseSuggestions,
  aiSuggestions,
  loadingAI,
  onAskAI,
  onAddSuggestion,
  onLoadLastPurchase
}: {
  activeTab: SuggestionsTab;
  onChangeTab: (tab: SuggestionsTab) => void;
  frequentSuggestions: string[];
  latestPurchaseSuggestions: string[];
  aiSuggestions: string[];
  loadingAI: boolean;
  onAskAI: () => void;
  onAddSuggestion: (name: string) => void;
  onLoadLastPurchase: () => void;
}) => {
  const currentList =
    activeTab === 'frequentes'
      ? frequentSuggestions
      : activeTab === 'ultima_compra'
        ? latestPurchaseSuggestions
        : aiSuggestions;

  const tabLabelClass = (tab: SuggestionsTab) =>
    activeTab === tab ? 'text-blue-700 bg-white border-blue-200' : 'text-gray-500 bg-gray-50 border-transparent hover:text-gray-700';

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-blue-100">
      <div className="flex items-center justify-between mb-5 gap-3">
        <h3 className="text-xl font-black tracking-tighter">Sugestoes Inteligentes</h3>
        {activeTab === 'ia' && (
          <button
            type="button"
            onClick={onAskAI}
            disabled={loadingAI}
            className="bg-white/20 disabled:opacity-70 disabled:cursor-not-allowed backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-white/30 transition-all active:scale-90 flex items-center gap-2"
          >
            {loadingAI && <span className="w-3 h-3 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />}
            {loadingAI ? 'Processando...' : 'Pedir IA'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button type="button" onClick={() => onChangeTab('frequentes')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${tabLabelClass('frequentes')}`}>
          Frequentes
        </button>
        <button type="button" onClick={() => onChangeTab('ultima_compra')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${tabLabelClass('ultima_compra')}`}>
          Ultima compra
        </button>
        <button type="button" onClick={() => onChangeTab('ia')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${tabLabelClass('ia')}`}>
          IA
        </button>
      </div>

      {activeTab === 'ultima_compra' && latestPurchaseSuggestions.length === 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={onLoadLastPurchase}
            className="bg-white/15 hover:bg-white/25 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            Carregar ultima compra
          </button>
        </div>
      )}

      {currentList.length === 0 ? (
        <p className="text-white/80 text-xs font-semibold">Sem sugestoes neste momento.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {currentList.map((name, index) => (
            <button
              key={`${name}-${index}`}
              type="button"
              onClick={() => onAddSuggestion(name)}
              className="bg-white/10 hover:bg-white text-white hover:text-blue-700 px-5 py-2.5 rounded-2xl text-xs font-black transition-all border border-white/10 shadow-sm"
            >
              + {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const TooltipDot = ({ text }: { text: string }) => (
  <span
    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black cursor-help"
    title={text}
    aria-label={text}
  >
    ℹ️
  </span>
);

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
    <div className={`fixed bottom-20 sm:bottom-10 left-1/2 -translate-x-1/2 ${bg} text-white px-4 py-3 rounded-2xl shadow-2xl z-[10000] flex items-center gap-2 animate-bounce text-sm font-medium text-center w-[calc(100%-1rem)] max-w-md`}>
      <span>{message}</span>
    </div>
  );
};

const ConfirmationModal = ({
  isOpen,
  config,
  onConfirm,
  onCancel
}: {
  isOpen: boolean;
  config: ConfirmDialogConfig | null;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  if (!isOpen || !config) return null;

  const isDanger = config.intent === 'danger';
  const confirmBtnClass = isDanger
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10002] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] border border-gray-200 shadow-2xl p-8 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-2xl border border-gray-200 mx-auto mb-5 flex items-center justify-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
        </div>
        <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-3">{config.title}</h3>
        <p className="text-sm font-medium text-gray-600 leading-relaxed">{config.message}</p>
        {config.details && config.details.length > 0 && (
          <div className="mt-5 p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 text-sm font-semibold space-y-1">
            {config.details.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        )}
        <div className="mt-7 flex flex-col sm:flex-row gap-3 sm:justify-center">
          <button onClick={onCancel} className="px-6 py-3 rounded-2xl border border-gray-300 bg-white text-gray-700 font-black text-sm uppercase tracking-wider hover:bg-gray-100 transition-all active:scale-95">
            {config.cancelLabel || 'Cancelar'}
          </button>
          <button onClick={onConfirm} className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 ${confirmBtnClass}`}>
            {config.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const OnboardingModal = ({
  isOpen,
  steps,
  stepIndex,
  onNext,
  onPrev,
  onSkip
}: {
  isOpen: boolean;
  steps: OnboardingStep[];
  stepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) => {
  if (!isOpen) return null;

  const isLastStep = stepIndex >= steps.length - 1;
  const current = steps[stepIndex];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10004] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] border border-gray-200 shadow-2xl overflow-hidden">
        <div className="px-7 py-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900 tracking-tight">Boas-vindas</h3>
          <button onClick={onSkip} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-700">
            Pular
          </button>
        </div>

        <div className="px-7 py-7">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3">
            Passo {stepIndex + 1} de {steps.length}
          </p>
          <h4 className="text-2xl font-black text-gray-900 mb-3">{current.title}</h4>
          <p className="text-sm font-medium text-gray-600 leading-relaxed">{current.description}</p>

          <div className="mt-6 flex gap-2">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 flex-1 rounded-full ${idx <= stepIndex ? 'bg-blue-600' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        <div className="px-7 pb-7 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={stepIndex === 0}
            className="sm:w-36 py-3 rounded-2xl border border-gray-300 bg-white text-gray-700 font-black text-xs uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95"
          >
            {isLastStep ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AppHeader = ({
  user,
  activeTab,
  onChangeTab,
  onOpenHelp,
  onOpenSettings,
  onLogout,
  listaCount,
  carrinhoCount,
  isOnline
}: {
  user: UserSession | null;
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  listaCount: number;
  carrinhoCount: number;
  isOnline: boolean;
}) => {
  const statusText = isOnline ? 'Sincronizado' : 'Offline';
  const statusClass = isOnline ? 'text-emerald-600' : 'text-amber-600';
  const tabsContainerRef = useRef<HTMLElement | null>(null);
  const [showTabsOverflowHint, setShowTabsOverflowHint] = useState(false);
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    lista: null,
    carrinho: null,
    historico: null
  });

  const updateTabsOverflowHint = useCallback(() => {
    const tabsEl = tabsContainerRef.current;
    if (!tabsEl) return;

    const hasOverflow = tabsEl.scrollWidth > tabsEl.clientWidth + 1;
    const canScrollRight = tabsEl.scrollLeft + tabsEl.clientWidth < tabsEl.scrollWidth - 1;
    setShowTabsOverflowHint(hasOverflow && canScrollRight);
  }, []);

  const scrollActiveTabIntoView = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      if (typeof window === 'undefined') return;
      if (!window.matchMedia('(max-width: 767px)').matches) return;
      tabRefs.current[activeTab]?.scrollIntoView({
        behavior,
        inline: 'center',
        block: 'nearest'
      });
    },
    [activeTab]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tabsEl = tabsContainerRef.current;
    if (!tabsEl) return;

    const handleUpdate = () => updateTabsOverflowHint();
    handleUpdate();

    tabsEl.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate);
    return () => {
      tabsEl.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [updateTabsOverflowHint]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const frameId = window.requestAnimationFrame(() => updateTabsOverflowHint());
    return () => window.cancelAnimationFrame(frameId);
  }, [activeTab, listaCount, carrinhoCount, updateTabsOverflowHint]);

  useEffect(() => {
    scrollActiveTabIntoView('smooth');
    const timeoutId = window.setTimeout(() => updateTabsOverflowHint(), 260);
    return () => window.clearTimeout(timeoutId);
  }, [activeTab, scrollActiveTabIntoView, updateTabsOverflowHint]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 767px)').matches) return;

    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      scrollActiveTabIntoView('auto');
      raf2 = window.requestAnimationFrame(() => scrollActiveTabIntoView('auto'));
    });
    const timeoutId = window.setTimeout(() => scrollActiveTabIntoView('auto'), 220);

    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      window.clearTimeout(timeoutId);
    };
  }, [scrollActiveTabIntoView]);

  const tabClass = (tab: TabKey) => {
    if (activeTab !== tab) return 'text-gray-400 hover:text-gray-600';
    if (tab === 'lista') return 'text-blue-600';
    if (tab === 'carrinho') return 'text-green-600';
    return 'text-purple-600';
  };
  const indicatorClass = (tab: TabKey) => {
    if (tab === 'lista') return 'bg-blue-600';
    if (tab === 'carrinho') return 'bg-green-600';
    return 'bg-purple-600';
  };

  return (
    <>
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-100 px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-50 overflow-x-clip">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 min-w-[40px] min-h-[40px] shrink-0 rounded-2xl overflow-hidden shadow-xl shadow-blue-100 bg-blue-600">
              <img
                src="/icons/icon-192-v2.png"
                alt="Shopping Pro"
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-gray-900 text-base sm:text-xl tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] sm:max-w-[220px] md:max-w-none">
                Shopping Pro
              </h1>
              <p className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className={`hidden sm:inline ${statusClass}`}>{statusText}</span>
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-gray-50 rounded-2xl p-1 border border-gray-100">
            <button onClick={() => onChangeTab('lista')} className={`px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${tabClass('lista')}`}>
              Lista ({listaCount})
            </button>
            <button onClick={() => onChangeTab('carrinho')} className={`px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${tabClass('carrinho')}`}>
              Carrinho ({carrinhoCount})
            </button>
            <button onClick={() => onChangeTab('historico')} className={`px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${tabClass('historico')}`}>
              Historico
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenHelp}
              aria-label="Abrir ajuda"
              className="px-2 sm:px-4 py-2 min-h-[40px] sm:min-h-[44px] rounded-xl border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all whitespace-nowrap inline-flex items-center justify-center gap-1"
            >
              <span>❓</span>
              <span className="hidden sm:inline">Ajuda</span>
            </button>
            <button
              onClick={onOpenSettings}
              aria-label="Abrir configurações"
              className="px-2 sm:px-3 py-2 min-h-[40px] sm:min-h-[44px] rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all whitespace-nowrap inline-flex items-center justify-center gap-1"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Config</span>
            </button>
            <button onClick={onLogout} className="group relative shrink-0" aria-label="Sair">
              <img
                src={user?.picture}
                className="w-10 h-10 min-w-[40px] min-h-[40px] shrink-0 rounded-full object-cover border-2 border-white shadow-md group-hover:ring-4 group-hover:ring-blue-50 transition-all"
              />
            </button>
          </div>
        </div>

        <div className="relative md:hidden mt-3">
          <nav ref={tabsContainerRef} className="tabs-container border border-gray-100 rounded-2xl bg-white">
            {(['lista', 'carrinho', 'historico'] as TabKey[]).map((tab) => {
              const label = tab === 'lista' ? `Lista (${listaCount})` : tab === 'carrinho' ? `Carrinho (${carrinhoCount})` : 'Historico';
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  ref={(el) => {
                    tabRefs.current[tab] = el;
                  }}
                  onClick={() => onChangeTab(tab)}
                  className={`tab py-3 font-black text-[10px] uppercase tracking-widest relative transition-all whitespace-nowrap ${active ? tabClass(tab) : 'text-gray-400'}`}
                >
                  {label}
                  {active && <span className={`absolute bottom-0 left-3 right-3 h-1 rounded-t-full ${indicatorClass(tab)}`} />}
                </button>
              );
            })}
          </nav>
          {showTabsOverflowHint && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white via-white/85 to-transparent rounded-r-2xl" />
          )}
        </div>
      </header>
    </>
  );
};

const DiagnosticModal = ({
  isOpen,
  onClose,
  onRefresh,
  initialSettings,
  onSaveSettings
}: {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  initialSettings: AppSettings;
  onSaveSettings: (next: AppSettings) => void;
}) => {
  const [form, setForm] = useState<AppSettings>(initialSettings);
  const [saveFeedback, setSaveFeedback] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(initialSettings);
      setSaveFeedback('');
    }
  }, [isOpen, initialSettings]);

  const saveSettings = () => {
    const next: AppSettings = {
      scriptUrl: (form.scriptUrl || '').trim(),
      googleClientId: (form.googleClientId || '').trim(),
      aiProvider: form.aiProvider || 'disabled',
      geminiApiKey: (form.geminiApiKey || '').trim(),
      openaiApiKey: (form.openaiApiKey || '').trim()
    };
    onSaveSettings(next);
    onRefresh();
    setSaveFeedback('Configurações salvas com sucesso.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[10001] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-fade-in border border-gray-200">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Painel de Controle V2</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-900 transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <section className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-700">IA</h3>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 flex items-center gap-2">
                Provider IA
                <TooltipDot text="Escolha o provedor de sugestões de IA que será usado pelo sistema." />
              </label>
              <select
                className="w-full bg-white border border-gray-300 p-4 rounded-2xl text-xs font-black text-gray-900 shadow-inner outline-none focus:ring-4 focus:ring-blue-100"
                value={form.aiProvider}
                onChange={(e) => setForm({ ...form, aiProvider: e.target.value as AIProvider })}
              >
                <option value="disabled">Desativado</option>
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>

            {form.aiProvider === 'gemini' && (
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 flex items-center gap-2">
                  Gemini API Key
                  <TooltipDot text="Chave da API Gemini para geração de sugestões inteligentes." />
                </label>
                <input
                  type="password"
                  placeholder="AIza..."
                  className="w-full bg-white border border-gray-300 p-4 rounded-2xl text-xs font-mono text-gray-900 shadow-inner"
                  value={form.geminiApiKey || ''}
                  onChange={(e) => setForm({ ...form, geminiApiKey: e.target.value })}
                />
              </div>
            )}

            {form.aiProvider === 'openai' && (
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 flex items-center gap-2">
                  OpenAI API Key
                  <TooltipDot text="Chave da API OpenAI para geração de sugestões inteligentes." />
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="w-full bg-white border border-gray-300 p-4 rounded-2xl text-xs font-mono text-gray-900 shadow-inner"
                  value={form.openaiApiKey || ''}
                  onChange={(e) => setForm({ ...form, openaiApiKey: e.target.value })}
                />
              </div>
            )}

            {form.aiProvider === 'disabled' && (
              <p className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-2xl p-3">
                IA desativada. Ative um provider para habilitar sugestões inteligentes.
              </p>
            )}
          </section>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={saveSettings} className="flex-1 bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-gray-800 transition-all active:scale-95">
              Salvar configurações
            </button>
            <button onClick={onClose} className="sm:w-40 bg-gray-100 text-gray-700 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] border border-gray-200 hover:bg-gray-200 transition-all active:scale-95">
              Fechar
            </button>
          </div>
          {saveFeedback && (
            <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 font-semibold">
              {saveFeedback}
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
      <div className="bg-white p-8 sm:p-12 rounded-[3rem] sm:rounded-[4rem] shadow-2xl shadow-blue-200 w-full max-w-md text-center border border-white">
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
  const { settings, updateSettings } = useAppSettings();
  const [user, setUser] = useState<UserSession | null>(null);
  const [currentPath, setCurrentPath] = useState<'/' | '/help'>(
    typeof window !== 'undefined' && window.location.pathname === '/help' ? '/help' : '/'
  );
  const [activeTab, setActiveTab] = useState<TabKey>('lista');
  const [pendingHelpTarget, setPendingHelpTarget] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('helpTarget');
  });
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [historyData, setHistoryData] = useState<{ compras: PurchaseGroup[], stats: DashboardStats } | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmDialogConfig | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsTab, setSuggestionsTab] = useState<SuggestionsTab>('frequentes');
  const [catFilter, setCatFilter] = useState('todos');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<HistoryQuickFilter>('todos');
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(
    typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_FLAG_KEY) === 'true'
  );
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [finalizingPurchase, setFinalizingPurchase] = useState(false);
  const [togglingItemIds, setTogglingItemIds] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  const [newItemName, setNewItemName] = useState('');
  const [newItemQtd, setNewItemQtd] = useState(1);
  const [newItemCat, setNewItemCat] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [quickAddHistory, setQuickAddHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(QUICK_ADD_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
    } catch {
      return [];
    }
  });
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦');
  const [newCategoryColor, setNewCategoryColor] = useState('#9E9E9E');
  const [editingItemId, setEditingItemId] = useState<string | number | null>(null);
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);
  const onboardingSteps: OnboardingStep[] = [
    {
      title: 'Crie seus itens',
      description: 'Use a adição rápida para montar a lista em poucos cliques.'
    },
    {
      title: 'Use o carrinho',
      description: 'Marque os itens para mover ao carrinho e acompanhar o progresso da compra.'
    },
    {
      title: 'Veja o histórico',
      description: 'No histórico você filtra compras antigas e pode recarregar uma compra completa.'
    },
    {
      title: 'Ative a IA',
      description: 'Abra Configurações, escolha Gemini ou OpenAI e informe a chave para receber sugestões.'
    }
  ];

  useEffect(() => {
    const savedUser = localStorage.getItem('shopping_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    else setLoading(false);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = window.location.pathname === '/help' ? '/help' : '/';
      setCurrentPath(nextPath);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => { if (user) fetchInitialData(); }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined' || !pendingHelpTarget) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('helpTarget')) return;
    params.delete('helpTarget');
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash || ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [pendingHelpTarget]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    if ((activeTab === 'lista' || activeTab === 'carrinho') && !itemsLoaded) {
      fetchItems();
    }
  }, [activeTab, user, itemsLoaded]);

  useEffect(() => {
    if (!user || loading) return;
    const alreadySeen = localStorage.getItem(ONBOARDING_FLAG_KEY) === 'true';
    setHasSeenOnboarding(alreadySeen);
    if (!alreadySeen) {
      setOnboardingStep(0);
      setIsOnboardingOpen(true);
    }
  }, [user, loading]);

  useEffect(() => {
    if (!user || !pendingHelpTarget) return;
    if (pendingHelpTarget === '/lista' || pendingHelpTarget === '/carrinho' || pendingHelpTarget === '/historico') {
      setActiveTab(pendingHelpTarget.replace('/', '') as TabKey);
    }
    if (pendingHelpTarget === '/configuracoes') {
      setIsDebugOpen(true);
    }
    setPendingHelpTarget(null);
  }, [user, pendingHelpTarget]);

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

  const parsePriceValue = (value: string) => {
    const normalized = (value || '').replace(',', '.').trim();
    const num = parseFloat(normalized);
    if (!Number.isFinite(num) || num < 0) return 0;
    return num;
  };

  const getRuntimeAISettings = (): AppSettings => {
    const env = (import.meta as any).env || {};
    const debugProvider = localStorage.getItem('DEBUG_AI_PROVIDER') as AIProvider | null;
    const debugGeminiKey = localStorage.getItem('DEBUG_API_KEY') || '';
    const debugOpenAIKey = localStorage.getItem('DEBUG_OPENAI_API_KEY') || '';
    const debugScriptUrl = localStorage.getItem('DEBUG_APPS_SCRIPT_URL') || '';
    const debugClientId = localStorage.getItem('DEBUG_CLIENT_ID') || '';

    return {
      scriptUrl: (debugScriptUrl || settings.scriptUrl || env.VITE_APPS_SCRIPT_URL || '').trim(),
      googleClientId: (debugClientId || settings.googleClientId || env.VITE_GOOGLE_CLIENT_ID || '').trim(),
      aiProvider: (debugProvider || settings.aiProvider || 'disabled') as AIProvider,
      geminiApiKey: (debugGeminiKey || settings.geminiApiKey || '').trim(),
      openaiApiKey: (debugOpenAIKey || settings.openaiApiKey || '').trim()
    };
  };

  const persistQuickAddHistory = (itemsToPersist: string[]) => {
    localStorage.setItem(QUICK_ADD_HISTORY_KEY, JSON.stringify(itemsToPersist));
  };

  const addQuickHistoryItem = (name: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setQuickAddHistory((prev) => {
      const normalized = normalizeText(trimmed);
      const filtered = prev.filter((entry) => normalizeText(entry) !== normalized);
      const next = [trimmed, ...filtered].slice(0, 80);
      persistQuickAddHistory(next);
      return next;
    });
  };

  const inferCategory = (productName: string): Category | null => {
    if (!categories.length) return null;
    const normalizedProduct = normalizeText(productName);
    if (!normalizedProduct) return categories[0];

    const byCategoryName = categories.find((category) => {
      const categoryName = normalizeText(category.nome);
      return categoryName && normalizedProduct.includes(categoryName);
    });
    if (byCategoryName) return byCategoryName;

    for (const rule of CATEGORY_RULES) {
      const hitKeyword = rule.keywords.some((keyword) => normalizedProduct.includes(normalizeText(keyword)));
      if (!hitKeyword) continue;
      const ruleMatch = categories.find((category) => {
        const normalizedCategory = normalizeText(category.nome);
        return rule.hints.some((hint) => normalizedCategory.includes(normalizeText(hint)));
      });
      if (ruleMatch) return ruleMatch;
    }

    return categories[0];
  };

  const quickAddCatalog = useMemo(() => {
    const frequency = new Map<string, { name: string; score: number }>();

    const upsert = (rawName: string, score: number) => {
      const name = (rawName || '').trim();
      if (!name) return;
      const normalized = normalizeText(name);
      if (!normalized) return;
      const existing = frequency.get(normalized);
      if (existing) {
        existing.score += score;
      } else {
        frequency.set(normalized, { name, score });
      }
    };

    quickAddHistory.forEach((name) => upsert(name, 4));
    items.forEach((item) => upsert(item.nome, 3));
    historyData?.compras?.forEach((purchase) => {
      purchase.itens.forEach((item) => upsert(String(item?.nome || ''), 2));
    });
    BASE_ITEM_DICTIONARY.forEach((name) => upsert(name, 1));

    return Array.from(frequency.values())
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'pt-BR'))
      .map((entry) => entry.name);
  }, [items, historyData, quickAddHistory]);

  const quickAddSuggestions = useMemo(() => {
    if (!newItemName.trim()) return quickAddCatalog.slice(0, 8);
    const query = normalizeText(newItemName);
    if (!query) return quickAddCatalog.slice(0, 8);

    const startsWith = quickAddCatalog.filter((name) => normalizeText(name).startsWith(query));
    const contains = quickAddCatalog.filter((name) => {
      const normalized = normalizeText(name);
      return normalized.includes(query) && !normalized.startsWith(query);
    });

    return [...startsWith, ...contains].slice(0, 8);
  }, [newItemName, quickAddCatalog]);

  const inferredCategoryForInput = useMemo(() => {
    const parsed = parseQuickItemInput(newItemName, newItemQtd);
    return inferCategory(parsed.nome);
  }, [newItemName, newItemQtd, categories]);

  const handleItemNameChange = (nextName: string) => {
    setNewItemName(nextName);
    const parsed = parseQuickItemInput(nextName, newItemQtd);
    const inferred = inferCategory(parsed.nome);
    if (inferred?.nome) {
      setNewItemCat(inferred.nome);
    }
  };

  const requestConfirmation = (config: ConfirmDialogConfig) => {
    setConfirmConfig({
      cancelLabel: 'Não, cancelar',
      confirmLabel: 'Sim, confirmar',
      intent: 'primary',
      ...config
    });
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
    });
  };

  const handleConfirmationResult = (confirmed: boolean) => {
    setConfirmConfig(null);
    if (confirmResolverRef.current) {
      const resolve = confirmResolverRef.current;
      confirmResolverRef.current = null;
      resolve(confirmed);
    }
  };

  useEffect(() => {
    return () => {
      if (confirmResolverRef.current) {
        const resolve = confirmResolverRef.current;
        confirmResolverRef.current = null;
        resolve(false);
      }
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('shopping_user');
    setItems([]);
    setItemsLoaded(false);
    setHistoryData(null);
    setHistoryLoaded(false);
    setHistorySearch('');
    setHistoryFilter('todos');
    setUser(null);
  };

  const finishOnboarding = () => {
    localStorage.setItem(ONBOARDING_FLAG_KEY, 'true');
    setHasSeenOnboarding(true);
    setIsOnboardingOpen(false);
    setOnboardingStep(0);
  };

  const handleOnboardingNext = () => {
    if (onboardingStep >= onboardingSteps.length - 1) {
      finishOnboarding();
      return;
    }
    setOnboardingStep((prev) => prev + 1);
  };

  const handleOnboardingPrev = () => {
    setOnboardingStep((prev) => Math.max(0, prev - 1));
  };

  const handleSaveControlSettings = (next: AppSettings) => {
    updateSettings(next);
    showToast('Configurações salvas com sucesso.', 'success');
  };

  const navigateTo = (path: '/' | '/help') => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const navigateToHelp = () => navigateTo('/help');
  const navigateToHome = () => navigateTo('/');

  const applyHelpTarget = (deepLink: string) => {
    if (deepLink === '/lista' || deepLink === '/carrinho' || deepLink === '/historico') {
      setActiveTab(deepLink.replace('/', '') as TabKey);
    }
    if (deepLink === '/configuracoes') {
      setIsDebugOpen(true);
    }
  };

  const handleHelpOpenDeepLink = (deepLink: string) => {
    applyHelpTarget(deepLink);
    navigateToHome();
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemCat) {
      showToast('Informe nome e categoria para salvar na planilha.', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.addItem({ nome: newItemName, quantidade: newItemQtd, categoria: newItemCat, precoEstimado: parsePriceValue(newItemPrice) });
      const updated = await api.getItems();
      setItems(updated);
      setItemsLoaded(true);
      setNewItemName(''); setNewItemQtd(1); setNewItemPrice('');
      addQuickHistoryItem(newItemName);
      showToast('Item adicionado!', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Erro ao salvar item na planilha', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addItemWithAutoCategory = async (
    rawName: string,
    fallbackQty: number,
    options?: { resetInput?: boolean; quantityOverride?: number; successMessage?: string }
  ) => {
    if (!categories.length) {
      showToast('Cadastre ao menos uma categoria para usar a adição rápida.', 'error');
      return false;
    }

    const parsed = parseQuickItemInput(rawName, fallbackQty);
    const finalQty = options?.quantityOverride ?? parsed.quantidade;
    if (!parsed.nome) {
      showToast('Digite o nome do item para adicionar.', 'error');
      return false;
    }

    const resolvedCategory = inferCategory(parsed.nome) || categories[0];
    if (!resolvedCategory?.nome) {
      showToast('Não foi possível inferir a categoria. Selecione uma manualmente.', 'error');
      return false;
    }

    setLoading(true);
    try {
      await api.addItem({
        nome: parsed.nome,
        quantidade: Math.max(1, Number(finalQty) || 1),
        categoria: resolvedCategory.nome,
        precoEstimado: parsePriceValue(newItemPrice)
      });
      const updated = await api.getItems();
      setItems(updated);
      setItemsLoaded(true);
      setNewItemCat(resolvedCategory.nome);
      addQuickHistoryItem(parsed.nome);
      if (options?.resetInput) {
        setNewItemName('');
        setNewItemQtd(1);
        setNewItemPrice('');
      }
      showToast(options?.successMessage || `Item adicionado em ${resolvedCategory.nome}.`, 'success');
      return true;
    } catch (e: any) {
      showToast(e?.message || 'Erro ao salvar item na planilha', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddItem = async () => {
    await addItemWithAutoCategory(newItemName, newItemQtd, { resetInput: true });
  };

  const handleToggleStatus = async (id: string | number) => {
    const targetId = String(id);
    if (togglingItemIds.includes(targetId)) return;

    const previousItems = items;
    const targetItem = previousItems.find((item) => String(item.id) === targetId);
    if (!targetItem) return;

    const beforeStatus: ShoppingItem['status'] = targetItem.status;
    const optimisticStatus: ShoppingItem['status'] = beforeStatus === 'comprado' ? 'pendente' : 'comprado';
    const optimisticItems: ShoppingItem[] = previousItems.map((item): ShoppingItem =>
      String(item.id) === targetId
        ? { ...item, status: optimisticStatus }
        : item
    );

    setItems(optimisticItems);
    setItemsLoaded(true);
    if (editingItemId !== null && String(editingItemId) === targetId) handleCancelEditItem();
    setTogglingItemIds((prev) => (prev.includes(targetId) ? prev : [...prev, targetId]));

    try {
      await api.toggleStatus(id);
      let refreshed = await api.getItems();
      let afterStatus = refreshed.find(i => String(i.id) === targetId)?.status;

      // Em alguns cenários a primeira leitura pode voltar sem atualização imediata.
      if (beforeStatus && afterStatus === beforeStatus) {
        refreshed = await api.getItems();
        afterStatus = refreshed.find(i => String(i.id) === targetId)?.status;
      }

      if (beforeStatus && afterStatus === beforeStatus) {
        throw new Error('Não foi possível mover o item entre lista e carrinho. Tente novamente.');
      }
      setItems(refreshed);
      setItemsLoaded(true);
      if (afterStatus === 'comprado') {
        showToast('Item movido para o carrinho.', 'success');
      } else if (afterStatus === 'pendente') {
        showToast('Item voltou para a lista.', 'info');
      }
    } catch (e: any) {
      setItems(previousItems);
      showToast(e?.message || 'Erro ao atualizar status no servidor', 'error');
    } finally {
      setTogglingItemIds((prev) => prev.filter((itemId) => itemId !== targetId));
    }
  };

  const handleRemoveItem = async (id: string | number) => {
    const item = items.find(i => String(i.id) === String(id));
    const confirmed = await requestConfirmation({
      title: 'Confirmar exclusão',
      message: 'Este item será removido da sua lista atual.',
      details: item?.nome ? [`Item: ${item.nome}`] : undefined,
      confirmLabel: 'Sim, remover',
      cancelLabel: 'Não, cancelar',
      intent: 'danger'
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      await api.removeItem(id);
      const refreshed = await api.getItems();
      setItems(refreshed);
      setItemsLoaded(true);
      if (editingItemId !== null && String(editingItemId) === String(id)) handleCancelEditItem();
      showToast('Item removido com sucesso.', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Erro ao remover item na planilha', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditItem = (item: ShoppingItem) => {
    setEditingItemId(item.id);
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
  };

  const handleSaveEditItem = async (item: EditPanelItem) => {
    if (!item.nome.trim() || !item.categoria.trim()) {
      showToast('Informe nome e categoria para editar o item.', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.updateItem(item.id, {
        nome: item.nome.trim(),
        quantidade: Number(item.quantidade) || 1,
        categoria: item.categoria.trim(),
        precoEstimado: Number(item.precoEstimado) || 0
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
    const categoryName = newCategoryName.trim();
    if (!categoryName) {
      showToast('Informe o nome da categoria.', 'error');
      return;
    }
    const categoryIcon = (newCategoryIcon || '📦').trim() || '📦';
    const categoryColor = (newCategoryColor || '#9E9E9E').trim() || '#9E9E9E';

    setLoading(true);
    try {
      const added = await api.addCategory({
        nome: categoryName,
        icone: categoryIcon,
        cor: categoryColor
      });

      const selectedCategoryName = (added?.nome || categoryName).trim();
      const optimisticCategory: Category = {
        id: String(added?.id ?? `temp-${Date.now()}`),
        nome: selectedCategoryName,
        icone: (added?.icone || categoryIcon).trim(),
        cor: (added?.cor || categoryColor).trim()
      };

      setCategories((prev) => {
        const exists = prev.some((cat) => normalizeText(cat.nome) === normalizeText(selectedCategoryName));
        if (exists) {
          return prev.map((cat) =>
            normalizeText(cat.nome) === normalizeText(selectedCategoryName)
              ? { ...cat, ...optimisticCategory, id: cat.id }
              : cat
          );
        }
        return [...prev, optimisticCategory];
      });

      setNewItemCat(selectedCategoryName);
      setNewCategoryName('');
      setNewCategoryIcon('📦');
      setNewCategoryColor('#9E9E9E');
      setShowNewCategoryForm(false);
      showToast('Categoria adicionada!', 'success');

      try {
        const updatedCats = await api.getCategories();
        setCategories(updatedCats);
      } catch {
        // Keeps optimistic category visible if category refresh fails.
      }
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
    const confirmed = await requestConfirmation({
      title: 'Carregar compra do histórico',
      message: 'Os itens desta compra serão adicionados na lista atual como pendentes.',
      details: [`Compra: ${purchaseId}`],
      confirmLabel: 'Sim, carregar',
      cancelLabel: 'Não, cancelar',
      intent: 'primary'
    });
    if (!confirmed) return;

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
    if (finalizingPurchase) return;

    const confirmed = await requestConfirmation({
      title: 'Finalizar compra',
      message: 'Os itens marcados no carrinho serão movidos para o histórico.',
      details: ['Após isso, eles sairão da lista atual.'],
      confirmLabel: 'Sim, finalizar',
      cancelLabel: 'Não, cancelar',
      intent: 'primary'
    });
    if (!confirmed) return;

    setFinalizingPurchase(true);
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
      setFinalizingPurchase(false);
    }
  };

  const handleGetSuggestions = async () => {
    const runtimeSettings = getRuntimeAISettings();
    if (runtimeSettings.aiProvider === 'disabled') {
      showToast('IA desativada. Ative um provider em Configurações.', 'error');
      return;
    }

    const hasGeminiKey = !!runtimeSettings.geminiApiKey?.trim();
    const hasOpenAIKey = !!runtimeSettings.openaiApiKey?.trim();
    if (runtimeSettings.aiProvider === 'gemini' && !hasGeminiKey) {
      showToast('API key ausente para Gemini. Configure antes de pedir IA.', 'error');
      return;
    }
    if (runtimeSettings.aiProvider === 'openai' && !hasOpenAIKey) {
      showToast('API key ausente para OpenAI. Configure antes de pedir IA.', 'error');
      return;
    }

    const contextSource = items
      .filter((item) => item.status === 'pendente')
      .map((item) => item.nome)
      .filter(Boolean);
    const contextItems = contextSource.length ? contextSource : quickAddCatalog.slice(0, 10);
    const contextInput = Array.from(new Set(contextItems.map((name) => name.trim()).filter(Boolean))).slice(0, 12).join(', ');
    if (!contextInput) {
      showToast('Adicione alguns itens na lista para gerar sugestões de IA.', 'info');
      return;
    }

    setLoadingSuggestions(true);
    try {
      const generated = await generateAISuggestions(contextInput, runtimeSettings);
      const names = Array.from(new Set(generated.map((item) => item.name.trim()).filter(Boolean))).slice(0, 8);
      setAiSuggestions(names);
      setSuggestionsTab('ia');
      if (!names.length) {
        showToast('A IA não retornou sugestões para este contexto.', 'info');
      }
    } catch (e: any) {
      const message = String(e?.message || '');
      if (/failed to fetch|network|ERR_|timeout|conectar/i.test(message)) {
        showToast('Erro de rede ao consultar IA. Tente novamente.', 'error');
      } else {
        showToast(message || 'Erro ao gerar sugestões com IA.', 'error');
      }
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddSuggestion = async (suggestion: string) => {
    await addItemWithAutoCategory(suggestion, 1, {
      quantityOverride: 1,
      successMessage: `${suggestion} adicionado com 1 clique.`
    });
  };

  const handleSuggestionsTabChange = (tab: SuggestionsTab) => {
    setSuggestionsTab(tab);
    if (tab === 'ultima_compra' && !historyLoaded && !loading) {
      fetchHistory();
    }
  };

  if (currentPath === '/help') {
    return <HelpLayout onBack={navigateToHome} onOpenDeepLink={handleHelpOpenDeepLink} />;
  }

  if (!user && !loading) return (
    <>
      <LoginScreen onLogin={setUser} />
      <button onClick={() => setIsDebugOpen(true)} className="fixed bottom-8 right-8 bg-white/80 p-4 rounded-3xl border border-gray-200 shadow-2xl z-[9999] active:scale-90 flex items-center gap-2">
         <span className="text-xl">⚙️</span>
         <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Config</span>
      </button>
      <DiagnosticModal
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        onRefresh={() => { if (user) fetchInitialData(); }}
        initialSettings={settings}
        onSaveSettings={handleSaveControlSettings}
      />
    </>
  );

  const editingItem = editingItemId === null
    ? null
    : items.find((it) => String(it.id) === String(editingItemId)) || null;
  const editingPanelItem: EditPanelItem | null = editingItem
    ? {
        id: String(editingItem.id),
        nome: editingItem.nome || '',
        quantidade: Math.max(1, Number(editingItem.quantidade) || 1),
        categoria: editingItem.categoria || categories[0]?.nome || '',
        precoEstimado: Number(editingItem.precoEstimado) || 0
      }
    : null;
  const pendingItems = items.filter(i => i.status === 'pendente' && (catFilter === 'todos' || i.categoria === catFilter));
  const boughtItems = items.filter(i => i.status === 'comprado');
  const cartTotal = boughtItems.reduce((acc, curr) => acc + (curr.precoEstimado * curr.quantidade), 0);
  const selectedCount = boughtItems.length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0;
  const effectiveHistory = historyData || { compras: [], stats: { totalGasto: 0, totalCompras: 0, totalItens: 0, gastoMedio: 0, categoriaFavorita: '' } };
  const historySearchTerm = normalizeText(historySearch);
  const now = new Date();
  const historyPurchases = [...effectiveHistory.compras]
    .filter((purchase) => {
      if (!historySearchTerm) return true;
      return purchase.itens.some((item) =>
        normalizeText(String(item?.nome || '')).includes(historySearchTerm)
      );
    })
    .filter((purchase) => {
      if (historyFilter === '7d' || historyFilter === '30d') {
        const purchaseDate = parsePurchaseDate(String(purchase.data || ''));
        if (!purchaseDate) return false;
        const daysBack = historyFilter === '7d' ? 7 : 30;
        const minDate = new Date(now);
        minDate.setDate(minDate.getDate() - daysBack);
        return purchaseDate >= minDate;
      }
      return true;
    })
    .sort((a, b) => {
      if (historyFilter === 'maior') return Number(b.total || 0) - Number(a.total || 0);
      if (historyFilter === 'menor') return Number(a.total || 0) - Number(b.total || 0);
      return 0;
    });
  const frequentSuggestions = quickAddCatalog.slice(0, 8);
  const latestPurchaseSuggestions = (() => {
    const latestPurchase = effectiveHistory.compras?.[0];
    if (!latestPurchase) return [];
    return Array.from(
      new Set(
        latestPurchase.itens
          .map((item) => String(item?.nome || '').trim())
          .filter(Boolean)
      )
    ).slice(0, 8);
  })();

  return (
    <div className="max-w-4xl mx-auto pb-24 min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      {loading && <LoadingOverlay />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmationModal
        isOpen={!!confirmConfig}
        config={confirmConfig}
        onCancel={() => handleConfirmationResult(false)}
        onConfirm={() => handleConfirmationResult(true)}
      />
      <OnboardingModal
        isOpen={isOnboardingOpen && !hasSeenOnboarding}
        steps={onboardingSteps}
        stepIndex={onboardingStep}
        onNext={handleOnboardingNext}
        onPrev={handleOnboardingPrev}
        onSkip={finishOnboarding}
      />
      <DiagnosticModal
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        onRefresh={fetchInitialData}
        initialSettings={settings}
        onSaveSettings={handleSaveControlSettings}
      />
      <AppHeader
        user={user}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenHelp={navigateToHelp}
        onOpenSettings={() => setIsDebugOpen(true)}
        onLogout={handleLogout}
        listaCount={pendingItems.length}
        carrinhoCount={boughtItems.length}
        isOnline={isOnline}
      />

      <main className="p-3 sm:p-4 flex-1">
        {activeTab === 'lista' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-white">
              <QuickAddInput
                value={newItemName}
                quantity={newItemQtd}
                inferredCategoryName={inferredCategoryForInput?.nome || ''}
                suggestions={quickAddSuggestions}
                loading={loading}
                onChangeValue={handleItemNameChange}
                onChangeQuantity={setNewItemQtd}
                onPickSuggestion={(suggestion) => handleItemNameChange(suggestion)}
                onSubmit={handleQuickAddItem}
              />

              <div className="my-6 h-px bg-gray-100" />

              <form onSubmit={handleAddItem} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-300 uppercase ml-2 tracking-widest">Modo completo (opcional)</label>
                  <input type="text" placeholder="Ex: Arroz 5kg" className="w-full px-8 py-6 bg-gray-50 rounded-[2rem] focus:ring-4 focus:ring-blue-100 outline-none font-black text-gray-900 text-lg shadow-inner border border-gray-100" value={newItemName} onChange={e => handleItemNameChange(e.target.value)} />
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
                    <button type="button" onClick={() => setShowNewCategoryForm(true)} className="w-full mt-2 bg-blue-50 text-blue-700 border border-blue-200 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all active:scale-95">
                      Cadastrar Nova Categoria
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-300 uppercase ml-2 tracking-widest">Preço Unitário</label>
                    <input type="number" min={0} step="0.01" inputMode="decimal" className="w-full bg-gray-50 px-8 py-5 rounded-[2rem] font-black focus:ring-4 focus:ring-blue-100 outline-none text-gray-900 shadow-inner border border-gray-100" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="w-full md:w-auto md:px-10 min-h-[48px] bg-blue-600 text-white py-4 md:py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest">Adicionar Agora</button>
              </form>
            </div>

            <SuggestionsPanel
              activeTab={suggestionsTab}
              onChangeTab={handleSuggestionsTabChange}
              frequentSuggestions={frequentSuggestions}
              latestPurchaseSuggestions={latestPurchaseSuggestions}
              aiSuggestions={aiSuggestions}
              loadingAI={loadingSuggestions}
              onAskAI={handleGetSuggestions}
              onAddSuggestion={handleAddSuggestion}
              onLoadLastPurchase={fetchHistory}
            />

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
              {pendingItems.map(it => {
                const isToggling = togglingItemIds.includes(String(it.id));
                return (
                  <div
                    key={it.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleStartEditItem(it)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleStartEditItem(it);
                      }
                    }}
                    className="bg-white p-6 md:p-4 rounded-[2.5rem] shadow-xl shadow-gray-100 border border-white flex items-center justify-between gap-3 md:gap-2 group hover:border-blue-200 transition-all hover:scale-[1.01] cursor-pointer min-h-[44px]"
                  >
                    <div className="flex items-center gap-5 md:gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(it.id);
                        }}
                        disabled={isToggling}
                        className="w-14 h-14 md:w-12 md:h-12 rounded-[1.2rem] border-4 border-blue-50 hover:bg-blue-50 transition-colors flex items-center justify-center bg-gray-50 disabled:opacity-70"
                      >
                        {isToggling ? (
                          <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="w-3 h-3 rounded-full bg-blue-200" />
                        )}
                      </button>
                      <div>
                        <h3 className="font-black text-gray-900 text-lg leading-tight">{it.nome}</h3>
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">
                          {it.quantidade}x • {it.categoria} • R$ {Number(it.precoEstimado || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditItem(it);
                        }}
                        className="p-3 min-h-[44px] min-w-[44px] text-gray-300 hover:text-blue-600 active:scale-90"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(it.id);
                        }}
                        className="p-3 min-h-[44px] min-w-[44px] text-gray-300 hover:text-red-500 active:scale-90"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'carrinho' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-green-600 p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] text-white shadow-2xl shadow-green-100 border-4 border-white">
              <p className="text-green-100 text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Subtotal Selecionado</p>
              <h2 className="text-4xl sm:text-6xl font-black mt-3 tracking-tighter break-words">R$ {cartTotal.toFixed(2)}</h2>
              <div className="mt-6">
                <p className="text-[11px] font-black uppercase tracking-widest text-green-100 mb-2">
                  {selectedCount} de {totalCount} itens selecionados
                </p>
                <div className="w-full h-3 rounded-full bg-white/25 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {boughtItems.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-gray-300 font-black uppercase text-[10px] tracking-widest">O carrinho está vazio</p>
                </div>
              )}
              {boughtItems.map(it => {
                const isToggling = togglingItemIds.includes(String(it.id));
                return (
                  <div key={it.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex items-center gap-5 shadow-sm group hover:scale-[1.01] transition-all">
                    <button
                      onClick={() => handleToggleStatus(it.id)}
                      disabled={isToggling}
                      className="w-14 h-14 rounded-[1.3rem] bg-green-500 flex items-center justify-center text-white shadow-lg active:scale-90 transition-all disabled:opacity-70"
                      aria-label="Desmarcar item do carrinho"
                    >
                      {isToggling ? (
                        <span className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-gray-400 line-through text-lg">{it.nome}</h3>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${isToggling ? 'text-amber-700 bg-amber-100' : 'text-green-700 bg-green-100'}`}>
                          {isToggling ? 'Atualizando' : 'Selecionado'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                        <p className="text-xs font-black text-green-700 uppercase tracking-widest">
                          Quantidade: {it.quantidade}
                        </p>
                        <p className="text-xs font-black text-gray-600 uppercase tracking-widest">
                          Preço: R$ {Number(it.precoEstimado || 0).toFixed(2)}
                        </p>
                        <p className="text-lg font-black text-gray-900 sm:text-right">
                          R$ {(it.precoEstimado * it.quantidade).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {boughtItems.length > 0 && (
              <button
                onClick={handleFinalize}
                disabled={finalizingPurchase}
                className="w-full md:w-auto md:px-12 md:self-end min-h-[48px] bg-green-600 text-white py-6 md:py-5 rounded-[3rem] font-black text-xl md:text-2xl hover:bg-green-700 shadow-2xl shadow-green-100 transition-all border-b-8 border-green-800 tracking-tighter uppercase active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {finalizingPurchase && <span className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />}
                {finalizingPurchase ? 'SALVANDO...' : 'FINALIZAR E SALVAR'}
              </button>
            )}
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-6 animate-fade-in">
            {!historyLoaded && (
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm text-center">
                <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-5">Histórico sob demanda</p>
                <button onClick={fetchHistory} className="w-full sm:w-auto min-h-[48px] bg-purple-600 text-white py-4 px-8 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all active:scale-95">
                  Carregar Histórico
                </button>
              </div>
            )}

            {historyLoaded && (
              <>
             <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Buscar no histórico</label>
                  <input
                    type="text"
                    placeholder="Buscar no histórico..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl text-sm font-semibold text-gray-900 outline-none focus:ring-4 focus:ring-purple-100"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: '7d', label: 'Últimos 7 dias' },
                    { id: '30d', label: 'Últimos 30 dias' },
                    { id: 'maior', label: 'Maior valor' },
                    { id: 'menor', label: 'Menor valor' }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setHistoryFilter((prev) => (prev === filter.id ? 'todos' : filter.id as HistoryQuickFilter))}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        historyFilter === filter.id
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-purple-200 hover:text-purple-700'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-purple-600 p-8 rounded-[3rem] text-white shadow-2xl">
                  <p className="text-purple-100 text-[9px] font-black uppercase tracking-widest opacity-70">Gasto Acumulado</p>
                  <h2 className="text-3xl font-black mt-2 tracking-tighter">R$ {Number(effectiveHistory.stats.totalGasto).toFixed(2)}</h2>
                </div>
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col justify-center">
                  <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Categoria Top</p>
                  <h2 className="text-xl font-black mt-2 text-gray-900 truncate tracking-tight">{effectiveHistory.stats.categoriaFavorita || 'Sem Dados'}</h2>
                </div>
             </div>
             
             {historyPurchases.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-gray-300 font-black uppercase text-[10px] tracking-widest">Nenhuma compra encontrada com os filtros atuais</p>
                </div>
             )}
             
             {historyPurchases.map(p => (
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
                   <button onClick={() => handleReloadFromHistory(p.id)} className="w-full mt-2 bg-purple-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all active:scale-95 shadow-sm">
                     🔁 Recarregar esta compra
                   </button>
                 </div>
               </div>
             ))}
             </>
            )}
          </div>
        )}
      </main>

      <EditItemPanel
        item={editingPanelItem}
        open={editingItemId !== null}
        onClose={handleCancelEditItem}
        onSave={handleSaveEditItem}
        onDelete={(id) => handleRemoveItem(id)}
      />

      <CategoryPanel
        open={showNewCategoryForm}
        loading={loading}
        name={newCategoryName}
        icon={newCategoryIcon}
        color={newCategoryColor}
        onClose={() => setShowNewCategoryForm(false)}
        onSave={handleAddCategory}
        onNameChange={setNewCategoryName}
        onIconChange={setNewCategoryIcon}
        onColorChange={setNewCategoryColor}
      />

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t px-4 py-4 sm:hidden flex justify-around items-center z-50 rounded-t-[2.25rem] shadow-2xl">
          {(['lista', 'carrinho', 'historico'] as TabKey[]).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`flex flex-col items-center gap-2 relative transition-all ${activeTab === t ? 'scale-110' : 'grayscale opacity-40 hover:opacity-100'}`}>
              <div className="text-3xl">{t === 'lista' ? '📋' : t === 'carrinho' ? '🛒' : '📅'}</div>
              <span className={`text-[9px] font-black uppercase tracking-tighter ${
                activeTab === t
                  ? (t === 'lista' ? 'text-blue-600' : t === 'carrinho' ? 'text-green-600' : 'text-purple-600')
                  : 'text-gray-500'
              }`}>{t}</span>
              {t === 'carrinho' && boughtItems.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg">{boughtItems.length}</span>
              )}
            </button>
          ))}
      </footer>
    </div>
  );
}

