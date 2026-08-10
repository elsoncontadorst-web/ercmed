import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Edit2, Loader2, Mail, MapPin, Phone, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { Clinic, ClinicFormData } from '../types/clinic';
import { addClinic, deleteClinic, getClinics, updateClinic } from '../services/clinicService';
import { useUser } from '../contexts/UserContext';
import { ClinicSyncStatus } from './ClinicSyncStatus';
import { getStoredActiveClinicId, setStoredActiveClinicId } from '../services/activeClinicStorage';
import { formatCnpj, lookupCnpj } from '../services/cnpjLookupService';

const EMPTY_FORM: ClinicFormData = {
  name: '',
  address: {
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  },
  phone: '',
  email: '',
  specialty: '',
  cnpj: '',
  taxRegime: 'simples_nacional',
  cnes: '',
};

const ClinicsView: React.FC = () => {
  const { isAdmin, userProfile } = useUser();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState<ClinicFormData>(EMPTY_FORM);
  const [activeClinicId, setActiveClinicId] = useState<string | null>(getStoredActiveClinicId());
  const [isLookingUpCnpj, setIsLookingUpCnpj] = useState(false);
  const [cnpjLookupFeedback, setCnpjLookupFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const hasAccess = isAdmin || userProfile?.isClinicManager === true;

  useEffect(() => {
    if (hasAccess) {
      loadClinics();
    } else {
      setLoading(false);
    }
  }, [hasAccess]);

  const loadClinics = async () => {
    setLoading(true);
    try {
      const data = await getClinics();
      setClinics(data);
      if (data.length > 0) {
        const storedClinicId = getStoredActiveClinicId();
        const nextActiveClinicId = data.some(clinic => clinic.id === storedClinicId) ? storedClinicId : data[0].id;
        setActiveClinicId(nextActiveClinicId);
        setStoredActiveClinicId(nextActiveClinicId);
      }
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectActiveClinic = (clinicId: string) => {
    setActiveClinicId(clinicId);
    setStoredActiveClinicId(clinicId);
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingClinic(null);
    setErrorMessage('');
    setCnpjLookupFeedback(null);
  };

  const handleCnpjLookup = async () => {
    setIsLookingUpCnpj(true);
    setCnpjLookupFeedback(null);
    try {
      const result = await lookupCnpj(formData.cnpj);
      setFormData(current => ({
        ...current,
        cnpj: result.cnpj,
        name: current.name || result.name,
        specialty: current.specialty || result.specialty,
        phone: current.phone || result.phone,
        email: current.email || result.email,
        address: {
          street: current.address.street || result.address.street,
          number: current.address.number || result.address.number,
          complement: current.address.complement || result.address.complement,
          neighborhood: current.address.neighborhood || result.address.neighborhood,
          city: current.address.city || result.address.city,
          state: current.address.state || result.address.state,
          zipCode: current.address.zipCode || result.address.zipCode,
        },
      }));
      setCnpjLookupFeedback({ type: 'success', message: 'Dados públicos encontrados e campos vazios preenchidos.' });
    } catch (error) {
      setCnpjLookupFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível consultar o CNPJ.',
      });
    } finally {
      setIsLookingUpCnpj(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingClinic) {
        await updateClinic(editingClinic.id, formData);
      } else {
        await addClinic(formData);
      }

      closeModal();
      await loadClinics();
    } catch (error) {
      console.error('Erro ao salvar clínica:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao salvar clínica.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setFormData({
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone,
      email: clinic.email,
      specialty: clinic.specialty,
      cnpj: clinic.cnpj,
      taxRegime: clinic.taxRegime || 'simples_nacional',
      cnes: clinic.cnes,
    });
    setShowModal(true);
  };

  const handleDelete = async (clinic: Clinic) => {
    if (!confirm(`Tem certeza que deseja excluir a clínica "${clinic.name}"?`)) return;

    try {
      await deleteClinic(clinic.id);
      await loadClinics();
    } catch (error) {
      console.error('Erro ao excluir clínica:', error);
      alert('Erro ao excluir clínica. Tente novamente.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <Building2 className="h-6 w-6 text-brand-600" />
            Clínicas e Unidades
          </h1>
          <p className="text-slate-500">Gerencie a matriz, filiais e unidades operacionais da sua empresa de saúde.</p>
        </div>

        {hasAccess && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Adicionar Clínica
          </button>
        )}
      </div>

      {hasAccess ? (
        <>
          <ClinicSyncStatus onSyncClick={loadClinics} />

          {loading ? (
            <div className="py-10 text-center">Carregando...</div>
          ) : clinics.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <Building2 className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">Nenhuma clínica cadastrada.</p>
              <button onClick={() => setShowModal(true)} className="mt-2 font-medium text-brand-600 hover:underline">
                Adicionar primeira clínica
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clinics.map(clinic => (
                <div
                  key={clinic.id}
                  onClick={() => handleSelectActiveClinic(clinic.id)}
                  className={`cursor-pointer rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md ${
                    activeClinicId === clinic.id ? 'border-brand-500 ring-2 ring-brand-200' : 'border-gray-200'
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-800">{clinic.name}</h3>
                        {activeClinicId === clinic.id && (
                          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                            Unidade ativa
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{clinic.specialty}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={(event) => { event.stopPropagation(); handleEdit(clinic); }} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={(event) => { event.stopPropagation(); handleDelete(clinic); }} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>
                        {clinic.address.street}, {clinic.address.number}
                        {clinic.address.complement ? ` - ${clinic.address.complement}` : ''}
                        <br />
                        {clinic.address.neighborhood}, {clinic.address.city} - {clinic.address.state}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{clinic.phone}</span>
                    </div>

                    {clinic.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{clinic.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          Este acesso está disponível apenas para perfis gestores.
        </div>
      )}

      {showModal && hasAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{editingClinic ? 'Editar Clínica' : 'Nova Clínica'}</h2>
                {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
              </div>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Nome da clínica ou unidade *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Especialidade *</label>
                  <input
                    type="text"
                    value={formData.specialty}
                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Telefone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">E-mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">CNPJ</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.cnpj}
                      onChange={e => {
                        setFormData({ ...formData, cnpj: formatCnpj(e.target.value) });
                        setCnpjLookupFeedback(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleCnpjLookup();
                        }
                      }}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={handleCnpjLookup}
                      disabled={isLookingUpCnpj || !formData.cnpj}
                      className="flex shrink-0 items-center gap-2 rounded-lg border border-brand-600 px-3 py-2.5 font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Consultar dados públicos pelo CNPJ"
                    >
                      {isLookingUpCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      <span className="hidden sm:inline">Buscar</span>
                    </button>
                  </div>
                  {cnpjLookupFeedback && (
                    <p className={`mt-1.5 flex items-center gap-1 text-xs ${cnpjLookupFeedback.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
                      {cnpjLookupFeedback.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {cnpjLookupFeedback.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">CNES</label>
                  <input
                    type="text"
                    value={formData.cnes}
                    onChange={e => setFormData({ ...formData, cnes: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Regime tributário *</label>
                  <select
                    value={formData.taxRegime || 'simples_nacional'}
                    onChange={e => setFormData({ ...formData, taxRegime: e.target.value as ClinicFormData['taxRegime'] })}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  >
                    <option value="simples_nacional">Simples Nacional</option>
                    <option value="lucro_presumido">Lucro Presumido</option>
                    <option value="lucro_real">Lucro Real</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-500">Este regime será usado automaticamente na configuração do Emissor NFS-e.</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-3 font-semibold text-slate-800">Endereço</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="sm:col-span-3">
                    <label className="text-sm font-medium text-slate-700">Rua *</label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={e => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                      className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Número *</label>
                    <input
                      type="text"
                      value={formData.address.number}
                      onChange={e => setFormData({ ...formData, address: { ...formData.address, number: e.target.value } })}
                      className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Complemento</label>
                    <input
                      type="text"
                      value={formData.address.complement}
                      onChange={e => setFormData({ ...formData, address: { ...formData.address, complement: e.target.value } })}
                      className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Bairro *</label>
                    <input
                      type="text"
                      value={formData.address.neighborhood}
                      onChange={e => setFormData({ ...formData, address: { ...formData.address, neighborhood: e.target.value } })}
                      className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Cidade *</label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={e => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                      className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Estado *</label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={e => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                      className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 uppercase outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">CEP *</label>
                    <input
                      type="text"
                      value={formData.address.zipCode}
                      onChange={e => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value } })}
                      className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 font-medium text-white hover:bg-brand-700"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Salvando...' : editingClinic ? 'Atualizar Clínica' : 'Cadastrar Clínica'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicsView;
