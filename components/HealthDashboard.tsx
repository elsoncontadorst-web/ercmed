import React, { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileUp,
  Gauge,
  Landmark,
  RefreshCw,
  Tags,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { AppView } from '../types';
import { useUser } from '../contexts/UserContext';
import { getManagerIdForUser } from '../services/accessControlService';
import { getAllAppointments, getAllPatients } from '../services/healthService';
import { getAllBillingRecords, getRepasseStatements } from '../services/repasseService';
import { getTransactions, SavedTransaction } from '../services/userDataService';
import { getContracts } from '../services/contractService';
import { Appointment, Patient } from '../types/health';
import { ConsultationBilling, Contract, RepasseStatement } from '../types/finance';
import { calculateExecutiveSimples } from '../services/simplesExecutiveService';
import { calculateFactorR, FactorRSettings, getFactorRSettings, getRollingMonthKeys, mergeFactorRMonths } from '../services/factorRService';
import { ACTIVE_CLINIC_CHANGED_EVENT, getActiveClinicScopeId } from '../services/activeClinicStorage';
import { getClinics } from '../services/clinicService';
import { recordMatchesClinicScope } from '../services/clinicScopeService';

interface HealthDashboardProps {
  setView?: (view: AppView) => void;
}

interface ExecutiveData {
  appointments: Appointment[];
  patients: Patient[];
  billings: ConsultationBilling[];
  transactions: SavedTransaction[];
  statements: RepasseStatement[];
  contracts: Contract[];
  factorRSettings: FactorRSettings | null;
}

interface ResultCenterRow {
  name: string;
  value: number;
}

interface SavingsProjection {
  startMonthLabel: string;
  reducedExpense: number;
  freeRevenue: number;
  expenseReduction: number;
  reductionPercent: number;
  recommendation: string;
}

const emptyData: ExecutiveData = {
  appointments: [],
  patients: [],
  billings: [],
  transactions: [],
  statements: [],
  contracts: [],
  factorRSettings: null,
};

const currency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Math.abs(value || 0) < 0.005 ? 0 : value || 0);

const percentage = (part: number, total: number) => (total ? (part / total) * 100 : 0);

const dateMonthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const isPlausibleFinancialDate = (date?: string) => {
  const match = String(date || '').match(/^(\d{4})-(\d{2})/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const maximumPlanningYear = new Date().getFullYear() + 1;
  return year >= 2000 && year <= maximumPlanningYear && month >= 1 && month <= 12;
};

const preferredDashboardPeriod = (periods: string[]) => {
  const currentPeriod = dateMonthKey();
  return periods.find(period => period <= currentPeriod) || periods[0] || currentPeriod;
};

const monthKey = () => dateMonthKey();

const previousMonthKey = () => {
  const previous = new Date();
  previous.setDate(1);
  previous.setMonth(previous.getMonth() - 1);
  return dateMonthKey(previous);
};

const timestampMonthKey = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 7);
  if (typeof value.toDate === 'function') return dateMonthKey(value.toDate());
  if (typeof value.seconds === 'number') return dateMonthKey(new Date(value.seconds * 1000));
  return '';
};

const isWithinLastTwelveMonths = (date?: string) => {
  if (!date) return false;
  const now = new Date();
  const compared = new Date(`${date}T00:00:00`);
  const floor = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return compared >= floor && compared <= now;
};

const isInCurrentMonth = (date?: string) => Boolean(date && date.slice(0, 7) === monthKey());

const calculateHealthScore = ({
  cash,
  pending,
  billed,
  result,
  expenses,
}: {
  cash: number;
  pending: number;
  billed: number;
  result: number;
  expenses: number;
}) => {
  let score = 55;
  if (cash >= 0) score += 12;
  if (result >= 0) score += 12;
  if (billed > 0 && pending / billed <= 0.12) score += 9;
  if (billed > 0 && result / billed >= 0.12) score += 7;
  if (expenses > 0 && billed >= expenses) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
};

const calculateSavingsProjection = ({
  expenses,
  taxes,
  repasses,
  result,
}: {
  expenses: number;
  taxes: number;
  repasses: number;
  result: number;
}): SavingsProjection => {
  const totalReduction = Math.max(0, taxes * 0.35 + repasses * 0.18);
  const reducedExpense = Math.max(0, expenses - totalReduction);
  // Receita livre Ã© o resultado efetivamente disponÃ­vel. Uma economia futura
  // projetada nÃ£o pode aumentar o valor atual exibido ao gestor.
  const freeRevenue = Math.max(0, result);
  const reductionPercent = expenses > 0 ? (totalReduction / expenses) * 100 : 0;
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const startMonthLabel = nextMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const recommendation =
    freeRevenue >= 15000
      ? 'Considere investir em expansão comercial, equipe ou novos contratos.'
      : freeRevenue >= 5000
        ? 'Considere investir em marketing, processos e padronização financeira.'
        : 'Considere preservar caixa e reinvestir apenas no que acelera receita e eficiência.';

  return {
    startMonthLabel,
    reducedExpense,
    freeRevenue,
    expenseReduction: totalReduction,
    reductionPercent,
    recommendation,
  };
};

