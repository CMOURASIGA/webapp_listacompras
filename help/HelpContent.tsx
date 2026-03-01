import React, { useEffect, useMemo, useState } from 'react';
import GuideStep from './GuideStep';
import { HelpGuide, HelpStepData, HelpTabGuide } from './types';

type HelpContentProps = {
  guide: HelpGuide;
  onOpenDeepLink?: (deepLink: string) => void;
};

const deepLinkByTarget: Record<string, string> = {
  lista: '/lista',
  carrinho: '/carrinho',
  historico: '/historico',
  configuracoes: '/configuracoes'
};

const resolveStepDeepLink = (step: HelpStepData) => {
  if (step.deepLink) return step.deepLink;
  if (!step.systemTarget) return undefined;
  return deepLinkByTarget[step.systemTarget];
};

function StepSkeleton() {
  return (
    <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50 animate-pulse">
      <div className="h-2.5 w-24 rounded bg-blue-100 mb-2" />
      <div className="h-4 w-48 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-full rounded bg-gray-200" />
      <div className="mt-3 h-44 sm:h-52 rounded-xl border border-gray-200 bg-white" />
      <div className="mt-3 h-8 w-32 rounded-xl bg-gray-200" />
    </div>
  );
}

export default function HelpContent({ guide, onOpenDeepLink }: HelpContentProps) {
  const [activeTabId, setActiveTabId] = useState<string>(guide.tabGuides?.[0]?.id || '');
  const [isSwitchingSteps, setIsSwitchingSteps] = useState(false);

  useEffect(() => {
    setActiveTabId(guide.tabGuides?.[0]?.id || '');
  }, [guide.id, guide.tabGuides]);

  useEffect(() => {
    setIsSwitchingSteps(true);
    const timer = window.setTimeout(() => setIsSwitchingSteps(false), 160);
    return () => window.clearTimeout(timer);
  }, [guide.id, activeTabId]);

  const activeTabGuide: HelpTabGuide | null = useMemo(() => {
    if (!guide.tabGuides || guide.tabGuides.length === 0) return null;
    return guide.tabGuides.find((item) => item.id === activeTabId) || guide.tabGuides[0];
  }, [guide.tabGuides, activeTabId]);

  const steps = activeTabGuide ? activeTabGuide.steps : (guide.steps || []);

  return (
    <main className="bg-white border border-gray-200 rounded-3xl p-4 sm:p-8 transition-all duration-300 min-w-0">
      <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{guide.title}</h2>
      <p className="mt-2 text-sm text-gray-600 font-medium">{guide.description}</p>

      {guide.subsections && guide.subsections.length > 0 && (
        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          {guide.subsections.map((section) => (
            <div key={section.title} className="border border-gray-200 rounded-2xl p-4 bg-indigo-50/50">
              <h3 className="text-sm font-black text-gray-900">{section.title}</h3>
              <p className="text-xs font-semibold text-gray-600 mt-1">{section.description}</p>
              <ul className="mt-3 space-y-1">
                {section.bullets.map((bullet, index) => (
                  <li key={index} className="text-xs font-semibold text-indigo-800">
                    • {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {guide.tabGuides && guide.tabGuides.length > 0 && (
        <div className="mt-6 border border-dashed border-emerald-300 rounded-3xl bg-gradient-to-br from-emerald-50 to-cyan-50 p-3 sm:p-5">
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
            {guide.tabGuides.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap shrink-0 ${
                  activeTabGuide?.id === tab.id
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-200 hover:text-emerald-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {isSwitchingSteps ? (
              <>
                <StepSkeleton />
                <StepSkeleton />
              </>
            ) : (
              steps.map((step, index) => (
                <GuideStep
                  key={`${activeTabGuide?.id || guide.id}-step-${index}`}
                  currentStep={index + 1}
                  totalSteps={steps.length}
                  title={step.title}
                  description={step.description}
                  image={step.image}
                  highlights={step.highlights}
                  deepLink={resolveStepDeepLink(step)}
                  onOpenDeepLink={onOpenDeepLink}
                />
              ))
            )}
          </div>

          {activeTabGuide && (
            <a
              href={activeTabGuide.cta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full sm:w-auto inline-flex items-center justify-center bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95"
            >
              {activeTabGuide.cta.label}
            </a>
          )}
        </div>
      )}

      {(!guide.tabGuides || guide.tabGuides.length === 0) && (
        <div className="mt-6 grid gap-3">
          {isSwitchingSteps ? (
            <>
              <StepSkeleton />
              <StepSkeleton />
            </>
          ) : (
            steps.map((step, index) => (
              <GuideStep
                key={`${guide.id}-step-${index}`}
                currentStep={index + 1}
                totalSteps={steps.length}
                title={step.title}
                description={step.description}
                image={step.image}
                highlights={step.highlights}
                deepLink={resolveStepDeepLink(step)}
                onOpenDeepLink={onOpenDeepLink}
              />
            ))
          )}
        </div>
      )}

    </main>
  );
}
