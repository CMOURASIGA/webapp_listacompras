import React from 'react';

export interface MonthlyOverview {
  gastoTotal: number;
  totalItens: number;
  totalCompras: number;
}

interface MonthlyOverviewCardProps {
  monthLabel: string;
  overview: MonthlyOverview;
  loading: boolean;
}

export default function MonthlyOverviewCard({
  monthLabel,
  overview,
  loading
}: MonthlyOverviewCardProps) {
  if (loading) {
    return (
      <section className="bg-white border border-gray-100 rounded-[2rem] p-5 sm:p-6 shadow-sm animate-pulse">
        <div className="h-3 w-28 rounded bg-gray-200" />
        <div className="mt-3 h-8 w-44 rounded bg-gray-200" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="h-16 rounded-xl bg-gray-100" />
          <div className="h-16 rounded-xl bg-gray-100" />
          <div className="h-16 rounded-xl bg-gray-100" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-br from-emerald-600 to-green-600 text-white rounded-[2rem] p-5 sm:p-6 shadow-2xl shadow-emerald-100 border border-white">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-100 opacity-90">
        Resumo mensal
      </p>
      <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight capitalize">{monthLabel}</h2>
      <p className="mt-1 text-sm font-semibold text-emerald-100">
        Gasto total: R$ {overview.gastoTotal.toFixed(2)}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/15 border border-white/20 p-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Itens</p>
          <p className="text-xl font-black mt-1">{overview.totalItens}</p>
        </div>
        <div className="rounded-xl bg-white/15 border border-white/20 p-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Compras</p>
          <p className="text-xl font-black mt-1">{overview.totalCompras}</p>
        </div>
        <div className="rounded-xl bg-white/15 border border-white/20 p-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Média</p>
          <p className="text-xl font-black mt-1">
            R$ {(overview.totalCompras > 0 ? overview.gastoTotal / overview.totalCompras : 0).toFixed(0)}
          </p>
        </div>
      </div>
    </section>
  );
}
