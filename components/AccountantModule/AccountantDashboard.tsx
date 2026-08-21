import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, CalendarClock, ExternalLink, Loader2, Receipt, TrendingUp, WalletCards } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { watchAccountantLinks } from '../../services/accountantService';
import { setDelegatedCompanyContext } from '../../services/delegatedCompanyContext';
import { AccountantLink } from '../../types/accountant';
import { AccountantCompanyMetric, loadAccountantCompanyMetrics } from '../../services/accountantDashboardService';

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
const riskLabel = { regular: 'Regular', attention: 'Atenção', critical: 'Crítico', exceeded: 'Ultrapassado' };
const riskStyle = { regular: 'bg-emerald-100 text-emerald-700', attention: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700', exceeded: 'bg-red-700 text-white' };

const AccountantDashboard: React.FC<{ onClients: () => void; onOpenCompany: () => void; onOpenPayables: () => void }> = ({ onClients, onOpenCompany, onOpenPayables }) => {
  const { user } = useUser();
  const [active, setActive] = useState<AccountantLink[]>([]);
  const [pending, setPending] = useState<AccountantLink[]>([]);
  const [metrics, setMetrics] = useState<AccountantCompanyMetric[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState('all');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    const a = watchAccountantLinks(user.uid, 'active', setActive);
    const p = watchAccountantLinks(user.uid, 'pending', setPending);
    return () => { a(); p(); };
  }, [user?.uid]);
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadAccountantCompanyMetrics(active).then(setMetrics).catch(error => { console.error('Erro ao consolidar carteira:', error); setMetrics([]); }).finally(() => setLoading(false));
  }, [active, user?.uid]);
  const visibleMetrics = useMemo(() => selectedOwnerId === 'all' ? metrics : metrics.filter(item => item.ownerId === selectedOwnerId), [metrics, selectedOwnerId]);
  const totals = useMemo(() => ({
    month: visibleMetrics.reduce((sum, item) => sum + item.monthRevenue, 0),
    pending: visibleMetrics.filter(item => item.pendingObligations || item.overdueExpenses || item.risk !== 'regular').length,
    nearLimit: visibleMetrics.filter(item => item.risk === 'attention' || item.risk === 'critical' || item.risk === 'exceeded').length,
    obligations: visibleMetrics.reduce((sum, item) => sum + item.pendingObligations, 0),
  }), [visibleMetrics]);
  const ranked = [...visibleMetrics].sort((a, b) => b.limitPercent - a.limitPercent);
  const chart = useMemo(() => {
    if (visibleMetrics[0]?.monthly) return visibleMetrics[0].monthly.map((month, index) => ({ ...month, value: visibleMetrics.reduce((sum, item) => sum + (item.monthly[index]?.value || 0), 0) }));
    const now = new Date();
    return Array.from({ length: 12 }, (_, index) => { const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1); return { key: `${date.getFullYear()}-${date.getMonth() + 1}`, label: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''), value: 0 }; });
  }, [visibleMetrics]);
  const maxChart = Math.max(1, ...chart.map(item => item.value));
  const open = (item: AccountantCompanyMetric) => { setDelegatedCompanyContext({ ownerId: item.ownerId, companyName: item.name }); onOpenCompany(); };
  const openPayables = (item: AccountantCompanyMetric) => { setDelegatedCompanyContext({ ownerId: item.ownerId, companyName: item.name }); onOpenPayables(); };

  if (loading && active.length) return <div className="flex min-h-72 flex-col items-center justify-center text-center text-slate-500"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50"><Loader2 className="h-7 w-7 animate-spin text-teal-600"/></div><p className="mt-3 font-bold text-slate-700">Consolidando dados da carteira</p><p className="mt-1 text-xs">Aguarde enquanto analisamos as empresas vinculadas.</p></div>;
  return <div className="space-y-6">
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white to-teal-50/40 p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between"><div><span className="mb-2 inline-flex rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-teal-700">Carteira contábil</span><h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{selectedOwnerId === 'all' ? 'Visão geral da carteira' : visibleMetrics[0]?.name || 'Empresa selecionada'}</h2><p className="mt-1 text-sm text-slate-500">Riscos, limites e providências com base nos dados reais das empresas.</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="accountant-company-filter">Trocar empresa</label><select id="accountant-company-filter" value={selectedOwnerId} onChange={event => { const value = event.target.value; setSelectedOwnerId(value); const item = metrics.find(metric => metric.ownerId === value); setDelegatedCompanyContext(item ? { ownerId: item.ownerId, companyName: item.name } : null); }} className="min-w-72 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"><option value="all">Visão geral da carteira</option>{metrics.map(item => <option key={item.ownerId} value={item.ownerId}>{item.name}</option>)}</select><button onClick={onClients} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 hover:shadow-md">Gerenciar clientes e convites</button></div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Card icon={Building2} label={selectedOwnerId === 'all' ? 'Empresas ativas' : 'Empresa selecionada'} value={selectedOwnerId === 'all' ? String(active.length) : '1'} tone="teal" />
      <Card icon={WalletCards} label="Faturamento no mês" value={money(totals.month)} tone="teal" />
      <Card icon={AlertTriangle} label="Clientes com pendências" value={String(totals.pending)} tone="rose" />
      <Card icon={TrendingUp} label="Próximas do limite" value={String(totals.nearLimit)} tone="amber" />
      <Card icon={CalendarClock} label="Obrigações em 7 dias" value={String(totals.obligations)} tone="blue" />
    </div>
    {(pending.length > 0 || ranked.some(item => item.risk !== 'regular' || item.overdueExpenses > 0)) && <section className="rounded-2xl border bg-white shadow-sm"><div className="border-b px-5 py-4"><h3 className="font-black text-slate-900">Central de alertas prioritários</h3></div><div className="divide-y">
      {pending.length > 0 && <AlertRow tone="amber" title={`${pending.length} convite(s) aguardando aceite`} detail="A empresa ainda não liberou o acesso contábil." />}
      {ranked.filter(item => item.risk !== 'regular').map(item => <AlertRow key={`${item.ownerId}-limit`} tone={item.risk === 'attention' ? 'amber' : 'red'} title={`${item.name} — ${riskLabel[item.risk]} (${item.limitPercent.toFixed(1)}% do limite)`} detail={`Faturamento anual ${money(item.annualRevenue)} · projeção ${money(item.projection)}`} action={() => open(item)} />)}
      {ranked.filter(item => item.overdueExpenses > 0).map(item => <AlertRow key={`${item.ownerId}-overdue`} tone="red" title={`${item.name} — ${item.overdueExpenses} despesa(s) vencida(s)`} detail="Existem contas pendentes com vencimento anterior a hoje." action={() => openPayables(item)} />)}
    </div></section>}
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b px-5 py-4"><h3 className="font-black text-slate-900">Ranking e riscos da carteira</h3><p className="text-xs text-slate-500">Faturamento anual para porte; RBT12 exibida separadamente.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Empresa</th><th>Porte / regime</th><th className="text-right">Mês</th><th className="text-right">Ano</th><th className="text-right">RBT12</th><th className="px-3">Limite utilizado</th></tr></thead><tbody className="divide-y">{ranked.map(item => <tr key={item.ownerId} className="transition hover:bg-slate-50/70"><td className="p-3 font-bold text-slate-800">{item.name}<span className="block text-[10px] font-medium text-slate-400">{item.annualRevenue === 0 ? 'Sem movimento registrado' : 'Dados financeiros disponíveis'}</span><button onClick={() => open(item)} className="ml-2 text-teal-700" title="Abrir empresa"><ExternalLink className="inline h-3.5 w-3.5"/></button></td><td><span className="font-semibold">{item.size}</span><span className="block text-xs text-slate-500">{item.regime}</span></td><td className="text-right">{money(item.monthRevenue)}</td><td className="text-right font-semibold">{money(item.annualRevenue)}</td><td className="text-right">{money(item.rbt12)}</td><td className="px-3"><div className="flex items-center gap-2"><div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${item.limitPercent >= 90 ? 'bg-red-500' : item.limitPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, item.limitPercent)}%` }}/></div><span>{item.limitPercent.toFixed(1)}%</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${riskStyle[item.risk]}`}>{riskLabel[item.risk]}</span></div></td></tr>)}</tbody></table>{ranked.length === 0 && <Empty />}</div></section>
      <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-black text-slate-900">Monitor de enquadramento</h3>{ranked[0] ? <div className="mt-4"><div className="flex items-start justify-between"><div><p className="text-lg font-black">{ranked[0].name}</p><p className="text-xs text-slate-500">{ranked[0].size} · {ranked[0].regime}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${riskStyle[ranked[0].risk]}`}>{riskLabel[ranked[0].risk]}</span></div><p className="mt-5 text-xs text-slate-500">Faturamento anual</p><p className="text-xl font-black text-teal-700">{money(ranked[0].annualRevenue)} <span className="text-sm font-medium text-slate-400">de {money(ranked[0].limit)}</span></p><div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-teal-600" style={{ width: `${Math.min(100, ranked[0].limitPercent)}%` }}/></div><div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-center"><Metric label="Média mensal" value={money(ranked[0].annualRevenue / (new Date().getMonth() + 1))}/><Metric label="Projeção anual" value={money(ranked[0].projection)}/><Metric label="RBT12" value={money(ranked[0].rbt12)}/></div><div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Fiscal: <b>{money(ranked[0].fiscalRevenue)}</b> · Recebido: <b>{money(ranked[0].financialRevenue)}</b></div></div> : <Empty />}</section>
    </div>
    <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-black text-slate-900">Faturamento da carteira — últimos 12 meses</h3><div className="mt-6 flex h-56 items-end gap-2 border-b border-l px-3">{chart.map(item => <div key={item.key} className="group flex h-full min-w-0 flex-1 flex-col justify-end"><div className="relative rounded-t bg-teal-500 transition hover:bg-teal-600" style={{ height: `${Math.max(item.value ? 4 : 0, item.value / maxChart * 90)}%` }}><span className="absolute bottom-full left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">{money(item.value)}</span></div><span className="mt-2 truncate text-center text-[10px] text-slate-500">{item.label}</span></div>)}</div></section>
  </div>;
};

