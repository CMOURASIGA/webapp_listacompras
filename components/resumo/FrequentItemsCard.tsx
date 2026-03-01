import React from 'react';

export interface FrequentItemData {
  nome: string;
  vezes: number;
}

interface FrequentItemsCardProps {
  items: FrequentItemData[];
  loading: boolean;
}

export default function FrequentItemsCard({ items, loading }: FrequentItemsCardProps) {
  return (
    <section className="bg-white border border-gray-100 rounded-[2rem] p-5 sm:p-6 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Itens frequentes</h3>
      {loading ? (
        <div className="mt-4 space-y-2 animate-pulse">
          <div className="h-10 rounded-xl bg-gray-100" />
          <div className="h-10 rounded-xl bg-gray-100" />
          <div className="h-10 rounded-xl bg-gray-100" />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-gray-500">Ainda sem recorrência no mês.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item, index) => (
            <div key={`${item.nome}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-black text-gray-900 truncate">{item.nome}</p>
              <span className="text-[11px] font-black uppercase tracking-widest text-blue-700 bg-blue-100 border border-blue-200 px-2 py-1 rounded-full">
                {item.vezes}x
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
