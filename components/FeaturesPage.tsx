import React from 'react';
import {
    ArrowLeft,
    BarChart3,
    Building2,
    CheckCircle,
    FileSpreadsheet,
    Landmark,
    MessageCircle,
    Package,
    ReceiptText,
    ShieldCheck,
    UsersRound,
    WalletCards
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FeaturesPage: React.FC = () => {
    const navigate = useNavigate();

    const handleWhatsApp = () => {
        window.open('https://api.whatsapp.com/send?phone=5579988078887&text=Olá%2C%20gostaria%20de%20conhecer%20os%20módulos%20do%20novo%20ERCMED.', '_blank');
    };

    const detailedFeatures = [
        {
            category: 'Gestão Executiva',
            icon: BarChart3,
            items: [
                'Dashboard executivo com indicadores empresariais',
                'Centros de resultado, margem, EBITDA e fluxo projetado',
                'Planejamento, metas e visão por unidade',
                'BI com alertas e análises gerenciais'
            ]
        },
        {
            category: 'Financeiro',
            icon: WalletCards,
            items: [
                'Contas a pagar, contas a receber e inadimplência',
                'Caixa, bancos e conciliação bancária',
                'Cobrança, baixas e previsibilidade de caixa',
                'Integração com faturamento e controladoria'
            ]
        },
        {
            category: 'Faturamento e Repasse',
            icon: ReceiptText,
            items: [
                'Faturamento particular e convênios',
                'Guias, lotes, glosas e recursos',
                'Repasse médico por regras configuráveis',
                'Portal do profissional com produção vinculada ao valor do serviço'
            ]
        },
        {
            category: 'Operação e Cadastros',
            icon: UsersRound,
            items: [
                'Serviços, preços, contratos e tabelas',
                'Cadastro de unidades, equipes e acessos',
                'Portal do profissional para lançamento de produção',
                'Estrutura preparada para empresas de saúde com múltiplas áreas'
            ]
        },
        {
            category: 'Recursos Empresariais',
            icon: Package,
            items: [
                'Compras e fornecedores',
                'Estoque e insumos',
                'Patrimônio e ativos',
                'Pacotes e serviços recorrentes'
            ]
        },
        {
            category: 'Apoio Fiscal e Governança',
            icon: ShieldCheck,
            items: [
                'Importação XML com reflexos operacionais',
                'Fiscal, contabilidade e apoio tributário',
                'Permissões por perfil e rastreabilidade',
                'Integrações e parâmetros do sistema'
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/40 to-cyan-50/30">
            <nav className="w-full border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <Building2 className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-800 font-bold text-xl leading-tight">ERCMed</span>
                            <span className="text-teal-600 text-xs tracking-wider font-medium">ERP PARA EMPRESAS DE SAÚDE</span>
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

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-800 mb-4">
                        Módulos do <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500">novo ERCMED</span>
                    </h1>
                    <p className="text-slate-600 text-lg max-w-3xl mx-auto">
                        Conheça a estrutura do ERP desenhado para gestão, faturamento, financeiro, controladoria e operação de empresas de saúde.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {detailedFeatures.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all border border-slate-100"
                        >
                            <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center mb-4">
                                <feature.icon className="w-6 h-6 text-teal-600" />
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

                <div className="grid gap-6 lg:grid-cols-3 mb-12">
                    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                        <Landmark className="w-8 h-8 text-teal-600 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Controladoria</h3>
                        <p className="text-slate-600 text-sm">DRE, margem, rentabilidade, inadimplência, ticket médio, centros de resultado e acompanhamento executivo.</p>
                    </div>
                    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                        <FileSpreadsheet className="w-8 h-8 text-teal-600 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Fiscal e XML</h3>
                        <p className="text-slate-600 text-sm">Importação XML, classificação fiscal, reflexos em financeiro, estoque e patrimônio e organização documental.</p>
                    </div>
                    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                        <UsersRound className="w-8 h-8 text-teal-600 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Portal do Profissional</h3>
                        <p className="text-slate-600 text-sm">Profissionais lançam sua produção, o sistema calcula receita e repasse, e a gestão acompanha tudo em tempo real.</p>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-3xl p-12 text-center shadow-2xl">
                    <div className="max-w-3xl mx-auto">
                        <Building2 className="w-16 h-16 text-white mx-auto mb-6" />
                        <h3 className="text-4xl font-bold text-white mb-4">
                            Quer ver o novo ERCMED funcionando?
                        </h3>
                        <p className="text-white/90 text-lg mb-8">
                            Fale com nossa equipe e conheça a proposta do ERP para gestão de empresas de saúde.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={handleWhatsApp}
                                className="bg-white text-teal-600 hover:bg-slate-50 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="w-6 h-6" />
                                Falar com especialista
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="bg-slate-900 text-white hover:bg-slate-800 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 border-2 border-white/20"
                            >
                                Voltar ao início
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="bg-gradient-to-r from-teal-600 to-cyan-700 py-8 mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-full">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-xl">ERCMed</p>
                                <p className="text-sm opacity-90">ERP para empresas de saúde</p>
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
                        <p>© 2026 ERCMed. Todos os direitos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default FeaturesPage;
