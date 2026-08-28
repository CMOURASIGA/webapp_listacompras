import type { ReactNode } from 'react';

/** Card - contêiner base padronizado (mesmos raio/sombra do design system Consult Services). */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

const BADGE_TONES = {
  neutral: 'bg-slate-100 text-slate-600',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
  info: 'bg-info-50 text-info-700',
} as const;
/** Badge - indicador de status, paleta semântica alinhada ao design system Consult Services. */
export function Badge({ tone = 'neutral', children, className = '' }: { tone?: keyof typeof BADGE_TONES; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_TONES[tone]} ${className}`}>{children}</span>;
}
/** @deprecated use Badge — mantido só para não quebrar imports antigos. */
export const Pill = Badge;

export function Skeleton({ className = '' }: { className?: string }) { return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`}/>; }
/** Estado de carregamento em página cheia (sessão/autenticação). Para o conteúdo interno já montado, prefira Skeleton. */
export function LoadingState() { return <div className="grid min-h-[55vh] place-items-center"><div className="text-center"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600"/><p className="mt-3 text-sm text-slate-500">Carregando suas compras...</p></div></div>; }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <Card className="py-10 text-center"><img src="/icons/icon-192-v2.png" alt="" className="mx-auto h-12 w-12 rounded-xl"/><h3 className="mt-3 font-bold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{description}</p>{action && <div className="mt-4">{action}</div>}</Card>; }
export function ErrorState({ message, retry }: { message: string; retry: () => void }) { return <Card className="border-danger-50 bg-danger-50 text-center"><p className="font-semibold text-danger-700">{message}</p><button onClick={retry} className="mt-3 rounded-xl bg-danger-500 px-4 py-2 text-sm font-bold text-white">Tentar novamente</button></Card>; }
