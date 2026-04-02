import React, { useState, useEffect } from 'react';
import { Users, UserPlus, UserCheck, UserX, Shield, Mail, Phone, Search, Filter, Crown, Building2, Unlock, Lock, Globe, CheckSquare, Square, X } from 'lucide-react';
import { auth } from '../services/firebase';
import { AccountTier, TIER_NAMES, migrateTierName } from '../types/accountTiers';
import { assignTier, setClinicManager, updateUserModuleAccess } from '../services/accountTierService';
import {
    getAllUsers,
    getAllUserProfiles,
    getPendingUsers,
    createUserByAdmin,
    approveUser,
    rejectUser,
    updateUserStatus,
    sendPasswordReset,
    updateUserAccessSettings,
    updateUserClinics
} from '../services/userManagementService';
import { getClinics } from '../services/clinicService';
import { Clinic } from '../types/clinic';
// ATENÇÃO: Certifique-se que SystemUser agora possui os campos Tier/Acesso/ClinicIds
import { SystemUser, UserCreationByAdmin, CustomModuleAccess } from '../types/users';
import { useUser } from '../contexts/UserContext';

// Define TIER_COLORS
const TIER_COLORS: Record<string, string> = {
    [AccountTier.TRIAL]: 'bg-gray-100 text-gray-700',
    [AccountTier.BRONZE]: 'bg-orange-100 text-orange-700',
    [AccountTier.SILVER]: 'bg-slate-200 text-slate-700',
    [AccountTier.GOLD]: 'bg-yellow-100 text-yellow-700',
    [AccountTier.UNLIMITED]: 'bg-purple-100 text-purple-700',
};

// Reutilizando CustomModuleAccess do arquivo /types/users.ts (se importado)
type ModuleAccess = CustomModuleAccess;


