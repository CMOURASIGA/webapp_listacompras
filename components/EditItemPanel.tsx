import React, { useEffect, useMemo, useState } from 'react';
import useBreakpoint from '../hooks/useBreakpoint';
import EditItemDrawer from './EditItemDrawer';
import EditItemBottomSheet from './EditItemBottomSheet';

export interface Item {
  id: string;
  nome: string;
  quantidade: number;
  categoria: string;
  precoEstimado: number;
}

export interface EditItemPanelProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  onSave: (item: Item) => void;
  onDelete: (id: string) => void;
}

const normalizeDecimalInput = (value: string) => value.replace(',', '.');
export default function EditItemPanel({
  item,
  open,
  onClose,
  onSave,
  onDelete
}: EditItemPanelProps) {
  const { isMobile } = useBreakpoint();
  const [activeItem, setActiveItem] = useState<Item | null>(item);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [precoInput, setPrecoInput] = useState('');

  useEffect(() => {
    if (item) setActiveItem(item);
  }, [item]);

  useEffect(() => {
    if (!open || !activeItem) return;
    setNome(activeItem.nome || '');
    setCategoria(activeItem.categoria || '');
    setQuantidade(Math.max(1, Number(activeItem.quantidade) || 1));
    setPrecoInput(activeItem.precoEstimado != null ? String(activeItem.precoEstimado) : '');
  }, [open, activeItem]);

  const parsedPrice = useMemo(() => {
    const parsed = Number(normalizeDecimalInput(precoInput || '0'));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }, [precoInput]);

  if (!activeItem) return null;

  const handleSave = () => {
    onSave({
      id: activeItem.id,
      nome: nome.trim(),
      categoria: categoria.trim(),
      quantidade: Math.max(1, Number(quantidade) || 1),
      precoEstimado: parsedPrice
    });
  };

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Editar item</p>
          <h3 className="text-xl font-black text-gray-900 leading-tight">{activeItem.nome || 'Item'}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          aria-label="Fechar edição"
        >
          ×
        </button>
      </div>

      <div className="mt-5 space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full bg-gray-50 px-4 py-3 rounded-xl font-semibold border border-gray-200 outline-none focus:ring-4 focus:ring-blue-100"
            placeholder="Nome do item"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantidade</label>
          <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-2 py-2">
            <button
              type="button"
              onClick={() => setQuantidade((prev) => Math.max(1, prev - 1))}
              className="w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 font-black text-lg leading-none hover:bg-gray-100 active:scale-95"
              aria-label="Diminuir quantidade"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              value={quantidade}
              onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 h-9 text-center rounded-lg border border-gray-300 bg-white text-sm font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => setQuantidade((prev) => prev + 1)}
              className="w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 font-black text-lg leading-none hover:bg-gray-100 active:scale-95"
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</label>
          <input
            type="text"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full bg-gray-50 px-4 py-3 rounded-xl font-semibold border border-gray-200 outline-none focus:ring-4 focus:ring-blue-100"
            placeholder="Categoria"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preço</label>
          <input
            type="text"
            inputMode="decimal"
            value={precoInput}
            onChange={(e) => setPrecoInput(e.target.value)}
            className="w-full bg-gray-50 px-4 py-3 rounded-xl font-semibold border border-gray-200 outline-none focus:ring-4 focus:ring-blue-100"
            placeholder="Ex: 12.50"
          />
        </div>
      </div>
    </>
  );

  const desktopActions = (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
      <button
        type="button"
        onClick={handleSave}
        className="sm:col-span-2 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95"
      >
        Salvar
      </button>
      <button
        type="button"
        onClick={() => onDelete(activeItem.id)}
        className="bg-red-50 text-red-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-red-200 hover:bg-red-100 transition-all active:scale-95"
      >
        Remover item
      </button>
      <button
        type="button"
        onClick={onClose}
        className="sm:col-span-3 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-gray-200 hover:bg-gray-200 transition-all active:scale-95"
      >
        Cancelar
      </button>
    </div>
  );

  const mobileFooter = (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleSave}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95"
      >
        Salvar
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onDelete(activeItem.id)}
          className="bg-red-50 text-red-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-red-200 hover:bg-red-100 transition-all active:scale-95"
        >
          Remover item
        </button>
        <button
          type="button"
          onClick={onClose}
          className="bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-gray-200 hover:bg-gray-200 transition-all active:scale-95"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  if (!isMobile) {
    return (
      <EditItemDrawer open={open} onClose={onClose}>
        {content}
        {desktopActions}
      </EditItemDrawer>
    );
  }

  return (
    <EditItemBottomSheet open={open} onClose={onClose} footer={mobileFooter}>
        {content}
    </EditItemBottomSheet>
  );
}