const HealthDashboard: React.FC<HealthDashboardProps> = ({ setView }) => {
  const { user } = useUser();
  const [data, setData] = useState<ExecutiveData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [activeClinicId, setActiveClinicId] = useState<string | null>(getActiveClinicScopeId());
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [periodView, setPeriodView] = useState<'monthly' | 'annual'>('monthly');
  const [showSimplesAllocation, setShowSimplesAllocation] = useState(false);

  const loadDashboard = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const managerId = await getManagerIdForUser(user.uid);
      const ownerId = managerId || user.uid;
      const [appointments, patients, billings, transactions, statements, contracts, factorRSettings, clinics] = await Promise.all([
        getAllAppointments(ownerId),
        getAllPatients(ownerId),
        getAllBillingRecords(ownerId),
        getTransactions(ownerId),
        getRepasseStatements(ownerId),
        getContracts(ownerId),
        getFactorRSettings(ownerId),
        getClinics(ownerId),
      ]);
      const inScope = <T extends { clinicId?: string; unitName?: string }>(items: T[]) =>
        items.filter(item => recordMatchesClinicScope(item, activeClinicId, clinics));
      const scopedData = {
        appointments: inScope(appointments),
        patients: inScope(patients),
        billings: inScope(billings).filter(item => isPlausibleFinancialDate(item.consultationDate)),
        transactions: inScope(transactions).filter(item => isPlausibleFinancialDate(item.date)),
        statements: inScope(statements),
        contracts: inScope(contracts),
        factorRSettings,
      };
      setData(scopedData);
      const periods = Array.from(new Set([
        ...scopedData.transactions.map(item => item.date?.slice(0, 7)),
        ...scopedData.billings.map(item => item.consultationDate?.slice(0, 7)),
      ].filter((value): value is string => Boolean(value && /^\d{4}-\d{2}$/.test(value))))).sort().reverse();
      setSelectedPeriod(current => current && periods.includes(current) ? current : preferredDashboardPeriod(periods));
      setUpdatedAt(new Date());
    } catch (error) {
      console.error('Erro ao carregar o dashboard executivo:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user?.uid, activeClinicId]);

  useEffect(() => {
    const syncScope = () => setActiveClinicId(getActiveClinicScopeId());
    window.addEventListener(ACTIVE_CLINIC_CHANGED_EVENT, syncScope);
    return () => window.removeEventListener(ACTIVE_CLINIC_CHANGED_EVENT, syncScope);
  }, []);

  const availablePeriods = useMemo(() => Array.from(new Set([
    ...data.transactions.map(item => item.date?.slice(0, 7)),
    ...data.billings.map(item => item.consultationDate?.slice(0, 7)),
  ].filter((value): value is string => Boolean(value && /^\d{4}-\d{2}$/.test(value))))).sort().reverse(), [data]);

  const dashboard = useMemo(() => {
    const periodKey = selectedPeriod || dateMonthKey();
    const [periodYear, periodMonth] = periodKey.split('-').map(Number);
    const previousDate = new Date(periodYear, periodMonth - 2, 1);
    const previousKey = dateMonthKey(previousDate);
    const selectedYear = String(periodYear);
    const previousYear = String(periodYear - 1);
    const isWithinAnnualCutoff = (date?: string) => {
      const month = Number(date?.slice(5, 7));
      return Number.isFinite(month) && month >= 1 && month <= periodMonth;
    };
    const isInSelectedPeriod = (date?: string) => Boolean(date && (periodView === 'annual'
      ? date.slice(0, 4) === selectedYear && isWithinAnnualCutoff(date)
      : date.slice(0, 7) === periodKey));
    const isInPreviousPeriod = (date?: string) => Boolean(date && (periodView === 'annual'
      ? date.slice(0, 4) === previousYear && isWithinAnnualCutoff(date)
      : date.slice(0, 7) === previousKey));
    const monthBillings = data.billings.filter(item => isInSelectedPeriod(item.consultationDate));
    const monthTransactions = data.transactions.filter(item => isInSelectedPeriod(item.date));
    const previousBillings = data.billings.filter(item => isInPreviousPeriod(item.consultationDate));
    const previousTransactions = data.transactions.filter(item => isInPreviousPeriod(item.date));
    const incomeTransactions = monthTransactions.filter(item => item.type === 'income');
    const paidIncomeTransactions = incomeTransactions.filter(item => item.status === 'paid');
    const expenseTransactions = monthTransactions.filter(item => item.type === 'expense');
    const paidExpenseTransactions = expenseTransactions.filter(item => item.status === 'paid');
    const income = paidIncomeTransactions.reduce((sum, item) => sum + (item.amount || 0), 0);
    // Resultado gerencial usa competência; fluxo de caixa usa apenas valores efetivamente pagos.
    const expenses = expenseTransactions.reduce((sum, item) => sum + (item.amount || 0), 0);
    const paidExpenses = paidExpenseTransactions.reduce((sum, item) => sum + (item.amount || 0), 0);
    const billedFromBilling = monthBillings.reduce((sum, item) => sum + (item.grossAmount || 0), 0);
    const nonBillingIncome = incomeTransactions
      .filter(item => !item.sourceBillingId && item.sourceType !== 'billing' && item.sourceType !== 'production_entry')
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    const billed = billedFromBilling + nonBillingIncome;
    const laboratoryBilledFromBilling = monthBillings
      .filter(item => item.revenueUnit === 'laboratory')
      .reduce((sum, item) => sum + (item.grossAmount || 0), 0);
    const laboratoryBilledFromTransactions = incomeTransactions
      .filter(item => !item.sourceBillingId && item.sourceType !== 'billing' && item.sourceType !== 'production_entry' && item.revenueUnit === 'laboratory')
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    const laboratoryBilled = laboratoryBilledFromBilling + laboratoryBilledFromTransactions;
    const clinicalBilled = Math.max(0, billed - laboratoryBilled);
    const rbt12FromBilling = data.billings
      .filter(item => isWithinLastTwelveMonths(item.consultationDate))
      .reduce((sum, item) => sum + (item.grossAmount || 0), 0);
    const rbt12FromTransactions = data.transactions
      .filter(item =>
        item.type === 'income' &&
        !item.sourceBillingId &&
        item.sourceType !== 'billing' &&
        item.sourceType !== 'production_entry' &&
        isWithinLastTwelveMonths(item.date)
      )
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    const rbt12 = rbt12FromBilling + rbt12FromTransactions;
    // O RBT12 considera os 12 meses anteriores ao período de apuração selecionado.
    const factorAutomatic = getRollingMonthKeys().map(month => {
      const billingRevenue = data.billings.filter(item => item.consultationDate?.slice(0, 7) === month).reduce((sum, item) => sum + Number(item.grossAmount || 0), 0);
      const otherRevenue = data.transactions.filter(item => item.type === 'income' && item.date?.slice(0, 7) === month && !item.sourceBillingId && item.sourceType !== 'billing' && item.sourceType !== 'production_entry').reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const payroll = data.transactions.filter(item => {
        if (item.type !== 'expense' || item.date?.slice(0, 7) !== month) return false;
        const text = `${item.category || ''} ${item.description || ''}`.toLowerCase();
        return ['folha', 'salário', 'salario', 'pró-labore', 'pro-labore', 'pro labore', 'fgts', 'encargo', 'inss patronal'].some(term => text.includes(term));
      }).reduce((sum, item) => sum + Number(item.amount || 0), 0);
      return { month, revenue: billingRevenue + otherRevenue, payroll };
    });
    const factorR = calculateFactorR(mergeFactorRMonths(factorAutomatic, data.factorRSettings), billed);
    const simples = factorR.simples || calculateExecutiveSimples(billed, rbt12, 'III');
    const getTaxCompetence = (item: { competence?: string; date?: string }) => {
      if (/^\d{4}-\d{2}$/.test(item.competence || '')) return item.competence as string;
      if (!item.date) return '';
      const [year, month] = item.date.slice(0, 7).split('-').map(Number);
      return dateMonthKey(new Date(year, month - 2, 1));
    };
    const taxTransactionsPaidInPeriod = expenseTransactions
      .filter(item => (item.category || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'impostos e tributos')
    const taxExpenseAmount = taxTransactionsPaidInPeriod
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const hasTaxExpense = taxExpenseAmount > 0;
    const hasInferredTaxCompetence = taxTransactionsPaidInPeriod.some(item => !item.competence);
    const taxCompetenceKeys = Array.from(new Set(taxTransactionsPaidInPeriod.map(getTaxCompetence).filter(Boolean)));
    const allocationPeriodKeys = hasTaxExpense ? taxCompetenceKeys : (periodView === 'annual'
      ? Array.from({ length: 12 }, (_, index) => `${selectedYear}-${String(index + 1).padStart(2, '0')}`)
      : [periodKey]);
    const allocationBillings = data.billings.filter(item => allocationPeriodKeys.includes(item.consultationDate?.slice(0, 7) || ''));
    const allocationIncomeTransactions = data.transactions.filter(item =>
      item.type === 'income' && allocationPeriodKeys.includes(item.date?.slice(0, 7) || '')
    );
    const allocationBilled = allocationBillings.reduce((sum, item) => sum + Number(item.grossAmount || 0), 0)
      + allocationIncomeTransactions
        .filter(item => !item.sourceBillingId && item.sourceType !== 'billing' && item.sourceType !== 'production_entry')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const taxForAllocation = hasTaxExpense ? taxExpenseAmount : (simples.impostoMensalEstimado || 0);
    const displayedEffectiveRate = hasTaxExpense && allocationBilled > 0
      ? (taxExpenseAmount / allocationBilled) * 100
      : simples.aliquotaEfetiva;
    const professionalRevenue = new Map<string, { name: string; revenue: number; unassigned: boolean }>();
    const addProfessionalRevenue = (id: string | undefined, name: string | undefined, amount: number) => {
      const normalizedName = name?.trim();
      const key = id || normalizedName || '__unassigned__';
      const current = professionalRevenue.get(key);
      professionalRevenue.set(key, {
        name: normalizedName || 'Profissional não informado',
        revenue: (current?.revenue || 0) + Number(amount || 0),
        unassigned: !id && !normalizedName,
      });
    };
    allocationBillings.forEach(item => addProfessionalRevenue(item.professionalId, item.professionalName, item.grossAmount));
    allocationIncomeTransactions
      .filter(item => !item.sourceBillingId && item.sourceType !== 'billing' && item.sourceType !== 'production_entry')
      .forEach(item => addProfessionalRevenue(item.professionalId, item.professionalName, item.amount));
    const estimatedTaxCents = Math.max(0, Math.round(taxForAllocation * 100));
    let allocatedTaxCents = 0;
    const allocationBase = Array.from(professionalRevenue.entries())
      .map(([id, item]) => ({ id, ...item }))
      .filter(item => item.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
    const simplesAllocation = allocationBase.map((item, index) => {
      const share = allocationBilled > 0 ? item.revenue / allocationBilled : 0;
      const taxCents = index === allocationBase.length - 1
        ? estimatedTaxCents - allocatedTaxCents
        : Math.round(estimatedTaxCents * share);
      allocatedTaxCents += taxCents;
      return { ...item, share, taxAmount: taxCents / 100 };
    });
    const received = income;
    const pending = monthBillings.filter(item => item.paymentStatus === 'pending').reduce((sum, item) => sum + (item.grossAmount || 0), 0);
    const recordedTaxes = monthBillings.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    // Enquanto não houver apuração fiscal fechada, usa a estimativa do Simples para não
    // exibir lucro/receita livre como se o imposto fosse zero.
    const taxes = hasTaxExpense ? recordedTaxes : Math.max(recordedTaxes, simples.impostoMensalEstimado || 0);
    const provisionedRepasses = monthBillings
      .filter(item => item.paymentStatus !== 'cancelled')
      .reduce((sum, item) => sum + (item.repasseAmount || 0), 0);
    const statementRepasses = data.statements
      .filter(item => item.status !== 'paid' && isInSelectedPeriod(item.periodEnd))
      .reduce((sum, item) => sum + (item.netAmount || 0), 0);
    const repasses = provisionedRepasses > 0 ? provisionedRepasses : statementRepasses;
    const appointments = data.appointments.filter(item => isInSelectedPeriod(item.date));
    const completedAppointments = appointments.filter(item => item.status === 'completed').length;
    const completed = completedAppointments > 0 ? completedAppointments : monthBillings.filter(item => item.paymentStatus !== 'cancelled').length;
    const cancelled = appointments.filter(item => item.status === 'cancelled').length;
    const result = received - expenses - taxes - repasses;
    const ebitda = billed - expenses - repasses;
    const operationalRevenue = billed;
    const grossProfit = billed - expenses;
    const cash = income - paidExpenses;
    const openingBalance = data.transactions
      .filter(item => item.date && (periodView === 'annual' ? item.date.slice(0, 4) < selectedYear : item.date.slice(0, 7) < periodKey) && item.status === 'paid')
      .reduce((sum, item) => sum + (item.type === 'income' ? item.amount || 0 : -(item.amount || 0)), 0);
    const previousIncome = previousTransactions.filter(item => item.type === 'income' && item.status === 'paid').reduce((sum, item) => sum + (item.amount || 0), 0);
    const previousExpenses = previousTransactions.filter(item => item.type === 'expense' && item.status === 'paid').reduce((sum, item) => sum + (item.amount || 0), 0);
    const previousBilledFromBilling = previousBillings.reduce((sum, item) => sum + (item.grossAmount || 0), 0);
    const previousNonBillingIncome = previousTransactions
      .filter(item => item.type === 'income' && !item.sourceBillingId && item.sourceType !== 'billing' && item.sourceType !== 'production_entry')
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    const previousBilled = previousBilledFromBilling + previousNonBillingIncome;
    const previousReceived = previousIncome;
    const previousTaxes = previousBillings.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    const previousProvisionedRepasses = previousBillings
      .filter(item => item.paymentStatus !== 'cancelled')
      .reduce((sum, item) => sum + (item.repasseAmount || 0), 0);
    const previousStatementRepasses = data.statements
      .filter(item => isInPreviousPeriod(item.periodEnd))
      .reduce((sum, item) => sum + (item.netAmount || 0), 0);
    const previousRepasses = previousProvisionedRepasses > 0 ? previousProvisionedRepasses : previousStatementRepasses;
    const previousResult = previousReceived - previousExpenses - previousTaxes - previousRepasses;
    const previousEbitda = previousBilled - previousExpenses - previousRepasses;
    const currentPatientKeys = new Set(
      appointments
        .filter(item => item.status === 'completed')
        .map(item => item.patientId || item.patientName)
        .filter(Boolean)
    );
    const priorPatientKeys = new Set(
      data.appointments
        .filter(item => item.status === 'completed' && (periodView === 'annual' ? item.date?.slice(0, 4) < selectedYear : item.date?.slice(0, 7) < periodKey))
        .map(item => item.patientId || item.patientName)
        .filter(Boolean)
    );
    const returningPatients = Array.from(currentPatientKeys).filter(key => priorPatientKeys.has(key)).length;
    const newPatients = data.patients.filter(item => {
      const createdPeriod = timestampMonthKey(item.createdAt);
      return periodView === 'annual' ? createdPeriod.slice(0, 4) === selectedYear : createdPeriod === periodKey;
    }).length;
    const activeProfessionalCount = new Set(
      appointments
        .filter(item => item.status === 'completed')
        .map(item => item.professionalId || item.professionalName)
        .filter(Boolean)
    ).size;
    const chartPeriods = periodView === 'annual'
      ? [1, 4, 7, 10, 12].map(month => ({ label: new Date(periodYear, month - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), prefix: `${selectedYear}-${String(month).padStart(2, '0')}` }))
      : [1, 8, 15, 22, 29].map(day => ({ label: String(day).padStart(2, '0'), prefix: `${periodKey}-${String(day).padStart(2, '0')}` }));
    const daily = chartPeriods.map(({ label, prefix }) => {
      const billedDayFromBilling = monthBillings.filter(item => item.consultationDate?.startsWith(prefix)).reduce((sum, item) => sum + (item.grossAmount || 0), 0);
      const billedDayFromTransactions = monthTransactions
        .filter(item => item.type === 'income' && !item.sourceBillingId && item.sourceType !== 'billing' && item.sourceType !== 'production_entry' && item.date?.startsWith(prefix))
        .reduce((sum, item) => sum + (item.amount || 0), 0);
      const expenseDay = monthTransactions.filter(item => item.type === 'expense' && item.status === 'paid' && item.date?.startsWith(prefix)).reduce((sum, item) => sum + (item.amount || 0), 0);
      return { label, income: billedDayFromBilling + billedDayFromTransactions, expenses: expenseDay };
    });

    const resultCentersMap = new Map<string, number>();
    paidIncomeTransactions.forEach(item => {
      const key = item.resultCenter || item.category || 'Operação';
      resultCentersMap.set(key, (resultCentersMap.get(key) || 0) + (item.amount || 0));
    });

    const resultCenters = Array.from(resultCentersMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      billed,
      clinicalBilled,
      laboratoryBilled,
      hasLaboratoryRevenue: data.transactions.some(item => item.type === 'income' && item.revenueUnit === 'laboratory') || data.billings.some(item => item.revenueUnit === 'laboratory'),
      rbt12,
      simples,
      hasTaxExpense,
      hasInferredTaxCompetence,
      taxCompetenceKeys,
      allocationBilled,
      taxForAllocation,
      displayedEffectiveRate,
      simplesAllocation,
      factorR,
      received,
      pending,
      expenses,
      taxes,
      repasses,
      income,
      result,
      ebitda,
      resultCenters,
      appointments,
      completed,
      cancelled,
      daily,
      cash,
      openingBalance,
      previous: {
        operationalRevenue: previousBilled,
        expenses: previousExpenses,
        grossProfit: previousBilled - previousExpenses,
        ebitda: previousEbitda,
        result: previousResult,
      },
      newPatients,
      returnRate: percentage(returningPatients, currentPatientKeys.size),
      activeProfessionalCount,
      activePatients: data.patients.filter(item => item.active !== false).length,
      cancellation: percentage(cancelled, appointments.length),
      operationalRevenue,
      grossProfit,
      healthScore: calculateHealthScore({ cash, pending, billed, result, expenses }),
      savingsProjection: calculateSavingsProjection({ expenses, taxes, repasses, result }),
    };
  }, [data, selectedPeriod, periodView]);

  const alerts = [
    dashboard.pending > 0 ? { title: 'Recebimentos pendentes', detail: `${currency(dashboard.pending)} em aberto`, view: AppView.BILLING_MANAGEMENT } : null,
    dashboard.repasses > 0 ? { title: 'Repasses médicos', detail: `${currency(dashboard.repasses)} aguardam conferência`, view: AppView.REPASSE_DASHBOARD } : null,
    dashboard.cancellation >= 15 ? { title: 'Cancelamentos acima da meta', detail: `${dashboard.cancellation.toFixed(0)}% dos atendimentos`, view: AppView.APPOINTMENTS } : null,
    dashboard.taxes > 0 ? { title: 'Impostos provisionados', detail: `${currency(dashboard.taxes)} no período`, view: AppView.FINANCIAL_CONTROL } : null,
  ].filter(Boolean) as Array<{ title: string; detail: string; view: AppView }>;

  const modules = [
    ['Agenda operacional', 'Agenda, encaixes e rotina', Calendar, AppView.APPOINTMENTS],
    ['Portal de Produção Profissional', 'Produção e lançamentos', ClipboardList, AppView.PRODUCTION_ENTRY],
    ['Serviços e Preços', 'Catálogo, regras e tabelas', Tags, AppView.SERVICE_CATALOG],
    ['Financeiro', 'Contas, caixa e bancos', Wallet, AppView.FINANCIAL_CONTROL],
    ['Faturamento', 'Convênios, guias e recebimentos', CircleDollarSign, AppView.BILLING_MANAGEMENT],
    ['Repasses Médicos', 'Produção e pagamentos', Banknote, AppView.REPASSE_DASHBOARD],
    ['Controladoria', 'DRE, margem e EBITDA', BarChart3, AppView.CASH_FLOW],
    ['Documentos Fiscais', 'XML, PDF e classificação', FileUp, AppView.FISCAL_IMPORT],
    ['Patrimônio', 'Ativos e depreciação', Landmark, AppView.ASSETS],
    ['Contábil e Fiscal', 'Impostos e visão gerencial', Gauge, AppView.ACCOUNTANT_MODULE],
  ] as const;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <RefreshCw className="h-7 w-7 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <main className="h-full overflow-y-auto bg-slate-50 p-3 md:p-4">
      <div className="mx-auto w-full max-w-[1680px] space-y-3 pb-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard Executivo</h1>
            <p className="text-sm text-slate-500">Visão geral da gestão da sua empresa de saúde</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" aria-label="Tipo de visão do dashboard">
              <button
                type="button"
                onClick={() => setPeriodView('monthly')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${periodView === 'monthly' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setPeriodView('annual')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${periodView === 'annual' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Anual
              </button>
            </div>
            <select
              value={periodView === 'annual' ? (selectedPeriod || dateMonthKey()).slice(0, 4) : selectedPeriod}
              onChange={event => {
                if (periodView === 'annual') {
                  const periodForYear = availablePeriods.find(period => period.startsWith(`${event.target.value}-`));
                  setSelectedPeriod(periodForYear || `${event.target.value}-01`);
                } else {
                  setSelectedPeriod(event.target.value);
                }
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-brand-500"
              aria-label="Período do dashboard"
            >
              {(periodView === 'annual'
                ? availablePeriods.filter((period, index, periods) => periods.findIndex(item => item.slice(0, 4) === period.slice(0, 4)) === index)
                : availablePeriods
              ).map(period => {
                const [year, month] = period.split('-').map(Number);
                const label = periodView === 'annual'
                  ? String(year)
                  : new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                return <option key={period} value={periodView === 'annual' ? String(year) : period}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>;
              })}
              {availablePeriods.length === 0 && <option value={selectedPeriod || dateMonthKey()}>Este mês</option>}
            </select>
            <button onClick={loadDashboard} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          <Metric label="Receita Total" value={currency(dashboard.received)} detail="Recebido no período" tone="emerald" values={dashboard.daily.map(item => item.income)} />
          <Metric label="Lucro Líquido" value={currency(dashboard.result)} detail="Após despesas, impostos e repasses" tone={dashboard.result >= 0 ? 'teal' : 'rose'} values={dashboard.daily.map(item => item.income - item.expenses)} />
          <Metric label="Margem Líquida" value={`${percentage(dashboard.result, dashboard.received || dashboard.billed).toFixed(1)}%`} detail="Resultado sobre receita" tone="green" values={dashboard.daily.map(item => item.income - item.expenses)} />
          <Metric label="Faturamento Clínico" value={currency(dashboard.clinicalBilled)} detail="Produzido no período" tone="teal" values={dashboard.daily.map(item => item.income)} />
          {dashboard.hasLaboratoryRevenue && <Metric label="Faturamento Laboratorial" value={currency(dashboard.laboratoryBilled)} detail="Produzido no período" tone="blue" values={dashboard.daily.map(item => item.income)} />}
          {!dashboard.hasLaboratoryRevenue && <Metric label="Imposto estimado da competência" value={dashboard.factorR.annex ? currency(dashboard.simples.impostoMensalEstimado) : 'Pendente'} detail={`Estimativa sobre o faturamento ${periodView === 'annual' ? 'do ano' : 'do mês'}`} tone="orange" values={dashboard.daily.map(item => item.income * (dashboard.simples.aliquotaEfetiva || 0) / 100)} />}
          <Metric label="EBITDA" value={currency(dashboard.ebitda)} detail="Resultado operacional" tone="blue" values={dashboard.daily.map(item => item.income)} />
          <Metric label="Saldo do Período" value={currency(dashboard.cash)} detail="Entradas menos saídas registradas" tone="violet" values={dashboard.daily.map(item => item.income - item.expenses)} />
          <Metric label="Inadimplência" value={`${percentage(dashboard.pending, dashboard.billed).toFixed(1)}%`} detail="Títulos em aberto" tone="orange" values={dashboard.daily.map(item => item.expenses)} />
        </section>

        <section className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          <TaxCard label="RBT12" value={currency(dashboard.factorR.revenue12 || dashboard.rbt12)} detail="Receita acumulada dos últimos 12 meses" />
          <TaxCard label="Fator R" value={dashboard.factorR.factorR === null ? 'Pendente' : `${(dashboard.factorR.factorR * 100).toFixed(2)}%`} detail={dashboard.factorR.annex ? `Anexo ${dashboard.factorR.annex} · ${dashboard.simples.faixa}ª faixa` : 'Anexo pendente de validação'} />
          <TaxCard label="Alíquota do imposto lançado" value={dashboard.hasTaxExpense && dashboard.allocationBilled > 0 ? `${dashboard.displayedEffectiveRate.toFixed(2)}%` : 'Aguardando'} detail={dashboard.hasTaxExpense ? (dashboard.hasInferredTaxCompetence ? 'Comparada ao faturamento do mês anterior' : `Comparada ao faturamento da competência ${dashboard.taxCompetenceKeys.join(', ')}`) : 'Nenhum imposto lançado para pagamento no mês'} />
          <TaxCard
            label={`Imposto lançado no ${periodView === 'annual' ? 'ano' : 'mês'}`}
            value={dashboard.hasTaxExpense ? currency(dashboard.taxForAllocation) : currency(0)}
            detail={dashboard.hasTaxExpense ? (dashboard.hasInferredTaxCompetence ? 'Pagamento referente ao mês anterior; confirme a competência' : `Referente à competência ${dashboard.taxCompetenceKeys.join(', ')}`) : 'Nenhum lançamento em Impostos e Tributos'}
            action={dashboard.hasTaxExpense ? (showSimplesAllocation ? 'Ocultar rateio' : 'Ver rateio') : undefined}
            onAction={() => setShowSimplesAllocation(value => !value)}
          />
        </section>

        {showSimplesAllocation && dashboard.hasTaxExpense && (
          <SimplesAllocationPanel
            rows={dashboard.simplesAllocation}
            totalRevenue={dashboard.allocationBilled}
            totalTax={dashboard.taxForAllocation}
            onAssign={() => setView?.(AppView.FINANCIAL_CONTROL)}
          />
        )}

        <section className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <ChartCard title="Receitas x Despesas" className="xl:col-span-4">
            <MiniChart data={dashboard.daily} />
          </ChartCard>
          <ChartCard title="Resultado por Centro de Resultado" className="xl:col-span-4">
            <ResultBreakdown rows={dashboard.resultCenters} />
          </ChartCard>
          <ChartCard title="Fluxo de Caixa" className="xl:col-span-2">
            <CashFlow income={dashboard.income} expenses={dashboard.expenses} openingBalance={dashboard.openingBalance} />
          </ChartCard>
          <aside className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm xl:col-span-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900">Alertas e Pendências</h2>
            </div>
            <div className="mt-2 space-y-1">
              {alerts.length ? alerts.slice(0, 4).map(alert => (
                <button key={alert.title} onClick={() => setView?.(alert.view)} className="w-full rounded-lg p-2 text-left hover:bg-slate-50">
                  <span className="block text-xs font-semibold text-slate-800">{alert.title}</span>
                  <span className="block text-[11px] text-slate-500">{alert.detail} · Ver detalhes</span>
                </button>
              )) : (
                <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                  Sem pendências relevantes.
                </p>
              )}
            </div>
          </aside>
        </section>

        <section className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <ChartCard title="Desempenho Financeiro" action="Ver relatório completo" onAction={() => setView?.(AppView.CASH_FLOW)} className="xl:col-span-4">
            <FinancialPerformanceTable
              current={{ operationalRevenue: dashboard.operationalRevenue, expenses: dashboard.expenses, grossProfit: dashboard.grossProfit, ebitda: dashboard.ebitda, result: dashboard.result }}
              previous={dashboard.previous}
              currentLabel={periodView === 'annual' ? `${(selectedPeriod || dateMonthKey()).slice(0, 4)} até o mês` : 'Valor atual'}
              previousLabel={periodView === 'annual' ? `${Number((selectedPeriod || dateMonthKey()).slice(0, 4)) - 1} até o mesmo mês` : 'Mês anterior'}
            />
          </ChartCard>
          <ChartCard title="Indicadores Empresariais" className="xl:col-span-4">
            <Indicators received={dashboard.received} billed={dashboard.billed} appointments={dashboard.appointments.length} expenses={dashboard.expenses} completed={dashboard.completed} newPatients={dashboard.newPatients} returnRate={dashboard.returnRate} activeProfessionalCount={dashboard.activeProfessionalCount} />
          </ChartCard>
          <ChartCard title="Saúde Financeira" action="Ver análise completa" onAction={() => setView?.(AppView.FINANCIAL_CONTROL)} className="xl:col-span-4">
            <FinancialHealthCard score={dashboard.healthScore} cash={dashboard.cash} pending={dashboard.pending} billed={dashboard.billed} result={dashboard.result} />
          </ChartCard>
        </section>

        <section className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <ChartCard title="Projeção de Redução de Despesa" action="Ver financeiro" onAction={() => setView?.(AppView.FINANCIAL_CONTROL)} className="xl:col-span-12">
            <SavingsProjectionCard projection={dashboard.savingsProjection} />
          </ChartCard>
        </section>

        <section className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm xl:col-span-9">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Módulos Principais</h2>
                <p className="text-xs text-slate-500">Acesso rápido aos recursos centrais do novo ERP de gestão.</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {modules.map(([title, description, Icon, view]) => (
                <button key={title} onClick={() => setView?.(view)} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2.5 text-left hover:border-brand-200 hover:bg-brand-50/40">
                  <span className="rounded-md bg-brand-50 p-1.5 text-brand-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-xs text-slate-800">{title}</strong>
                    <small className="block truncate text-[10px] text-slate-500">{description}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <aside className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm xl:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Documentos Fiscais</h2>
                <p className="text-[11px] text-slate-500">NF-e, NFS-e e CT-e</p>
              </div>
              <FileUp className="h-4 w-4 text-brand-600" />
            </div>
            <p className="mt-2 text-xs text-slate-600">Importe documentos fiscais para classificar despesas, contas a pagar, estoque e patrimônio.</p>
            <button onClick={() => setView?.(AppView.FISCAL_IMPORT)} className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
              Importar XML ou PDF
            </button>
          </aside>
        </section>

        {updatedAt && (
          <p className="text-right text-[10px] text-slate-400">
            Dados atualizados às {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </main>
  );
};

const Metric = ({ label, value, detail, tone, values }: { label: string; value: string; detail: string; tone: string; values: number[] }) => (
  <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex items-start justify-between">
      <span className={`rounded-lg p-2 ${tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' : ''}${tone === 'teal' ? ' bg-teal-50 text-teal-600' : ''}${tone === 'green' ? ' bg-green-50 text-green-600' : ''}${tone === 'blue' ? ' bg-blue-50 text-blue-600' : ''}${tone === 'violet' ? ' bg-violet-50 text-violet-600' : ''}${tone === 'orange' ? ' bg-orange-50 text-orange-600' : ''}${tone === 'rose' ? ' bg-rose-50 text-rose-600' : ''}`}>
        <TrendingUp className="h-4 w-4" />
      </span>
      <Sparkline values={values} tone={tone} />
    </div>
    <p className="mt-2 text-[11px] font-medium text-slate-500">{label}</p>
    <p className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">{value}</p>
    <p className="mt-1 truncate text-[10px] text-slate-500">{detail}</p>
  </article>
);

const Sparkline = ({ values, tone }: { values: number[]; tone: string }) => {
  const maximum = Math.max(...values, 1);
  const points = values.map((value, index) => `${index * 25},${28 - (Math.max(value, 0) / maximum) * 20}`).join(' ');
  const color =
    tone === 'emerald' ? 'text-emerald-500' :
    tone === 'teal' ? 'text-teal-500' :
    tone === 'green' ? 'text-green-500' :
    tone === 'blue' ? 'text-blue-500' :
    tone === 'violet' ? 'text-violet-500' :
    tone === 'orange' ? 'text-orange-500' :
    'text-rose-500';

  return (
    <svg viewBox="0 0 100 30" className={`h-7 w-20 ${color}`}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const ChartCard = ({ title, children, className = '', action, onAction }: { title: string; children: React.ReactNode; className?: string; action?: string; onAction?: () => void }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {action && <button onClick={onAction} className="text-[11px] font-semibold text-brand-700">{action}</button>}
    </div>
    <div className="mt-3">{children}</div>
  </section>
);

const MiniChart = ({ data }: { data: Array<{ label: string; income: number; expenses: number }> }) => {
  const maximum = Math.max(...data.flatMap(item => [item.income, item.expenses]), 1);
  return (
    <>
      <div className="flex gap-3 text-[10px] text-slate-500">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Receitas</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500" />Despesas</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500" />Resultado</span>
      </div>
      <div className="mt-3 flex h-28 items-end justify-between gap-2">
        {data.map(item => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-20 items-end gap-1">
              <i className="w-2 rounded-t bg-emerald-500" style={{ height: `${Math.max(3, (item.income / maximum) * 80)}px` }} />
              <i className="w-2 rounded-t bg-rose-400" style={{ height: `${Math.max(3, (item.expenses / maximum) * 80)}px` }} />
            </div>
            <small className="text-[9px] text-slate-400">{item.label}</small>
          </div>
        ))}
      </div>
    </>
  );
};

const ResultBreakdown = ({ rows }: { rows: ResultCenterRow[] }) => {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const colors = ['bg-blue-500', 'bg-teal-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-24 w-24 place-items-center rounded-full border-[10px] border-brand-100 text-center">
        <span className="text-[10px] text-slate-500">
          Total
          <br />
          <b className="text-xs text-slate-900">{currency(total)}</b>
        </span>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {rows.length ? rows.map((row, index) => (
          <div key={row.name} className="flex items-center justify-between gap-2 text-[10px]">
            <span className="truncate text-slate-500">
              <i className={`mr-1 inline-block h-2 w-2 rounded-full ${colors[index] || colors[0]}`} />
              {row.name}
            </span>
            <b className="text-slate-700">{percentage(row.value, total).toFixed(0)}%</b>
          </div>
        )) : (
          <p className="text-xs text-slate-500">Classifique os lançamentos por centro de resultado para acompanhar esta visão.</p>
        )}
      </div>
    </div>
  );
};

const CashFlow = ({ income, expenses, openingBalance }: { income: number; expenses: number; openingBalance: number }) => {
  const closingBalance = openingBalance + income - expenses;
  return (
  <div className="space-y-2 text-xs">
    <Row label="Saldo Inicial" value={openingBalance} tone="text-slate-700" />
    <Row label="Entradas" value={income} tone="text-emerald-700" />
    <Row label="Saídas" value={-expenses} tone="text-rose-600" />
    <div className="border-t pt-2">
      <Row label="Saldo Final" value={closingBalance} tone={closingBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'} strong />
    </div>
    <div className="flex h-8 items-end gap-1 pt-1">
      {[openingBalance, income, -expenses, income - expenses, closingBalance].map((value, index) => (
        <i key={index} className={value >= 0 ? 'flex-1 rounded-t bg-emerald-500' : 'flex-1 rounded-t bg-rose-400'} style={{ height: `${Math.max(3, Math.min(30, Math.abs(value) / 1000 || 3))}px` }} />
      ))}
    </div>
  </div>
  );
};

const Row = ({ label, value, tone, strong }: { label: string; value: number; tone: string; strong?: boolean }) => (
  <div className={`flex justify-between ${strong ? 'font-bold' : ''}`}>
    <span className="text-slate-500">{label}</span>
    <span className={tone}>{currency(value)}</span>
  </div>
);

interface FinancialPeriodSummary {
  operationalRevenue: number;
  expenses: number;
  grossProfit: number;
  ebitda: number;
  result: number;
}

const FinancialPerformanceTable = ({ current, previous, currentLabel, previousLabel }: {
  current: FinancialPeriodSummary;
  previous: FinancialPeriodSummary;
  currentLabel: string;
  previousLabel: string;
}) => {
  const rows = [
    { label: 'Receita Operacional', current: current.operationalRevenue, previous: previous.operationalRevenue },
    { label: 'Custos e Despesas', current: current.expenses, previous: previous.expenses },
    { label: 'Lucro Bruto', current: current.grossProfit, previous: previous.grossProfit },
    { label: 'EBITDA', current: current.ebitda, previous: previous.ebitda },
    { label: 'Lucro Líquido', current: current.result, previous: previous.result },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[11px]">
        <thead className="border-b text-slate-400">
          <tr>
            <th className="pb-2 font-medium">Indicador</th>
            <th className="pb-2 font-medium">{currentLabel}</th>
            <th className="pb-2 font-medium">{previousLabel}</th>
            <th className="pb-2 font-medium">Variação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const hasComparisonBase = Math.abs(row.previous) >= 0.01;
            const variation = hasComparisonBase ? ((row.current - row.previous) / Math.abs(row.previous)) * 100 : 0;
            const positive = variation >= 0;
            return (
              <tr key={row.label} className="border-b border-slate-50">
                <td className="py-2 font-semibold text-slate-700">{row.label}</td>
                <td className="py-2 text-slate-600">{currency(row.current)}</td>
                <td className="py-2 text-slate-500">{currency(row.previous)}</td>
                <td className={`py-2 font-semibold ${!hasComparisonBase ? 'text-slate-400' : positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {!hasComparisonBase ? 'Sem base' : `${positive ? '+' : ''}${variation.toFixed(1)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const Indicators = ({ received, billed, appointments, expenses, completed, newPatients, returnRate, activeProfessionalCount }: { received: number; billed: number; appointments: number; expenses: number; completed: number; newPatients: number; returnRate: number; activeProfessionalCount: number }) => (
  <div className="space-y-2">
    {[
      ['Ticket Médio', currency(appointments ? billed / appointments : 0), true],
      ['Atendimentos Realizados', String(completed), true],
      ['Novos Pacientes', String(newPatients), true],
      ['Retorno', `${returnRate.toFixed(0)}%`, true],
      ['Custo por Atendimento', currency(appointments ? expenses / appointments : 0), false],
      ['Receita por Profissional', currency(activeProfessionalCount ? received / activeProfessionalCount : 0), true],
    ].map(([label, value, positive]) => (
      <div key={String(label)} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={positive ? 'font-semibold text-emerald-700' : 'font-semibold text-slate-700'}>{value}</span>
      </div>
    ))}
  </div>
);

const FinancialHealthCard = ({ score, cash, pending, billed, result }: { score: number; cash: number; pending: number; billed: number; result: number }) => {
  const circumference = 219.91;
  const maxArc = circumference / 1.45;
  const offset = maxArc - (Math.max(0, Math.min(100, score)) / 100) * maxArc;
  const statuses = [
    ['Liquidez', cash >= 0 ? 'Boa' : 'Atenção', cash >= 0],
    ['Endividamento', pending <= billed * 0.25 ? 'Controlado' : 'Atenção', pending <= billed * 0.25],
    ['Rentabilidade', result >= 0 ? 'Boa' : 'Atenção', result >= 0],
    ['Margem', result >= billed * 0.1 ? 'Boa' : 'Atenção', result >= billed * 0.1],
    ['Inadimplência', pending <= billed * 0.12 ? 'Boa' : 'Atenção', pending <= billed * 0.12],
  ] as const;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-[126deg]">
            <circle cx="50" cy="50" r="35" fill="none" stroke="#dbeafe" strokeWidth="10" strokeDasharray={`${maxArc} ${circumference}`} strokeLinecap="round" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="#10b981" strokeWidth="10" strokeDasharray={`${maxArc} ${circumference}`} strokeDashoffset={offset} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-bold text-slate-900">{score}/100</span>
            <span className="text-xs font-semibold text-emerald-600">{score >= 75 ? 'Boa' : score >= 55 ? 'Estável' : 'Atenção'}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2 text-[11px]">
          {statuses.map(([label, status, good]) => (
            <div key={label} className="flex min-w-0 items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 whitespace-nowrap text-slate-500">
                <i className={`inline-block h-2 w-2 rounded-full ${good ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {label}
              </span>
              <b className={`shrink-0 whitespace-nowrap ${good ? 'text-emerald-600' : 'text-rose-600'}`}>{status}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TaxCard = ({ label, value, detail, action, onAction }: { label: string; value: string; detail: string; action?: string; onAction?: () => void }) => (
  <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      {action && <button type="button" onClick={onAction} className="text-[10px] font-bold text-brand-700 hover:text-brand-800">{action}</button>}
    </div>
    <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    <p className="mt-1 text-[10px] text-slate-500">{detail}</p>
  </article>
);

interface SimplesAllocationRow {
  id: string;
  name: string;
  revenue: number;
  share: number;
  taxAmount: number;
  unassigned: boolean;
}

const detailedCurrency = (value: number) => value.toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const SimplesAllocationPanel = ({ rows, totalRevenue, totalTax, onAssign }: { rows: SimplesAllocationRow[]; totalRevenue: number; totalTax: number; onAssign: () => void }) => {
  const hasUnassigned = rows.some(row => row.unassigned && row.revenue > 0);
  return (
    <section className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Rateio estimado do Simples Nacional</h2>
          <p className="mt-1 text-xs text-slate-500">Distribuição proporcional ao faturamento atribuído a cada sócio ou profissional no período.</p>
        </div>
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-right">
          <p className="text-[10px] font-semibold uppercase text-blue-600">Total estimado do DAS</p>
          <p className="text-base font-bold text-blue-900">{detailedCurrency(totalTax)}</p>
        </div>
      </div>
      {rows.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="pb-2 font-semibold">Sócio / profissional</th>
                <th className="pb-2 text-right font-semibold">Faturamento</th>
                <th className="pb-2 text-right font-semibold">Participação</th>
                <th className="pb-2 text-right font-semibold">Simples atribuído</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className={`border-b border-slate-100 ${row.unassigned ? 'bg-amber-50' : ''}`}>
                  <td className="py-3 font-semibold text-slate-800">{row.name}</td>
                  <td className="py-3 text-right text-slate-600">{detailedCurrency(row.revenue)}</td>
                  <td className="py-3 text-right text-slate-600">{(row.share * 100).toFixed(2)}%</td>
                  <td className="py-3 text-right font-bold text-blue-800">{detailedCurrency(row.taxAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-bold text-slate-900">
              <tr>
                <td className="pt-3">Total</td>
                <td className="pt-3 text-right">{detailedCurrency(totalRevenue)}</td>
                <td className="pt-3 text-right">{totalRevenue > 0 ? '100,00%' : '0,00%'}</td>
                <td className="pt-3 text-right text-blue-900">{detailedCurrency(totalTax)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Não há faturamento no período para realizar o rateio.</p>}
      {hasUnassigned && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-amber-900">Há receitas sem responsável. Vincule as notas para distribuir corretamente o imposto.</p>
          <button type="button" onClick={onAssign} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700">Vincular notas</button>
        </div>
      )}
      <p className="mt-3 text-[10px] text-slate-400">Rateio gerencial baseado na estimativa do sistema. O valor oficial deve ser conferido com a apuração e o DAS emitido.</p>
    </section>
  );
};

const SavingsProjectionCard = ({ projection }: { projection: SavingsProjection }) => (
  <div className="grid gap-3 md:grid-cols-4">
    <div className="rounded-xl bg-emerald-50 p-4">
      <p className="text-xs font-semibold text-emerald-700">A partir de</p>
      <p className="mt-1 text-lg font-bold capitalize text-slate-900">{projection.startMonthLabel}</p>
      <p className="mt-1 text-xs text-slate-600">Estimativa de melhora com despesas, repasses e provisões melhor organizados.</p>
    </div>
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-600">Despesa mensal projetada</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{currency(projection.reducedExpense)}</p>
      <p className="mt-1 text-xs text-rose-600">Redução estimada de {currency(projection.expenseReduction)}</p>
    </div>
    <div className="rounded-xl bg-blue-50 p-4">
      <p className="text-xs font-semibold text-blue-700">Receita livre ao mês</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{currency(projection.freeRevenue)}</p>
      <p className="mt-1 text-xs text-slate-600">Isso representa {projection.reductionPercent.toFixed(1)}% de redução de despesa.</p>
    </div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-semibold text-amber-700">Recomendação executiva</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{projection.recommendation}</p>
    </div>
  </div>
);

export default HealthDashboard;
