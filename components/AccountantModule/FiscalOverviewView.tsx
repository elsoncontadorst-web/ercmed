import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Check, ChevronDown, Landmark, Percent, Receipt, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { getManagerIdForUser } from '../../services/accessControlService';
import { getTransactions, SavedTransaction, upsertSimplesForecastTransaction } from '../../services/userDataService';
import { getAllBillingRecords } from '../../services/repasseService';
import {
  calculateFactorR,
  FactorRMonthEntry,
  getFactorRSettings,
  getRollingMonthKeys,
  mergeFactorRMonths,
  saveFactorRSettings,
} from '../../services/factorRService';
import { calculateExecutiveSimples, calculateSimplesTaxComposition } from '../../services/simplesExecutiveService';
import { getActiveClinicScopeId } from '../../services/activeClinicStorage';
import { getClinics } from '../../services/clinicService';
import { recordMatchesClinicScope } from '../../services/clinicScopeService';

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value || 0);
const percent = (value: number | null) => value === null ? 'Pendente' : `${(value * 100).toFixed(2)}%`;
const monthLabel = (key: string) => new Date(`${key}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
const payrollTerms = ['folha', 'salário', 'salario', 'pró-labore', 'pro-labore', 'pro labore', 'fgts', 'encargo', 'inss patronal'];

const FiscalOverviewView: React.FC = () => {
  const { user } = useUser();
  const [managerId, setManagerId] = useState('');
  const [months, setMonths] = useState<FactorRMonthEntry[]>([]);
  const [automaticMonths, setAutomaticMonths] = useState<FactorRMonthEntry[]>([]);
  const [currentRevenue, setCurrentRevenue] = useState(0);
  const [expenseTaxes, setExpenseTaxes] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [transactions, setTransactions] = useState<SavedTransaction[]>([]);
  const [activeClinicId, setActiveClinicId] = useState<string | null>(null);
  const [activeClinicName, setActiveClinicName] = useState('Grupo consolidado');
  const [forecastAmounts, setForecastAmounts] = useState<Record<string, number>>({});
  const [generatingMonth, setGeneratingMonth] = useState('');
  const [showComposition, setShowComposition] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const ownerId = (await getManagerIdForUser(user.uid)) || user.uid;
      const clinicId = getActiveClinicScopeId();
      const [allTransactions, billings, saved, clinics] = await Promise.all([
        getTransactions(ownerId),
        getAllBillingRecords(ownerId),
        getFactorRSettings(ownerId),
        getClinics(ownerId),
      ]);
      const transactions = allTransactions.filter(item => recordMatchesClinicScope(item, clinicId, clinics));
      const scopedBillings = billings.filter(item => recordMatchesClinicScope(item, clinicId, clinics));
      const keys = getRollingMonthKeys();
      const automatic = keys.map(month => {
        const billingRevenue = scopedBillings.filter(item => item.consultationDate?.slice(0, 7) === month).reduce((sum, item) => sum + Number(item.grossAmount || 0), 0);
        const otherRevenue = transactions.filter(item => item.type === 'income' && item.date?.slice(0, 7) === month && !item.sourceBillingId && item.sourceType !== 'billing' && item.sourceType !== 'production_entry').reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const payroll = transactions.filter(item => {
          if (item.type !== 'expense' || item.date?.slice(0, 7) !== month) return false;
          const text = `${item.category || ''} ${item.description || ''}`.toLowerCase();
          return payrollTerms.some(term => text.includes(term));
        }).reduce((sum, item) => sum + Number(item.amount || 0), 0);
        return { month, revenue: billingRevenue + otherRevenue, payroll };
      });
      const automaticEntries = mergeFactorRMonths(automatic, null);
      setManagerId(ownerId);
      setAutomaticMonths(automaticEntries);
      setMonths(mergeFactorRMonths(automatic, saved));
      setCurrentRevenue(automatic.at(-1)?.revenue || 0);
      setExpenseTaxes(transactions.filter(item => item.type === 'expense' && `${item.category || ''} ${item.description || ''}`.toLowerCase().includes('imposto')).reduce((sum, item) => sum + Number(item.amount || 0), 0));
      setTransactions(transactions);
      setActiveClinicId(clinicId);
      setActiveClinicName(clinics.find(clinic => clinic.id === clinicId)?.name || 'Grupo consolidado');
    };
    load().catch(error => console.error('Erro ao carregar Fator R:', error));
  }, [user?.uid]);

  const snapshot = useMemo(() => calculateFactorR(months, currentRevenue), [months, currentRevenue]);
  const composition = useMemo(() => snapshot.simples ? calculateSimplesTaxComposition(snapshot.simples, currentRevenue) : [], [snapshot.simples, currentRevenue]);
  const hasManual = months.some(item => item.revenueSource === 'manual' || item.payrollSource === 'manual');

  const forecasts = useMemo(() => months.map(item => {
    const calculated = snapshot.annex && snapshot.revenue12 > 0
      ? calculateExecutiveSimples(item.revenue, snapshot.revenue12, snapshot.annex)
      : null;
    const fingerprint = `simples-das:${activeClinicId || 'consolidated'}:${item.month}`;
    const payable = transactions.find(transaction => transaction.sourceFingerprint === fingerprint);
    return {
      month: item.month,
      revenue: item.revenue,
      calculated,
      payable,
      amount: forecastAmounts[item.month] ?? payable?.amount ?? calculated?.impostoMensalEstimado ?? 0,
    };
  }), [months, snapshot.annex, snapshot.revenue12, transactions, activeClinicId, forecastAmounts]);

  const dueDateForCompetence = (competence: string) => {
    const [year, month] = competence.split('-').map(Number);
    const due = new Date(year, month, 20);
    return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-20`;
  };

  const generatePayable = async (forecast: typeof forecasts[number]) => {
    if (!managerId || !forecast.calculated || forecast.amount <= 0) return;
    setGeneratingMonth(forecast.month);
    const saved = await upsertSimplesForecastTransaction(managerId, {
      competence: forecast.month,
      amount: forecast.amount,
      dueDate: dueDateForCompetence(forecast.month),
      clinicId: activeClinicId || undefined,
      unitName: activeClinicId ? activeClinicName : undefined,
      annex: forecast.calculated.anexo,
      effectiveRate: forecast.calculated.aliquotaEfetiva,
    });
    if (saved) {
      setTransactions(current => [saved, ...current.filter(item => item.sourceFingerprint !== saved.sourceFingerprint)]);
      setMessage(`Conta a pagar do DAS de ${monthLabel(forecast.month)} gerada/atualizada com sucesso e sem duplicidade.`);
    } else {
      setMessage('Não foi possível gerar a conta a pagar. Verifique sua permissão e tente novamente.');
    }
    setGeneratingMonth('');
  };

  const updateValue = (month: string, field: 'revenue' | 'payroll', value: number) => {
    setMonths(current => current.map(item => item.month === month ? {
      ...item,
      [field]: Math.max(0, value),
      [field === 'revenue' ? 'revenueSource' : 'payrollSource']: 'manual',
    } : item));
    setMessage('');
  };

  const restoreMonth = (month: string) => {
    const automatic = automaticMonths.find(item => item.month === month);
    if (!automatic) return;
    setMonths(current => current.map(item => item.month === month ? { ...automatic, justification: '' } : item));
  };

  const save = async () => {
    if (!user || !managerId) return;
    if (hasManual && months.some(item => (item.revenueSource === 'manual' || item.payrollSource === 'manual') && !item.justification?.trim())) {
      setMessage('Informe a justificativa nos meses que possuem ajuste manual.');
      return;
    }
    setSaving(true);
    try {
      await saveFactorRSettings(managerId, { months }, user.uid);
      setMessage('Memória do Fator R salva com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar Fator R:', error);
      setMessage('Não foi possível salvar. Verifique sua permissão e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Fator R e Simples Nacional</h2>
        <p className="text-sm text-slate-500">Memória gerencial dos últimos 12 meses, com valores automáticos ou ajustes manuais.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card icon={Landmark} label="Receita sujeita ao Fator R" value={money(snapshot.revenue12)} detail="RBT12 utilizada no cálculo" tone="blue" />
        <Card icon={Receipt} label="Folha acumulada" value={money(snapshot.payroll12)} detail="Salários, pró-labore, FGTS e encargos" tone="amber" />
        <Card icon={Percent} label="Fator R atual" value={percent(snapshot.factorR)} detail="Folha dos 12 meses ÷ receita dos 12 meses" tone={snapshot.factorR !== null && snapshot.factorR >= .28 ? 'emerald' : 'violet'} />
        <Card icon={ShieldCheck} label="Anexo e faixa" value={snapshot.annex && snapshot.simples ? `Anexo ${snapshot.annex} · ${snapshot.simples.faixa}ª faixa` : 'Pendente'} detail={snapshot.annex ? (snapshot.annex === 'III' ? 'Fator R igual ou superior a 28%' : 'Fator R inferior a 28%') : 'Informe receita para validar'} tone={snapshot.annex === 'III' ? 'emerald' : 'violet'} />
        <Card icon={AlertTriangle} label="Folha para atingir 28%" value={money(snapshot.payrollGap)} detail={snapshot.payrollGap > 0 ? 'Diferença gerencial estimada' : 'Limite de 28% atingido'} tone={snapshot.payrollGap > 0 ? 'amber' : 'emerald'} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Memória mensal</h3>
            <p className="text-xs text-slate-500">Edite um valor para torná-lo manual. A justificativa mantém a alteração auditável.</p>
          </div>
          <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {saving ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar memória
          </button>
        </div>
        <div className="mx-5 mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <strong>Origem automática:</strong> a receita vem dos atendimentos, faturamentos e lançamentos do ERP; a folha vem apenas de despesas identificadas como salários, pró-labore, FGTS ou encargos. O sistema não cria uma folha de 28%: esse percentual é somente o limite usado para estimar o enquadramento entre os Anexos III e V.
        </div>
        {message && <div className={`mx-5 mt-4 rounded-lg p-3 text-sm ${message.includes('sucesso') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{message}</div>}
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="border-b text-left text-xs text-slate-500"><th className="pb-3">Competência</th><th className="pb-3">Receita sujeita</th><th className="pb-3">Folha do mês</th><th className="pb-3">Origem</th><th className="pb-3">Justificativa</th><th className="pb-3 text-right">Ação</th></tr></thead>
            <tbody>{months.map(item => {
              const manual = item.revenueSource === 'manual' || item.payrollSource === 'manual';
              return <tr key={item.month} className="border-b border-slate-100">
                <td className="py-3 font-semibold capitalize text-slate-800">{monthLabel(item.month)}</td>
                <td className="py-3 pr-3"><CurrencyInput ariaLabel={`Receita ${item.month}`} value={item.revenue} onChange={value => updateValue(item.month, 'revenue', value)} /></td>
                <td className="py-3 pr-3"><CurrencyInput ariaLabel={`Folha ${item.month}`} value={item.payroll} onChange={value => updateValue(item.month, 'payroll', value)} /></td>
                <td className="py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${manual ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>{manual ? 'Manual' : 'Automático'}</span></td>
                <td className="py-3 pr-3"><input aria-label={`Justificativa ${item.month}`} value={item.justification || ''} disabled={!manual} onChange={e => setMonths(current => current.map(row => row.month === item.month ? { ...row, justification: e.target.value } : row))} placeholder={manual ? 'Motivo do ajuste' : 'Não necessária'} className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50" /></td>
                <td className="py-3 text-right"><button onClick={() => restoreMonth(item.month)} disabled={!manual} title="Restaurar valores automáticos" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><RotateCcw className="h-4 w-4" /></button></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h3 className="flex items-center gap-2 font-bold text-slate-900"><CalendarDays className="h-5 w-5 text-brand-600" /> Previsão mensal do DAS</h3>
          <p className="mt-1 text-xs text-slate-500">Estimativa gerencial com base na receita registrada/importada, no RBT12 e no Fator R. Confirme ou ajuste o valor antes de gerar a conta a pagar.</p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {forecasts.map(forecast => {
            const status = forecast.payable?.status === 'paid' ? 'Pago' : forecast.payable ? 'A pagar' : 'Previsto';
            return <article key={forecast.month} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-bold capitalize text-slate-800">{monthLabel(forecast.month)}</p><p className="text-[11px] text-slate-500">Receita: {money(forecast.revenue)}</p></div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : status === 'A pagar' ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>{status}</span>
              </div>
              <div className="mt-3"><CurrencyInput ariaLabel={`DAS previsto ${forecast.month}`} value={forecast.amount} onChange={value => setForecastAmounts(current => ({ ...current, [forecast.month]: value }))} /></div>
              <p className="mt-2 text-[10px] text-slate-500">{forecast.calculated ? `Anexo ${forecast.calculated.anexo} · ${forecast.calculated.faixa}ª faixa · ${forecast.calculated.aliquotaEfetiva.toFixed(2)}%` : 'Aguardando dados do Fator R'}</p>
              <button onClick={() => generatePayable(forecast)} disabled={!forecast.calculated || forecast.amount <= 0 || generatingMonth === forecast.month} className="mt-3 w-full rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40">
                {generatingMonth === forecast.month ? 'Gerando...' : forecast.payable ? 'Atualizar conta a pagar' : 'Gerar conta a pagar'}
              </button>
            </article>;
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Estimativa do período atual</h3>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Alíquota efetiva estimada" value={snapshot.simples ? `${snapshot.simples.aliquotaEfetiva.toFixed(2)}%` : 'Pendente'} />
            <Row label="DAS estimado" value={snapshot.simples ? money(snapshot.simples.impostoMensalEstimado) : 'Pendente'} />
            <Row label="Tributos registrados no ERP" value={money(expenseTaxes)} />
          </div>
          {snapshot.simples && <div className="mt-4 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setShowComposition(value => !value)} className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-brand-700 hover:bg-slate-100" aria-expanded={showComposition}>
              Como esta guia foi calculada?
              <ChevronDown className={`h-4 w-4 transition-transform ${showComposition ? 'rotate-180' : ''}`} />
            </button>
            {showComposition && <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Composição estimada do DAS de {money(snapshot.simples.impostoMensalEstimado)} sobre {money(currentRevenue)} de receita.</p>
              {composition.map(component => <div key={component.key} className="grid grid-cols-[1fr_auto] gap-2 border-b border-slate-100 pb-2 text-xs last:border-0 last:pb-0">
                <span className={component.applicable ? 'text-slate-700' : 'text-slate-400'}>{component.label}{!component.applicable ? ' (não aplicável)' : ''}</span>
                <span className="text-right font-semibold text-slate-800">{money(component.amount)} <small className="font-normal text-slate-500">· {component.effectivePercent.toFixed(3)}% da receita</small></span>
              </div>)}
              <p className="pt-1 text-[10px] text-slate-500">Tabela de repartição do Simples Nacional vigente em 2026. Estimativa gerencial; valide o DAS definitivo no PGDAS-D.</p>
            </div>}
          </div>}
        </section>
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          <h3 className="font-bold text-slate-900">Importante</h3>
          <p className="mt-3">Esta é uma estimativa gerencial. A classificação das receitas, composição legal da folha e apuração definitiva devem ser validadas pela contabilidade antes do PGDAS-D.</p>
          <p className="mt-2 inline-flex items-center gap-2 text-emerald-700"><Check className="h-4 w-4" /> Ajustes manuais ficam identificados e exigem justificativa.</p>
        </section>
      </div>
    </div>
  );
};

const Card = ({ icon: Icon, label, value, detail, tone }: { icon: React.ElementType; label: string; value: string; detail: string; tone: 'blue' | 'violet' | 'amber' | 'emerald' }) => {
  const tones = { blue: 'bg-blue-50 text-blue-700', violet: 'bg-violet-50 text-violet-700', amber: 'bg-amber-50 text-amber-700', emerald: 'bg-emerald-50 text-emerald-700' };
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className={`inline-flex rounded-lg p-2 ${tones[tone]}`}><Icon className="h-4 w-4" /></span><p className="mt-3 text-[11px] font-medium text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value}</p><p className="mt-1 text-[10px] text-slate-500">{detail}</p></article>;
};
const Row = ({ label, value }: { label: string; value: string }) => <div className="flex items-center justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-800">{value}</span></div>;

const CurrencyInput = ({ ariaLabel, value, onChange }: { ariaLabel: string; value: number; onChange: (value: number) => void }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const beginEditing = () => {
    setDraft(Number(value || 0).toFixed(2).replace('.', ','));
    setEditing(true);
  };

  const updateDraft = (text: string) => {
    const cleaned = text.replace(/[^\d,.-]/g, '');
    setDraft(cleaned);
    const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) onChange(Math.max(0, Math.round(parsed * 100) / 100));
  };

  return <input
    aria-label={ariaLabel}
    type="text"
    inputMode="decimal"
    value={editing ? draft : money(value)}
    onFocus={beginEditing}
    onChange={event => updateDraft(event.target.value)}
    onBlur={() => setEditing(false)}
    className="w-full rounded-lg border border-slate-200 px-3 py-2"
  />;
};

export default FiscalOverviewView;
