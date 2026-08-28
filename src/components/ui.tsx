import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <div className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>; }
export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'blue' | 'green' | 'amber' | 'red' }) {
  const tones = { slate: 'bg-slate-100 text-slate-600', blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700' };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
export function LoadingState() { return <div className="grid min-h-[55vh] place-items-center"><div className="text-center"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"/><p className="mt-3 text-sm text-slate-500">Carregando suas compras...</p></div></div>; }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <Card className="py-10 text-center"><div className="text-3xl">🛒</div><h3 className="mt-3 font-bold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{description}</p>{action && <div className="mt-4">{action}</div>}</Card>; }
export function ErrorState({ message, retry }: { message: string; retry: () => void }) { return <Card className="border-red-100 bg-red-50 text-center"><p className="font-semibold text-red-700">{message}</p><button onClick={retry} className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">Tentar novamente</button></Card>; }

