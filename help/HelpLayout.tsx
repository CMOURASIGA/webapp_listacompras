import React, { useEffect, useMemo, useState } from 'react';
import HelpContent from './HelpContent';
import HelpSidebar from './HelpSidebar';
import { helpGuides } from './guides';
import { HelpGuide } from './types';

type HelpLayoutProps = {
  onBack: () => void;
  onOpenDeepLink?: (deepLink: string) => void;
};

const LAST_GUIDE_STORAGE_KEY = 'shopping_help_last_guide_v1';
const CLOSE_ON_NAV_STORAGE_KEY = 'shopping_help_close_on_navigate_v1';

function guideMatchesSearch(guide: HelpGuide, query: string) {
  const q = query.toLowerCase();
  const inText = (value: string) => value.toLowerCase().includes(q);

  if (inText(guide.label) || inText(guide.title) || inText(guide.description)) return true;
  if (guide.subsections?.some((section) =>
    inText(section.title) ||
    inText(section.description) ||
    section.bullets.some(inText)
  )) return true;
  if (guide.steps?.some((step) =>
    inText(step.title) ||
    inText(step.description) ||
    inText(step.image) ||
    (step.highlights || []).some(inText)
  )) return true;
  if (guide.tabGuides?.some((tab) =>
    inText(tab.label) ||
    inText(tab.cta.label) ||
    tab.steps.some((step) =>
      inText(step.title) ||
      inText(step.description) ||
      inText(step.image) ||
      (step.highlights || []).some(inText)
    )
  )) return true;

  return false;
}

export default function HelpLayout({ onBack, onOpenDeepLink }: HelpLayoutProps) {
  const [activeGuideId, setActiveGuideId] = useState(() => {
    if (typeof window === 'undefined') return helpGuides[0]?.id || '';
    const saved = localStorage.getItem(LAST_GUIDE_STORAGE_KEY) || '';
    return helpGuides.some((guide) => guide.id === saved) ? saved : (helpGuides[0]?.id || '');
  });
  const [search, setSearch] = useState('');
  const [closeOnNavigate, setCloseOnNavigate] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(CLOSE_ON_NAV_STORAGE_KEY) !== 'false';
  });

  const filteredGuides = useMemo(() => {
    const query = search.trim();
    if (!query) return helpGuides;
    return helpGuides.filter((guide) => guideMatchesSearch(guide, query));
  }, [search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeGuideId) localStorage.setItem(LAST_GUIDE_STORAGE_KEY, activeGuideId);
  }, [activeGuideId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CLOSE_ON_NAV_STORAGE_KEY, String(closeOnNavigate));
  }, [closeOnNavigate]);

  useEffect(() => {
    if (!filteredGuides.length) return;
    if (!filteredGuides.some((guide) => guide.id === activeGuideId)) {
      setActiveGuideId(filteredGuides[0].id);
    }
  }, [activeGuideId, filteredGuides]);

  const activeGuide = filteredGuides.find((guide) => guide.id === activeGuideId) || filteredGuides[0];
  const handleOpenDeepLink = (deepLink: string) => {
    if (!onOpenDeepLink) return;

    if (closeOnNavigate) {
      onOpenDeepLink(deepLink);
      return;
    }

    const targetUrl = new URL('/', window.location.origin);
    targetUrl.searchParams.set('helpTarget', deepLink);
    const opened = window.open(targetUrl.toString(), '_blank', 'noopener,noreferrer');
    if (!opened) {
      onOpenDeepLink(deepLink);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 animate-fade-in">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95"
            >
              Voltar
            </button>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">Central de Ajuda</h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-600">
              <input
                type="checkbox"
                checked={closeOnNavigate}
                onChange={(e) => setCloseOnNavigate(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
              />
              Fechar ajuda ao navegar
            </label>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">/help</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar na ajuda..."
            className="w-full bg-white border border-gray-200 px-4 py-3 rounded-2xl text-sm font-semibold text-gray-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-5">
          <HelpSidebar
            guides={filteredGuides}
            activeGuideId={activeGuideId}
            onSelect={setActiveGuideId}
          />
          {activeGuide ? (
            <HelpContent guide={activeGuide} onOpenDeepLink={handleOpenDeepLink} />
          ) : (
            <main className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8">
              <h2 className="text-2xl font-black text-gray-900">Nenhum guia encontrado</h2>
              <p className="mt-2 text-sm font-semibold text-gray-600">
                Tente outro termo em "Buscar na ajuda...".
              </p>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
