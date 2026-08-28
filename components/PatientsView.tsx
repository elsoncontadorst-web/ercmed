import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, X, Check, Calendar, Phone, Mail, MapPin, AlertCircle, CheckCircle2, RefreshCw, Trash2, Building2, UserPlus } from 'lucide-react';
import { auth } from '../services/firebase';
import { addPatient, getAllPatients, updatePatient, searchPatients, deletePatient } from '../services/healthService';
import { getClinics } from '../services/clinicService';
import { getAllowedClinicsForUser } from '../services/accessControlService';
import { Patient } from '../types/health';
import { Clinic } from '../types/clinic';
import { useUser } from '../contexts/UserContext';
import { AccountTier, TIER_CONFIG } from '../types/accountTiers';
import { Lock } from 'lucide-react';
import { formatCPF, formatPhone } from '../utils/formatters';
import { ACTIVE_CLINIC_CHANGED_EVENT, getActiveClinicScopeId } from '../services/activeClinicStorage';
import { getClients, saveClient } from '../services/clientService';
import { getManagerIdForUser } from '../services/accessControlService';
import type { Client } from '../types/client';

import { AppView } from '../types';

interface PatientsViewProps {
    setView: (view: AppView) => void;
}

const PatientsView: React.FC<PatientsViewProps> = ({ setView }) => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
    const [managerId, setManagerId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const { userProfile } = useUser();
    const [activeClinicId, setActiveClinicId] = useState<string | null>(getActiveClinicScopeId());

    // Trial Limit Check
    const canAddMorePatients = () => {
        const tier = userProfile?.accountTier as AccountTier;
        if (tier === AccountTier.TRIAL) {
            const limit = TIER_CONFIG[AccountTier.TRIAL].maxPatients || 10;
            return patients.length < limit;
        }
        return true;
    };

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        cpf: '',
        birthdate: '',
        phone: '',
        email: '',
        address: '',
        gender: '',
        clinicId: '',
        clientId: '',
        isMinor: false,
        guardianName: '',
        guardianCpf: '',
        guardianRelationship: 'Pai',
        guardianPhone: '',
        guardianEmail: '',
        medicalNotes: '',
        bloodType: '',
        allergies: '',
        chronicConditions: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const syncClinic = () => {
            setActiveClinicId(getActiveClinicScopeId());
        };

        window.addEventListener(ACTIVE_CLINIC_CHANGED_EVENT, syncClinic);
        return () => window.removeEventListener(ACTIVE_CLINIC_CHANGED_EVENT, syncClinic);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (user) {
                // Load Patients
                const allPatients = await getAllPatients();
                const clinicScopedPatients = activeClinicId
                    ? allPatients.filter(patient => patient.clinicId === activeClinicId)
                    : allPatients;
                setPatients(clinicScopedPatients);
                setFilteredPatients(clinicScopedPatients);
                const managerId = (await getManagerIdForUser(user.uid)) || user.uid;
                setManagerId(managerId);
                setClients(await getClients(managerId, activeClinicId || undefined));

                // Load Clinics
                const allClinics = await getClinics();
                const allowedIds = await getAllowedClinicsForUser(user.uid);

                // Filter clinics based on access
                // If user is Manager (allowedIds includes user.uid usually, but clinics have their own IDs),
                // we show all clinics returned by getClinics (which are the manager's clinics).
                // If user is Professional, allowedIds has the specific clinic IDs they can access.

                // Note: getAllowedClinicsForUser returns [managerId] and [clinicIds]. 
                // getClinics returns actual Clinic objects.
                const filteredClinics = allClinics.filter(c => allowedIds.includes(c.id));
                setClinics(filteredClinics);
                const preferredClinicId =
                    (activeClinicId && filteredClinics.some(clinic => clinic.id === activeClinicId) ? activeClinicId : null) ||
                    filteredClinics[0]?.id ||
                    '';
                setFormData(current => current.clinicId
                    ? current
                    : { ...current, clinicId: preferredClinicId });
            }
        } catch (error) {
            console.error("Error loading data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeClinicId]);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setFilteredPatients(patients);
        } else {
            const user = auth.currentUser;
            if (user) {
                const results = await searchPatients(query, user.uid);
                setFilteredPatients(results);
            }
        }
    };

    const calculateAge = (birthdate?: string): number | null => {
        if (!birthdate) return null;
        const today = new Date();
        const birth = new Date(`${birthdate}T12:00:00`);
        if (Number.isNaN(birth.getTime()) || birth > today) return null;
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const handleDelete = async (patientId: string) => {
        if (!confirm('Tem certeza que deseja excluir este paciente? Esta ação é irreversível.')) return;
        setLoading(true);
        try {
            const success = await deletePatient(patientId);
            if (success) {
                setNotification({ type: 'success', message: 'Paciente excluído com sucesso.' });
                loadData();
            } else {
                setNotification({ type: 'error', message: 'Erro ao excluir paciente.' });
            }
        } catch (error) {
            console.error('Error deleting patient', error);
            setNotification({ type: 'error', message: 'Erro ao excluir paciente.' });
        } finally {
            setLoading(false);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setNotification(null);

        if (!formData.clinicId) {
            setNotification({ type: 'error', message: 'Selecione uma clínica para o paciente.' });
            setLoading(false);
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                setNotification({ type: 'error', message: 'Usuário não autenticado' });
                setLoading(false);
                return;
            }

            const age = calculateAge(formData.birthdate);
            if (age === null) {
                setNotification({ type: 'error', message: 'Informe uma data de nascimento válida.' });
                setLoading(false);
                return;
            }
            const isMinor = age < 18;

            const patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'> = {
                name: formData.name,
                cpf: formData.cpf || undefined,
                birthdate: formData.birthdate,
                phone: formData.phone,
                email: formData.email || undefined,
                address: formData.address || undefined,
                gender: formData.gender || undefined,
                clinicId: formData.clinicId,
                clientId: formData.clientId || undefined,
                isMinor,
                guardian: isMinor ? {
                    name: formData.guardianName,
                    cpf: formData.guardianCpf,
                    relationship: formData.guardianRelationship,
                    phone: formData.guardianPhone,
                    email: formData.guardianEmail || undefined
                } : undefined,
                medicalNotes: formData.medicalNotes || undefined,
                bloodType: formData.bloodType || undefined,
                allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : undefined,
                chronicConditions: formData.chronicConditions ? formData.chronicConditions.split(',').map(c => c.trim()) : undefined,
                professionalId: user.uid,
                active: true
            };

            if (editingPatient) {
                await updatePatient(editingPatient.id, patientData);
                setNotification({ type: 'success', message: 'Paciente atualizado com sucesso!' });
            } else {
                await addPatient(patientData);
                setNotification({ type: 'success', message: 'Paciente cadastrado com sucesso!' });
            }

            setShowModal(false);
            resetForm();
            loadData();

            // Clear notification after 5 seconds
            setTimeout(() => setNotification(null), 5000);
        } catch (error) {
            console.error("Error saving patient", error);
            setNotification({ type: 'error', message: 'Erro ao salvar paciente. Tente novamente.' });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            cpf: '',
            birthdate: '',
            phone: '',
            email: '',
            address: '',
            gender: '',
            clinicId: clinics.length === 1 ? clinics[0].id : (clinics.length > 0 ? clinics[0].id : ''),
            clientId: '',
            isMinor: false,
            guardianName: '',
            guardianCpf: '',
            guardianRelationship: 'Pai',
            guardianPhone: '',
            guardianEmail: '',
            medicalNotes: '',

            bloodType: '',
            allergies: '',
            chronicConditions: ''
        });
        setEditingPatient(null);
    };

    const handleEdit = (patient: Patient) => {
        setEditingPatient(patient);
        setFormData({
            name: patient.name,
            cpf: patient.cpf || '',
            birthdate: patient.birthdate,
            phone: patient.phone,
            email: patient.email || '',
            address: patient.address || '',
            gender: patient.gender || '',
            clinicId: patient.clinicId || '',
            clientId: patient.clientId || '',
            isMinor: patient.isMinor,
            guardianName: patient.guardian?.name || '',
            guardianCpf: patient.guardian?.cpf || '',
            guardianRelationship: patient.guardian?.relationship || 'Pai',
            guardianPhone: patient.guardian?.phone || '',
            guardianEmail: patient.guardian?.email || '',
            medicalNotes: patient.medicalNotes || '',
            bloodType: patient.bloodType || '',
            allergies: patient.allergies?.join(', ') || '',
            chronicConditions: patient.chronicConditions?.join(', ') || ''
        });
        setShowModal(true);
    };

    const digits = (value?: string) => String(value || '').replace(/\D/g, '');
    const importableClients = clients.filter(client => {
        const taxId = digits(client.taxId);
        if (taxId.length === 14 || client.patientId) return false;
        return !patients.some(patient => patient.clientId === client.id || (taxId.length === 11 && digits(patient.cpf) === taxId));
    });

    const openClientImport = () => {
        setSelectedClientIds(new Set());
        setShowImportModal(true);
    };

    const toggleClientSelection = (clientId: string) => {
        setSelectedClientIds(current => {
            const next = new Set(current);
            if (next.has(clientId)) next.delete(clientId); else next.add(clientId);
            return next;
        });
    };

    const importSelectedClients = async () => {
        const selected = importableClients.filter(client => selectedClientIds.has(client.id));
        if (!selected.length || !managerId) return;
        const clinicId = activeClinicId || clinics[0]?.id;
        if (!clinicId) {
            setNotification({ type: 'error', message: 'Selecione uma clínica antes de importar pacientes.' });
            return;
        }
        const tier = userProfile?.accountTier as AccountTier;
        if (tier === AccountTier.TRIAL) {
            const limit = TIER_CONFIG[AccountTier.TRIAL].maxPatients || 10;
            if (patients.length + selected.length > limit) {
                setNotification({ type: 'error', message: `A seleção ultrapassa o limite de ${limit} pacientes do plano de teste.` });
                return;
            }
        }
        setLoading(true);
        try {
            let imported = 0;
            for (const client of selected) {
                const taxId = digits(client.taxId);
                const address = [client.street, client.number, client.complement, client.neighborhood, client.city, client.state].filter(Boolean).join(', ');
                const patientId = await addPatient({
                    name: client.name, ...(taxId.length === 11 ? { cpf: taxId } : {}), birthdate: '',
                    phone: client.phone || '', ...(client.email ? { email: client.email } : {}), ...(address ? { address } : {}),
                    clinicId, clientId: client.id, isMinor: false, active: true,
                });
                if (!patientId) continue;
                const { id, createdAt, updatedAt, ...clientInput } = client;
                await saveClient(managerId, { ...clientInput, patientId }, id);
                imported += 1;
            }
            setShowImportModal(false);
            setSelectedClientIds(new Set());
            await loadData();
            setNotification({ type: 'success', message: `${imported} cliente(s) incluído(s) como paciente(s) e vinculados com sucesso.` });
        } catch (error) {
            console.error('Erro ao importar clientes como pacientes:', error);
            setNotification({ type: 'error', message: 'Não foi possível concluir toda a importação.' });
        } finally { setLoading(false); }
    };

    const age = formData.birthdate ? calculateAge(formData.birthdate) : null;
    const showGuardianFields = age !== null && age < 18;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-6 h-6 text-brand-600" />
                        Gestão de Pacientes
                    </h1>
                    <p className="text-slate-500">Cadastro e gerenciamento de pacientes</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center gap-2 transition-colors disabled:opacity-50"
                        title="Atualizar lista"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                    <button onClick={openClientImport} className="px-4 py-2 rounded-lg flex items-center gap-2 border border-teal-200 bg-teal-50 text-teal-700 font-semibold hover:bg-teal-100">
                        <UserPlus className="w-4 h-4" /> Importar clientes
                    </button>
                    <button
                        onClick={() => {
                            if (!canAddMorePatients()) {
                                if (confirm('Você atingiu o limite de pacientes do plano de teste (10 pacientes). Deseja ver os planos para fazer upgrade?')) {
                                    setView(AppView.PLANS);
                                }
                                return;
                            }
                            resetForm();
                            setShowModal(true);
                        }}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${!canAddMorePatients()
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-brand-600 text-white hover:bg-brand-700'
                            }`}
                    >
                        {!canAddMorePatients() ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        Novo Paciente
                    </button>
                </div>
            </div>

            {/* Notification */}
            {notification && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                    {notification.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                        {notification.message}
                    </span>
                </div>
            )}

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Buscar por nome, CPF ou telefone..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>
            </div>

            {/* Patients List */}
            <div className="space-y-3 md:hidden">
                {filteredPatients.length === 0 ? <p className="rounded-xl border bg-white p-8 text-center text-slate-500">Nenhum paciente encontrado.</p> : filteredPatients.map(patient => {
                    const patientAge = calculateAge(patient.birthdate);
                    const patientClinic = clinics.find(c => c.id === patient.clinicId);
                    return <article key={patient.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-slate-900">{patient.name}</h3><p className="text-xs text-slate-500">{patient.cpf ? `CPF: ${patient.cpf}` : 'CPF não informado'}</p></div><div className="flex shrink-0"><button aria-label="Editar paciente" onClick={() => handleEdit(patient)} className="rounded-lg bg-brand-50 p-2 text-brand-600"><Edit2 className="h-4 w-4"/></button>{(userProfile?.isClinicManager === true || userProfile?.accountTier === AccountTier.UNLIMITED) && <button aria-label="Excluir paciente" onClick={() => handleDelete(patient.id)} className="ml-1 rounded-lg bg-red-50 p-2 text-red-500"><Trash2 className="h-4 w-4"/></button>}</div></div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-slate-400">Idade</p><p>{patientAge === null ? 'Não informada' : `${patientAge} anos`}</p></div><div><p className="text-xs text-slate-400">Telefone</p><p className="truncate">{patient.phone || '—'}</p></div><div className="col-span-2"><p className="text-xs text-slate-400">Clínica</p><p className="truncate text-blue-700">{patientClinic?.name || 'Geral'}</p></div></div></article>;
                })}
            </div>

            {showImportModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
                    <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-start justify-between border-b p-5"><div><h2 className="text-xl font-bold text-slate-900">Incluir clientes como pacientes</h2><p className="mt-1 text-sm text-slate-500">Selecione várias pessoas físicas para criar e vincular os cadastros de uma só vez.</p></div><button onClick={() => setShowImportModal(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>
                        <div className="border-b bg-slate-50 px-5 py-3"><label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={importableClients.length > 0 && selectedClientIds.size === importableClients.length} onChange={event => setSelectedClientIds(event.target.checked ? new Set(importableClients.map(client => client.id)) : new Set())} className="h-4 w-4 accent-teal-700"/>Selecionar todos os {importableClients.length} clientes disponíveis</label></div>
                        <div className="flex-1 space-y-2 overflow-y-auto p-5">{importableClients.length ? importableClients.map(client => <label key={client.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${selectedClientIds.has(client.id) ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}><input type="checkbox" checked={selectedClientIds.has(client.id)} onChange={() => toggleClientSelection(client.id)} className="h-4 w-4 accent-teal-700"/><span className="min-w-0 flex-1"><strong className="block truncate text-slate-900">{client.name}</strong><span className="text-xs text-slate-500">{client.taxId || 'CPF não informado'}{client.phone ? ` • ${client.phone}` : ''}</span></span></label>) : <div className="py-12 text-center"><CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400"/><p className="font-bold text-slate-700">Todos os clientes elegíveis já são pacientes</p><p className="mt-1 text-sm text-slate-500">Cadastros com CNPJ não são exibidos nesta importação.</p></div>}</div>
                        <div className="flex items-center justify-between border-t bg-white p-5"><p className="text-sm font-semibold text-slate-600">{selectedClientIds.size} selecionado(s)</p><div className="flex gap-2"><button onClick={() => setShowImportModal(false)} className="rounded-xl border px-4 py-2.5 font-bold text-slate-600">Cancelar</button><button disabled={loading || selectedClientIds.size === 0} onClick={() => void importSelectedClients()} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 font-bold text-white disabled:opacity-50">{loading ? <RefreshCw className="h-4 w-4 animate-spin"/> : <UserPlus className="h-4 w-4"/>}Incluir como pacientes</button></div></div>
                    </div>
                </div>
            )}
            <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
                <table className="w-full min-w-[900px] text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 font-semibold text-slate-700">Nome</th>
                            <th className="p-4 font-semibold text-slate-700">Clínica</th>
                            <th className="p-4 font-semibold text-slate-700">Idade</th>
                            <th className="p-4 font-semibold text-slate-700">Contato</th>
                            <th className="p-4 font-semibold text-slate-700">Responsável</th>
                            <th className="p-4 font-semibold text-slate-700">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPatients.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500">
                                    Nenhum paciente encontrado.
                                </td>
                            </tr>
                        ) : (
                            filteredPatients.map(patient => {
                                const patientAge = calculateAge(patient.birthdate);
                                const patientClinic = clinics.find(c => c.id === patient.clinicId);
                                return (
                                    <tr key={patient.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="p-4">
                                            <div>
                                                <p className="font-medium text-slate-900">{patient.name}</p>
                                                {patient.cpf && <p className="text-xs text-slate-500">CPF: {patient.cpf}</p>}
                                                {patient.clientId && <p className="mt-1 text-xs font-medium text-teal-600">Cliente fiscal: {clients.find(client => client.id === patient.clientId)?.name || 'Vinculado'}</p>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {patientClinic ? (
                                                <span className="flex items-center gap-1 text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-md w-fit">
                                                    <Building2 className="w-3 h-3" />
                                                    {patientClinic.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">Geral</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {patientAge === null ? 'Não informada' : `${patientAge} anos`}
                                            {patient.isMinor && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Menor</span>}
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            <div className="space-y-1">
                                                <p className="flex items-center gap-1 text-sm">
                                                    <Phone className="w-3 h-3" />
                                                    {patient.phone}
                                                </p>
                                                {patient.email && (
                                                    <p className="flex items-center gap-1 text-sm">
                                                        <Mail className="w-3 h-3" />
                                                        {patient.email}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {patient.guardian ? (
                                                <div>
                                                    <p className="font-medium text-sm">{patient.guardian.name}</p>
                                                    <p className="text-xs text-slate-500">{patient.guardian.relationship}</p>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleEdit(patient)}
                                                className="text-brand-600 hover:text-brand-700 p-2 rounded-lg hover:bg-brand-50"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            {(userProfile?.isClinicManager === true || userProfile?.accountTier === AccountTier.UNLIMITED) && (
                                                <button
                                                    onClick={() => handleDelete(patient.id)}
                                                    className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 ml-2"
                                                    title="Excluir Paciente"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingPatient ? 'Editar Paciente' : 'Novo Paciente'}
                            </h2>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-500 hover:text-slate-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-slate-700 block mb-1">Clínica *</label>
                                    <select
                                        value={formData.clinicId}
                                        onChange={(e) => setFormData({ ...formData, clinicId: e.target.value })}
                                        disabled={clinics.length === 1}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 bg-white disabled:bg-slate-50 disabled:text-slate-700"
                                        required
                                    >
                                        <option value="">Selecione a Clínica...</option>
                                        {clinics.map(clinic => (
                                            <option key={clinic.id} value={clinic.id}>
                                                {clinic.name}
                                            </option>
                                        ))}
                                    </select>
                                    {clinics.length === 1 && (
                                        <p className="mt-1 text-xs text-emerald-600">
                                            Clínica vinculada automaticamente ao seu perfil.
                                        </p>
                                    )}
                                    {clinics.length === 0 && (
                                        <p className="text-xs text-red-500 mt-1">
                                            Nenhuma clínica disponível. Crie uma clínica primeiro.
                                        </p>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-slate-700 block mb-1">Cliente fiscal vinculado</label>
                                    <select
                                        value={formData.clientId}
                                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                    >
                                        <option value="">Não vincular cliente</option>
                                        {clients.map(client => <option key={client.id} value={client.id}>{client.name} {client.taxId ? `— ${client.taxId}` : ''}</option>)}
                                    </select>
                                    <p className="mt-1 text-xs text-slate-500">Ao selecionar este paciente na NFS-e, serão usados os dados fiscais e o endereço deste cliente.</p>
                                </div>

                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-slate-700">Nome Completo *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700">Data de Nascimento *</label>
                                    <input
                                        type="date"
                                        value={formData.birthdate}
                                        onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        required
                                    />
                                    {age !== null && (
                                        <p className="text-xs text-slate-500 mt-1">Idade: {age} anos</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700">CPF {!showGuardianFields && '*'}</label>
                                    <input
                                        type="text"
                                        value={formData.cpf}
                                        onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        required={!showGuardianFields}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700">Telefone *</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
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
                                    <label className="text-sm font-medium text-slate-700">Sexo</label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Feminino">Feminino</option>
                                        <option value="Outro">Outro</option>
                                        <option value="Prefiro não informar">Prefiro não informar</option>
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-slate-700">Endereço</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                            </div>

                            {/* Guardian Info (for minors) */}
                            {showGuardianFields && (
                                <div className="border-t border-gray-200 pt-4 space-y-4">
                                    <div className="flex items-center gap-2 text-blue-700 bg-blue-50 p-3 rounded-lg">
                                        <AlertCircle className="w-5 h-5" />
                                        <p className="text-sm font-medium">Paciente menor de idade - Dados do responsável obrigatórios</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-sm font-medium text-slate-700">Nome do Responsável *</label>
                                            <input
                                                type="text"
                                                value={formData.guardianName}
                                                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                                required={showGuardianFields}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-slate-700">CPF do Responsável *</label>
                                            <input
                                                type="text"
                                                value={formData.guardianCpf}
                                                onChange={(e) => setFormData({ ...formData, guardianCpf: formatCPF(e.target.value) })}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                                required={showGuardianFields}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-slate-700">Parentesco *</label>
                                            <select
                                                value={formData.guardianRelationship}
                                                onChange={(e) => setFormData({ ...formData, guardianRelationship: e.target.value })}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                                required={showGuardianFields}
                                            >
                                                <option value="Pai">Pai</option>
                                                <option value="Mãe">Mãe</option>
                                                <option value="Avô">Avô</option>
                                                <option value="Avó">Avó</option>
                                                <option value="Tutor Legal">Tutor Legal</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-slate-700">Telefone do Responsável *</label>
                                            <input
                                                type="tel"
                                                value={formData.guardianPhone}
                                                onChange={(e) => setFormData({ ...formData, guardianPhone: formatPhone(e.target.value) })}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                                required={showGuardianFields}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-slate-700">Email do Responsável</label>
                                            <input
                                                type="email"
                                                value={formData.guardianEmail}
                                                onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Medical Info */}
                            <div className="border-t border-gray-200 pt-4 space-y-4">
                                <h3 className="font-semibold text-slate-700">Informações Médicas (Opcional)</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-slate-700">Tipo Sanguíneo</label>
                                        <select
                                            value={formData.bloodType}
                                            onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="A+">A+</option>
                                            <option value="A-">A-</option>
                                            <option value="B+">B+</option>
                                            <option value="B-">B-</option>
                                            <option value="AB+">AB+</option>
                                            <option value="AB-">AB-</option>
                                            <option value="O+">O+</option>
                                            <option value="O-">O-</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-slate-700">Alergias (separadas por vírgula)</label>
                                        <input
                                            type="text"
                                            value={formData.allergies}
                                            onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                                            placeholder="Ex: Penicilina, Látex"
                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="text-sm font-medium text-slate-700">Condições Crônicas (separadas por vírgula)</label>
                                        <input
                                            type="text"
                                            value={formData.chronicConditions}
                                            onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                                            placeholder="Ex: Diabetes, Hipertensão"
                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="text-sm font-medium text-slate-700">Observações Médicas</label>
                                        <textarea
                                            value={formData.medicalNotes}
                                            onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                                            rows={3}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-brand-600 text-white py-3 rounded-lg hover:bg-brand-700 font-medium mt-4"
                            >
                                {loading ? 'Salvando...' : editingPatient ? 'Atualizar Paciente' : 'Cadastrar Paciente'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientsView;
