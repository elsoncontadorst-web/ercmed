import React, { useEffect, useState } from 'react';
import { getAllUsersData, UserActivity, getAllFeedback, Feedback, deleteUserActivity } from '../services/userDataService';
import { Users, Smartphone, Monitor, Clock, Calendar, ArrowLeft, Search, AlertCircle, MessageSquare, Bug, Lightbulb, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { AppView } from '../types';

interface ManagerDashboardViewProps {
    onBack?: () => void;
}

const ManagerDashboardView: React.FC<ManagerDashboardViewProps> = ({ onBack }) => {
    const [users, setUsers] = useState<UserActivity[]>([]);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'feedbacks'>('users');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [usersData, feedbacksData] = await Promise.all([
                getAllUsersData(),
                getAllFeedback()
            ]);
            setUsers(usersData);
            setFeedbacks(feedbacksData);
            setLoading(false);
        };

        fetchData();
    }, []);

    const handleDeleteUser = async (uid: string, email: string) => {
        if (window.confirm(`Tem certeza que deseja apagar o registro histórico de ${email}? Isso limpará a tabela, mas não afeta a Firebase Auth.`)) {
            const success = await deleteUserActivity(uid);
            if (success) {
                setUsers(prev => prev.filter(u => u.uid !== uid));
            } else {
                alert("Erro ao apagar. Atualize a página.");
            }
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredFeedbacks = feedbacks.filter(feedback => {
        const matchesSearch = feedback.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            feedback.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            feedback.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || feedback.type === filterType;
        const matchesStatus = filterStatus === 'all' || feedback.status === filterStatus;
        return matchesSearch && matchesType && matchesStatus;
    });

    const stats = {
        totalUsers: users.length,
        activeToday: users.filter(u => {
            if (!u.lastLogin) return false;
            const last = u.lastLogin.toDate ? u.lastLogin.toDate() : new Date(u.lastLogin);
            const today = new Date();
            return last.getDate() === today.getDate() &&
                last.getMonth() === today.getMonth() &&
                last.getFullYear() === today.getFullYear();
        }).length,
        mobileUsers: users.filter(u => u.deviceType === 'mobile').length,
        desktopUsers: users.filter(u => u.deviceType === 'desktop').length,
        totalFeedbacks: feedbacks.length,
        newFeedbacks: feedbacks.filter(f => f.status === 'new').length,
        bugs: feedbacks.filter(f => f.type === 'bug').length,
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('pt-BR');
    };

    const getDaysActive = (first: any, last: any) => {
        if (!first || !last) return 1;
        const start = first.toDate ? first.toDate() : new Date(first);
        const end = last.toDate ? last.toDate() : new Date(last);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays || 1;
    };

    const getTypeIcon = (type: string) => {
        const icons = {
            bug: { icon: Bug, color: 'text-red-600 bg-red-100' },
            feedback: { icon: MessageSquare, color: 'text-blue-600 bg-blue-100' },
            suggestion: { icon: Lightbulb, color: 'text-yellow-600 bg-yellow-100' }
        };
        const config = icons[type as keyof typeof icons] || icons.feedback;
        const Icon = config.icon;
        return <Icon className={`w-4 h-4 ${config.color} p-1 rounded`} />;
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            new: { text: 'Novo', color: 'bg-blue-100 text-blue-700' },
            reviewing: { text: 'Em Análise', color: 'bg-yellow-100 text-yellow-700' },
            resolved: { text: 'Resolvido', color: 'bg-green-100 text-green-700' }
        };
        const badge = badges[status as keyof typeof badges] || badges.new;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                {badge.text}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        Painel do Gestor
                        <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full">Admin</span>
                    </h1>
                    <p className="text-slate-600">Visão geral dos usuários e feedbacks do sistema.</p>
                </div>
                {onBack && (
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-brand-600 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>
                )}
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Total de Usuários</p>
                            <h3 className="text-2xl font-bold text-slate-800">{stats.totalUsers}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Ativos Hoje</p>
                            <h3 className="text-2xl font-bold text-slate-800">{stats.activeToday}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Feedbacks</p>
                            <h3 className="text-2xl font-bold text-slate-800">{stats.totalFeedbacks}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                            <Bug className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Bugs Reportados</p>
                            <h3 className="text-2xl font-bold text-slate-800">{stats.bugs}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'users' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Usuários
                    </button>
                    <button
                        onClick={() => setActiveTab('feedbacks')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'feedbacks' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Feedbacks ({stats.newFeedbacks} novos)
                    </button>
                </div>

                {activeTab === 'users' ? (
                    <>
                        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                            <h3 className="font-bold text-lg text-slate-800">Usuários Cadastrados</h3>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="py-3 px-6 text-sm font-semibold text-slate-600">Email</th>
                                        <th className="py-3 px-6 text-sm font-semibold text-slate-600">Dispositivo</th>
                                        <th className="py-3 px-6 text-sm font-semibold text-slate-600">Último Acesso</th>
                                        <th className="py-3 px-6 text-sm font-semibold text-slate-600">Tempo de Uso</th>
                                        <th className="py-3 px-6 text-sm font-semibold text-slate-600">Módulos Mais Usados</th>
                                        <th className="py-3 px-6 text-sm font-semibold text-slate-600">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-6 text-sm font-medium text-slate-800">
                                                {user.email}
                                                {user.email === 'elsoncontador.st@gmail.com' && (
                                                    <span className="ml-2 text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">Admin</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-6 text-sm text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    {user.deviceType === 'mobile' ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                                                    <span className="capitalize">{user.deviceType || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-6 text-sm text-slate-600">
                                                {formatDate(user.lastLogin)}
                                            </td>
                                            <td className="py-3 px-6 text-sm text-slate-600">
                                                {getDaysActive(user.firstLogin || user.lastLogin, user.lastLogin)} dias
                                            </td>
                                            <td className="py-3 px-6 text-sm text-slate-600">
                                                {user.moduleUsage ? (
                                                    <div className="flex gap-1 flex-wrap">
                                                        {Object.entries(user.moduleUsage)
                                                            .sort(([, a], [, b]) => b - a)
                                                            .slice(0, 2)
                                                            .map(([mod, count]) => (
                                                                <span key={mod} className="text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                                    {mod.replace('_', ' ')} ({count})
                                                                </span>
                                                            ))
                                                        }
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="py-3 px-6 text-sm text-slate-600">
                                                <button 
                                                    onClick={() => handleDeleteUser(user.uid, user.email)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Limpar Registro"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-500">
                                                Nenhum usuário encontrado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <h3 className="font-bold text-lg text-slate-800">Feedbacks Recebidos</h3>
                                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    >
                                        <option value="all">Todos os Tipos</option>
                                        <option value="bug">Bugs</option>
                                        <option value="feedback">Feedbacks</option>
                                        <option value="suggestion">Sugestões</option>
                                    </select>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    >
                                        <option value="all">Todos os Status</option>
                                        <option value="new">Novos</option>
                                        <option value="reviewing">Em Análise</option>
                                        <option value="resolved">Resolvidos</option>
                                    </select>
                                    <div className="relative flex-1 md:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {filteredFeedbacks.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                    <p>Nenhum feedback encontrado.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredFeedbacks.map((feedback) => (
                                        <div
                                            key={feedback.id}
                                            className="border border-slate-200 rounded-lg p-4 hover:border-brand-300 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <div className="flex items-start gap-3 flex-1">
                                                    {getTypeIcon(feedback.type)}
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-slate-800 mb-1">{feedback.title}</h4>
                                                        <p className="text-sm text-slate-600 mb-2">{feedback.description}</p>
                                                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                                            <span>👤 {feedback.userEmail}</span>
                                                            {feedback.module && <span>📦 {feedback.module}</span>}
                                                            <span>📅 {formatDate(feedback.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {getStatusBadge(feedback.status)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ManagerDashboardView;

