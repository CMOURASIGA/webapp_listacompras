import React, { useEffect, useState } from 'react';

export interface EditItemBottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}

const ANIMATION_MS = 220;

export default function EditItemBottomSheet({
  open,
  onClose,
  children,
  footer
}: EditItemBottomSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

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

    const updateKeyboardOffset = () => {
      if (!window.visualViewport) {
        setKeyboardOffset(0);
        return;
      }
      const viewport = window.visualViewport;
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(offset);
    };

    updateKeyboardOffset();
    window.addEventListener('keydown', onKeyDown);
    window.visualViewport?.addEventListener('resize', updateKeyboardOffset);
    window.visualViewport?.addEventListener('scroll', updateKeyboardOffset);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.visualViewport?.removeEventListener('resize', updateKeyboardOffset);
      window.visualViewport?.removeEventListener('scroll', updateKeyboardOffset);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[10003]">
      <button
        type="button"
        aria-label="Fechar edição"
        onClick={onClose}
        className={`absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <section
        role="dialog"
        aria-modal="true"
        className={`absolute inset-x-0 rounded-t-[2rem] bg-white border-t border-gray-200 shadow-2xl transition-[transform,bottom] duration-[220ms] ease-out overflow-hidden ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height: '85dvh', bottom: `${keyboardOffset}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full relative flex flex-col">
          <div className="pt-2 pb-1 flex justify-center">
            <span className="w-12 h-1.5 rounded-full bg-gray-300" />
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-36">
            {children}
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        </div>
      </section>
    </div>
  );
}
