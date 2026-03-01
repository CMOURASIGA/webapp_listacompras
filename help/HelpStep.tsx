import React from 'react';
import { HelpSystemTarget } from './types';

type HelpStepProps = {
  title: string;
  description: string;
  image: string;
  index?: number;
  totalSteps?: number;
  highlights?: string[];
  systemTarget?: HelpSystemTarget;
  onViewInSystem?: (target: HelpSystemTarget) => void;
};

export default function HelpStep({
  title,
  description,
  image,
  index,
  totalSteps,
  highlights = [],
  systemTarget,
  onViewInSystem
}: HelpStepProps) {
  return (
    <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
      {typeof index === 'number' && (
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">
          {typeof totalSteps === 'number' ? `Passo ${index + 1} de ${totalSteps}` : `Passo ${index + 1}`}
        </p>
      )}
      <p className="text-base font-black text-gray-800">{title}</p>
      <p className="text-sm font-semibold text-gray-600 mt-1">{description}</p>

      <div className="mt-3 relative h-24 rounded-xl border border-gray-300 bg-white overflow-hidden">
        <div className="absolute inset-x-2 top-2 h-3 rounded bg-gray-200" />
        <div className="absolute inset-x-2 top-7 h-3 rounded bg-gray-200" />
        <div className="absolute inset-x-2 top-12 h-3 rounded bg-gray-200" />
        <span className="absolute bottom-1 left-1 px-2 py-1 rounded-lg bg-amber-300/95 text-[9px] font-black uppercase tracking-widest text-amber-950 border border-amber-400 shadow">
          {image}
        </span>
      </div>

      {highlights.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {highlights.map((item) => (
            <span key={item} className="px-2 py-1 rounded-full bg-white border border-blue-200 text-[10px] font-black uppercase tracking-wider text-blue-700">
              {item}
            </span>
          ))}
        </div>
      )}

      {systemTarget && onViewInSystem && (
        <button
          type="button"
          onClick={() => onViewInSystem(systemTarget)}
          className="mt-3 inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95"
        >
          Ver no sistema
        </button>
      )}
    </div>
  );
}
