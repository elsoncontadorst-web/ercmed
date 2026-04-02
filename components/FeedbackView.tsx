import React, { useState, useEffect } from 'react';
import { MessageSquare, Bug, Lightbulb, Send, CheckCircle, Clock, XCircle } from 'lucide-react';
import { auth } from '../services/firebase';
import { submitFeedback, getUserFeedback, getAllFeedback, Feedback } from '../services/userDataService';

const FeedbackView: React.FC = () => {
    const [type, setType] = useState<'bug' | 'feedback' | 'suggestion'>('feedback');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [module, setModule] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userFeedbacks, setUserFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);

    const modules = [
        'Dashboard Geral',
        'Gestão de Saúde',
        'Pacientes',
        'Agendamentos',
        'Prontuário Eletrônico',
        'Recibos',
        'Horários da Clínica',
        'Gestão de Repasse',
        'Contratos',
        'Gerenciar Usuários',
        'Consultor IA',
        'Módulo Financeiro',
        'Outro'
    ];

    useEffect(() => {
        loadUserFeedbacks();
    }, []);

    const loadUserFeedbacks = async () => {
        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        // If admin, load all feedbacks. Otherwise, load only user's feedbacks
        const isAdmin = user.email === 'elsoncontador.st@gmail.com';
        const feedbacks = isAdmin ? await getAllFeedback() : await getUserFeedback(user.uid);
        setUserFeedbacks(feedbacks);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        if (!title.trim() || !description.trim()) {
            alert('Por favor, preencha o título e a descrição.');
            return;
        }

        setIsSubmitting(true);

        const success = await submitFeedback({
            userId: user.uid,
            userEmail: user.email || '',
            type,
            title,
            description,
            module: module || undefined,
            status: 'new'
        });

        if (success) {
            alert('Feedback enviado com sucesso! Obrigado pela sua contribuição.');
            setTitle('');
            setDescription('');
            setModule('');
            await loadUserFeedbacks();
        } else {
            alert('Erro ao enviar feedback. Tente novamente.');
        }

        setIsSubmitting(false);
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            new: { icon: Clock, text: 'Novo', color: 'bg-blue-100 text-blue-700' },
            reviewing: { icon: Clock, text: 'Em Análise', color: 'bg-yellow-100 text-yellow-700' },
            resolved: { icon: CheckCircle, text: 'Resolvido', color: 'bg-green-100 text-green-700' }
        };
        const badge = badges[status as keyof typeof badges] || badges.new;
        const Icon = badge.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                <Icon className="w-3 h-3" />
                {badge.text}
            </span>
        );
    };

    const getTypeIcon = (type: string) => {
        const icons = {
            bug: { icon: Bug, color: 'text-red-600' },
            feedback: { icon: MessageSquare, color: 'text-blue-600' },
            suggestion: { icon: Lightbulb, color: 'text-yellow-600' }
        };
        const config = icons[type as keyof typeof icons] || icons.feedback;
        const Icon = config.icon;
        return <Icon className={`w-5 h-5 ${config.color}`} />;
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR');
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <MessageSquare className="w-8 h-8 text-brand-600" />
                    Feedback & Suporte
                </h1>
                <p className="text-slate-600 mt-2">
                    Encontrou um bug? Tem uma sugestão? Envie seu feedback e nos ajude a melhorar!
                </p>
            </header>

            {/* Submission Form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Enviar Feedback</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setType('bug')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${type === 'bug'
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-slate-200 hover:border-red-300'
                                    }`}
                            >
                                <Bug className="w-5 h-5" />
                                <span className="font-medium">Bug</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('feedback')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${type === 'feedback'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 hover:border-blue-300'
                                    }`}
                            >
                                <MessageSquare className="w-5 h-5" />
                                <span className="font-medium">Feedback</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('suggestion')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${type === 'suggestion'
                                    ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                    : 'border-slate-200 hover:border-yellow-300'
                                    }`}
                            >
                                <Lightbulb className="w-5 h-5" />
                                <span className="font-medium">Sugestão</span>
                            </button>
                        </div>
                    </div>

                    {/* Module */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Módulo (Opcional)</label>
                        <select
                            value={module}
                            onChange={(e) => setModule(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        >
                            <option value="">Selecione um módulo</option>
                            {modules.map((mod) => (
                                <option key={mod} value={mod}>
                                    {mod}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Título *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Resumo do problema ou sugestão"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Descrição *</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descreva detalhadamente o problema, feedback ou sugestão..."
                            rows={5}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Enviar Feedback
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* User's Previous Feedbacks */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">
                        {auth.currentUser?.email === 'elsoncontador.st@gmail.com' ? 'Todos os Feedbacks' : 'Meus Feedbacks'}
                    </h2>
                </div>
                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                        </div>
                    ) : userFeedbacks.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p>Você ainda não enviou nenhum feedback.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {userFeedbacks.map((feedback) => (
                                <div
                                    key={feedback.id}
                                    className="border border-slate-200 rounded-lg p-4 hover:border-brand-300 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div className="flex items-center gap-3">
                                            {getTypeIcon(feedback.type)}
                                            <div>
                                                <h3 className="font-semibold text-slate-800">{feedback.title}</h3>
                                                {feedback.module && (
                                                    <p className="text-xs text-slate-500">Módulo: {feedback.module}</p>
                                                )}
                                                {auth.currentUser?.email === 'elsoncontador.st@gmail.com' && (
                                                    <p className="text-xs text-slate-500">Usuário: {feedback.userEmail}</p>
                                                )}
                                            </div>
                                        </div>
                                        {getStatusBadge(feedback.status)}
                                    </div>
                                    <p className="text-sm text-slate-600 mb-2">{feedback.description}</p>
                                    <p className="text-xs text-slate-400">
                                        Enviado em {formatDate(feedback.createdAt)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FeedbackView;
