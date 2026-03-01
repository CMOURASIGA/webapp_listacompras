import React from 'react';

interface AIInsightsPlaceholderCardProps {
  loading: boolean;
}

export default function AIInsightsPlaceholderCard({ loading }: AIInsightsPlaceholderCardProps) {
  if (loading) {
    return (
      <section className="bg-white border border-gray-100 rounded-[2rem] p-5 sm:p-6 shadow-sm animate-pulse">
        <div className="h-3 w-36 rounded bg-gray-200" />
        <div className="mt-3 h-4 w-56 rounded bg-gray-200" />
        <div className="mt-4 h-20 rounded-2xl bg-gray-100" />
      </section>
    );
  }

  return (
    <section className="bg-white border border-dashed border-blue-200 rounded-[2rem] p-5 sm:p-6 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Insights IA</p>
      <h3 className="mt-2 text-lg font-black tracking-tight text-gray-900">Modulo em preparacao</h3>
      <p className="mt-2 text-sm font-semibold text-gray-500">
        Espaco reservado para insights inteligentes no resumo.
      </p>
    </section>
  );
}
