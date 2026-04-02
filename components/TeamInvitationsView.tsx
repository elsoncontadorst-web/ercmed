import React, { useState, useEffect } from 'react';
import { Users, Check, X, Clock, UserPlus, UserMinus, Loader } from 'lucide-react';
import { getTeamInvitations, respondToInvitation } from '../services/healthService';
import { TeamInvitation } from '../types/health';
import { auth } from '../services/firebase';

const TeamInvitationsView: React.FC = () => {
    const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'responded'>('pending');

    useEffect(() => {
        loadInvitations();
    }, []);

    const loadInvitations = async () => {
        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        try {
            const data = await getTeamInvitations(user.uid, user.email || undefined);
            setInvitations(data);
        } catch (error) {
            console.error('Error loading invitations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRespond = async (invitationId: string, response: 'accepted' | 'rejected') => {
        setLoading(true);
        try {
            await respondToInvitation(invitationId, response);
            await loadInvitations();
            alert(response === 'accepted' ? 'Convite aceito com sucesso!' : 'Convite rejeitado.');
        } catch (error) {
            console.error('Error responding to invitation:', error);
            alert('Erro ao responder convite.');
        } finally {
            setLoading(false);
        }
    };

    const filteredInvitations = invitations.filter(inv => {
        if (filter === 'pending') return inv.status === 'pending';
        if (filter === 'responded') return inv.status !== 'pending';
        return true;
    });

    const pendingCount = invitations.filter(inv => inv.status === 'pending').length;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-7 h-7 text-blue-600" />
                    Convites de Equipe
                </h1>
                <p className="text-slate-600 mt-1">
                    Gerencie suas solicitações para participar de equipes multidisciplinares
                </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 font-medium transition-colors ${filter === 'pending'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    Pendentes ({pendingCount})
                </button>
                <button
                    onClick={() => setFilter('responded')}
                    className={`px-4 py-2 font-medium transition-colors ${filter === 'responded'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    Respondidos
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 font-medium transition-colors ${filter === 'all'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    Todos
                </button>
            </div>

            {/* Invitations List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : filteredInvitations.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">Nenhum convite encontrado</h3>
                    <p className="text-slate-500 mt-1">
                        {filter === 'pending'
                            ? 'Você não tem convites pendentes no momento.'
                            : 'Nenhum convite encontrado com este filtro.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredInvitations.map(invitation => (
                        <div
                            key={invitation.id}
                            className={`bg-white p-6 rounded-xl shadow-sm border-2 ${invitation.status === 'pending'
                                ? 'border-orange-200'
                                : invitation.status === 'accepted'
                                    ? 'border-green-200'
                                    : 'border-red-200'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        {invitation.type === 'add' ? (
                                            <UserPlus className="w-5 h-5 text-blue-600" />
                                        ) : (
                                            <UserMinus className="w-5 h-5 text-red-600" />
                                        )}
                                        <h3 className="text-lg font-bold text-slate-800">
                                            {invitation.type === 'add'
                                                ? 'Convite para Participar da Equipe'
                                                : 'Solicitação de Remoção da Equipe'}
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium">Paciente</p>
                                            <p className="text-slate-800 font-semibold">{invitation.patientName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium">Solicitado por</p>
                                            <p className="text-slate-800">{invitation.invitedByName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium">Função</p>
                                            <p className="text-blue-600 font-medium">{invitation.role}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium">Data</p>
                                            <p className="text-slate-700">
                                                {invitation.createdAt
                                                    ? new Date(invitation.createdAt.toDate()).toLocaleDateString('pt-BR')
                                                    : 'Agora'}
                                            </p>
                                        </div>
                                    </div>

                                    {invitation.status !== 'pending' && (
                                        <div className="mt-4">
                                            <span
                                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${invitation.status === 'accepted'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}
                                            >
                                                {invitation.status === 'accepted' ? (
                                                    <>
                                                        <Check className="w-4 h-4" />
                                                        Aceito
                                                    </>
                                                ) : (
                                                    <>
                                                        <X className="w-4 h-4" />
                                                        Rejeitado
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {invitation.status === 'pending' && (
                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={() => handleRespond(invitation.id, 'accepted')}
                                            disabled={loading}
                                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                        >
                                            <Check className="w-4 h-4" />
                                            Aceitar
                                        </button>
                                        <button
                                            onClick={() => handleRespond(invitation.id, 'rejected')}
                                            disabled={loading}
                                            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                        >
                                            <X className="w-4 h-4" />
                                            Rejeitar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TeamInvitationsView;
