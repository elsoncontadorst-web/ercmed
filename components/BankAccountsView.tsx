import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Landmark, Plus, Power, Wallet } from 'lucide-react';
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
  const [movementBalance, setMovementBalance] = useState(0);
  const [showForm, setShowForm] = useState(false);
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
      setMovementBalance(transactions.filter(item => item.status === 'paid' && (!clinicId || item.clinicId === clinicId)).reduce((sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount), 0));
    };
    load()
      .catch(error => {
        console.error('Erro ao carregar contas bancárias:', error);
        setMessage('Não foi possível carregar as contas bancárias. Tente novamente.');
      })
      .finally(() => setLoading(false));
  }, []);

  const total = useMemo(() => accounts.filter(item => item.active).reduce((sum, item) => sum + item.openingBalance, movementBalance), [accounts, movementBalance]);

  const addAccount = async () => {
    if (!managerId || !form.name.trim() || !form.bank.trim() || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const updated = [...accounts, { id: `bank_${Date.now()}`, name: form.name.trim(), bank: form.bank.trim(), agency: form.agency.trim(), account: form.account.trim(), openingBalance: Number(form.openingBalance.replace(',', '.')) || 0, active: true }];
      await saveBankAccounts(managerId, updated, clinicId);
      setAccounts(updated);
      setForm({ name: '', bank: '', agency: '', account: '', openingBalance: '' });
      setShowForm(false);
      setMessage('Conta bancária salva com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar conta bancária:', error);
      setMessage('Não foi possível salvar a conta bancária. Tente novamente.');
    } finally { setSaving(false); }
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

  return <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-10">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><h1 className="text-3xl font-bold text-slate-900">Contas bancárias</h1><p className="mt-1 text-slate-500">Cadastre bancos e acompanhe a posição financeira da clínica.</p></div>
      <button onClick={() => setShowForm(!showForm)} className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700"><Plus size={19}/> Nova conta</button>
    </div>
    {message && <div role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-800">{message}</div>}
    <div className="grid gap-4 md:grid-cols-3">
      <Summary icon={Landmark} label="Contas ativas" value={String(accounts.filter(item => item.active).length)} />
      <Summary icon={Wallet} label="Saldo financeiro consolidado" value={money(total)} />
      <Summary icon={Building2} label="Instituições" value={String(new Set(accounts.map(item => item.bank)).size)} />
    </div>
    {showForm && <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-5">
      <input className="rounded-lg border p-3" placeholder="Nome da conta *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>
      <input className="rounded-lg border p-3" placeholder="Banco *" value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })}/>
      <input className="rounded-lg border p-3" placeholder="Agência" value={form.agency} onChange={e => setForm({ ...form, agency: e.target.value })}/>
      <input className="rounded-lg border p-3" placeholder="Conta" value={form.account} onChange={e => setForm({ ...form, account: e.target.value })}/>
      <div className="flex gap-2"><input className="min-w-0 flex-1 rounded-lg border p-3" placeholder="Saldo inicial" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: e.target.value })}/><button disabled={saving} onClick={addAccount} className="rounded-lg bg-slate-900 px-4 text-white">Salvar</button></div>
    </div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading ? <div className="p-12 text-center text-slate-500">Carregando contas bancárias...</div> : accounts.length === 0 ? <div className="p-12 text-center text-slate-500"><Landmark className="mx-auto mb-3" size={34}/><p className="font-semibold text-slate-700">Nenhuma conta cadastrada</p><p className="text-sm">Cadastre a conta usada pela clínica para iniciar a conciliação.</p></div> : accounts.map(item => <div key={item.id} className="flex items-center justify-between border-b p-5 last:border-0"><div><p className="font-semibold text-slate-900">{item.name}</p><p className="text-sm text-slate-500">{item.bank} · Agência {item.agency || '—'} · Conta {item.account || '—'}</p></div><div className="flex items-center gap-5"><div className="text-right"><p className="text-xs text-slate-500">Saldo inicial</p><p className="font-bold">{money(item.openingBalance)}</p></div><button disabled={saving} title={item.active ? 'Desativar conta' : 'Ativar conta'} onClick={() => toggle(item.id)} className={`rounded-lg p-2 disabled:opacity-40 ${item.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><Power size={18}/></button></div></div>)}
    </div>
  </div>;
};

const Summary = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="mb-4 text-teal-600"/><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>;

export default BankAccountsView;
