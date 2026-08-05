import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardPlus, Loader2, Package2 } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { subscribeToPatients } from '../services/healthService';
import { getAllProfessionals } from '../services/repasseService';
import { getClinicServices, resolveClinicServicePrice } from '../services/clinicErpService';
import { getManagerIdForUser } from '../services/accessControlService';
import { registerProductionEntry } from '../services/productionService';
import { getInventoryItems } from '../services/inventoryService';
import { Patient } from '../types/health';
import { Professional } from '../types/finance';
import { ClinicService, InventoryItem, ServicePayer } from '../types/clinicErp';
import { getActiveClinicScopeId, ACTIVE_CLINIC_CHANGED_EVENT } from '../services/activeClinicStorage';
import { getClinics } from '../services/clinicService';

const today = new Date().toISOString().slice(0, 10);
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const ProductionEntryView: React.FC = () => {
  const { user, isAdmin, userProfile } = useUser();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<ClinicService[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [resolvedPrice, setResolvedPrice] = useState<ClinicService | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeClinicId, setActiveClinicId] = useState<string | null>(getActiveClinicScopeId());
  const [activeClinicName, setActiveClinicName] = useState('');
  const [form, setForm] = useState({
    patientId: '',
    patientName: '',
    professionalId: '',
    serviceId: '',
    date: today,
    time: new Date().toTimeString().slice(0, 5),
    payer: 'private' as ServicePayer,
    paymentStatus: 'pending' as 'pending' | 'received',
    attendanceKind: 'standard' as 'standard' | 'package' | 'return_free',
    contractName: '',
    unitName: '',
    packageName: '',
    packageTotalSessions: 10,
    notes: '',
    materialsUsed: [] as Array<{ itemId: string; itemName: string; quantity: number }>
  });

  useEffect(() => {
    const unsubscribe = subscribeToPatients((loadedPatients) => {
      const clinicId = getActiveClinicScopeId();
      setPatients(clinicId ? loadedPatients.filter(patient => patient.clinicId === clinicId) : loadedPatients);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const syncActiveClinic = async () => {
      const clinicId = getActiveClinicScopeId();
      setActiveClinicId(clinicId);
      const clinics = await getClinics();
      const activeClinic = clinicId ? clinics.find(clinic => clinic.id === clinicId) : undefined;
      setActiveClinicName(activeClinic?.name || '');
    };

    syncActiveClinic();
    window.addEventListener(ACTIVE_CLINIC_CHANGED_EVENT, syncActiveClinic);
    return () => window.removeEventListener(ACTIVE_CLINIC_CHANGED_EVENT, syncActiveClinic);
  }, []);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const managerId = (await getManagerIdForUser(user.uid)) || user.uid;
      const [availableProfessionals, availableServices, availableInventory] = await Promise.all([
        getAllProfessionals(managerId, activeClinicId || undefined),
        getClinicServices(managerId),
        getInventoryItems(managerId)
      ]);
      setProfessionals(availableProfessionals);
      setServices(
        activeClinicName
          ? availableServices.filter(service => !service.unitName || service.unitName === activeClinicName)
          : availableServices
      );
      setInventoryItems(availableInventory.filter(item => item.active));
      const ownProfessional = availableProfessionals.find(item => item.userId === user.uid);
      if (ownProfessional) setForm(current => ({ ...current, professionalId: ownProfessional.id }));
    })();
  }, [user?.uid, activeClinicId, activeClinicName]);

  const canChooseProfessional = isAdmin || userProfile?.isClinicManager === true;
  const availableServices = useMemo(
    () => services.filter(item => item.active && item.payer === form.payer),
    [services, form.payer]
  );
  const selectedService = services.find(item => item.id === form.serviceId);
  const selectedProfessional = professionals.find(item => item.id === form.professionalId);
  const previewValue = form.attendanceKind === 'standard' && resolvedPrice ? resolvedPrice.grossPrice : 0;

  useEffect(() => {
    const loadResolvedPrice = async () => {
      if (!user || !form.serviceId || !selectedProfessional) {
        setResolvedPrice(null);
        return;
      }
      const managerId = (await getManagerIdForUser(user.uid)) || user.uid;
      const resolved = await resolveClinicServicePrice(managerId, form.serviceId, {
        payer: form.payer,
        date: form.date,
        professionalId: selectedProfessional.id,
        specialty: selectedProfessional.specialty,
        contractName: form.contractName || undefined,
        unitName: form.unitName || activeClinicName || undefined,
      });
      setResolvedPrice(resolved);
    };

    loadResolvedPrice();
  }, [user?.uid, form.serviceId, form.payer, form.date, form.contractName, form.unitName, selectedProfessional?.id, selectedProfessional?.specialty]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!user || !selectedProfessional || !selectedService) return setMessage('Selecione profissional e serviço.');
    if (!canChooseProfessional && selectedProfessional.userId !== user.uid) return setMessage('Seu acesso só permite registrar a própria produção.');
    const resolvedClinicId = activeClinicId || selectedProfessional.clinicId || selectedProfessional.clinicIds?.[0];
    if (!resolvedClinicId) return setMessage('Selecione uma unidade no topo antes de finalizar o atendimento.');

    setSaving(true);
    try {
      const result = await registerProductionEntry({
        userId: user.uid,
        professional: selectedProfessional,
        patientId: form.patientId || undefined,
        patientName: form.patientName,
        serviceId: form.serviceId,
        clinicId: resolvedClinicId,
        date: form.date,
        time: form.time,
        payer: form.payer,
        paymentStatus: form.paymentStatus,
        attendanceKind: form.attendanceKind,
        contractName: form.contractName || undefined,
        unitName: form.unitName || activeClinicName || undefined,
        packageName: form.attendanceKind === 'package' ? form.packageName || undefined : undefined,
        packageTotalSessions: form.attendanceKind === 'package' ? form.packageTotalSessions : undefined,
        materialsUsed: form.materialsUsed,
        notes: form.notes || undefined
      });

      setMessage(`Atendimento finalizado. ${money(result.grossAmount)} processado automaticamente no ERP.`);
      setForm(current => ({
        ...current,
        patientId: '',
        patientName: '',
        serviceId: '',
        notes: '',
        contractName: '',
        packageName: '',
        packageTotalSessions: 10,
        materialsUsed: []
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nao foi possivel registrar a producao.');
    } finally {
      setSaving(false);
    }
  };

  const toggleMaterial = (item: InventoryItem) => {
    setForm(current => {
      const exists = current.materialsUsed.find(material => material.itemId === item.id);
      if (exists) {
        return {
          ...current,
          materialsUsed: current.materialsUsed.filter(material => material.itemId !== item.id)
        };
      }
      return {
        ...current,
        materialsUsed: [...current.materialsUsed, { itemId: item.id, itemName: item.name, quantity: 1 }]
      };
    });
  };

  const updateMaterialQuantity = (itemId: string, quantity: number) => {
    setForm(current => ({
      ...current,
      materialsUsed: current.materialsUsed.map(material =>
        material.itemId === itemId ? { ...material, quantity: Math.max(1, quantity) } : material
      )
    }));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <ClipboardPlus className="text-teal-600" />
          Portal de Produção Profissional
        </h1>
        <p className="mt-1 text-slate-500">Finalize atendimentos, registre producao, consuma materiais e deixe o ERP gerar faturamento, financeiro e repasse.</p>
      </div>

      <form onSubmit={submit} className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2">
        <Field label="Profissional">
          <select required disabled={!canChooseProfessional && !!form.professionalId} value={form.professionalId} onChange={e => setForm({ ...form, professionalId: e.target.value })} className="input">
            <option value="">Selecione</option>
            {professionals.map(item => <option key={item.id} value={item.id}>{item.name} · {item.specialty}</option>)}
          </select>
        </Field>

        <Field label="Paciente">
          <select
            required
            value={form.patientId}
            onChange={e => {
              const patient = patients.find(item => item.id === e.target.value);
              setForm({ ...form, patientId: e.target.value, patientName: patient?.name || '' });
            }}
            className="input"
          >
            <option value="">{patients.length > 0 ? 'Selecione um paciente cadastrado' : 'Nenhum paciente disponível'}</option>
            {patients.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}{item.cpf ? ` · CPF ${item.cpf}` : ''}
              </option>
            ))}
          </select>
          {patients.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">Cadastre ou vincule um paciente à clínica antes de finalizar o atendimento.</p>
          )}
        </Field>

        <Field label="Tipo de atendimento">
          <select value={form.attendanceKind} onChange={e => setForm({ ...form, attendanceKind: e.target.value as typeof form.attendanceKind })} className="input">
            <option value="standard">Atendimento com cobranca</option>
            <option value="package">Sessao de pacote</option>
            <option value="return_free">Retorno gratuito</option>
          </select>
        </Field>

        <Field label="Pagador">
          <select value={form.payer} onChange={e => setForm({ ...form, payer: e.target.value as ServicePayer, serviceId: '' })} className="input">
            <option value="private">Particular</option>
            <option value="insurance">Convenio</option>
            <option value="contract">Contrato/empresa</option>
          </select>
        </Field>

        <Field label="Servico realizado">
          <select required value={form.serviceId} onChange={e => setForm({ ...form, serviceId: e.target.value })} className="input">
            <option value="">Selecione na tabela de precos</option>
            {availableServices.map(item => <option key={item.id} value={item.id}>{item.name} - {money(item.grossPrice)}</option>)}
          </select>
        </Field>

        <Field label="Contrato ou convenio">
          <input value={form.contractName} onChange={e => setForm({ ...form, contractName: e.target.value })} className="input" placeholder="Opcional para resolver regra comercial" />
        </Field>

        {form.attendanceKind === 'package' && (
          <>
            <Field label="Nome do pacote">
              <input value={form.packageName} onChange={e => setForm({ ...form, packageName: e.target.value })} className="input" placeholder="Ex: Pacote fono infantil 10 sessoes" />
            </Field>

            <Field label="Total de sessoes do pacote">
              <input type="number" min="1" value={form.packageTotalSessions} onChange={e => setForm({ ...form, packageTotalSessions: Math.max(1, Number(e.target.value) || 1) })} className="input" />
            </Field>
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data"><input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input" /></Field>
          <Field label="Hora"><input required type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="input" /></Field>
        </div>

        <Field label="Situacao financeira">
          <select value={form.paymentStatus} onChange={e => setForm({ ...form, paymentStatus: e.target.value as 'pending' | 'received' })} className="input" disabled={form.attendanceKind !== 'standard'}>
            <option value="pending">A receber</option>
            <option value="received">Recebido no atendimento</option>
          </select>
        </Field>

        <div className="lg:col-span-2">
          <Field label="Observacoes">
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input min-h-20" />
          </Field>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Package2 className="h-4 w-4 text-brand-600" />
            Materiais utilizados
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {inventoryItems.length ? inventoryItems.slice(0, 8).map(item => {
              const selected = form.materialsUsed.find(material => material.itemId === item.id);
              return (
                <div key={item.id} className={`rounded-lg border p-3 ${selected ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => toggleMaterial(item)} className="text-left">
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">Disponivel: {item.quantity} {item.unit}</p>
                    </button>
                    <input type="number" min="1" value={selected?.quantity || 1} disabled={!selected} onChange={e => updateMaterialQuantity(item.id, Number(e.target.value))} className="w-20 rounded-lg border border-slate-200 p-2 text-sm" />
                  </div>
                </div>
              );
            }) : <p className="text-sm text-slate-500">Nenhum item de estoque cadastrado ainda.</p>}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 lg:col-span-2">
          <span className="text-sm text-slate-500">Valor resolvido automaticamente</span>
          <strong className="mt-1 block text-2xl text-teal-700">{money(previewValue)}</strong>
          <p className="mt-2 text-xs text-slate-500">
            O portal consulta a mesma regra comercial usada no faturamento, considerando serviço, profissional, especialidade, convênio/contrato e vigência.
          </p>
          {resolvedPrice && (
            <div className="mt-3 rounded-lg border border-teal-100 bg-white p-3 text-xs text-slate-600">
              Regra aplicada: <strong>{resolvedPrice.name}</strong>
              {resolvedPrice.professionalName ? ` · ${resolvedPrice.professionalName}` : ' · regra geral'}
              {resolvedPrice.specialty ? ` · ${resolvedPrice.specialty}` : ''}
            </div>
          )}
        </div>

        {message && <p className="flex items-center gap-2 text-sm font-medium text-teal-700 lg:col-span-2"><CheckCircle2 className="h-4 w-4" />{message}</p>}

        <button disabled={saving} className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white hover:bg-teal-700 disabled:opacity-60 lg:col-span-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Processando...' : 'Finalizar atendimento e gerar eventos'}
        </button>
      </form>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block text-sm font-semibold text-slate-700">
    {label}
    <div className="mt-1 [&_.input]:w-full [&_.input]:rounded-lg [&_.input]:border [&_.input]:border-slate-200 [&_.input]:p-2.5 [&_.input]:font-normal">{children}</div>
  </label>
);

export default ProductionEntryView;
