import React, { useEffect, useMemo, useState } from 'react';
import HighlightBox from './HighlightBox';
import { hasHighlightTarget } from './highlightMap';
import MockCartScreen from './mocks/MockCartScreen';
import MockHistoryScreen from './mocks/MockHistoryScreen';
import MockListScreen from './mocks/MockListScreen';
import MockSettingsScreen from './mocks/MockSettingsScreen';

type GuideStepProps = {
  title: string;
  description: string;
  image: string;
  currentStep: number;
  totalSteps: number;
  deepLink?: string;
  highlights?: string[];
  onOpenDeepLink?: (deepLink: string) => void;
};

export default function GuideStep({
  title,
  description,
  image,
  currentStep,
  totalSteps,
  deepLink,
  highlights = [],
  onOpenDeepLink
}: GuideStepProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isImageUrl = useMemo(() => /^https?:\/\//i.test((image || '').trim()), [image]);
  const visibleHighlights = useMemo(
    () => highlights.filter((target) => hasHighlightTarget(target)),
    [highlights]
  );

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    const timer = window.setTimeout(() => {
      if (!isImageUrl) setIsLoading(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [image, isImageUrl]);

  const shouldShowFallback = !image || hasError;
  const hasSystemMock = deepLink === '/lista' || deepLink === '/carrinho' || deepLink === '/historico' || deepLink === '/configuracoes';

  const renderSystemMock = () => {
    if (deepLink === '/lista') return <MockListScreen />;
    if (deepLink === '/carrinho') return <MockCartScreen />;
    if (deepLink === '/historico') return <MockHistoryScreen />;
    if (deepLink === '/configuracoes') return <MockSettingsScreen />;
    return (
      <div className="absolute inset-0 p-2 z-10">
        <div className="absolute inset-x-2 top-2 h-3 rounded bg-gray-200" />
        <div className="absolute inset-x-2 top-7 h-3 rounded bg-gray-200" />
        <div className="absolute inset-x-2 top-12 h-3 rounded bg-gray-200" />
        <span className="absolute bottom-1 left-1 px-2 py-1 rounded-lg bg-amber-300/95 text-[9px] font-black uppercase tracking-widest text-amber-950 border border-amber-400 shadow">
          {image}
        </span>
      </div>
    );
  };

  return (
    <article className="border border-gray-200 rounded-2xl p-4 bg-gray-50 flex flex-col gap-3">
      <header>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">
          Passo {currentStep} de {totalSteps}
        </p>
        <h3 className="text-base font-black text-gray-800">{title}</h3>
      </header>

      <div className="relative h-44 sm:h-52 rounded-xl border border-gray-300 bg-white overflow-hidden">
        {isImageUrl && !shouldShowFallback && (
          <img
            src={image}
            alt={title}
            className={`w-full h-full object-cover transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-gray-50 animate-pulse">
            <div className="absolute inset-x-2 top-2 h-3 rounded bg-gray-200" />
            <div className="absolute inset-x-2 top-7 h-3 rounded bg-gray-200" />
            <div className="absolute inset-x-2 top-12 h-3 rounded bg-gray-200" />
          </div>
        )}

        {!isLoading && shouldShowFallback && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-xs font-black uppercase tracking-widest px-4 text-center">
            Mock indisponível
          </div>
        )}

        {!isLoading && !shouldShowFallback && !isImageUrl && renderSystemMock()}

        {!isLoading && !shouldShowFallback && !isImageUrl && hasSystemMock && (
          <span className="absolute bottom-2 left-2 z-20 px-2 py-1 rounded-lg bg-amber-300/95 text-[9px] font-black uppercase tracking-widest text-amber-950 border border-amber-400 shadow">
            {image}
          </span>
        )}

        {!isLoading && !shouldShowFallback && visibleHighlights.length > 0 && (
          <div className="absolute inset-0 z-20">
            {visibleHighlights.map((target, index) => (
              <HighlightBox key={`${target}-${index}`} target={target} />
            ))}
          </div>
        )}
      </div>

      <footer className="space-y-2">
        <p className="text-sm font-semibold text-gray-600">{description}</p>

        {highlights.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {highlights.map((item) => (
              <span key={item} className="px-2 py-1 rounded-full bg-white border border-blue-200 text-[10px] font-black uppercase tracking-wider text-blue-700">
                {item}
              </span>
            ))}
          </div>
        )}

        {deepLink && onOpenDeepLink && (
          <button
            type="button"
            onClick={() => onOpenDeepLink(deepLink)}
            className="inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95"
          >
            Ver no sistema
          </button>
        )}
      </footer>
    </article>
  );
}
