import React, { useEffect, useMemo, useState } from 'react';
import { Link2, Loader2, Pencil, Plus, Search, Trash2, UserRound, X } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getManagerIdForUser } from '../services/accessControlService';
import { deleteClient, getClients, saveClient } from '../services/clientService';
import { getActiveClinicScopeId } from '../services/activeClinicStorage';
import { getClinics } from '../services/clinicService';
import type { Client } from '../types/client';
import { getAllPatients, updatePatient } from '../services/healthService';
import type { Patient } from '../types/health';

const digits = (value: string) => value.replace(/\D/g, '');
const empty = {
  name: '', taxId: '', email: '', phone: '', postalCode: '', street: '', number: '',
  complement: '', neighborhood: '', city: '', state: '', cityCode: ''
};

const ClientsView: React.FC = () => {
  const { user } = useUser();
  const [clients, setClients] = useState<Client[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bulkLinking, setBulkLinking] = useState(false);
  const [managerId, setManagerId] = useState('');
  const clinicId = getActiveClinicScopeId() || '';

  const load = async () => {
    if (!user) return;
    const owner = (await getManagerIdForUser(user.uid)) || user.uid;
    setManagerId(owner);
    const [clientItems, patientItems] = await Promise.all([getClients(owner, clinicId), getAllPatients()]);
    setClients(clientItems);
    setPatients(patientItems.filter(patient => !clinicId || patient.clinicId === clinicId));
  };

  useEffect(() => { void load(); }, [user?.uid, clinicId]);

  const filtered = useMemo(() => {
    const term = search.toLocaleLowerCase('pt-BR').replace(/\D/g, '') || search.toLocaleLowerCase('pt-BR');
    return clients.filter(item => `${item.name} ${item.taxId || ''}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [clients, search]);

  const closeForm = () => { setForm(empty); setEditingId(null); setOpen(false); };
  const startNew = () => { setForm(empty); setEditingId(null); setOpen(true); };
  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      name: client.name || '', taxId: client.taxId || '', email: client.email || '', phone: client.phone || '',
      postalCode: client.postalCode || '', street: client.street || '', number: client.number || '',
      complement: client.complement || '', neighborhood: client.neighborhood || '', city: client.city || '', state: client.state || '', cityCode: client.cityCode || ''
    });
    setOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    if (!managerId || !form.name.trim()) return;
    const taxId = digits(form.taxId);
    if (taxId && taxId.length !== 11 && taxId.length !== 14) {
      alert('Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.');
      return;
    }
    setBusy(true);
    try {
      const clinic = (await getClinics()).find(item => item.id === clinicId);
      const existing = editingId ? clients.find(item => item.id === editingId) : undefined;
      await saveClient(managerId, {
        ...form,
        name: form.name.trim(),
        taxId,
        postalCode: digits(form.postalCode),
        state: form.state.trim().toUpperCase().slice(0, 2),
        clinicId,
        unitName: clinic?.name,
        source: existing?.source || 'manual',
        lastDocumentAt: existing?.lastDocumentAt,
        lastDocumentId: existing?.lastDocumentId,
        active: true
      }, editingId || undefined);
      closeForm();
      await load();
    } finally { setBusy(false); }
  };

  const linkAllClientsToPatients = async () => {
    const patientsByCpf = new Map<string, Patient>();
    patients.forEach(patient => {
      const cpf = digits(patient.cpf || '');
      if (cpf.length === 11) patientsByCpf.set(cpf, patient);
    });
    const matches = clients
      .filter(client => !client.patientId)
      .map(client => ({ client, patient: patientsByCpf.get(digits(client.taxId || '')) }))
      .filter((item): item is { client: Client; patient: Patient } => Boolean(item.patient));
    if (!matches.length) {
      alert('Nenhum novo vínculo foi encontrado. Para vincular, cliente e paciente precisam ter o mesmo CPF cadastrado.');
      return;
    }
    if (!confirm(`Vincular ${matches.length} cliente(s) aos pacientes com o mesmo CPF?`)) return;
    setBulkLinking(true);
    try {
      const results = await Promise.all(matches.map(async ({ client, patient }) => {
        const { id, createdAt, updatedAt, ...clientInput } = client;
        await saveClient(managerId, { ...clientInput, patientId: patient.id }, id);
        const patientSaved = await updatePatient(patient.id, { clientId: client.id });
        return patientSaved;
      }));
      const linked = results.filter(Boolean).length;
      await load();
      alert(`${linked} cliente(s) vinculado(s) aos respectivos pacientes.`);
    } catch (error) {
      console.error('Erro ao vincular clientes aos pacientes:', error);
      alert('Não foi possível concluir todos os vínculos.');
    } finally {
      setBulkLinking(false);
    }
  };

  const field = (key: keyof typeof empty, placeholder: string, extra = '') => (
    <input className={`rounded-xl border p-3 ${extra}`} placeholder={placeholder} value={form[key]}
      onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} />
  );

  return <div className="mx-auto max-w-6xl space-y-4 p-3 sm:space-y-6 sm:p-6">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><h1 className="flex items-center gap-2 text-2xl font-black text-slate-950"><UserRound className="text-teal-600"/>Clientes</h1><p className="mt-1 text-slate-500">Cadastro próprio para emissão de notas, separado dos pacientes e fornecedores.</p></div>
      <div className="flex flex-wrap gap-2"><button disabled={bulkLinking} onClick={() => void linkAllClientsToPatients()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-50">{bulkLinking ? <Loader2 className="animate-spin" size={18}/> : <Link2 size={18}/>} {bulkLinking ? 'Vinculando...' : 'Vincular clientes aos pacientes'}</button><button onClick={startNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-bold text-white"><Plus size={18}/>Novo cliente</button></div>
    </header>
    {open && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">{editingId ? 'Editar cliente' : 'Novo cliente'}</h2><p className="text-sm text-slate-500">Complete os dados usados na emissão da nota fiscal.</p></div><button onClick={closeForm} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19}/></button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {field('name', 'Nome ou razão social', 'lg:col-span-2')}{field('taxId', 'CPF ou CNPJ')}{field('phone', 'Telefone')}
        {field('email', 'E-mail', 'sm:col-span-2')}{field('postalCode', 'CEP')}{field('state', 'UF')}
        {field('street', 'Logradouro', 'sm:col-span-2')}{field('number', 'Número')}{field('complement', 'Complemento')}
        {field('neighborhood', 'Bairro')}{field('city', 'Cidade')}{field('cityCode', 'Código IBGE da cidade')}
      </div>
      <div className="mt-4 flex justify-end gap-2"><button onClick={closeForm} className="rounded-xl border px-4 py-3 font-bold text-slate-600">Cancelar</button><button disabled={busy || !form.name.trim()} onClick={() => void submit()} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar cliente'}</button></div>
    </section>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="relative block"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input className="w-full rounded-xl border py-3 pl-10 pr-3" placeholder="Buscar por nome, CPF ou CNPJ" value={search} onChange={e => setSearch(e.target.value)}/></label>
      <div className="mt-4 space-y-3 md:hidden">{filtered.map(item => <article key={item.id} className="rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-slate-900">{item.name}</h3><p className="mt-1 text-xs text-slate-500">{item.taxId || 'CPF/CNPJ não informado'}</p></div><div className="flex shrink-0 gap-1"><button aria-label="Editar cliente" onClick={() => startEdit(item)} className="rounded-lg bg-blue-50 p-2 text-blue-600"><Pencil size={17}/></button><button aria-label="Excluir cliente" onClick={async()=>{if(confirm('Excluir este cliente?')){await deleteClient(managerId,item.id);await load();}}} className="rounded-lg bg-red-50 p-2 text-red-500"><Trash2 size={17}/></button></div></div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-slate-400">Telefone</p><p className="truncate font-medium text-slate-700">{item.phone || '—'}</p></div><div><p className="text-xs text-slate-400">Cidade</p><p className="truncate font-medium text-slate-700">{item.city ? `${item.city}${item.state ? `/${item.state}` : ''}` : '—'}</p></div><div className="col-span-2"><p className="text-xs text-slate-400">Paciente vinculado</p><p className={item.patientId ? 'font-medium text-teal-600' : 'text-slate-400'}>{item.patientId ? patients.find(patient => patient.id === item.patientId)?.name || 'Vinculado' : 'Não vinculado'}</p></div></div>
      </article>)}{!filtered.length && <p className="py-8 text-center text-slate-500">Nenhum cliente encontrado.</p>}</div>
      <div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Nome</th><th className="p-3">CPF/CNPJ</th><th className="p-3">Paciente vinculado</th><th className="p-3">Telefone</th><th className="p-3">Cidade/UF</th><th className="p-3">Origem</th><th className="p-3 text-right">Ações</th></tr></thead>
        <tbody>{filtered.map(item => <tr key={item.id} className="border-b border-slate-100"><td className="p-3 font-semibold">{item.name}</td><td className="p-3">{item.taxId || '—'}</td><td className="p-3">{item.patientId ? <span className="font-medium text-teal-600">{patients.find(patient => patient.id === item.patientId)?.name || 'Vinculado'}</span> : <span className="text-slate-400">Não vinculado</span>}</td><td className="p-3">{item.phone || '—'}</td><td className="p-3">{item.city ? `${item.city}${item.state ? `/${item.state}` : ''}` : '—'}</td><td className="p-3">{item.source === 'xml' ? 'XML fiscal' : item.source === 'nfse' ? 'NFS-e' : 'Manual'}</td><td className="p-3"><div className="flex justify-end gap-2"><button title="Editar cliente" onClick={() => startEdit(item)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Pencil size={17}/></button><button title="Excluir" onClick={async()=>{if(confirm('Excluir este cliente?')){await deleteClient(managerId,item.id);await load();}}} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={17}/></button></div></td></tr>)}</tbody>
      </table>{!filtered.length && <p className="py-10 text-center text-slate-500">Nenhum cliente encontrado.</p>}</div>
    </section>
  </div>;
};

export default ClientsView;
