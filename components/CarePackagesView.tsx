import React, { FormEvent, useEffect, useState } from 'react';
import { Layers3, Plus, Users } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getManagerIdForUser } from '../services/accessControlService';
import { getCarePackages, createCarePackage } from '../services/carePackageService';
import { getAllProfessionals } from '../services/repasseService';
import { subscribeToPatients } from '../services/healthService';
import { getClinicServices } from '../services/clinicErpService';
import { CarePackageBalance, ClinicService } from '../types/clinicErp';
import { Patient } from '../types/health';
import { Professional } from '../types/finance';

const initialForm = {
  patientId: '',
  patientName: '',
  professionalId: '',
  serviceId: '',
  packageName: '',
  totalSessions: 10,
  contractName: '',
  unitName: ''
};

const CarePackagesView: React.FC = () => {
  const { user } = useUser();
  const [items, setItems] = useState<CarePackageBalance[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<ClinicService[]>([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!user) return;
    const managerId = (await getManagerIdForUser(user.uid)) || user.uid;
    const [packages, pros, serviceCatalog] = await Promise.all([
      getCarePackages(managerId),
      getAllProfessionals(managerId),
      getClinicServices(managerId)
    ]);
    setItems(packages);
    setProfessionals(pros);
    setServices(serviceCatalog.filter(item => item.active));
  };

  useEffect(() => subscribeToPatients(setPatients), []);
  useEffect(() => { load(); }, [user?.uid]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !form.patientName || !form.serviceId) return;
    const managerId = (await getManagerIdForUser(user.uid)) || user.uid;
    const selectedService = services.find(item => item.id === form.serviceId);
    const selectedProfessional = professionals.find(item => item.id === form.professionalId);
    if (!selectedService) return;

    await createCarePackage(managerId, {
      patientId: form.patientId || undefined,
      patientName: form.patientName,
      professionalId: selectedProfessional?.id,
      professionalName: selectedProfessional?.name,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      packageName: form.packageName || `${selectedService.name} · pacote`,
      totalSessions: Math.max(1, form.totalSessions),
      contractName: form.contractName || undefined,
      unitName: form.unitName || undefined,
      createdBy: user.uid
    });

    setForm(initialForm);
    setMessage('Pacote assistencial cadastrado. As próximas sessões poderão ser consumidas no portal do profissional.');
    await load();
  };

  const active = items.filter(item => item.active);
  const exhausted = items.filter(item => !item.active);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Layers3 className="text-brand-600" />
            Pacotes assistenciais
          </h1>
          <p className="mt-1 text-slate-500">Cadastre sessões contratadas para evitar cobrança duplicada e controlar saldo por paciente.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pacotes ativos" value={String(active.length)} />
        <StatCard label="Pacotes encerrados" value={String(exhausted.length)} />
        <StatCard label="Sessões restantes" value={String(active.reduce((sum, item) => sum + (item.remainingSessions || 0), 0))} />
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <Field label="Paciente">
          <input list="care-packages-patients" value={form.patientName} onChange={e => {
            const patient = patients.find(item => item.name === e.target.value);
            setForm({ ...form, patientName: e.target.value, patientId: patient?.id || '' });
          }} className="input" required />
          <datalist id="care-packages-patients">{patients.map(item => <option key={item.id} value={item.name} />)}</datalist>
        </Field>
        <Field label="Profissional">
          <select value={form.professionalId} onChange={e => setForm({ ...form, professionalId: e.target.value })} className="input">
            <option value="">Qualquer profissional</option>
            {professionals.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Serviço">
          <select value={form.serviceId} onChange={e => setForm({ ...form, serviceId: e.target.value })} className="input" required>
            <option value="">Selecione</option>
            {services.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Nome do pacote"><input value={form.packageName} onChange={e => setForm({ ...form, packageName: e.target.value })} className="input" /></Field>
        <Field label="Total de sessões"><input type="number" min="1" value={form.totalSessions} onChange={e => setForm({ ...form, totalSessions: Math.max(1, Number(e.target.value) || 1) })} className="input" /></Field>
        <Field label="Contrato / convênio"><input value={form.contractName} onChange={e => setForm({ ...form, contractName: e.target.value })} className="input" /></Field>
        <Field label="Unidade"><input value={form.unitName} onChange={e => setForm({ ...form, unitName: e.target.value })} className="input" /></Field>
        <div className="md:col-span-3 flex items-center justify-between">
          <p className="text-sm text-brand-700">{message}</p>
          <button className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-bold text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" />
            Salvar pacote
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_.8fr_.8fr] gap-4 border-b border-slate-200 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          <span>Paciente / pacote</span>
          <span>Serviço</span>
          <span>Profissional</span>
          <span>Saldo</span>
          <span>Status</span>
        </div>
        {items.length ? items.map(item => (
          <div key={item.id} className="grid grid-cols-[1.5fr_1fr_1fr_.8fr_.8fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm">
            <div>
              <p className="font-semibold text-slate-800">{item.patientName}</p>
              <p className="text-xs text-slate-500">{item.packageName}</p>
            </div>
            <span className="text-slate-700">{item.serviceName}</span>
            <span className="text-slate-600">{item.professionalName || 'Livre'}</span>
            <span className="font-semibold text-slate-800">{item.remainingSessions}/{item.totalSessions}</span>
            <span className={item.active ? 'font-semibold text-emerald-600' : 'font-semibold text-slate-500'}>
              {item.active ? 'Ativo' : 'Encerrado'}
            </span>
          </div>
        )) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
            <Users className="mb-4 h-14 w-14 text-slate-200" />
            <p className="font-semibold text-slate-700">Nenhum pacote assistencial cadastrado</p>
            <p className="mt-1 text-sm text-slate-500">Cadastre pacotes vendidos para o profissional só consumir as sessões na produção.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block text-sm font-medium text-slate-700">
    {label}
    <div className="mt-1 [&_.input]:w-full [&_.input]:rounded-lg [&_.input]:border [&_.input]:border-slate-200 [&_.input]:p-2.5">{children}</div>
  </label>
);

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
  </div>
);

export default CarePackagesView;
