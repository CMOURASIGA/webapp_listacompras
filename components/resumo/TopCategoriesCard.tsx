import React from 'react';

export interface TopCategoryData {
  categoria: string;
  percentual: number;
}

interface TopCategoriesCardProps {
  categories: TopCategoryData[];
  loading: boolean;
}

export default function TopCategoriesCard({ categories, loading }: TopCategoriesCardProps) {
  return (
    <section className="bg-white border border-gray-100 rounded-[2rem] p-5 sm:p-6 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Top categorias</h3>
      {loading ? (
        <div className="mt-4 space-y-2 animate-pulse">
          <div className="h-10 rounded-xl bg-gray-100" />
          <div className="h-10 rounded-xl bg-gray-100" />
          <div className="h-10 rounded-xl bg-gray-100" />
        </div>
      ) : categories.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-gray-500">Sem dados no período atual.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {categories.map((category) => (
            <div key={category.categoria} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-gray-900">{category.categoria}</p>
                <p className="text-xs font-black text-gray-600">{category.percentual}%</p>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, category.percentual))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
