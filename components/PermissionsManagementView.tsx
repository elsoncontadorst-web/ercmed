import React, { useState, useEffect } from 'react';
import { getAllUsers, updateUserAccessSettings } from '../services/userManagementService';
import { SystemUser } from '../types/users';
import { Search, Shield, Lock, Unlock, Save, Check, X, AlertTriangle } from 'lucide-react';
import { TierBadge } from './TierBadge';

const MODULES = [
    { key: 'healthManagement', label: 'Gestão de Saúde' },
    { key: 'financial', label: 'Financeiro' },
    { key: 'contracts', label: 'Contratos' },
    { key: 'tiss', label: 'Faturamento TISS' },
    { key: 'labor', label: 'Gestão Trabalhista' },
    { key: 'simulator', label: 'Simuladores' }
];

const PermissionsManagementView: React.FC = () => {
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<SystemUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
    const [showModal, setShowModal] = useState(false);

    // Edit State
    const [editForm, setEditForm] = useState<{
        restrictToOwnPatients: boolean;
        blockedModules: string[];
    }>({
        restrictToOwnPatients: false,
        blockedModules: []
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const allUsers = await getAllUsers();
            setUsers(allUsers);
            setFilteredUsers(allUsers);
        } catch (error) {
            console.error("Error loading users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        const lower = query.toLowerCase();
        const filtered = users.filter(user =>
            user.name.toLowerCase().includes(lower) ||
            user.email.toLowerCase().includes(lower)
        );
        setFilteredUsers(filtered);
    };

    const openEditModal = (user: SystemUser) => {
        setSelectedUser(user);
        setEditForm({
            restrictToOwnPatients: user.restrictToOwnPatients || false,
            blockedModules: user.blockedModules || []
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!selectedUser) return;

        try {
            const success = await updateUserAccessSettings(selectedUser.id, editForm);
            if (success) {
                // Update local state
                const updatedUsers = users.map(u =>
                    u.id === selectedUser.id
                        ? { ...u, ...editForm }
                        : u
                );
                setUsers(updatedUsers);
                setFilteredUsers(updatedUsers.filter(u =>
                    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchQuery.toLowerCase())
                ));
                setShowModal(false);
                alert('Permissões atualizadas com sucesso!');
            } else {
                alert('Erro ao atualizar permissões.');
            }
        } catch (error) {
            console.error("Error saving permissions", error);
            alert('Erro ao salvar.');
        }
    };

    const toggleModule = (moduleKey: string) => {
        setEditForm(prev => {
            const isBlocked = prev.blockedModules.includes(moduleKey);
            if (isBlocked) {
                return { ...prev, blockedModules: prev.blockedModules.filter(k => k !== moduleKey) };
            } else {
                return { ...prev, blockedModules: [...prev.blockedModules, moduleKey] };
            }
        });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-brand-600" />
                        Gerenciamento de Permissões Master
                    </h1>
                    <p className="text-slate-500">Controle granular de acesso e módulos por usuário</p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Buscar usuário por nome ou email..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 font-semibold text-slate-700">Usuário</th>
                            <th className="p-4 font-semibold text-slate-700">Plano</th>
                            <th className="p-4 font-semibold text-slate-700">Restrições</th>
                            <th className="p-4 font-semibold text-slate-700">Módulos Bloqueados</th>
                            <th className="p-4 font-semibold text-slate-700">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center">Carregando...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>
                        ) : (
                            filteredUsers.map(user => (
                                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="p-4">
                                        <div>
                                            <p className="font-medium text-slate-900">{user.name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                            <span className="text-[10px] uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                                                {user.role}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <TierBadge tier={user.accountTier} size="sm" />
                                    </td>
                                    <td className="p-4">
                                        {user.restrictToOwnPatients ? (
                                            <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full w-fit">
                                                <Lock className="w-3 h-3" /> Apenas Próprios
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
                                                <Unlock className="w-3 h-3" /> Todos (Equipe)
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {user.blockedModules && user.blockedModules.length > 0 ? (
                                                user.blockedModules.map(mod => (
                                                    <span key={mod} className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">
                                                        {MODULES.find(m => m.key === mod)?.label || mod}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-400">Nenhum</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="text-brand-600 hover:text-brand-700 font-medium text-sm hover:underline"
                                        >
                                            Gerenciar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {showModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
                        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <Shield className="w-5 h-5 text-brand-400" />
                                Permissões: {selectedUser.name}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Patient Access Restriction */}
                            <div className="space-y-3">
                                <h4 className="font-semibold text-slate-800 border-b pb-2">Acesso a Pacientes</h4>
                                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={editForm.restrictToOwnPatients}
                                        onChange={(e) => setEditForm({ ...editForm, restrictToOwnPatients: e.target.checked })}
                                        className="mt-1 w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                                    />
                                    <div>
                                        <p className="font-medium text-slate-900">Visualizar Apenas Meus Pacientes</p>
                                        <p className="text-xs text-slate-500">
                                            <strong>Marcado:</strong> O usuário vê apenas os pacientes que ele cadastrou.<br />
                                            <strong>Desmarcado:</strong> O usuário vê todos os pacientes da clínica (acesso total).
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {/* Module Blocking */}
                            <div className="space-y-3">
                                <h4 className="font-semibold text-slate-800 border-b pb-2">Bloqueio de Módulos</h4>
                                <p className="text-xs text-slate-500 mb-2">Marque os módulos que deseja <span className="font-bold text-red-600">BLOQUEAR</span> para este usuário.</p>

                                <div className="grid grid-cols-2 gap-2">
                                    {MODULES.map(module => (
                                        <label
                                            key={module.key}
                                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${editForm.blockedModules.includes(module.key)
                                                ? 'bg-red-50 border-red-200'
                                                : 'bg-white border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={editForm.blockedModules.includes(module.key)}
                                                onChange={() => toggleModule(module.key)}
                                                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                            />
                                            <span className={`text-sm ${editForm.blockedModules.includes(module.key) ? 'text-red-700 font-medium' : 'text-slate-700'}`}>
                                                {module.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermissionsManagementView;
