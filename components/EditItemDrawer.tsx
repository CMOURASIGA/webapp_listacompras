import React, { useEffect, useState } from 'react';

export interface EditItemDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const ANIMATION_MS = 220;

export default function EditItemDrawer({ open, onClose, children }: EditItemDrawerProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[10003]">
      <button
        type="button"
        aria-label="Fechar painel de edição"
        onClick={onClose}
        className={`absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={`absolute right-0 top-0 h-full w-full max-w-[400px] overflow-y-auto bg-white border-l border-gray-200 shadow-2xl p-6 transition-transform duration-[220ms] ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {children}
      </aside>
    </div>
  );
}
