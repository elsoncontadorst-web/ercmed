import { getClinics } from './clinicService';
import { getTransactions, SavedTransaction } from './userDataService';
import { AccountantLink } from '../types/accountant';

export type AccountantCompanyMetric = {
  link: AccountantLink;
  name: string;
  ownerId: string;
  regime: string;
  monthRevenue: number;
  annualRevenue: number;
  rbt12: number;
  previousYearToDate: number;
  growth: number | null;
  projection: number;
  limit: number;
  limitPercent: number;
  size: 'ME' | 'EPP';
  risk: 'regular' | 'attention' | 'critical' | 'exceeded';
  pendingObligations: number;
  overdueExpenses: number;
  fiscalRevenue: number;
  financialRevenue: number;
  monthly: { key: string; label: string; value: number }[];
};

const moneyDate = (item: SavedTransaction) => new Date(`${(item.competence ? `${item.competence}-01` : item.date || item.dueDate || '1970-01-01').slice(0, 10)}T12:00:00`);
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const regimeLabel = (value?: string) => value === 'lucro_real' ? 'Lucro Real' : value === 'lucro_presumido' ? 'Lucro Presumido' : 'Simples Nacional';

export const loadAccountantCompanyMetrics = async (links: AccountantLink[], now = new Date()): Promise<AccountantCompanyMetric[]> => {
  const active = links.filter(link => link.status === 'active' && link.companyOwnerId);
  return Promise.all(active.map(async link => {
    const ownerId = link.companyOwnerId!;
    // Um vínculo antigo ou parcialmente configurado não pode derrubar toda a
    // carteira. Mantemos a empresa visível com valores zerados e consolidamos
    // normalmente as demais.
    const [transactions, clinics] = await Promise.all([
      getTransactions(ownerId).catch(() => []),
      getClinics(ownerId).catch(() => []),
    ]);
    const income = transactions.filter(item => item.type === 'income');
    const year = now.getFullYear();
    const month = now.getMonth();
    const startRbt = new Date(year, month - 11, 1);
    const annualRevenue = income.filter(item => moneyDate(item).getFullYear() === year).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const monthRevenue = income.filter(item => { const date = moneyDate(item); return date.getFullYear() === year && date.getMonth() === month; }).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const previousYearToDate = income.filter(item => { const date = moneyDate(item); return date.getFullYear() === year - 1 && date.getMonth() <= month; }).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const rbt12 = income.filter(item => { const date = moneyDate(item); return date >= startRbt && date <= now; }).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const projection = month >= 0 ? annualRevenue / (month + 1) * 12 : annualRevenue;
    const size: 'ME' | 'EPP' = annualRevenue <= 360000 ? 'ME' : 'EPP';
    const limit = size === 'ME' ? 360000 : 4800000;
    const limitPercent = limit ? annualRevenue / limit * 100 : 0;
    const risk = limitPercent >= 100 ? 'exceeded' : limitPercent >= 90 ? 'critical' : limitPercent >= 80 ? 'attention' : 'regular';
    const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);
    const pendingExpenses = transactions.filter(item => item.type === 'expense' && item.status === 'pending');
    const pendingObligations = pendingExpenses.filter(item => { const due = moneyDate(item); return due >= now && due <= nextWeek && /impost|tribut|das|pgdas|defis|esocial|fiscal/i.test(`${item.category} ${item.description}`); }).length;
    const overdueExpenses = pendingExpenses.filter(item => moneyDate(item) < now).length;
    const fiscalRevenue = income.filter(item => item.sourceFiscalDocumentId || item.sourceType === 'fiscal_import').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const financialRevenue = income.filter(item => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const monthly = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(year, month - 11 + index, 1);
      const key = monthKey(date);
      return { key, label: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''), value: income.filter(item => monthKey(moneyDate(item)) === key).reduce((sum, item) => sum + Number(item.amount || 0), 0) };
    });
    return { link, name: clinics[0]?.name || link.companyName || 'Empresa sem nome', ownerId, regime: regimeLabel(clinics[0]?.taxRegime), monthRevenue, annualRevenue, rbt12, previousYearToDate, growth: previousYearToDate > 0 ? (annualRevenue - previousYearToDate) / previousYearToDate * 100 : null, projection, limit, limitPercent, size, risk, pendingObligations, overdueExpenses, fiscalRevenue, financialRevenue, monthly };
  }));
};
