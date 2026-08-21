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

  return <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center">
      <div><span className="mb-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-blue-700">Conferência bancária</span><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Conciliação bancária</h1><p className="mt-1 text-sm text-slate-500 sm:text-base">Compare o extrato do banco com os lançamentos financeiros da clínica.</p></div>
      <div className="flex flex-wrap gap-3"><select disabled={busy} value={accountId} onChange={e => setAccountId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3"><option value="">Selecione a conta</option>{accounts.map(item => <option key={item.id} value={item.id}>{item.name} — {item.bank}</option>)}</select><input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={e => importCsv(e.target.files?.[0])}/><button disabled={!accountId || busy} onClick={() => inputRef.current?.click()} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-40"><FileUp size={18}/> {busy ? 'Importando...' : 'Importar extrato CSV'}</button></div>
    </div>
    {accounts.length === 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">Cadastre uma conta em <strong>Bancos</strong> antes de importar o extrato.</div>}
    {message && <div role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-800">{message}</div>}
    <div className="grid gap-4 md:grid-cols-3"><Card label="Movimentações do extrato" value={String(visible.length)} /><Card label="Conciliadas" value={`${matched} de ${visible.length}`} positive/><Card label="Diferença pendente" value={money(difference)} warning={Math.abs(difference) > 0.01}/></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b bg-slate-50/60 p-4"><div className="relative max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input value={query} onChange={e => setQuery(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Buscar movimentação do extrato..."/></div></div>
      {!visible.length ? <div className="p-8 text-center text-slate-500 sm:p-14"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100"><RefreshCw size={28}/></div><p className="font-semibold text-slate-700">{query ? 'Nenhum resultado para esta busca' : 'Nenhuma movimentação para conciliar'}</p><p className="text-sm">{query ? 'Altere o texto pesquisado para visualizar outros lançamentos.' : 'Importe um CSV contendo as colunas Data, Descrição e Valor.'}</p></div> : <><div className="space-y-3 p-3 md:hidden">{visible.map(entry => {
        const linked = transactions.find(item => item.id === entry.matchedTransactionId);
        const suggestion = entry.status === 'pending' ? suggestionFor(entry) : undefined;
        const availableTransactions = transactions.filter(item => !matchedIds.has(item.id));
        return <article key={entry.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold text-slate-900">{entry.description}</h3><p className="text-xs text-slate-500">{entry.date}</p></div><p className={`shrink-0 font-extrabold ${entry.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(entry.amount)}</p></div><div className="mt-3">{linked ? <p className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">Conciliado com {linked.description}</p> : <div className="space-y-2">{suggestion && <button disabled={busy} onClick={() => match(entry.id, suggestion.id)} className="w-full rounded-lg bg-blue-50 px-3 py-3 text-left text-sm font-semibold text-blue-700">Conciliar com “{suggestion.description}”</button>}<select disabled={busy} aria-label="Selecionar lançamento" defaultValue="" onChange={event => event.target.value && match(entry.id, event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm"><option value="">Selecionar outro lançamento...</option>{availableTransactions.map(item => <option key={item.id} value={item.id}>{item.date} · {item.description} · {money(signedTransactionAmount(item))}</option>)}</select></div>}</div>{entry.status === 'matched' && <button disabled={busy} onClick={() => unmatch(entry.id)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 py-2 text-sm font-semibold text-emerald-700"><Unlink size={15}/>Desfazer conciliação</button>}</article>;
      })}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Data</th><th className="p-4">Descrição no banco</th><th className="p-4 text-right">Valor</th><th className="p-4">Correspondência no financeiro</th><th className="p-4">Situação</th></tr></thead><tbody>{visible.map(entry => {
        const linked = transactions.find(item => item.id === entry.matchedTransactionId);
        const suggestion = entry.status === 'pending' ? suggestionFor(entry) : undefined;
        const availableTransactions = transactions.filter(item => !matchedIds.has(item.id));
        return <tr key={entry.id} className="border-t transition hover:bg-slate-50/70"><td className="whitespace-nowrap p-4">{entry.date}</td><td className="p-4 font-medium">{entry.description}</td><td className={`p-4 text-right font-bold ${entry.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(entry.amount)}</td><td className="p-4">{linked ? <span>{linked.description}</span> : <div className="flex min-w-64 flex-col gap-2">{suggestion && <button disabled={busy} onClick={() => match(entry.id, suggestion.id)} className="rounded-lg bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-700 disabled:opacity-40">Conciliar com “{suggestion.description}”</button>}<select disabled={busy} aria-label="Selecionar lançamento manualmente" defaultValue="" onChange={event => event.target.value && match(entry.id, event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-40"><option value="">Selecionar outro lançamento...</option>{availableTransactions.map(item => <option key={item.id} value={item.id}>{item.date} · {item.description} · {money(signedTransactionAmount(item))}</option>)}</select></div>}</td><td className="p-4">{entry.status === 'matched' ? <button disabled={busy} onClick={() => unmatch(entry.id)} className="flex items-center gap-2 text-sm font-semibold text-emerald-700 disabled:opacity-40"><CheckCircle2 size={17}/> Conciliado <Unlink size={15}/></button> : <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Pendente</span>}</td></tr>;
      })}</tbody></table></div></>}
    </div>
  </div>;
};

const Card = ({ label, value, positive, warning }: { label: string; value: string; positive?: boolean; warning?: boolean }) => <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-white p-5 shadow-sm ${positive ? 'border-emerald-100 to-emerald-50/50' : warning ? 'border-amber-100 to-amber-50/50' : 'border-blue-100 to-blue-50/40'}`}><div className={`absolute inset-x-0 top-0 h-1 ${positive ? 'bg-emerald-500' : warning ? 'bg-amber-500' : 'bg-blue-500'}`}/><p className="text-sm text-slate-500">{label}</p><p className={`mt-2 text-2xl font-bold ${positive ? 'text-emerald-600' : warning ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p></div>;

export default BankReconciliationView;
