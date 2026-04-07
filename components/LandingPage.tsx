import React, { useState } from 'react';
import { LogIn, MessageCircle, Heart, Activity, Calendar, Pill, DollarSign, FileSignature, TrendingUp, Users, CheckCircle, Sparkles, Shield, Clock, Download, Rocket } from 'lucide-react';
import InstallModal from './InstallModal';
import SystemLogo from './SystemLogo';

interface LandingPageProps {
    onLoginClick: () => void;
    onTrialClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onTrialClick }) => {
    const [showDetailedFeatures, setShowDetailedFeatures] = React.useState(false);

    const handleWhatsApp = () => {
        window.open('https://api.whatsapp.com/send?phone=5579988078887&text=Olá%2C%20gostaria%20de%20conhecer%20o%20ERCMed.', '_blank');
    };

    const mainFeatures = [
        {
            title: 'Gestão de Saúde',
            subtitle: 'Pessoal',
            color: 'from-teal-400 to-cyan-500',
            icon: Heart,
            description: 'Acompanhe consultas, medicamentos e métricas de saúde'
        },
        {
            title: 'Repasse Clínico',
            subtitle: 'Financeiro',
            color: 'from-blue-400 to-indigo-500',
            icon: DollarSign,
            description: 'Calcule repasses de profissionais com precisão'
        },
        {
            title: 'Contratos',
            subtitle: 'Prestadores',
            color: 'from-purple-400 to-pink-500',
            icon: FileSignature,
            description: 'Organize contratos de prestadores de serviço'
        },
        {
            title: 'Controle Financeiro',
            subtitle: 'Completo',
            color: 'from-emerald-400 to-teal-500',
            icon: TrendingUp,
            description: 'Gerencie receitas, despesas e fluxo de caixa'
        },
    ];

    const healthFeatures = [
        {
            icon: Calendar,
            title: 'Agendamento de Consultas',
            description: 'Organize e acompanhe todas as suas consultas médicas em um só lugar. Receba lembretes e nunca perca um compromisso.',
            color: 'teal'
        },
        {
            icon: Pill,
            title: 'Controle de Medicamentos',
            description: 'Gerencie seus medicamentos, dosagens e horários. Mantenha um histórico completo de prescrições médicas.',
            color: 'blue'
        },
        {
            icon: Activity,
            title: 'Métricas de Saúde',
            description: 'Registre e acompanhe pressão arterial, glicose, peso e outros indicadores importantes para sua saúde.',
            color: 'purple'
        },
        {
            icon: Users,
            title: 'Gestão de Profissionais',
            description: 'Configure profissionais de saúde, taxas de repasse, impostos e aluguel de sala de forma personalizada.',
            color: 'emerald'
        }
    ];

    const benefits = [
        'Interface intuitiva e fácil de usar',
        'Sincronização automática na nuvem',
        'Cálculos precisos de repasse',
        'Relatórios detalhados em PDF',
        'Alertas e lembretes inteligentes',
        'Suporte especializado',
        'Atualizações constantes',
        'Segurança de dados garantida',
        'Acesso multiplataforma',
        'Categorias personalizáveis'
    ];

    const detailedFeatures = [
        {
            category: 'Gestão de Pacientes',
            icon: Users,
            color: 'teal',
            items: [
                'Cadastro completo de pacientes',
                'Histórico médico detalhado',
                'Prontuário eletrônico integrado',
                'Anamnese individual e multidisciplinar',
                'Equipes multidisciplinares'
            ]
        },
        {
            category: 'Agendamento',
            icon: Calendar,
            color: 'blue',
            items: [
                'Agenda online integrada',
                'Confirmação automática por WhatsApp',
                'Gestão de horários de atendimento',
                'Link público para agendamento',
                'Sincronização em tempo real'
            ]
        },
        {
            category: 'Prontuário Eletrônico',
            icon: FileSignature,
            color: 'purple',
            items: [
                'Evolução clínica (rápida e detalhada)',
                'Prescrição digital com PDF',
                'Solicitação de exames',
                'Documentos e atestados médicos',
                'Métricas e gráficos de evolução'
            ]
        },
        {
            category: 'Gestão Financeira',
            icon: DollarSign,
            color: 'emerald',
            items: [
                'Faturamento e recibos',
                'Cálculo de repasse profissional',
                'Contratos de prestadores',
                'Faturamento TISS (convênios)',
                'Controle de glosas'
            ]
        },
        {
            category: 'TISS - Convênios',
            icon: Activity,
            color: 'indigo',
            items: [
                'Cadastro de convênios',
                'Tabelas de preços (CBHPM, AMB)',
                'Emissão de guias (Consulta, SADT)',
                'Gestão de lotes',
                'Geração automática de XML TISS'
            ]
        },
        {
            category: 'Relatórios',
            icon: TrendingUp,
            color: 'cyan',
            items: [
                'Recibos em PDF',
                'Prescrições médicas',
                'Solicitações de exames',
                'Atestados e declarações',
                'Relatórios de repasse'
            ]
        }
    ];


    const [showInstallModal, setShowInstallModal] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-cyan-50 flex flex-col font-sans overflow-x-hidden">
            <InstallModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
            {/* Navbar */}
            <nav className="w-full bg-white/80 backdrop-blur-md border-b border-teal-100 fixed top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <SystemLogo className="h-16" variant="dark" />
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowInstallModal(true)}
                            className="hidden md:flex text-teal-600 hover:text-teal-700 font-medium text-sm items-center gap-2 px-4 py-2 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Instalar App
                        </button>
                        <button
                            onClick={onTrialClick}
                            className="hidden lg:flex bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-5 py-2.5 rounded-full font-bold text-sm items-center gap-2 transition-all shadow-sm"
                        >
                            <Rocket className="w-4 h-4" />
                            Teste Grátis
                        </button>
                        <button
                            onClick={onLoginClick}
                            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-6 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 shadow-lg shadow-teal-200"
                        >
                            <LogIn className="w-4 h-4" />
                            Acessar Sistema
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 pt-20 w-full overflow-hidden relative">
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl pointer-events-none opacity-50"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">

                    {/* Header */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                            <Sparkles className="w-4 h-4" />
                            Plataforma completa de gestão para clínicas de saúde
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-800 leading-tight mb-4">
                            Gestão Inteligente para <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500">Clínicas</span> e
                        </h1>
                        <h2 className="text-4xl lg:text-6xl font-bold text-slate-700 mb-6">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">Consultórios</span> de Saúde
                        </h2>
                        <p className="text-slate-600 text-lg max-w-3xl mx-auto mb-8 leading-relaxed">
                            A solução definitiva para médicos e profissionais de saúde. Simplifique agendamentos, prontuários,
                            controle financeiro e repasses em uma única plataforma integrada.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                            <button
                                onClick={onTrialClick}
                                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-4 rounded-xl font-black text-lg shadow-xl shadow-emerald-200 transition-all flex items-center justify-center gap-2 transform hover:scale-105 border-2 border-white/20"
                            >
                                <Rocket className="w-6 h-6 animate-bounce" />
                                COMEÇAR TESTE GRÁTIS
                                <span className="text-[10px] bg-white text-emerald-600 px-2 py-0.5 rounded-full ml-1">15 DIAS</span>
                            </button>
                            <button
                                onClick={handleWhatsApp}
                                className="bg-white text-emerald-600 hover:bg-emerald-50 px-8 py-4 rounded-xl font-bold text-lg shadow-lg border-2 border-emerald-200 transition-all flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="w-6 h-6" />
                                Falar com Especialista
                            </button>
                        </div>

                        <div className="flex justify-center mb-12 sm:hidden">
                            <button
                                onClick={() => setShowInstallModal(true)}
                                className="text-teal-600 font-medium flex items-center gap-2 hover:bg-teal-50 px-4 py-2 rounded-lg transition-colors"
                            >
                                <Download className="w-5 h-5" />
                                Como Instalar o App
                            </button>
                        </div>

                        {/* Dashboard Mockup */}
                        <div className="relative mx-auto max-w-5xl shadow-2xl rounded-2xl overflow-hidden border-4 border-slate-800/5">
                            <img
                                src="/assets/dashboard-mockup.png"
                                alt="Dashboard do Sistema ERCMed"
                                className="w-full h-auto object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent pointer-events-none"></div>
                        </div>
                    </div>

                    {/* Main Features Cards */}
                    <div className="mb-20">
                        <h3 className="text-3xl font-bold text-slate-800 text-center mb-3">
                            Recursos <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500">Principais</span>
                        </h3>
                        <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
                            Tudo que você precisa para gerenciar sua saúde e as finanças da sua clínica
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {mainFeatures.map((feature, index) => (
                                <div
                                    key={index}
                                    className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 cursor-default group border border-slate-100"
                                >
                                    <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                                        <feature.icon className="w-8 h-8 text-white" />
                                    </div>
                                    <h4 className="text-slate-800 font-bold text-xl mb-1">{feature.title}</h4>
                                    <p className="text-teal-600 text-sm font-semibold mb-3">{feature.subtitle}</p>
                                    <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                                </div>
                            ))}
                        </div>

                        {/* Button to show detailed features */}
                        <div className="text-center mt-10">
                            <a
                                href="/recursos"
                                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-teal-200 transition-all inline-flex items-center gap-3"
                            >
                                <Sparkles className="w-5 h-5" />
                                Ver Todos os Recursos do Sistema
                            </a>
                        </div>

                        {/* Detailed Features Section */}
                        {showDetailedFeatures && (
                            <div className="mt-12 animate-fadeIn">
                                <div className="bg-gradient-to-br from-slate-50 to-teal-50 rounded-3xl p-8 border-2 border-teal-100">
                                    <h4 className="text-2xl font-bold text-slate-800 text-center mb-8">
                                        Recursos <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500">Completos</span> do Sistema
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Health Features Section */}
            <div className="mb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h3 className="text-3xl font-bold text-slate-800 text-center mb-3">
                    Gestão <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">Inteligente</span>
                </h3>
                <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
                    Ferramentas profissionais para cuidar da sua saúde e gerenciar sua clínica
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {healthFeatures.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-white/70 backdrop-blur-sm border-2 border-slate-100 p-8 rounded-2xl hover:border-teal-200 hover:shadow-xl transition-all group"
                        >
                            <div className={`w-14 h-14 bg-${feature.color}-100 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                                <feature.icon className={`w-7 h-7 text-${feature.color}-600`} />
                            </div>
                            <h4 className="text-slate-800 font-bold text-xl mb-3">{feature.title}</h4>
                            <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile Access Section */}
            <div className="mb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-slate-900 rounded-3xl p-8 md:p-12 overflow-hidden relative">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                        <div>
                            <h3 className="text-3xl font-bold text-white mb-6">
                                Acesse de <span className="text-teal-400">Qualquer Lugar</span>
                            </h3>
                            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                                Tenha o controle da sua clínica e da sua saúde na palma da mão.
                                Nossa plataforma é totalmente responsiva e otimizada para dispositivos móveis.
                            </p>
                            <ul className="space-y-4 mb-8">
                                {[
                                    'Visualize sua agenda em tempo real',
                                    'Consulte prontuários e históricos',
                                    'Acompanhe o fluxo de caixa',
                                    'Receba notificações importantes'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-200">
                                        <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center">
                                            <CheckCircle className="w-4 h-4 text-teal-400" />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => setShowInstallModal(true)}
                                className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                Ver como Instalar o App
                            </button>
                        </div>
                        <div className="relative flex justify-center">
                            <img
                                src="/assets/mobile-mockup.png"
                                alt="Versão Mobile do ERCMed"
                                className="w-[280px] rounded-[2.5rem] shadow-2xl border-8 border-slate-800 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500"
                            />
                        </div>
                    </div>

                    {/* Background decorations */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none opacity-50"></div>
                </div>
            </div>

            {/* Benefits Grid */}
            <div className="mb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h3 className="text-3xl font-bold text-slate-800 text-center mb-12">
                    Por que escolher o <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500">ERCMed?</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {benefits.map((benefit, index) => (
                        <div
                            key={index}
                            className="bg-white/60 backdrop-blur-sm border border-slate-200 p-5 rounded-xl flex items-center gap-4 hover:bg-white hover:shadow-lg transition-all"
                        >
                            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-6 h-6 text-teal-600" />
                            </div>
                            <span className="text-slate-700 font-medium">{benefit}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trust Section */}
            <div className="mb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl p-12 text-center shadow-2xl">
                    <div className="max-w-3xl mx-auto">
                        <Shield className="w-16 h-16 text-white mx-auto mb-6 opacity-90" />
                        <h3 className="text-4xl font-bold text-white mb-4">
                            Segurança e Privacidade Garantidas
                        </h3>
                        <p className="text-white/90 text-lg mb-6 leading-relaxed">
                            Seus dados de saúde e informações financeiras são protegidos com criptografia de ponta a ponta.
                            Conformidade total com a LGPD e normas de segurança médica.
                        </p>
                        <div className="flex flex-wrap justify-center gap-6 text-white/80 text-sm">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                <span>Criptografia SSL</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                <span>Backup Automático</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                <span>Conforme LGPD</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="mb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-3xl p-12 text-center shadow-2xl">
                    <div className="max-w-3xl mx-auto">
                        <Heart className="w-16 h-16 text-white mx-auto mb-6" />
                        <h3 className="text-4xl font-bold text-white mb-4">
                            Pronto para simplificar sua gestão?
                        </h3>
                        <p className="text-white/90 text-lg mb-8">
                            Comece agora a usar o ERCMed e tenha mais tempo para cuidar do que realmente importa
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={handleWhatsApp}
                                className="bg-white text-teal-600 hover:bg-slate-50 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="w-6 h-6" />
                                Solicitar Demonstração
                            </button>
                            <button
                                onClick={onLoginClick}
                                className="bg-slate-900 text-white hover:bg-slate-800 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 border-2 border-white/20"
                            >
                                <LogIn className="w-6 h-6" />
                                Fazer Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gradient-to-r from-teal-600 to-cyan-700 py-8 relative z-20 mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-white">
                        <div className="flex items-center gap-4">
                            <SystemLogo className="h-20" variant="white" />
                            <div className="text-left">
                                <p className="font-bold text-2xl">ERCMed</p>
                                <p className="text-sm opacity-90 font-medium">Gestão de Saúde e Repasse Clínico</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 opacity-90">
                            <div className="flex flex-col items-center">
                                <MessageCircle className="w-5 h-5 mb-1" />
                                <p className="font-semibold text-sm">(79) 98807-8887</p>
                                <p className="text-xs">Suporte e Vendas</p>
                            </div>
                            <div className="h-12 w-px bg-white/30"></div>
                            <div className="text-xs text-right leading-tight">
                                <p className="opacity-80">DESENVOLVIDO POR</p>
                                <p className="font-bold text-sm">ERC SISTEMAS DE GESTÃO E AUTOMAÇÕES EMPRESARIAIS</p>
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

export default LandingPage;
