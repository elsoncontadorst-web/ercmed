import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, RefreshCw, ChevronRight, ChevronDown, Check, X, Shield, Plus } from 'lucide-react';
import { getAllPatients, getTeamMembers, addTeamMember, searchPatients } from '../services/healthService';
import { Patient, PatientTeamMember } from '../types/health';
import { useUser } from '../contexts/UserContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const ClinicTeamsView: React.FC = () => {
    const { userProfile } = useUser();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
    const [teamMembers, setTeamMembers] = useState<Record<string, PatientTeamMember[]>>({});
    const [loadingTeam, setLoadingTeam] = useState<string | null>(null);

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [emailToAdd, setEmailToAdd] = useState('');
    const [roleToAdd, setRoleToAdd] = useState('');
    const [addingMember, setAddingMember] = useState(false);

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        setLoading(true);
        try {
            // Load patients managed by this user
            const data = await getAllPatients();
            setPatients(data);
        } catch (error) {
            console.error('Error loading patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const togglePatient = async (patientId: string) => {
        if (expandedPatient === patientId) {
            setExpandedPatient(null);
            return;
        }

        setExpandedPatient(patientId);
        if (!teamMembers[patientId]) {
            setLoadingTeam(patientId);
            try {
                const members = await getTeamMembers(patientId);
                setTeamMembers(prev => ({ ...prev, [patientId]: members }));
            } catch (error) {
                console.error('Error loading team:', error);
            } finally {
                setLoadingTeam(null);
            }
        }
    };

    const handleAddMember = (patient: Patient) => {
        setSelectedPatient(patient);
        setIsAddModalOpen(true);
        setEmailToAdd('');
        setRoleToAdd('');
    };

    const submitAddMember = async () => {
        if (!selectedPatient || !emailToAdd || !roleToAdd) return;

        setAddingMember(true);
        try {
            // 1. Find professional by email
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', emailToAdd));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                alert('Profissional não encontrado com este e-mail.');
                setAddingMember(false);
                return;
            }

            const professionalDoc = snapshot.docs[0];
            const professionalData = professionalDoc.data();

            // 2. Add directly to team (Manager privilege)
            await addTeamMember({
                patientId: selectedPatient.id,
                professionalId: professionalDoc.id,
                professionalEmail: emailToAdd,
                professionalName: professionalData.displayName || professionalData.name || 'Profissional',
                specialty: professionalData.specialty || professionalData.profession || 'Geral',
                role: roleToAdd,
                assignedBy: userProfile?.displayName || 'Gestor'
            });

            // 3. Refresh team list
            const updatedMembers = await getTeamMembers(selectedPatient.id);
            setTeamMembers(prev => ({ ...prev, [selectedPatient.id]: updatedMembers }));

            setIsAddModalOpen(false);
            alert('Profissional adicionado à equipe com sucesso!');

        } catch (error) {
            console.error('Error adding member:', error);
            alert('Erro ao adicionar membro à equipe.');
        } finally {
            setAddingMember(false);
        }
    };

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cpf?.includes(searchTerm)
    );

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-7 h-7 text-brand-600" />
                        Gestão de Equipes da Clínica
                    </h1>
                    <p className="text-slate-600 mt-1">
                        Visualize e gerencie as equipes multidisciplinares de seus pacientes.
                    </p>
                </div>
                <button
                    onClick={loadPatients}
                    className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium"
                >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar Lista
                </button>
            </div>

            {/* Search */}
            <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar paciente por nome ou CPF..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    />
                </div>
            </div>

            {/* Patients List */}
            {loading ? (
                <div className="text-center py-20">
                    <RefreshCw className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
                    <p className="text-slate-500 mt-2">Carregando pacientes...</p>
                </div>
            ) : filteredPatients.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">Nenhum paciente encontrado</h3>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredPatients.map(patient => (
                        <div key={patient.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div
                                onClick={() => togglePatient(patient.id)}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${expandedPatient === patient.id ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {expandedPatient === patient.id ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                    </div>
                                    <h3 className="font-bold text-slate-800">{patient.name}</h3>
                                    <p className="text-sm text-slate-500">CPF: {patient.cpf || 'Não informado'} • Nascimento: {patient.birthdate ? new Date(patient.birthdate).toLocaleDateString('pt-BR') : '-'}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium text-slate-500">
                                        {teamMembers[patient.id]?.length || 0} profissionais
                                    </span>
                                </div>
                            </div>

                            {/* Expanded Team View */}
                            {expandedPatient === patient.id && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-4 animate-fade-in">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-brand-600" />
                                            Equipe Multidisciplinar Atual
                                        </h4>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAddMember(patient); }}
                                            className="flex items-center gap-2 text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Adicionar Profissional
                                        </button>
                                    </div>

                                    {loadingTeam === patient.id ? (
                                        <div className="py-8 text-center text-slate-500 text-sm">Carregando equipe...</div>
                                    ) : !teamMembers[patient.id] || teamMembers[patient.id].length === 0 ? (
                                        <p className="text-sm text-slate-500 italic py-2">Nenhum profissional na equipe deste paciente.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {teamMembers[patient.id].map(member => (
                                                <div key={member.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{member.professionalName}</p>
                                                        <p className="text-xs text-brand-600 font-medium">{member.role} • {member.specialty}</p>
                                                        <p className="text-xs text-slate-400 mt-1">Add por: {member.assignedBy}</p>
                                                        <div className="mt-2 p-1 bg-red-50 border border-red-100 rounded text-[10px] text-red-800 font-mono">
                                                            ID: {member.professionalId}<br />
                                                            Email: {member.professionalEmail || 'N/A'}
                                                        </div>
                                                    </div>
                                                    {/* Manager could potentially remove/manage here too, but start with View/Add */}
                                                    <div className="h-2 w-2 rounded-full bg-green-500" title="Ativo"></div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add Member Modal */}
            {isAddModalOpen && selectedPatient && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-brand-400" />
                                Adicionar à Equipe
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-brand-50 p-3 rounded-lg border border-brand-100 mb-4">
                                <p className="text-sm text-brand-800">
                                    Adicionando profissional para o paciente: <br />
                                    <strong>{selectedPatient.name}</strong>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail do Profissional</label>
                                <input
                                    type="email"
                                    value={emailToAdd}
                                    onChange={(e) => setEmailToAdd(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="email@exemplo.com"
                                />
                                <p className="text-xs text-slate-500 mt-1">O profissional deve estar cadastrado na plataforma.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Função na Equipe</label>
                                <input
                                    type="text"
                                    value={roleToAdd}
                                    onChange={(e) => setRoleToAdd(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="Ex: Cardiologista, Fisioterapeuta"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={submitAddMember}
                                    disabled={addingMember || !emailToAdd || !roleToAdd}
                                    className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium flex items-center gap-2 disabled:opacity-50"
                                >
                                    {addingMember ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Adicionar e Sincronizar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClinicTeamsView;
