import React, { useEffect, useMemo, useState } from 'react';
import { Link2, Loader2, Pencil, Plus, Search, Trash2, UserRound, X } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getManagerIdForUser } from '../services/accessControlService';
import { deleteClient, getClients, saveClient } from '../services/clientService';
import { getActiveClinicScopeId } from '../services/activeClinicStorage';
import { getClinics } from '../services/clinicService';
import type { Client } from '../types/client';
import { addPatient, getAllPatients, updatePatient } from '../services/healthService';
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
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkClientId, setLinkClientId] = useState('');
  const [linkPatientId, setLinkPatientId] = useState('');
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

  const saveLink = async (client: Client, patient: Patient) => {
    const previousPatient = client.patientId ? patients.find(item => item.id === client.patientId) : undefined;
    const previousClient = clients.find(item => item.id !== client.id && item.patientId === patient.id);
    if (previousPatient && previousPatient.id !== patient.id) await updatePatient(previousPatient.id, { clientId: '' });
    if (previousClient) {
      const { id, createdAt, updatedAt, ...previousInput } = previousClient;
      await saveClient(managerId, { ...previousInput, patientId: '' }, id);
    }
    const { id, createdAt, updatedAt, ...clientInput } = client;
    await saveClient(managerId, { ...clientInput, patientId: patient.id }, id);
    return updatePatient(patient.id, { clientId: client.id });
  };

  const openLink = (clientId = '') => {
    const client = clients.find(item => item.id === clientId);
    setLinkClientId(clientId);
    setLinkPatientId(client?.patientId || '');
    setLinkOpen(true);
  };

  const linkSelected = async () => {
    const client = clients.find(item => item.id === linkClientId);
    const patient = patients.find(item => item.id === linkPatientId);
    if (!client || !patient) return;
    setBulkLinking(true);
    try {
      await saveLink(client, patient);
      await load();
      setLinkOpen(false);
      setLinkClientId('');
      setLinkPatientId('');
    } catch (error) {
      console.error('Erro ao vincular cliente e paciente:', error);
      alert('Não foi possível salvar o vínculo. Verifique suas permissões e tente novamente.');
    } finally { setBulkLinking(false); }
  };

  const createPatientFromClient = async () => {
    const client = clients.find(item => item.id === linkClientId);
    if (!client) return;
    const taxId = digits(client.taxId || '');
    if (taxId.length === 14) {
      alert('Clientes com CNPJ não podem ser cadastrados como pacientes. Selecione uma pessoa física.');
      return;
    }
    const sameCpfPatient = taxId.length === 11 ? patients.find(item => digits(item.cpf || '') === taxId) : undefined;
    if (sameCpfPatient) {
      setLinkPatientId(sameCpfPatient.id);
      alert('Já existe um paciente com este CPF. Ele foi selecionado para você salvar o vínculo.');
      return;
    }
    setBulkLinking(true);
    try {
      const address = [client.street, client.number, client.complement, client.neighborhood, client.city, client.state].filter(Boolean).join(', ');
      const patientId = await addPatient({
        name: client.name,
        ...(taxId.length === 11 ? { cpf: taxId } : {}),
        birthdate: '', phone: client.phone || '', ...(client.email ? { email: client.email } : {}),
        ...(address ? { address } : {}), isMinor: false, active: true,
        ...(clinicId ? { clinicId } : {}), clientId: client.id,
      });
      if (!patientId) throw new Error('Não foi possível criar o paciente.');
      const createdPatient: Patient = {
        id: patientId, name: client.name, ...(taxId.length === 11 ? { cpf: taxId } : {}),
        birthdate: '', phone: client.phone || '', isMinor: false, active: true,
        ...(clinicId ? { clinicId } : {}), clientId: client.id, createdAt: null, updatedAt: null,
      };
      await saveLink(client, createdPatient);
      await load();
      setLinkOpen(false);
      setLinkClientId('');
      setLinkPatientId('');
    } catch (error) {
      console.error('Erro ao criar paciente a partir do cliente:', error);
      alert('Não foi possível criar e vincular o paciente.');
    } finally { setBulkLinking(false); }
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
      alert('Nenhum vínculo automático por CPF foi encontrado. Você ainda pode fazer o vínculo manualmente nesta tela.');
      return;
    }
    if (!confirm(`Vincular ${matches.length} cliente(s) aos pacientes com o mesmo CPF?`)) return;
    setBulkLinking(true);
    try {
      const results = await Promise.all(matches.map(({ client, patient }) => saveLink(client, patient)));
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
      <div className="flex flex-wrap gap-2"><button disabled={bulkLinking} onClick={() => openLink()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-50"><Link2 size={18}/> Vincular cliente a paciente</button><button onClick={startNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-bold text-white"><Plus size={18}/>Novo cliente</button></div>
    </header>
    {linkOpen && <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold text-slate-900"><Link2 size={18} className="text-blue-600"/>Vincular cliente fiscal ao paciente</h2><p className="mt-1 text-sm text-slate-500">Selecione os dois cadastros. O CPF não precisa ser igual para o vínculo manual.</p></div><button onClick={() => setLinkOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19}/></button></div>
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]"><label className="text-sm font-semibold text-slate-700">Cliente fiscal<select value={linkClientId} onChange={event => { const id = event.target.value; setLinkClientId(id); setLinkPatientId(clients.find(item => item.id === id)?.patientId || ''); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal outline-none focus:border-blue-500"><option value="">Selecione o cliente...</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}{client.taxId ? ` — ${client.taxId}` : ''}</option>)}</select></label><div className="hidden items-end justify-center pb-3 text-blue-500 md:flex"><Link2 size={22}/></div><label className="text-sm font-semibold text-slate-700">Paciente<select value={linkPatientId} onChange={event => setLinkPatientId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal outline-none focus:border-blue-500"><option value="">Selecione o paciente...</option>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.name}{patient.cpf ? ` — ${patient.cpf}` : ''}</option>)}</select></label></div>
      {linkClientId && !linkPatientId && <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4"><p className="font-bold text-teal-900">Este cliente ainda não está na lista de pacientes?</p><p className="mt-1 text-sm text-teal-700">Crie o paciente usando nome, CPF, telefone, e-mail e endereço já cadastrados no cliente fiscal.</p><button disabled={bulkLinking} onClick={() => void createPatientFromClient()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"><Plus size={17}/>{bulkLinking ? 'Criando paciente...' : 'Criar paciente e vincular'}</button></div>}
      <div className="mt-4 flex flex-col-reverse justify-between gap-2 sm:flex-row"><button disabled={bulkLinking} onClick={() => void linkAllClientsToPatients()} className="rounded-xl border border-blue-200 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50">Vincular automaticamente por CPF</button><div className="flex gap-2"><button onClick={() => setLinkOpen(false)} className="rounded-xl border px-4 py-3 font-bold text-slate-600">Cancelar</button><button disabled={bulkLinking || !linkClientId || !linkPatientId} onClick={() => void linkSelected()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">{bulkLinking && <Loader2 className="animate-spin" size={17}/>}Salvar vínculo</button></div></div>
    </section>}
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
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-slate-900">{item.name}</h3><p className="mt-1 text-xs text-slate-500">{item.taxId || 'CPF/CNPJ não informado'}</p></div><div className="flex shrink-0 gap-1"><button aria-label="Vincular paciente" onClick={() => openLink(item.id)} className="rounded-lg bg-teal-50 p-2 text-teal-600"><Link2 size={17}/></button><button aria-label="Editar cliente" onClick={() => startEdit(item)} className="rounded-lg bg-blue-50 p-2 text-blue-600"><Pencil size={17}/></button><button aria-label="Excluir cliente" onClick={async()=>{if(confirm('Excluir este cliente?')){await deleteClient(managerId,item.id);await load();}}} className="rounded-lg bg-red-50 p-2 text-red-500"><Trash2 size={17}/></button></div></div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-slate-400">Telefone</p><p className="truncate font-medium text-slate-700">{item.phone || '—'}</p></div><div><p className="text-xs text-slate-400">Cidade</p><p className="truncate font-medium text-slate-700">{item.city ? `${item.city}${item.state ? `/${item.state}` : ''}` : '—'}</p></div><div className="col-span-2"><p className="text-xs text-slate-400">Paciente vinculado</p><p className={item.patientId ? 'font-medium text-teal-600' : 'text-slate-400'}>{item.patientId ? patients.find(patient => patient.id === item.patientId)?.name || 'Vinculado' : 'Não vinculado'}</p></div></div>
      </article>)}{!filtered.length && <p className="py-8 text-center text-slate-500">Nenhum cliente encontrado.</p>}</div>
      <div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Nome</th><th className="p-3">CPF/CNPJ</th><th className="p-3">Paciente vinculado</th><th className="p-3">Telefone</th><th className="p-3">Cidade/UF</th><th className="p-3">Origem</th><th className="p-3 text-right">Ações</th></tr></thead>
        <tbody>{filtered.map(item => <tr key={item.id} className="border-b border-slate-100"><td className="p-3 font-semibold">{item.name}</td><td className="p-3">{item.taxId || '—'}</td><td className="p-3">{item.patientId ? <span className="font-medium text-teal-600">{patients.find(patient => patient.id === item.patientId)?.name || 'Vinculado'}</span> : <span className="text-slate-400">Não vinculado</span>}</td><td className="p-3">{item.phone || '—'}</td><td className="p-3">{item.city ? `${item.city}${item.state ? `/${item.state}` : ''}` : '—'}</td><td className="p-3">{item.source === 'xml' ? 'XML fiscal' : item.source === 'nfse' ? 'NFS-e' : 'Manual'}</td><td className="p-3"><div className="flex justify-end gap-2"><button title="Vincular paciente" onClick={() => openLink(item.id)} className="rounded-lg p-2 text-teal-600 hover:bg-teal-50"><Link2 size={17}/></button><button title="Editar cliente" onClick={() => startEdit(item)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Pencil size={17}/></button><button title="Excluir" onClick={async()=>{if(confirm('Excluir este cliente?')){await deleteClient(managerId,item.id);await load();}}} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={17}/></button></div></td></tr>)}</tbody>
      </table>{!filtered.length && <p className="py-10 text-center text-slate-500">Nenhum cliente encontrado.</p>}</div>
    </section>
  </div>;
};

export default ClientsView;
