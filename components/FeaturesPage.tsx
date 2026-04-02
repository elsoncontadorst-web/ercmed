import React from 'react';
import { Heart, Users, Calendar, FileSignature, DollarSign, Activity, TrendingUp, CheckCircle, ArrowLeft, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FeaturesPage: React.FC = () => {
    const navigate = useNavigate();

    const handleWhatsApp = () => {
        window.open('https://api.whatsapp.com/send?phone=5579988078887&text=Olá%2C%20gostaria%20de%20conhecer%20o%20ERCMed.', '_blank');
    };

    const detailedFeatures = [
        {
            category: 'Agente de IA e Decisão Clínica',
            icon: Activity,
            color: 'purple',
            items: [
                'Assistente de Decisão Clínica Inteligente',
                'Geração de Anamneses mistas com IA',
                'Revisão e insights de prontuários',
                'Suporte à decisão baseada em evidências',
                'Automação de tarefas repetitivas'
            ]
        },
        {
            category: 'Gestão de Pacientes & Consultório',
            icon: Users,
            color: 'teal',
            items: [
                'Consultório Eletrônico (PEP) completo',
                'Histórico clínico cronológico',
                'Prescrição Digital inteligente',
                'Equipes multidisciplinares',
                'Segmentação por clínica/unidade'
            ]
        },
        {
            category: 'Agenda Inteligente',
            icon: Calendar,
            color: 'blue',
            items: [
                'Agendamento Online para pacientes',
                'Gestão de horários e turnos',
                'Fila de espera (em breve)',
                'Confirmação automática',
                'Bloqueios e feriados'
            ]
        },
        {
            category: 'Financeiro & Repasse',
            icon: DollarSign,
            color: 'emerald',
            items: [
                'Cálculo automático de Repasses Médicos',
                'Regras de comissão flexíveis e escalonadas',
                'Fluxo de Caixa com DRE Gerencial',
                'Indicadores financeiros e gráficos',
                'Emissão de Recibos Profissionais'
            ]
        },

    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-cyan-50">
            {/* Header */}
            <nav className="w-full bg-white/80 backdrop-blur-md border-b border-teal-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <Heart className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-800 font-bold text-xl leading-tight">ERCMed</span>
                            <span className="text-teal-600 text-xs tracking-wider font-medium">GESTÃO DE SAÚDE</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="text-slate-600 hover:text-slate-800 font-medium transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Title Section */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-800 mb-4">
                        Recursos <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500">Completos</span> do Sistema
                    </h1>
                    <p className="text-slate-600 text-lg max-w-3xl mx-auto">
                        Conheça todas as funcionalidades do ERCMed - a solução completa para gestão de clínicas e consultórios de saúde
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {detailedFeatures.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border border-slate-100"
                        >
                            <div className={`w-12 h-12 bg-${feature.color}-100 rounded-lg flex items-center justify-center mb-4`}>
                                <feature.icon className={`w-6 h-6 text-${feature.color}-600`} />
                            </div>
                            <h5 className="text-slate-800 font-bold text-lg mb-3">{feature.category}</h5>
                            <ul className="space-y-2">
                                {feature.items.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-slate-600 text-sm">
                                        <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* CTA Section */}
                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-3xl p-12 text-center shadow-2xl">
                    <div className="max-w-3xl mx-auto">
                        <Heart className="w-16 h-16 text-white mx-auto mb-6" />
                        <h3 className="text-4xl font-bold text-white mb-4">
                            Pronto para conhecer o ERCMed?
                        </h3>
                        <p className="text-white/90 text-lg mb-8">
                            Entre em contato e solicite uma demonstração personalizada
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={handleWhatsApp}
                                className="bg-white text-teal-600 hover:bg-slate-50 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="w-6 h-6" />
                                Falar com Especialista
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="bg-slate-900 text-white hover:bg-slate-800 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 border-2 border-white/20"
                            >
                                Voltar ao Início
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gradient-to-r from-teal-600 to-cyan-700 py-8 mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-full">
                                <Heart className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-xl">ERCMed</p>
                                <p className="text-sm opacity-90">Gestão de Saúde e Repasse Clínico</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 opacity-90">
                            <div className="flex flex-col items-center">
                                <MessageCircle className="w-5 h-5 mb-1" />
                                <p className="font-semibold text-sm">(79) 98807-8887</p>
                                <p className="text-xs">Suporte e Vendas</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/20 text-center text-white/70 text-sm">
                        <p>© 2025 ERCMed. Todos os direitos reservados. | Versão 2.0</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default FeaturesPage;
