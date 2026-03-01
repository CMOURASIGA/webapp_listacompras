import React from 'react';
import { HelpGuide } from './types';

type HelpSidebarProps = {
  guides: HelpGuide[];
  activeGuideId: string;
  onSelect: (guideId: string) => void;
};

export default function HelpSidebar({
  guides,
  activeGuideId,
  onSelect
}: HelpSidebarProps) {
  return (
    <aside className="bg-white border border-gray-200 rounded-3xl p-3 h-fit md:sticky md:top-24 transition-all duration-300">
      <p className="px-3 pt-2 pb-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
        Navegação
      </p>
      <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
        {guides.map((guide) => (
          <button
            key={guide.id}
            type="button"
            onClick={() => onSelect(guide.id)}
            className={`min-w-[180px] sm:min-w-[220px] md:min-w-0 w-full text-left px-3 py-3 rounded-2xl border transition-all duration-200 ${
              guide.id === activeGuideId
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-white border-transparent text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="text-sm font-black block">
              {guide.icon} {guide.label}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
