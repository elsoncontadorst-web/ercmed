import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, CalendarRange, Pencil, Plus, Tags, Trash2, UserRound, X } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getManagerIdForUser } from '../services/accessControlService';
import { deleteClinicService, getClinicServices, saveClinicService, updateClinicService } from '../services/clinicErpService';
import { getAllProfessionals } from '../services/repasseService';
import { ClinicService } from '../types/clinicErp';
import { Professional } from '../types/finance';
import { ensureProfessionalRegistryValue, getSpecialtyOptions } from '../services/professionalRegistryService';

const initial = {
  code: '',
  name: '',
  category: 'Consulta',
  specialty: '',
  professionalId: '',
  professionalName: '',
  unitName: '',
  contractName: '',
  effectiveFrom: '',
  effectiveTo: '',
  durationMinutes: 30,
  modality: 'in_person' as ClinicService['modality'],
  payer: 'private' as ClinicService['payer'],
  payers: ['private'] as ClinicService['payer'][],
  grossPrice: 0,
  minimumPrice: 0,
  tussCode: '',
  active: true,
};

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const ServiceCatalogView: React.FC = () => {
  const { user } = useUser();
  const [services, setServices] = useState<ClinicService[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [registrySpecialties, setRegistrySpecialties] = useState<string[]>([]);
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const specialties = useMemo(() => {
    const merged = new Set<string>(registrySpecialties);
    professionals.map(item => item.specialty).filter(Boolean).forEach(item => merged.add(item));
    return Array.from(merged).sort();
  }, [professionals, registrySpecialties]);

  const load = async () => {
    if (!user) return;
    const managerId = await getManagerIdForUser(user.uid);
    if (!managerId) return;
    const [loadedServices, loadedProfessionals] = await Promise.all([
      getClinicServices(managerId),
      getAllProfessionals(managerId),
    ]);
    const loadedSpecialties = await getSpecialtyOptions(managerId);
    setServices(loadedServices);
    setProfessionals(loadedProfessionals);
    setRegistrySpecialties(loadedSpecialties);
  };

  useEffect(() => {
    load();
  }, [user?.uid]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !form.name.trim() || form.payers.length === 0) return;

    setSaving(true);
    setMessage('');

    try {
      const managerId = await getManagerIdForUser(user.uid);
      if (!managerId) throw new Error('Empresa de saúde não identificada.');

      const normalizedSpecialty = form.specialty === '__custom__'
        ? customSpecialty.trim()
        : form.specialty.trim();

      const payload = {
        ...form,
        payer: form.payers[0],
        code: form.code.trim() || form.name.trim().toUpperCase().replace(/\s+/g, '_'),
        specialty: normalizedSpecialty || undefined,
        professionalId: form.professionalId || undefined,
        professionalName: form.professionalName || undefined,
        unitName: form.unitName.trim() || undefined,
        contractName: form.contractName.trim() || undefined,
        effectiveFrom: form.effectiveFrom || undefined,
        effectiveTo: form.effectiveTo || undefined,
        tussCode: form.tussCode.trim() || undefined,
      };

      if (editingId) await updateClinicService(managerId, editingId, payload);
      else await saveClinicService(managerId, payload);

      setForm(initial);
      const wasEditing = Boolean(editingId);
      setEditingId(null);
      setCustomSpecialty('');
      if (normalizedSpecialty) {
        await ensureProfessionalRegistryValue('specialties', normalizedSpecialty, managerId);
      }
      await load();
      setMessage(wasEditing
        ? 'Regra comercial atualizada. Os próximos lançamentos usarão a nova configuração.'
        : 'Regra comercial cadastrada. Produção, faturamento e repasses já passam a usar essa configuração.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a regra de preço.');
    } finally {
      setSaving(false);
    }
  };

  const handleProfessionalChange = (professionalId: string) => {
    const selected = professionals.find(item => item.id === professionalId);
    setForm(current => ({
      ...current,
      professionalId,
      professionalName: selected?.name || '',
      specialty: selected?.specialty || current.specialty,
    }));
  };

  const startEditing = (service: ClinicService) => {
    setEditingId(service.id);
    setForm({
      code: service.code || '',
      name: service.name || '',
      category: service.category || 'Consulta',
      specialty: service.specialty || '',
      professionalId: service.professionalId || '',
      professionalName: service.professionalName || '',
      unitName: service.unitName || '',
      contractName: service.contractName || '',
      effectiveFrom: service.effectiveFrom || '',
      effectiveTo: service.effectiveTo || '',
      durationMinutes: service.durationMinutes || 30,
      modality: service.modality || 'in_person',
      payer: service.payer || 'private',
      payers: service.payers?.length ? service.payers : [service.payer || 'private'],
      grossPrice: service.grossPrice || 0,
      minimumPrice: service.minimumPrice || 0,
      tussCode: service.tussCode || '',
      active: service.active !== false,
    });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setForm(initial);
    setCustomSpecialty('');
    setMessage('');
  };

  const togglePayer = (payer: ClinicService['payer']) => {
    setForm(current => {
      const selected = current.payers.includes(payer)
        ? current.payers.filter(item => item !== payer)
        : [...current.payers, payer];
      return { ...current, payers: selected, payer: selected[0] || current.payer };
    });
  };

  const removeService = async (service: ClinicService) => {
    if (!user || !window.confirm(`Excluir a regra "${service.name}"? Os lançamentos já realizados não serão alterados.`)) return;
    try {
      const managerId = await getManagerIdForUser(user.uid);
      if (!managerId) throw new Error('Empresa de saúde não identificada.');
      await deleteClinicService(managerId, service.id);
      if (editingId === service.id) cancelEditing();
      await load();
      setMessage('Regra comercial excluída. Os lançamentos anteriores foram preservados.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível excluir a regra.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Tags className="text-brand-600" />
            Tabela de Serviços e Preços
          </h1>
          <p className="mt-1 text-slate-500">
            Defina regras comerciais por serviço, profissional, especialidade, vigência, contrato e pagador.
          </p>
        </div>
        <div className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
          {services.length} regras cadastradas
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-slate-900">{editingId ? 'Editar regra comercial' : 'Nova regra comercial'}</h2>
            {editingId && (
              <button type="button" onClick={cancelEditing} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
                <X className="h-4 w-4" /> Cancelar
              </button>
            )}
          </div>

          <Field label="Nome do serviço" value={form.name} onChange={value => setForm({ ...form, name: value })} required />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Código" value={form.code} onChange={value => setForm({ ...form, code: value })} />
            <Field label="Categoria" value={form.category} onChange={value => setForm({ ...form, category: value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-700">
              Especialidade da regra
              <select
                value={form.specialty || 'ALL'}
                onChange={event => setForm({ ...form, specialty: event.target.value === 'ALL' ? '' : event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 p-2"
              >
                <option value="ALL">Todas as especialidades</option>
                {specialties.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
                <option value="__custom__">+ Adicionar nova especialidade</option>
              </select>
              {form.specialty === '__custom__' && (
                <input
                  value={customSpecialty}
                  onChange={event => setCustomSpecialty(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 p-2"
                  placeholder="Digite a nova especialidade"
                />
              )}
            </label>
            <Field
              label="Duração (min)"
              type="number"
              value={String(form.durationMinutes)}
              onChange={value => setForm({ ...form, durationMinutes: Number(value) })}
            />
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Profissional específico
            <select
              value={form.professionalId}
              onChange={event => handleProfessionalChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 p-2"
            >
              <option value="">Regra geral</option>
              {professionals.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.specialty}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Unidade" value={form.unitName} onChange={value => setForm({ ...form, unitName: value })} />
            <Field label="Contrato/Convênio" value={form.contractName} onChange={value => setForm({ ...form, contractName: value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Vigência inicial" type="date" value={form.effectiveFrom} onChange={value => setForm({ ...form, effectiveFrom: value })} />
            <Field label="Vigência final" type="date" value={form.effectiveTo} onChange={value => setForm({ ...form, effectiveTo: value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor de tabela" type="number" value={String(form.grossPrice)} onChange={value => setForm({ ...form, grossPrice: Number(value) })} />
            <Field label="Valor mínimo" type="number" value={String(form.minimumPrice)} onChange={value => setForm({ ...form, minimumPrice: Number(value) })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <fieldset className="block text-sm font-medium text-slate-700">
              <legend>Pagadores</legend>
              <div className="mt-1 flex min-h-[42px] flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                {([['private', 'Particular'], ['insurance', 'Convênio'], ['contract', 'Contrato']] as const).map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 font-normal">
                    <input type="checkbox" checked={form.payers.includes(value)} onChange={() => togglePayer(value)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                    {label}
                  </label>
                ))}
              </div>
              {form.payers.length === 0 && <p className="mt-1 text-xs text-red-600">Selecione ao menos um pagador.</p>}
            </fieldset>

            <label className="block text-sm font-medium text-slate-700">
              Modalidade
              <select
                value={form.modality}
                onChange={event => setForm({ ...form, modality: event.target.value as typeof form.modality })}
                className="mt-1 w-full rounded-lg border border-slate-200 p-2"
              >
                <option value="in_person">Presencial</option>
                <option value="online">Online</option>
                <option value="home">Domiciliar</option>
              </select>
            </label>
          </div>

          <Field label="Código TUSS" value={form.tussCode} onChange={value => setForm({ ...form, tussCode: value })} />

          {message && <p className="text-sm text-brand-700">{message}</p>}

          <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 font-bold text-white hover:bg-brand-700 disabled:opacity-60">
            {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar regra'}
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-bold text-slate-900">Catálogo vigente</h2>
            <p className="text-sm text-slate-500">Produção, faturamento e repasse usam estas regras para decidir automaticamente o valor correto.</p>
          </div>

          <div className="divide-y divide-slate-100">
            {services.length ? (
              services.map(service => (
                <div key={service.id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <strong className="text-slate-800">{service.name}</strong>
                    <p className="mt-1 text-xs text-slate-500">
                      {service.category} · {service.specialty || 'Todas as especialidades'} · {service.durationMinutes} min ·{' '}
                      {(service.payers?.length ? service.payers : [service.payer]).map(payer => payer === 'private' ? 'Particular' : payer === 'insurance' ? 'Convênio' : 'Contrato').join(', ')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      {service.professionalName && <Badge icon={<UserRound className="h-3 w-3" />} text={service.professionalName} />}
                      {service.contractName && <Badge icon={<BadgeDollarSign className="h-3 w-3" />} text={service.contractName} />}
                      {(service.effectiveFrom || service.effectiveTo) && (
                        <Badge icon={<CalendarRange className="h-3 w-3" />} text={`${service.effectiveFrom || 'agora'} até ${service.effectiveTo || 'indeterminado'}`} />
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-start gap-3">
                    <div className="text-right">
                      <strong className="text-brand-700">{money(service.grossPrice)}</strong>
                      <p className="text-xs text-slate-400">min. {money(service.minimumPrice || 0)}</p>
                      {service.unitName && <p className="mt-1 text-[11px] text-slate-500">{service.unitName}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => startEditing(service)} title="Editar regra" aria-label={`Editar ${service.name}`} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => removeService(service)} title="Excluir regra" aria-label={`Excluir ${service.name}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-sm text-slate-500">
                <BadgeDollarSign className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                Cadastre a primeira regra para padronizar produção, faturamento e repasses.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) => (
  <label className="block text-sm font-medium text-slate-700">
    {label}
    <input required={required} type={type} value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2" />
  </label>
);

const Badge = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
    {icon}
    {text}
  </span>
);

export default ServiceCatalogView;
