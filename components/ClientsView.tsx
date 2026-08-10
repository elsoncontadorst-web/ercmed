import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, UserRound } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getManagerIdForUser } from '../services/accessControlService';
import { deleteClient, getClients, saveClient } from '../services/clientService';
import { getActiveClinicScopeId } from '../services/activeClinicStorage';
import { getClinics } from '../services/clinicService';
import type { Client } from '../types/client';

const digits = (value: string) => value.replace(/\D/g, '');
const empty = { name: '', taxId: '', email: '', phone: '' };

const ClientsView: React.FC = () => {
  const { user } = useUser();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [managerId, setManagerId] = useState('');
  const clinicId = getActiveClinicScopeId() || '';

  const load = async () => {
    if (!user) return;
    const owner = (await getManagerIdForUser(user.uid)) || user.uid;
    setManagerId(owner);
    setClients(await getClients(owner, clinicId));
  };
  useEffect(() => { void load(); }, [user?.uid, clinicId]);
  const filtered = useMemo(() => {
    const term = search.toLocaleLowerCase('pt-BR').replace(/\D/g, '') || search.toLocaleLowerCase('pt-BR');
    return clients.filter(item => `${item.name} ${item.taxId || ''}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [clients, search]);

  const submit = async () => {
    if (!managerId || !form.name.trim()) return;
    setBusy(true);
    try {
      const clinic = (await getClinics()).find(item => item.id === clinicId);
      await saveClient(managerId, { ...form, name: form.name.trim(), taxId: digits(form.taxId), clinicId, unitName: clinic?.name, source: 'manual', active: true });
      setForm(empty); setOpen(false); await load();
    } finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-6xl space-y-6 p-6">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="flex items-center gap-2 text-2xl font-black text-slate-950"><UserRound className="text-teal-600"/>Clientes</h1><p className="mt-1 text-slate-500">Cadastro próprio para emissão de notas, separado dos pacientes e fornecedores.</p></div><button onClick={() => setOpen(!open)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-bold text-white"><Plus size={18}/>Novo cliente</button></header>
    {open && <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2"><input className="rounded-xl border p-3" placeholder="Nome ou razão social" value={form.name} onChange={e => setForm({...form, name:e.target.value})}/><input className="rounded-xl border p-3" placeholder="CPF ou CNPJ" value={form.taxId} onChange={e => setForm({...form, taxId:e.target.value})}/><input className="rounded-xl border p-3" placeholder="E-mail" value={form.email} onChange={e => setForm({...form, email:e.target.value})}/><input className="rounded-xl border p-3" placeholder="Telefone" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})}/><button disabled={busy || !form.name.trim()} onClick={submit} className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Salvando...' : 'Salvar cliente'}</button></section>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><label className="relative block"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input className="w-full rounded-xl border py-3 pl-10 pr-3" placeholder="Buscar por nome, CPF ou CNPJ" value={search} onChange={e => setSearch(e.target.value)}/></label><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Nome</th><th className="p-3">CPF/CNPJ</th><th className="p-3">Origem</th><th className="p-3">Último documento</th><th/></tr></thead><tbody>{filtered.map(item => <tr key={item.id} className="border-b border-slate-100"><td className="p-3 font-semibold">{item.name}</td><td className="p-3">{item.taxId || '—'}</td><td className="p-3">{item.source === 'xml' ? 'XML fiscal' : item.source === 'nfse' ? 'NFS-e' : 'Manual'}</td><td className="p-3">{item.lastDocumentAt || '—'}</td><td className="p-3 text-right"><button title="Excluir" onClick={async()=>{if(confirm('Excluir este cliente?')){await deleteClient(managerId,item.id);await load();}}} className="text-red-500"><Trash2 size={17}/></button></td></tr>)}</tbody></table>{!filtered.length && <p className="py-10 text-center text-slate-500">Nenhum cliente encontrado.</p>}</div></section>
  </div>;
};
export default ClientsView;
