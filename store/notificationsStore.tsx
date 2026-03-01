import React, { createContext, useContext, useMemo, useState } from 'react';

type NotificationType = 'success' | 'error' | 'warning';

type NotificationItem = {
  id: number;
  type: NotificationType;
  message: string;
};

type NotificationsContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function ToastItem({ item, onClose }: { item: NotificationItem; onClose: (id: number) => void }) {
  const bg = item.type === 'success'
    ? 'bg-green-600'
    : item.type === 'error'
      ? 'bg-red-600'
      : 'bg-amber-600';

  return (
    <button
      type="button"
      onClick={() => onClose(item.id)}
      className={`${bg} text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-medium text-center min-w-[280px]`}
    >
      {item.message}
    </button>
  );
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const push = (type: NotificationType, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => removeItem(id), 4000);
  };

  const value = useMemo<NotificationsContextValue>(() => ({
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    warning: (message: string) => push('warning', message)
  }), []);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <div className="fixed bottom-20 sm:bottom-10 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 items-center">
        {items.map((item) => (
          <ToastItem key={item.id} item={item} onClose={removeItem} />
        ))}
      </div>
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}

