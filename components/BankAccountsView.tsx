import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Landmark, Loader2, Pencil, Plus, Power, Wallet, X } from 'lucide-react';
import { auth } from '../services/firebase';
import { getManagerIdForUser } from '../services/accessControlService';
import { BankAccount, getBankingData, saveBankAccounts } from '../services/bankingService';
import { getTransactions } from '../services/userDataService';
import { getActiveClinicScopeId } from '../services/activeClinicStorage';

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const BankAccountsView: React.FC = () => {
  const [managerId, setManagerId] = useState('');
  const [clinicId] = useState(() => getActiveClinicScopeId());
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [movements, setMovements] = useState({ income: 0, expenses: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', bank: '', agency: '', account: '', openingBalance: '' });

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const ownerId = await getManagerIdForUser(user.uid) || user.uid;
      const [banking, transactions] = await Promise.all([getBankingData(ownerId), getTransactions(ownerId)]);
      setManagerId(ownerId);
      setAccounts(banking.accounts.filter(item => clinicId ? item.clinicId === clinicId : true));
      const paidTransactions = transactions.filter(item => item.status === 'paid' && (!clinicId || item.clinicId === clinicId));
      setMovements({
        income: paidTransactions.filter(item => item.type === 'income').reduce((sum, item) => sum + Math.abs(Number(item.amount) || 0), 0),
        expenses: paidTransactions.filter(item => item.type === 'expense').reduce((sum, item) => sum + Math.abs(Number(item.amount) || 0), 0)
      });
    };
    load()
      .catch(error => {
        console.error('Erro ao carregar contas bancárias:', error);
        setMessage('Não foi possível carregar as contas bancárias. Tente novamente.');
      })
      .finally(() => setLoading(false));
  }, []);

  const openingBalance = useMemo(() => accounts.filter(item => item.active).reduce((sum, item) => sum + item.openingBalance, 0), [accounts]);
  const total = openingBalance + movements.income - movements.expenses;

  const resetForm = () => {
    setForm({ name: '', bank: '', agency: '', account: '', openingBalance: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const parseMoney = (value: string) => Number(value.includes(',')
    ? value.replace(/\./g, '').replace(',', '.')
    : value) || 0;

  const saveAccount = async () => {
    if (!managerId || !form.name.trim() || !form.bank.trim() || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const values = { name: form.name.trim(), bank: form.bank.trim(), agency: form.agency.trim(), account: form.account.trim(), openingBalance: parseMoney(form.openingBalance) };
      const updated = editingId
        ? accounts.map(item => item.id === editingId ? { ...item, ...values } : item)
        : [...accounts, { id: `bank_${Date.now()}`, ...values, active: true }];
      await saveBankAccounts(managerId, updated, clinicId);
      setAccounts(updated);
      resetForm();
      setMessage('Conta bancária salva com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar conta bancária:', error);
      setMessage('Não foi possível salvar a conta bancária. Tente novamente.');
    } finally { setSaving(false); }
  };

  const editAccount = (account: BankAccount) => {
    setEditingId(account.id);
    setForm({ name: account.name, bank: account.bank, agency: account.agency || '', account: account.account || '', openingBalance: account.openingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) });
    setShowForm(true);
    setMessage('');
  };

  const toggle = async (id: string) => {
    if (!managerId || saving) return;
    const previous = accounts;
    const updated = accounts.map(item => item.id === id ? { ...item, active: !item.active } : item);
    setSaving(true);
    setMessage('');
    setAccounts(updated);
    try {
      await saveBankAccounts(managerId, updated, clinicId);
    } catch (error) {
      console.error('Erro ao atualizar conta bancária:', error);
      setAccounts(previous);
      setMessage('Não foi possível atualizar a conta. A alteração foi desfeita.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center">
      <div><span className="mb-2 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-teal-700">Tesouraria</span><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Contas bancárias</h1><p className="mt-1 text-sm text-slate-500 sm:text-base">Cadastre bancos e acompanhe a posição financeira da clínica.</p></div>
      <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 font-bold text-white shadow-sm transition hover:bg-teal-700 hover:shadow-md"><Plus size={19}/> Nova conta</button>
    </div>
    {message && <div role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-800">{message}</div>}
    <div className="grid gap-4 md:grid-cols-3">
      <Summary icon={Landmark} label="Contas ativas" value={String(accounts.filter(item => item.active).length)} />
      <Summary icon={Wallet} label="Saldo financeiro calculado" value={money(total)} detail={`${money(openingBalance)} + ${money(movements.income)} - ${money(movements.expenses)}`} />
      <Summary icon={Building2} label="Instituições" value={String(new Set(accounts.map(item => item.bank)).size)} />
    </div>
    {showForm && <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between"><h2 className="font-bold text-slate-800">{editingId ? 'Editar conta bancária' : 'Nova conta bancária'}</h2><button onClick={resetForm} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Cancelar"><X size={18}/></button></div>
      <div className="grid gap-4 md:grid-cols-5">
      <input className="rounded-lg border p-3" placeholder="Nome da conta *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>
      <input className="rounded-lg border p-3" placeholder="Banco *" value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })}/>
      <input className="rounded-lg border p-3" placeholder="Agência" value={form.agency} onChange={e => setForm({ ...form, agency: e.target.value })}/>
      <input className="rounded-lg border p-3" placeholder="Conta" value={form.account} onChange={e => setForm({ ...form, account: e.target.value })}/>
      <div className="flex gap-2"><input className="min-w-0 flex-1 rounded-lg border p-3" placeholder="Saldo inicial" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: e.target.value })}/><button disabled={saving} onClick={saveAccount} className="rounded-lg bg-slate-900 px-4 text-white">{saving ? 'Salvando...' : 'Salvar'}</button></div>
      </div>
    </div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      {loading ? <div className="flex flex-col items-center p-14 text-center"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50"><Loader2 className="animate-spin text-teal-600" size={24}/></div><p className="font-semibold text-slate-700">Carregando contas bancárias...</p></div> : accounts.length === 0 ? <div className="p-14 text-center text-slate-500"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100"><Landmark size={28}/></div><p className="font-semibold text-slate-700">Nenhuma conta cadastrada</p><p className="text-sm">Cadastre a conta usada pela clínica para iniciar a conciliação.</p></div> : accounts.map(item => <div key={item.id} className="flex flex-col gap-4 border-b p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between last:border-0"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Landmark size={20}/></div><div><p className="font-semibold text-slate-900">{item.name}</p><p className="text-sm text-slate-500">{item.bank} · Agência {item.agency || '—'} · Conta {item.account || '—'}</p></div></div><div className="flex items-center justify-between gap-3 sm:justify-end"><div className="mr-2 text-left sm:text-right"><p className="text-xs text-slate-500">Saldo inicial</p><p className="font-bold">{money(item.openingBalance)}</p></div><button disabled={saving} title="Editar conta" onClick={() => editAccount(item)} className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 disabled:opacity-40"><Pencil size={18}/></button><button disabled={saving} title={item.active ? 'Desativar conta' : 'Ativar conta'} onClick={() => toggle(item.id)} className={`rounded-lg p-2 disabled:opacity-40 ${item.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><Power size={18}/></button></div></div>)}
    </div>
  </div>;
};

const Summary = ({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail?: string }) => <div className="relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-white to-teal-50/40 p-5 shadow-sm"><div className="absolute inset-x-0 top-0 h-1 bg-teal-500"/><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100"><Icon className="text-teal-700" size={20}/></div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>{detail && <p className="mt-2 text-xs text-slate-500" title="Saldo inicial + entradas recebidas - saídas pagas">{detail}</p>}</div>;

export default BankAccountsView;
