import React from 'react';
import useBreakpoint from '../hooks/useBreakpoint';
import EditItemDrawer from './EditItemDrawer';
import EditItemBottomSheet from './EditItemBottomSheet';

export interface CategoryPanelProps {
  open: boolean;
  loading?: boolean;
  name: string;
  icon: string;
  color: string;
  onClose: () => void;
  onSave: () => void;
  onNameChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onColorChange: (value: string) => void;
}

export default function CategoryPanel({
  open,
  loading = false,
  name,
  icon,
  color,
  onClose,
  onSave,
  onNameChange,
  onIconChange,
  onColorChange
}: CategoryPanelProps) {
  const { isMobile } = useBreakpoint();
  const canSave = !!name.trim() && !loading;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Nova categoria</p>
          <h3 className="text-xl font-black text-gray-900 leading-tight">Adicionar categoria</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          aria-label="Fechar cadastro de categoria"
        >
          ×
        </button>
      </div>

      <div className="mt-5 space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full bg-gray-50 px-4 py-3 rounded-xl font-semibold border border-gray-200 outline-none focus:ring-4 focus:ring-blue-100"
            placeholder="Ex: Padaria"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ícone</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => onIconChange(e.target.value)}
              className="w-full bg-gray-50 px-4 py-3 rounded-xl font-semibold border border-gray-200 outline-none focus:ring-4 focus:ring-blue-100"
              placeholder="Ex: 🍞"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cor</label>
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-full h-[46px] bg-gray-50 p-2 rounded-xl border border-gray-200"
            />
          </div>
        </div>
      </div>
    </>
  );

  const desktopActions = (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        className="bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Salvando...' : 'Salvar categoria'}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-gray-200 hover:bg-gray-200 transition-all active:scale-95"
      >
        Cancelar
      </button>
    </div>
  );

  const mobileFooter = (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Salvando...' : 'Salvar categoria'}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-gray-200 hover:bg-gray-200 transition-all active:scale-95"
      >
        Cancelar
      </button>
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
