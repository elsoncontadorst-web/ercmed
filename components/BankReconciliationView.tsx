import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileUp, RefreshCw, Search, Unlink } from 'lucide-react';
import { auth } from '../services/firebase';
import { getManagerIdForUser } from '../services/accessControlService';
import { BankAccount, BankStatementEntry, getBankingData, parseBankCsv, saveStatementEntries } from '../services/bankingService';
import { getTransactions, SavedTransaction } from '../services/userDataService';
import { getActiveClinicScopeId } from '../services/activeClinicStorage';

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const signedTransactionAmount = (item: SavedTransaction) => item.type === 'income' ? item.amount : -item.amount;

const BankReconciliationView: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [managerId, setManagerId] = useState('');
  const [clinicId] = useState(() => getActiveClinicScopeId());
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [entries, setEntries] = useState<BankStatementEntry[]>([]);
  const [transactions, setTransactions] = useState<SavedTransaction[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const ownerId = await getManagerIdForUser(user.uid) || user.uid;
      const [banking, financial] = await Promise.all([getBankingData(ownerId), getTransactions(ownerId)]);
      setManagerId(ownerId);
      const scopedAccounts = banking.accounts.filter(item => item.active && (!clinicId || item.clinicId === clinicId));
      setAccounts(scopedAccounts);
      setAccountId(scopedAccounts[0]?.id || '');
      setEntries(banking.statementEntries.filter(item => !clinicId || item.clinicId === clinicId));
      setTransactions(financial.filter(item => item.status === 'paid' && (!clinicId || item.clinicId === clinicId)));
    };
    load().catch(error => {
      console.error('Erro ao carregar conciliação:', error);
      setMessage('Não foi possível carregar os dados de conciliação. Tente novamente.');
    });
  }, []);

  const visible = useMemo(() => entries.filter(item => (!accountId || item.bankAccountId === accountId) && (!query || item.description.toLowerCase().includes(query.toLowerCase()))), [entries, accountId, query]);
  const matchedIds = new Set(entries.map(item => item.matchedTransactionId).filter(Boolean));

  const suggestionFor = (entry: BankStatementEntry) => transactions.find(item => !matchedIds.has(item.id) && item.date === entry.date && Math.abs(signedTransactionAmount(item) - entry.amount) < 0.01);

  const importCsv = async (file?: File) => {
    if (!file || !accountId || !managerId || busy) return;
    setBusy(true);
    try {
      const parsed = parseBankCsv(await file.text(), accountId);
      if (!parsed.length) { setMessage('Não foi possível identificar Data, Descrição e Valor no arquivo CSV.'); return; }
      const fingerprints = new Set(entries.map(item => `${item.bankAccountId}|${item.date}|${item.description}|${item.amount}`));
      const newEntries = parsed.filter(item => !fingerprints.has(`${item.bankAccountId}|${item.date}|${item.description}|${item.amount}`));
      const updated = [...entries, ...newEntries];
      await saveStatementEntries(managerId, updated, clinicId);
      setEntries(updated);
      setMessage(`${newEntries.length} movimentações importadas; ${parsed.length - newEntries.length} duplicadas ignoradas.`);
    } catch (error) {
      console.error('Erro ao importar extrato bancário:', error);
      setMessage('Não foi possível importar o extrato. Nenhuma movimentação foi alterada.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const match = async (entryId: string, transactionId: string) => {
    if (busy) return;
    const previous = entries;
    const updated = entries.map(item => item.id === entryId ? { ...item, matchedTransactionId: transactionId, status: 'matched' as const } : item);
    setBusy(true);
    setMessage('');
    setEntries(updated);
    try {
      await saveStatementEntries(managerId, updated, clinicId);
    } catch (error) {
      console.error('Erro ao conciliar movimentação:', error);
      setEntries(previous);
      setMessage('Não foi possível salvar a conciliação. A alteração foi desfeita.');
    } finally {
      setBusy(false);
    }
  };

  const unmatch = async (entryId: string) => {
    if (busy) return;
    const previous = entries;
    const updated = entries.map(item => item.id === entryId ? { ...item, matchedTransactionId: undefined, status: 'pending' as const } : item);
    setBusy(true);
    setMessage('');
    setEntries(updated);
    try {
      await saveStatementEntries(managerId, updated, clinicId);
    } catch (error) {
      console.error('Erro ao desfazer conciliação:', error);
      setEntries(previous);
      setMessage('Não foi possível desfazer a conciliação. A alteração foi restaurada.');
    } finally {
      setBusy(false);
    }
  };

  const matched = visible.filter(item => item.status === 'matched').length;
  const difference = visible.filter(item => item.status === 'pending').reduce((sum, item) => sum + item.amount, 0);

  return <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-10">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div><h1 className="text-3xl font-bold text-slate-900">Conciliação bancária</h1><p className="mt-1 text-slate-500">Compare o extrato do banco com os lançamentos financeiros da clínica.</p></div>
      <div className="flex flex-wrap gap-3"><select disabled={busy} value={accountId} onChange={e => setAccountId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3"><option value="">Selecione a conta</option>{accounts.map(item => <option key={item.id} value={item.id}>{item.name} — {item.bank}</option>)}</select><input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={e => importCsv(e.target.files?.[0])}/><button disabled={!accountId || busy} onClick={() => inputRef.current?.click()} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-40"><FileUp size={18}/> {busy ? 'Importando...' : 'Importar extrato CSV'}</button></div>
    </div>
    {accounts.length === 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">Cadastre uma conta em <strong>Bancos</strong> antes de importar o extrato.</div>}
    {message && <div role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-800">{message}</div>}
    <div className="grid gap-4 md:grid-cols-3"><Card label="Movimentações do extrato" value={String(visible.length)} /><Card label="Conciliadas" value={`${matched} de ${visible.length}`} positive/><Card label="Diferença pendente" value={money(difference)} warning={Math.abs(difference) > 0.01}/></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b p-4"><Search className="text-slate-400" size={18}/><input value={query} onChange={e => setQuery(e.target.value)} className="w-full outline-none" placeholder="Buscar movimentação do extrato..."/></div>
      {!visible.length ? <div className="p-14 text-center text-slate-500"><RefreshCw className="mx-auto mb-3" size={34}/><p className="font-semibold text-slate-700">Nenhuma movimentação para conciliar</p><p className="text-sm">Importe um CSV contendo as colunas Data, Descrição e Valor.</p></div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Data</th><th className="p-4">Descrição no banco</th><th className="p-4 text-right">Valor</th><th className="p-4">Correspondência no financeiro</th><th className="p-4">Situação</th></tr></thead><tbody>{visible.map(entry => {
        const linked = transactions.find(item => item.id === entry.matchedTransactionId);
        const suggestion = entry.status === 'pending' ? suggestionFor(entry) : undefined;
        const availableTransactions = transactions.filter(item => !matchedIds.has(item.id));
        return <tr key={entry.id} className="border-t"><td className="whitespace-nowrap p-4">{entry.date}</td><td className="p-4 font-medium">{entry.description}</td><td className={`p-4 text-right font-bold ${entry.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(entry.amount)}</td><td className="p-4">{linked ? <span>{linked.description}</span> : <div className="flex min-w-64 flex-col gap-2">{suggestion && <button disabled={busy} onClick={() => match(entry.id, suggestion.id)} className="rounded-lg bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-700 disabled:opacity-40">Conciliar com “{suggestion.description}”</button>}<select disabled={busy} aria-label="Selecionar lançamento manualmente" defaultValue="" onChange={event => event.target.value && match(entry.id, event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-40"><option value="">Selecionar outro lançamento...</option>{availableTransactions.map(item => <option key={item.id} value={item.id}>{item.date} · {item.description} · {money(signedTransactionAmount(item))}</option>)}</select></div>}</td><td className="p-4">{entry.status === 'matched' ? <button disabled={busy} onClick={() => unmatch(entry.id)} className="flex items-center gap-2 text-sm font-semibold text-emerald-700 disabled:opacity-40"><CheckCircle2 size={17}/> Conciliado <Unlink size={15}/></button> : <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Pendente</span>}</td></tr>;
      })}</tbody></table></div>}
    </div>
  </div>;
};

const Card = ({ label, value, positive, warning }: { label: string; value: string; positive?: boolean; warning?: boolean }) => <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className={`mt-2 text-2xl font-bold ${positive ? 'text-emerald-600' : warning ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p></div>;

export default BankReconciliationView;