const UsersManagementView: React.FC = () => {
    // 1. Estados e Contextos
    const { isAdmin, user, userProfile } = useUser();
    const isMasterAdmin = user?.email === 'elsoncontador.st@gmail.com';
    const currentUserEmail = user?.email || 'admin@exemplo.com';

    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'create' | 'global'>('all');
    // Usamos SystemUser diretamente, pois ela foi atualizada
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [pendingUsers, setPendingUsers] = useState<SystemUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Estados para Clínicas
    const [availableClinics, setAvailableClinics] = useState<Clinic[]>([]);

    // Estados para Criação de Novo Usuário
    const [newUser, setNewUser] = useState<UserCreationByAdmin>({
        email: '', password: '', name: '', role: 'user', phone: '', specialty: '', crm: '',
        isClinicManager: false, accountTier: AccountTier.TRIAL
    });

    // Estados para Modais de Aprovação/Rejeição
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    // Usamos SystemUser diretamente, pois ela foi atualizada
    const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
    const [selectedRole, setSelectedRole] = useState<SystemUser['role']>('user');
    const [rejectionReason, setRejectionReason] = useState('');

    // Estados para Modal de Tier/Acesso
    const [showTierModal, setShowTierModal] = useState(false);
    const [selectedTier, setSelectedTier] = useState<AccountTier>(AccountTier.TRIAL);
    const [isClinicManager, setIsClinicManagerState] = useState(false);
    const [moduleAccess, setModuleAccess] = useState<ModuleAccess>({});
    const [selectedClinics, setSelectedClinics] = useState<string[]>([]);


    // 2. Efeitos e Carregamento de Dados
    const loadClinics = async () => {
        try {
            const clinics = await getClinics();
            setAvailableClinics(clinics);
        } catch (error) {
            console.error('Erro ao carregar clínicas:', error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'global' && isMasterAdmin) {
                const globalUsers = await getAllUserProfiles();
                setUsers(globalUsers);
            } else {
                const [allUsersData, pendingUsersData] = await Promise.all([
                    getAllUsers(),
                    getPendingUsers()
                ]);
                setUsers(allUsersData);
                setPendingUsers(pendingUsersData);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeTab]);

    useEffect(() => {
        if (showTierModal && isAdmin) {
            loadClinics();
        }
    }, [showTierModal, isAdmin]);


    // 3. Handlers (Lógica de Negócios)

    const handleCreateUser = async () => {
        if (!newUser.email || !newUser.password || !newUser.name) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }

        setLoading(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                alert('Usuário não autenticado');
                return;
            }

            const result = await createUserByAdmin(currentUser.uid, newUser);

            if (result.success) {
                alert('Usuário criado com sucesso!');
                setNewUser({
                    email: '', password: '', name: '', role: 'user', phone: '', specialty: '', crm: '',
                    isClinicManager: false, accountTier: AccountTier.TRIAL
                });
                loadData();
            } else {
                alert(result.error || 'Erro ao criar usuário');
            }
        } catch (error) {
            alert('Erro ao criar usuário');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedUser) return;

        setLoading(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                alert('Usuário não autenticado');
                return;
            }

            const success = await approveUser(selectedUser.id, currentUser.uid, selectedRole);

            if (success) {
                alert('Usuário aprovado com sucesso!');
                setShowApproveModal(false);
                setSelectedUser(null);
                loadData();
            } else {
                alert('Erro ao aprovar usuário');
            }
        } catch (error) {
            alert('Erro ao aprovar usuário');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedUser || !rejectionReason) {
            alert('Informe o motivo da rejeição');
            return;
        }

        setLoading(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                alert('Usuário não autenticado');
                return;
            }

            const success = await rejectUser(selectedUser.id, currentUser.uid, rejectionReason);

            if (success) {
                alert('Usuário rejeitado');
                setShowRejectModal(false);
                setSelectedUser(null);
                setRejectionReason('');
                loadData();
            } else {
                alert('Erro ao rejeitar usuário');
            }
        } catch (error) {
            alert('Erro ao rejeitar usuário');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (user: SystemUser) => {
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        setLoading(true);
        try {
            const success = await updateUserStatus(user.id, newStatus);
            if (success) {
                alert(`Usuário ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso!`);
                loadData();
            } else {
                alert('Erro ao atualizar status');
            }
        } catch (error) {
            alert('Erro ao atualizar status');
        } finally {
            setLoading(false);
        }
    };

    const handleSendPasswordReset = async (email: string) => {
        setLoading(true);
        try {
            const success = await sendPasswordReset(email);
            if (success) {
                alert('E-mail de redefinição de senha enviado!');
            } else {
                alert('Erro ao enviar e-mail');
            }
        } catch (error) {
            alert('Erro ao enviar e-mail');
        } finally {
            setLoading(false);
        }
    };

    // FUNÇÃO PRINCIPAL DE SALVAMENTO DE TIER/ACESSO
    const handleSaveTierSettings = async () => {
        if (!selectedUser) return;

        setLoading(true);
        try {
            const userId = selectedUser.id;
            const currentEmail = currentUserEmail;

            // Execute all tier and access updates
            // These functions return Promise<void> and throw errors on failure
            await assignTier(userId, selectedTier, currentEmail);
            await setClinicManager(userId, isClinicManager, currentEmail);
            await updateUserModuleAccess(userId, moduleAccess);
            await updateUserClinics(userId, selectedClinics);

            // If we reach here, all operations succeeded
            alert('Configurações de Tier e Acesso atualizadas com sucesso!');
            setShowTierModal(false);
            setSelectedUser(null);
            loadData();
        } catch (error) {
            console.error('Erro ao salvar Tier/Acesso:', error);
            alert('Erro ao salvar configurações.');
        } finally {
            setLoading(false);
        }
    };

    // Helper para Seleção de Clínica
    const toggleClinic = (clinicId: string) => {
        if (selectedClinics.includes(clinicId)) {
            setSelectedClinics(selectedClinics.filter(id => id !== clinicId));
        } else {
            setSelectedClinics([...selectedClinics, clinicId]);
        }
    };

    // Helper para Seleção de Módulo
    const toggleModuleAccess = (module: keyof ModuleAccess) => {
        setModuleAccess(prev => ({
            ...prev,
            [module]: !prev[module]
        }));
    };

    // 4. Lógica de Visualização

    const filteredUsers = users.filter(user => {
        const userName = user?.name || '';
        const userEmail = user?.email || '';
        const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
        return matchesSearch && matchesRole && matchesStatus;
    });

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-700';
            case 'manager': return 'bg-blue-100 text-blue-700';
            case 'professional': return 'bg-green-100 text-green-700';
            case 'receptionist': return 'bg-yellow-100 text-yellow-700';
            case 'biller': return 'bg-orange-100 text-orange-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700';
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            case 'inactive': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            admin: 'Administrador',
            manager: 'Gestor',
            professional: 'Profissional',
            receptionist: 'Recepcionista',
            biller: 'Faturista',
            user: 'Usuário'
        };
        return labels[role] || role;
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            active: 'Ativo',
            pending: 'Pendente',
            approved: 'Aprovado',
            rejected: 'Rejeitado',
            inactive: 'Inativo'
        };
        return labels[status] || status;
    };

    // 5. Renderização
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-6 h-6 text-brand-600" />
                        Gerenciamento de Usuários
                    </h1>
                    <p className="text-slate-500">Gerencie usuários, permissões e aprovações</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 font-medium ${activeTab === 'all' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-600'}`}
                >
                    <Users className="w-4 h-4 inline mr-2" />
                    Todos os Usuários
                </button>
                {isMasterAdmin && (
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`px-4 py-2 font-medium ${activeTab === 'global' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-600'}`}
                    >
                        <Globe className="w-4 h-4 inline mr-2" />
                        Global (Master)
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 font-medium ${activeTab === 'pending' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-600'} relative`}
                >
                    <UserCheck className="w-4 h-4 inline mr-2" />
                    Pendentes
                    {pendingUsers.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {pendingUsers.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('create')}
                    className={`px-4 py-2 font-medium ${activeTab === 'create' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-600'}`}
                >
                    <UserPlus className="w-4 h-4 inline mr-2" />
                    Criar Usuário
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {(activeTab === 'all' || activeTab === 'global') && (
                    <div className="space-y-4">
                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome ou e-mail..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 p-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="p-2 border border-gray-300 rounded-lg"
                            >
                                <option value="all">Todos os Papéis</option>
                                <option value="admin">Administrador</option>
                                <option value="manager">Gestor</option>
                                <option value="professional">Profissional</option>
                                <option value="receptionist">Recepcionista</option>
                                <option value="biller">Faturista</option>
                                <option value="user">Usuário</option>
                            </select>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="p-2 border border-gray-300 rounded-lg"
                            >
                                <option value="all">Todos os Status</option>
                                <option value="active">Ativo</option>
                                <option value="inactive">Inativo</option>
                                <option value="pending">Pendente</option>
                                <option value="rejected">Rejeitado</option>
                            </select>
                        </div>

                        {/* Users List */}
                        <div className="space-y-3">
                            {filteredUsers.map((user: SystemUser) => (
                                <div key={user.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-bold text-slate-800">{user.name}</h3>
                                                <span className={`text-xs px-2 py-1 rounded ${getRoleBadgeColor(user.role)}`}>
                                                    {getRoleLabel(user.role)}
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeColor(user.status)}`}>
                                                    {getStatusLabel(user.status)}
                                                </span>
                                            </div>
                                            <div className="space-y-1 text-sm text-slate-600">
                                                <p className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4" />
                                                    {user.email}
                                                </p>
                                                {user.phone && (
                                                    <p className="flex items-center gap-2">
                                                        <Phone className="w-4 h-4" />
                                                        {user.phone}
                                                    </p>
                                                )}
                                                {user.specialty && (
                                                    <p className="text-xs text-slate-500">
                                                        Especialidade: {user.specialty}
                                                    </p>
                                                )}
                                                {user.crm && (
                                                    <p className="text-xs text-slate-500">
                                                        CRM: {user.crm}
                                                    </p>
                                                )}
                                            </div>
                                            {/* Tier and Manager Badges - Sem (user as any) */}
                                            <div className="flex gap-2 mt-2">
                                                {user.accountTier && (
                                                    <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${TIER_COLORS[migrateTierName(user.accountTier)] || 'bg-gray-100'}`}>
                                                        <Crown className="w-3 h-3" />
                                                        {TIER_NAMES[migrateTierName(user.accountTier)]}
                                                    </span>
                                                )}
                                                {user.isClinicManager && (
                                                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        Gestor de Clínica
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {(user.status === 'active' || user.status === 'inactive') && (
                                                <>
                                                    <button
                                                        onClick={() => handleToggleStatus(user)}
                                                        disabled={loading}
                                                        className={`px-3 py-1 rounded text-sm ${user.status === 'active'
                                                            ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                                            : 'bg-green-600 text-white hover:bg-green-700'
                                                            }`}
                                                    >
                                                        {user.status === 'active' ? 'Desativar' : 'Ativar'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleSendPasswordReset(user.email)}
                                                        disabled={loading}
                                                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                                    >
                                                        Redefinir Senha
                                                    </button>
                                                    {(isAdmin || userProfile?.isClinicManager) && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                // Leitura das propriedades diretamente
                                                                setSelectedTier(migrateTierName(user.accountTier || AccountTier.TRIAL));
                                                                setIsClinicManagerState(user.isClinicManager || false);
                                                                setModuleAccess(user.customModuleAccess || {});
                                                                setSelectedClinics(user.clinicIds || []);
                                                                setShowTierModal(true);
                                                            }}
                                                            disabled={loading}
                                                            className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 flex items-center gap-1"
                                                        >
                                                            <Crown className="w-3 h-3" />
                                                            {isAdmin ? 'Tier' : 'Acesso'}
                                                        </button>
                                                    )}

                                                    {/* Access Restriction Toggle */}
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm(`Alterar restrição de acesso a pacientes para ${user.name}?`)) {
                                                                const newRestriction = !user.restrictToOwnPatients;
                                                                const success = await updateUserAccessSettings(user.id, { restrictToOwnPatients: newRestriction });
                                                                if (success) {
                                                                    setUsers(users.map(u => u.id === user.id ? { ...u, restrictToOwnPatients: newRestriction } : u));
                                                                } else {
                                                                    alert('Erro ao atualizar permissão.');
                                                                }
                                                            }
                                                        }}
                                                        className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${user.restrictToOwnPatients
                                                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                            }`}
                                                        title={user.restrictToOwnPatients ? "Acesso restrito aos próprios pacientes" : "Acesso a todos os pacientes da clínica"}
                                                    >
                                                        {user.restrictToOwnPatients ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                                        {user.restrictToOwnPatients ? 'Restrito' : 'Acesso Total'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredUsers.length === 0 && (
                                <p className="text-center text-slate-500 py-8">Nenhum usuário encontrado</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'pending' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-slate-800">Aprovações Pendentes</h2>
                        <div className="space-y-3">
                            {pendingUsers.map(user => (
                                <div key={user.id} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800">{user.name}</h3>
                                            <div className="space-y-1 text-sm text-slate-600 mt-2">
                                                <p className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4" />
                                                    {user.email}
                                                </p>
                                                {user.phone && (
                                                    <p className="flex items-center gap-2">
                                                        <Phone className="w-4 h-4" />
                                                        {user.phone}
                                                    </p>
                                                )}
                                                {user.specialty && (
                                                    <p className="text-xs text-slate-500">
                                                        Especialidade: {user.specialty}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowApproveModal(true);
                                                }}
                                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
                                            >
                                                <UserCheck className="w-4 h-4" />
                                                Aprovar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowRejectModal(true);
                                                }}
                                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1"
                                            >
                                                <UserX className="w-4 h-4" />
                                                Rejeitar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {pendingUsers.length === 0 && (
                                <p className="text-center text-slate-500 py-8">Nenhuma aprovação pendente</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'create' && (
                    <div className="space-y-4 max-w-2xl">
                        <h2 className="text-lg font-bold text-slate-800">Criar Novo Usuário</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
                                <input
                                    type="text"
                                    placeholder="Nome completo do usuário"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail *</label>
                                <input
                                    type="email"
                                    placeholder="email@exemplo.com"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Senha *</label>
                                <input
                                    type="password"
                                    placeholder="Senha (mínimo 6 caracteres)"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            {/* Campos Adicionais para Novo Usuário */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Papel Inicial</label>
                                    <select
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value as SystemUser['role'] })}
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="user">Usuário</option>
                                        <option value="professional">Profissional</option>
                                        <option value="manager">Gestor</option>
                                        <option value="receptionist">Recepcionista</option>
                                        <option value="biller">Faturista</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                                    <input
                                        type="text"
                                        placeholder="(99) 99999-9999"
                                        value={newUser.phone}
                                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Especialidade (se profissional)</label>
                                    <input
                                        type="text"
                                        placeholder="Cardiologista, etc."
                                        value={newUser.specialty}
                                        onChange={(e) => setNewUser({ ...newUser, specialty: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">CRM/Registro</label>
                                    <input
                                        type="text"
                                        placeholder="CRM 123456"
                                        value={newUser.crm}
                                        onChange={(e) => setNewUser({ ...newUser, crm: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4">
                                <input
                                    type="checkbox"
                                    id="isClinicManager"
                                    checked={newUser.isClinicManager}
                                    onChange={(e) => setNewUser({ ...newUser, isClinicManager: e.target.checked })}
                                    className="h-4 w-4 text-brand-600 border-gray-300 rounded"
                                />
                                <label htmlFor="isClinicManager" className="text-sm font-medium text-slate-700">
                                    Definir como Gestor de Clínica
                                </label>
                            </div>

                            <button
                                onClick={handleCreateUser}
                                disabled={loading}
                                className="w-full px-4 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 transition duration-150 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Criando...' : (
                                    <>
                                        <UserPlus className="w-5 h-5" />
                                        Criar Usuário
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- Modals --- */}

            {/* Modal de Aprovação */}
            {showApproveModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Aprovar {selectedUser.name}</h3>
                        <p className="mb-4">Selecione o papel que será atribuído a este usuário após a aprovação.</p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Papel</label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value as SystemUser['role'])}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            >
                                <option value="user">Usuário</option>
                                <option value="professional">Profissional</option>
                                <option value="manager">Gestor</option>
                                <option value="receptionist">Recepcionista</option>
                                <option value="biller">Faturista</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowApproveModal(false); setSelectedUser(null); }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={loading}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                            >
                                {loading ? 'Aprovando...' : 'Confirmar Aprovação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Rejeição */}
            {showRejectModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Rejeitar {selectedUser.name}</h3>
                        <p className="mb-4">Por favor, forneça o motivo da rejeição. Isso será enviado por e-mail ao usuário.</p>

                        <div className="mb-4">
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Motivo da rejeição"
                                rows={4}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowRejectModal(false); setSelectedUser(null); setRejectionReason(''); }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={loading || !rejectionReason}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1"
                            >
                                {loading ? 'Rejeitando...' : 'Confirmar Rejeição'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Gerenciamento de Tier e Acesso */}
            {showTierModal && selectedUser && isAdmin && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg my-8">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-xl font-bold text-purple-700 flex items-center gap-2">
                                <Crown className="w-5 h-5" />
                                Acesso e Tier: {selectedUser.name}
                            </h3>
                            <button onClick={() => setShowTierModal(false)} className="text-gray-500 hover:text-gray-800">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Seção 1: Tier e Gestor */}
                            <div className="border p-4 rounded-lg bg-purple-50">
                                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-purple-600" /> Nível de Assinatura (Tier)
                                </h4>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Selecionar Tier</label>
                                    <select
                                        value={selectedTier}
                                        onChange={(e) => setSelectedTier(e.target.value as AccountTier)}
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                    >
                                        {Object.values(AccountTier).map((tier) => (
                                            <option key={tier} value={tier}>
                                                {TIER_NAMES[tier]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isClinicManagerModal"
                                        checked={isClinicManager}
                                        onChange={(e) => setIsClinicManagerState(e.target.checked)}
                                        className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                                    />
                                    <label htmlFor="isClinicManagerModal" className="text-sm font-medium text-slate-700">
                                        Definir como Gestor de Clínica
                                    </label>
                                </div>
                            </div>

                            {/* Seção 2: Acesso a Módulos Customizados */}
                            <div className="border p-4 rounded-lg bg-blue-50">
                                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                    <Filter className="w-5 h-5 text-blue-600" /> Acesso a Módulos Customizados
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleModuleAccess('IRPF')}>
                                        {(moduleAccess.IRPF) ? <CheckSquare className="w-5 h-5 text-green-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                                        <span className="text-sm font-medium text-slate-700">Módulo IRPF</span>
                                    </div>
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleModuleAccess('SIMULATOR')}>
                                        {(moduleAccess.SIMULATOR) ? <CheckSquare className="w-5 h-5 text-green-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                                        <span className="text-sm font-medium text-slate-700">Módulo SIMULATOR</span>
                                    </div>
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleModuleAccess('ADVANCED_EMR')}>
                                        {(moduleAccess.ADVANCED_EMR) ? <CheckSquare className="w-5 h-5 text-green-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                                        <span className="text-sm font-medium text-slate-700">EMR Avançado</span>
                                    </div>
                                </div>
                            </div>

                            {/* Seção 3: Clínicas Associadas */}
                            {availableClinics.length > 0 && (
                                <div className="border p-4 rounded-lg bg-green-50">
                                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-green-600" /> Clínicas Associadas
                                    </h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {availableClinics.map(clinic => (
                                            <div
                                                key={clinic.id}
                                                className="flex items-center gap-2 p-2 rounded-md hover:bg-green-100 cursor-pointer"
                                                onClick={() => toggleClinic(clinic.id)}
                                            >
                                                {(selectedClinics.includes(clinic.id)) ? <CheckSquare className="w-5 h-5 text-brand-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                                                <span className="text-sm font-medium text-slate-700">{clinic.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <button
                                onClick={() => setShowTierModal(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={handleSaveTierSettings}
                                disabled={loading}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1"
                            >
                                {loading ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default UsersManagementView;
