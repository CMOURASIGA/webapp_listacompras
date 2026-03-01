import React from 'react';
import { resolveHighlight } from './highlightMap';

export interface HighlightBoxProps {
  target: string;
}

export default function HighlightBox({ target }: HighlightBoxProps) {
  const rect = resolveHighlight(target);
  if (!rect) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{
        top: `${rect.top}%`,
        left: `${rect.left}%`,
        width: `${rect.width}%`,
        height: `${rect.height}%`
      }}
    >
      <div className="absolute inset-0 rounded-xl border-2 border-sky-500/90 bg-sky-400/10 shadow-[0_0_0_1px_rgba(14,165,233,0.25),0_0_24px_rgba(14,165,233,0.2)]" />
      <div className="absolute -inset-1 rounded-2xl border border-sky-400/45 opacity-80 motion-safe:animate-pulse" />
      {rect.label && (
        <span className="absolute -top-2 left-1 bg-sky-600 text-white px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow">
          {rect.label}
        </span>
      )}
    </div>
  );
}
