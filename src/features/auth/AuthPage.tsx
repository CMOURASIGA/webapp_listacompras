import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { friendlyError } from '../../lib/errors';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [nome, setNome] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); const [message, setMessage] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setMessage('');
    try {
      if (mode === 'login') { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; }
      else { const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nome } } }); if (error) throw error; if (!data.session) setMessage('Cadastro realizado. Verifique seu e-mail para confirmar o acesso.'); }
    } catch (error) { setMessage(friendlyError(error)); } finally { setLoading(false); }
  };
  return <main className="grid min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-900 dark:text-slate-100 lg:grid-cols-2">
    <section className="hidden rounded-[2rem] bg-gradient-to-br from-brand-600 to-brand-500 p-12 text-white lg:flex lg:flex-col lg:justify-between"><div><div className="flex items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1"><img src="/icons/icon-192-v3.png" alt="7Mercado" className="h-full w-full rounded-xl object-cover"/></span><div><strong className="text-xl">7Mercado</strong><p className="text-sm text-brand-100">Consult Services</p></div></div></div><div><h1 className="max-w-lg text-4xl font-bold leading-tight">Planeje, compre e aprenda com o seu consumo real.</h1><p className="mt-4 max-w-lg text-brand-100">Histórico de preços, comparação de mercados e previsão da próxima compra em um só lugar.</p></div><p className="text-sm text-brand-100">Seus dados protegidos por conta e políticas de acesso.</p></section>
    <section className="grid place-items-center"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8"><div className="mb-7 flex items-center gap-3 lg:hidden"><span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl"><img src="/icons/icon-192-v3.png" alt="7Mercado" className="h-full w-full object-cover"/></span><div><strong>7Mercado</strong><p className="text-xs text-slate-500 dark:text-slate-400">Inteligência de consumo</p></div></div><h2 className="text-2xl font-bold">{mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{mode === 'login' ? 'Continue de onde parou.' : 'Comece a registrar seu histórico.'}</p>
      <div className="mt-6 space-y-3">{mode === 'signup' && <label className="block text-sm font-semibold">Nome<input required value={nome} onChange={e => setNome(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-600 dark:bg-slate-900" placeholder="Como devemos chamar você?"/></label>}<label className="block text-sm font-semibold">E-mail<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-600 dark:bg-slate-900" placeholder="voce@email.com"/></label><label className="block text-sm font-semibold">Senha<input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-600 dark:bg-slate-900" placeholder="Mínimo de 6 caracteres"/></label></div>
      {message && <p className="mt-4 rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-700 dark:text-slate-200">{message}</p>}<button disabled={loading} className="mt-5 w-full rounded-2xl bg-brand-600 py-3 font-bold text-white disabled:opacity-50">{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button><button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }} className="mt-4 w-full text-sm font-semibold text-brand-700 dark:text-brand-400">{mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}</button>
    </form></section>
  </main>;
}

