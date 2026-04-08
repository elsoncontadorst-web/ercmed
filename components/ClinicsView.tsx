import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, X, MapPin, Phone, Mail, Save } from 'lucide-react';
import { Clinic, ClinicFormData } from '../types/clinic';
import { getClinics, addClinic, updateClinic, deleteClinic } from '../services/clinicService';
import { useUser } from '../contexts/UserContext';
import { canAccessClinicManagement, UPGRADE_MESSAGES } from '../types/accountTiers';
import { UpgradePrompt } from './UpgradePrompt';
import { ClinicSyncStatus } from './ClinicSyncStatus';

const ClinicsView: React.FC = () => {
    const { userTier } = useUser();
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');


    const [formData, setFormData] = useState<ClinicFormData>({
        name: '',
        address: {
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            state: '',
            zipCode: ''
        },
        phone: '',
        email: '',
        specialty: '',
        cnpj: '',
        cnes: ''
    });

    const hasAccess = canAccessClinicManagement(userTier);

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
        } catch (error) {
            console.error('Error loading clinics:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            address: {
                street: '',
                number: '',
                complement: '',
                neighborhood: '',
                city: '',
                state: '',
                zipCode: ''
            },
            phone: '',
            email: '',
            specialty: '',
            cnpj: '',
            cnes: ''
        });
        setEditingClinic(null);
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

            setShowModal(false);
            resetForm();
            setErrorMessage('');
            await loadClinics();
        } catch (error) {
            console.error('Error saving clinic:', error);
            const msg = error instanceof Error ? error.message : 'Erro ao salvar consultório. Tente novamente.';
            setErrorMessage(msg);
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
            cnes: clinic.cnes
        });
        setShowModal(true);
    };

    const handleDelete = async (clinic: Clinic) => {
        if (!confirm(`Tem certeza que deseja excluir o consultório "${clinic.name}"?`)) return;

        try {
            await deleteClinic(clinic.id);
            await loadClinics();
        } catch (error) {
            console.error('Error deleting clinic:', error);
            alert('Erro ao excluir consultório. Tente novamente.');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-brand-600" />
                        Consultórios
                    </h1>
                    <p className="text-slate-500">Gerencie os consultórios da sua clínica</p>
                </div>

                {hasAccess ? (
                    <button
                        onClick={() => {
                            resetForm();
                            setShowModal(true);
                        }}
                        className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Adicionar Consultório
                    </button>
                ) : (
                    <button
                        onClick={() => alert(UPGRADE_MESSAGES.clinicManagement)}
                        className="bg-slate-300 text-slate-600 px-4 py-2 rounded-lg cursor-not-allowed flex items-center gap-2 relative"
                    >
                        <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1 rounded-full">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <Plus className="w-4 h-4" />
                        Adicionar Consultório
                    </button>
                )}
            </div>

            {/* Sync Status */}
            {hasAccess && <ClinicSyncStatus onSyncClick={loadClinics} />}

            {/* Content */}
            {!hasAccess ? (
                <UpgradePrompt
                    featureName="Gestão de Consultórios"
                    message={UPGRADE_MESSAGES.clinicManagement}
                    currentTier={userTier}
                />
            ) : loading ? (
                <div className="text-center py-10">Carregando...</div>
            ) : clinics.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum consultório cadastrado.</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="text-brand-600 font-medium mt-2 hover:underline"
                    >
                        Adicionar primeiro consultório
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {clinics.map(clinic => (
                        <div
                            key={clinic.id}
                            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{clinic.name}</h3>
                                    <p className="text-sm text-slate-500">{clinic.specialty}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(clinic)}
                                        className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(clinic)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-slate-600">
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>
                                        {clinic.address.street}, {clinic.address.number}
                                        {clinic.address.complement && ` - ${clinic.address.complement}`}
                                        <br />
                                        {clinic.address.neighborhood}, {clinic.address.city} - {clinic.address.state}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    <span>{clinic.phone}</span>
                                </div>

                                {clinic.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        <span>{clinic.email}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && hasAccess && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingClinic ? 'Editar Consultório' : 'Novo Consultório'}
{errorMessage && (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 mt-2">
    <span>{errorMessage}</span>
    <button onClick={() => setErrorMessage('')} className="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-500">×</button>
  </div>
)}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    resetForm();
                                }}
                                className="text-slate-500 hover:text-slate-700"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-slate-700">Nome do Consultório *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700">Especialidade *</label>
                                    <input
                                        type="text"
                                        value={formData.specialty}
                                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700">Telefone *</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="(00) 00000-0000"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700">CNPJ</label>
                                    <input
                                        type="text"
                                        value={formData.cnpj}
                                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                                        placeholder="00.000.000/0000-00"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700">CNES</label>
                                    <input
                                        type="text"
                                        value={formData.cnes}
                                        onChange={(e) => setFormData({ ...formData, cnes: e.target.value })}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-slate-800 mb-3">Endereço</h3>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-3">
                                        <label className="text-sm font-medium text-slate-700">Rua *</label>
                                        <input
                                            type="text"
                                            value={formData.address.street}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                address: { ...formData.address, street: e.target.value }
                                            })}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-slate-700">Número *</label>
                                        <input
                                            type="text"
                                            value={formData.address.number}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                address: { ...formData.address, number: e.target.value }
                                            })}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                            required
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="text-sm font-medium text-slate-700">Complemento</label>
                                        <input
                                            type="text"
                                            value={formData.address.complement}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                address: { ...formData.address, complement: e.target.value }
                                            })}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="text-sm font-medium text-slate-700">Bairro *</label>
                                        <input
                                            type="text"
                                            value={formData.address.neighborhood}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                address: { ...formData.address, neighborhood: e.target.value }
                                            })}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                            required
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="text-sm font-medium text-slate-700">Cidade *</label>
                                        <input
                                            type="text"
                                            value={formData.address.city}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                address: { ...formData.address, city: e.target.value }
                                            })}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-slate-700">Estado *</label>
                                        <input
                                            type="text"
                                            value={formData.address.state}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                address: { ...formData.address, state: e.target.value }
                                            })}
                                            maxLength={2}
                                            placeholder="UF"
                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-slate-700">CEP *</label>
                                        <input
                                            type="text"
                                            value={formData.address.zipCode}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                address: { ...formData.address, zipCode: e.target.value }
                                            })}
                                            placeholder="00000-000"
                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-brand-600 text-white py-3 rounded-lg hover:bg-brand-700 font-medium flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {loading ? 'Salvando...' : editingClinic ? 'Atualizar Consultório' : 'Cadastrar Consultório'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClinicsView;
