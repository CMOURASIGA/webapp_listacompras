import React from 'react';

interface QuickActionsCardProps {
  loading: boolean;
  lastPurchase: { id: string | number; data: string } | null;
  onRepeatLastPurchase: () => void;
  onGenerateListWithAI: () => void;
  onCreateNewList: () => void;
}

export default function QuickActionsCard({
  loading,
  lastPurchase,
  onRepeatLastPurchase,
  onGenerateListWithAI,
  onCreateNewList
}: QuickActionsCardProps) {
  return (
    <section className="bg-white border border-gray-100 rounded-[2rem] p-5 sm:p-6 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Ações rápidas</h3>

      {loading ? (
        <div className="mt-4 space-y-2 animate-pulse">
          <div className="h-11 rounded-xl bg-gray-100" />
          <div className="h-11 rounded-xl bg-gray-100" />
          <div className="h-11 rounded-xl bg-gray-100" />
        </div>
      ) : (
        <>
          {lastPurchase && (
            <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-purple-700">Última compra</p>
              <p className="mt-1 text-sm font-black text-purple-900">ID {lastPurchase.id}</p>
              <p className="text-xs font-semibold text-purple-700">{lastPurchase.data}</p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRepeatLastPurchase}
              disabled={!lastPurchase}
              className="min-h-[44px] rounded-xl bg-purple-600 text-white text-xs font-black uppercase tracking-widest hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Repetir última compra
            </button>
            <button
              type="button"
              onClick={onGenerateListWithAI}
              className="min-h-[44px] rounded-xl bg-green-600 text-white text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95"
            >
              Gerar lista com IA
            </button>
            <button
              type="button"
              onClick={onCreateNewList}
              className="min-h-[44px] rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all active:scale-95 sm:col-span-2"
            >
              Criar nova lista
            </button>
          </div>
        </>
      )}
    </section>
  );
}