const Card = ({icon: Icon,label,value,tone}:{icon:React.ElementType;label:string;value:string;tone:string}) => { const styles:Record<string,string>={teal:'bg-teal-50 text-teal-700',amber:'bg-amber-50 text-amber-700',rose:'bg-rose-50 text-rose-700',blue:'bg-blue-50 text-blue-700'}; const bars:Record<string,string>={teal:'bg-teal-500',amber:'bg-amber-500',rose:'bg-rose-500',blue:'bg-blue-500'}; return <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className={`absolute inset-x-0 top-0 h-1 ${bars[tone]}`}/><span className={`inline-flex rounded-lg p-2 ${styles[tone]}`}><Icon className="h-5 w-5"/></span><p className="mt-3 text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-900">{value}</p></div> };
const AlertRow = ({tone,title,detail,action}:{tone:'amber'|'red';title:string;detail:string;action?:()=>void}) => <div className={`flex flex-col gap-3 border-l-4 p-4 sm:flex-row sm:items-center ${tone === 'red' ? 'border-red-500 bg-red-50/50' : 'border-amber-500 bg-amber-50/50'}`}><AlertTriangle className={tone === 'red' ? 'text-red-600' : 'text-amber-600'}/><div className="flex-1"><p className="font-bold text-slate-800">{title}</p><p className="text-xs text-slate-500">{detail}</p></div>{action && <button onClick={action} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white">Analisar</button>}</div>;
const Metric = ({label,value}:{label:string;value:string}) => <div><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 text-xs font-black text-slate-800">{value}</p></div>;
const Empty = () => <div className="p-8 text-center text-sm text-slate-500">Nenhuma empresa com dados financeiros disponível.</div>;
export default AccountantDashboard;
