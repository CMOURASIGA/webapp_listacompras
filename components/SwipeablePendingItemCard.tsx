import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingItem } from '../types';

interface SwipeablePendingItemCardProps {
  item: ShoppingItem;
  isToggling: boolean;
  onMoveToCart: (id: string | number) => void;
  onOpenEdit: (item: ShoppingItem) => void;
  onRemove: (id: string | number) => void;
  onToggleFavorite: (name: string) => void;
}

type SwipeAxis = 'idle' | 'pending' | 'horizontal' | 'vertical';

const SWIPE_START_PX = 10;
const SWIPE_THRESHOLD_RATIO = 0.6;
const MAX_SWIPE_RATIO = 0.92;
const ACTION_DELAY_MS = 140;

export default function SwipeablePendingItemCard({
  item,
  isToggling,
  onMoveToCart,
  onOpenEdit,
  onRemove,
  onToggleFavorite
}: SwipeablePendingItemCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const startPointRef = useRef({ x: 0, y: 0 });
  const axisRef = useRef<SwipeAxis>('idle');
  const widthRef = useRef(0);
  const suppressClickRef = useRef(false);
  const actionTimerRef = useRef<number | null>(null);

  const [dragging, setDragging] = useState(false);
  const [offsetX, setOffsetX] = useState(0);

  const clearActionTimer = () => {
    if (actionTimerRef.current !== null) {
      window.clearTimeout(actionTimerRef.current);
      actionTimerRef.current = null;
    }
  };

  useEffect(() => () => clearActionTimer(), []);

  const thresholdPx = useMemo(() => {
    const width = widthRef.current || cardRef.current?.clientWidth || 0;
    return width * SWIPE_THRESHOLD_RATIO;
  }, [offsetX]);

  const progress = Math.min(1, Math.abs(offsetX) / Math.max(1, thresholdPx));
  const swipingRight = offsetX > 0;
  const swipingLeft = offsetX < 0;

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1 || isToggling) return;

    clearActionTimer();
    const touch = event.touches[0];
    startPointRef.current = { x: touch.clientX, y: touch.clientY };
    axisRef.current = 'pending';
    widthRef.current = cardRef.current?.clientWidth || 0;
    suppressClickRef.current = false;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1 || isToggling) return;

    const touch = event.touches[0];
    const dx = touch.clientX - startPointRef.current.x;
    const dy = touch.clientY - startPointRef.current.y;

    if (axisRef.current === 'pending') {
      if (Math.abs(dx) > SWIPE_START_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
        axisRef.current = 'horizontal';
        suppressClickRef.current = true;
        setDragging(true);
      } else if (Math.abs(dy) > SWIPE_START_PX && Math.abs(dy) > Math.abs(dx)) {
        axisRef.current = 'vertical';
      }
    }

    if (axisRef.current !== 'horizontal') return;
    if (event.cancelable) event.preventDefault();

    const maxOffset = Math.max(80, (widthRef.current || 0) * MAX_SWIPE_RATIO);
    const clamped = Math.max(-maxOffset, Math.min(maxOffset, dx));
    setOffsetX(clamped);
  };

  const handleTouchEnd = () => {
    if (axisRef.current !== 'horizontal') {
      axisRef.current = 'idle';
      setDragging(false);
      setOffsetX(0);
      return;
    }

    axisRef.current = 'idle';
    setDragging(false);

    const width = widthRef.current || cardRef.current?.clientWidth || 0;
    const threshold = width * SWIPE_THRESHOLD_RATIO;
    const shouldTrigger = Math.abs(offsetX) >= threshold && !isToggling;

    if (!shouldTrigger) {
      setOffsetX(0);
      return;
    }

    const direction = offsetX > 0 ? 1 : -1;
    const settleOffset = Math.max(96, width * 0.75);
    setOffsetX(direction * settleOffset);

    actionTimerRef.current = window.setTimeout(() => {
      if (direction > 0) {
        onMoveToCart(item.id);
      } else {
        onRemove(item.id);
      }
      setOffsetX(0);
      actionTimerRef.current = null;
    }, ACTION_DELAY_MS);
  };

  const handleTouchCancel = () => {
    axisRef.current = 'idle';
    setDragging(false);
    setOffsetX(0);
  };

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onOpenEdit(item);
  };

  return (
    <div className="relative overflow-hidden rounded-[2.5rem]">
      <div
        className={`absolute inset-0 flex items-center justify-between px-5 transition-colors duration-150 ${
          swipingRight ? 'bg-emerald-500' : swipingLeft ? 'bg-red-500' : 'bg-transparent'
        }`}
      >
        <div
          className="flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-widest transition-opacity"
          style={{ opacity: swipingRight ? Math.max(0.35, progress) : 0 }}
        >
          <span className="text-base leading-none">+</span>
          <span>Mover para carrinho</span>
        </div>
        <div
          className="flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-widest transition-opacity"
          style={{ opacity: swipingLeft ? Math.max(0.35, progress) : 0 }}
        >
          <span>Excluir item</span>
          <span className="text-base leading-none">×</span>
        </div>
      </div>

      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpenEdit(item);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={{ transform: `translateX(${offsetX}px)`, touchAction: 'pan-y' }}
        className={`bg-white p-6 md:p-4 rounded-[2.5rem] shadow-xl shadow-gray-100 border border-white flex items-center justify-between gap-3 md:gap-2 group hover:border-blue-200 hover:scale-[1.01] cursor-pointer min-h-[44px] ${
          dragging ? '' : 'transition-transform duration-200 ease-out'
        }`}
      >
        <div className="flex items-center gap-5 md:gap-3">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onMoveToCart(item.id);
            }}
            disabled={isToggling}
            className="w-14 h-14 md:w-12 md:h-12 rounded-[1.2rem] border-4 border-blue-50 hover:bg-blue-50 transition-colors flex items-center justify-center bg-gray-50 disabled:opacity-70"
            aria-label="Mover item para carrinho"
          >
            {isToggling ? (
              <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="w-3 h-3 rounded-full bg-blue-200" />
            )}
          </button>
          <div>
            <h3 className="font-black text-gray-900 text-lg leading-tight">{item.nome}</h3>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">
              {item.quantidade}x • {item.categoria} • R$ {Number(item.precoEstimado || 0).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(item.nome);
            }}
            className={`p-3 min-h-[44px] min-w-[44px] active:scale-90 transition-all ${
              item.isFavorito ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'
            }`}
            aria-label={item.isFavorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            title={item.isFavorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            ★
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpenEdit(item);
            }}
            className="p-3 min-h-[44px] min-w-[44px] text-gray-300 hover:text-blue-600 active:scale-90"
            aria-label="Editar item"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onRemove(item.id);
            }}
            className="p-3 min-h-[44px] min-w-[44px] text-gray-300 hover:text-red-500 active:scale-90"
            aria-label="Excluir item"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
