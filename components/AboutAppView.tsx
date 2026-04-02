import React from 'react';
import { Info, Target, Calculator, Shield, Clock, Banknote, Scale, User, Briefcase, Heart, Lightbulb, FileText, CheckCircle, TrendingUp, Users } from 'lucide-react';

const AboutAppView: React.FC = () => {
    const handleWhatsApp = () => {
        window.open('https://api.whatsapp.com/send?phone=5579988078887', '_system');
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Info className="w-6 h-6 text-brand-600" />
                    Sobre o App e o Escritório
                </h2>
                <p className="text-sm text-slate-500">
                    Especialista em Clínicas e Saúde.
                </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto space-y-8 pb-8">

                    {/* Seção Sobre o App */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-brand-100 rounded-xl">
                                <Target className="w-6 h-6 text-brand-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">ERCMed - Gestão de Clínica e Repasse Financeiro</h3>
                        </div>

                        <p className="text-slate-600 leading-relaxed mb-6">
                            O <strong>ERCMed - Gestão de Clínica e Repasse Financeiro</strong> foi desenvolvido para ser a solução completa de gestão para clínicas e profissionais de saúde, integrando consultório eletrônico, agendamento, controle financeiro e cálculo automatizado de repasses.
                            <br /><br />
                            Nossa missão é simplificar a gestão clínica e financeira, permitindo que você foque no que realmente importa: o cuidado com seus pacientes.
                        </p>

                        <h4 className="font-bold text-slate-700 mb-4 border-l-4 border-brand-500 pl-3">Módulos e Recursos do Sistema:</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Gestão de Saúde */}
                            <div className="flex gap-3 p-4 bg-teal-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-teal-100">
                                <Heart className="w-5 h-5 text-teal-600 flex-shrink-0 mt-1" />
                                <div>
                                    <p className="font-bold text-slate-800">Gestão de Saúde Completa</p>
                                    <p className="text-sm text-slate-500">Consultório Eletrônico (PEP), Agendamento Online, Prescrição Digital e Controle de Pacientes.</p>
                                </div>
                            </div>

                            {/* Consultor IA */}
                            <div className="flex gap-3 p-4 bg-purple-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-purple-100">
                                <Lightbulb className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                                <div>
                                    <p className="font-bold text-slate-800">Consultor IA & Decisão Clínica</p>
                                    <p className="text-sm text-slate-500">Inteligência Artificial para auxiliar em diagnósticos, anamneses e decisões clínicas baseadas em evidências.</p>
                                </div>
                            </div>

                            {/* Contratos e Repasse */}
                            <div className="flex gap-3 p-4 bg-emerald-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-emerald-100">
                                <Banknote className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-1" />
                                <div>
                                    <p className="font-bold text-slate-800">Repasses e Contratos</p>
                                    <p className="text-sm text-slate-500">Cálculo automático de comissões, gestão de contratos médicos e relatórios detalhados.</p>
                                </div>
                            </div>



                            {/* Financeiro e Fluxo de Caixa */}
                            <div className="flex gap-3 p-4 bg-indigo-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-indigo-100">
                                <TrendingUp className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                                <div>
                                    <p className="font-bold text-slate-800">Controle Financeiro</p>
                                    <p className="text-sm text-slate-500">Gestão rigorosa de fluxo de caixa, DRE gerencial e análise de lucratividade.</p>
                                </div>
                            </div>

                            {/* Multi-Clínicas */}
                            <div className="flex gap-3 p-4 bg-orange-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-orange-100">
                                <Users className="w-5 h-5 text-orange-600 flex-shrink-0 mt-1" />
                                <div>
                                    <p className="font-bold text-slate-800">Gestão Multi-Clínicas</p>
                                    <p className="text-sm text-slate-500">Administração centralizada de múltiplas unidades com segregação de dados segura.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seção Sobre o Especialista */}
                    <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-40 bg-brand-600 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -mr-20 -mt-20"></div>

                        <div className="flex flex-col md:flex-row gap-8 relative z-10">
                            <div className="flex-1 space-y-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                            <User className="w-6 h-6 text-brand-400" />
                                        </div>
                                        <h3 className="text-xl font-bold">Sobre o Especialista</h3>
                                    </div>

                                    <h4 className="text-2xl font-bold text-white mb-1">Elson Ribeiro Contador</h4>
                                    <p className="text-brand-400 font-mono text-sm">CRC 8456/O-0 SE</p>
                                </div>

                                <p className="text-slate-300 leading-relaxed">
                                    Sou Elson Ribeiro, contador registrado em Sergipe (SE), com uma atuação firmemente ancorada no <strong>Planejamento e Otimização Tributária</strong>.
                                </p>

                                {/* Especialidade e Visão */}
                                <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                    <h5 className="font-bold text-white mb-3 flex items-center gap-2">
                                        <Heart className="w-4 h-4 text-red-400" />
                                        Especialidade e Visão
                                    </h5>
                                    <p className="text-sm text-slate-300 mb-3">
                                        Minha maior expertise reside na <strong>Contabilidade Estratégica para o Setor de Saúde</strong> (Clínicas, Consultórios Médicos e Profissionais de Saúde). Minha formação em andamento em Farmácia, combinada com a experiência prática, me confere uma visão única para:
                                    </p>
                                    <ul className="space-y-2 text-sm text-slate-300">
                                        <li className="flex gap-2 items-start">
                                            <CheckCircle className="w-3 h-3 text-brand-400 flex-shrink-0 mt-1" />
                                            <span>Identificar e aplicar o <strong>Fator R</strong> para alíquotas reduzidas.</span>
                                        </li>
                                        <li className="flex gap-2 items-start">
                                            <CheckCircle className="w-3 h-3 text-brand-400 flex-shrink-0 mt-1" />
                                            <span>Tradução da complexa legislação (PIS/COFINS, ISS) para a realidade clínica.</span>
                                        </li>
                                        <li className="flex gap-2 items-start">
                                            <CheckCircle className="w-3 h-3 text-brand-400 flex-shrink-0 mt-1" />
                                            <span>Otimização fiscal na gestão de receitas e insumos hospitalares.</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Atendimento Abrangente */}
                                <div>
                                    <h5 className="font-bold text-white mb-3 flex items-center gap-2">
                                        <Target className="w-4 h-4 text-blue-400" />
                                        Atendimento Abrangente
                                    </h5>
                                    <p className="text-sm text-slate-300 mb-3">
                                        Embora o setor de Saúde seja meu foco principal, aplicamos a mesma metodologia estratégica de redução de custos e conformidade para outros segmentos:
                                    </p>
                                    <ul className="space-y-2 text-sm text-slate-300">
                                        <li className="flex gap-2 items-start">
                                            <CheckCircle className="w-3 h-3 text-blue-400 flex-shrink-0 mt-1" />
                                            <span><strong>Serviços de Alto Valor Agregado:</strong> Advocacia, Engenharia e Consultoria.</span>
                                        </li>
                                        <li className="flex gap-2 items-start">
                                            <CheckCircle className="w-3 h-3 text-blue-400 flex-shrink-0 mt-1" />
                                            <span><strong>Comércio e Varejo:</strong> Otimização de carga tributária e gestão de estoque/margem.</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="p-4 bg-brand-900/30 border-l-4 border-brand-500 rounded-r-xl">
                                    <p className="text-slate-200 italic text-sm">
                                        "Minha missão é clara: Transformar o custo obrigatório de impostos em um investimento inteligente para o crescimento e a rentabilidade do seu negócio."
                                    </p>
                                </div>
                            </div>

                            {/* Serviços Estratégicos */}
                            <div className="md:w-1/2 bg-white/10 rounded-xl p-6 border border-white/10 backdrop-blur-md h-fit">
                                <h4 className="font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                                    <Briefcase className="w-5 h-5 text-brand-400" />
                                    Nossos Serviços Estratégicos
                                </h4>
                                <ul className="space-y-4 text-sm text-slate-200">
                                    <li className="flex gap-3 items-start">
                                        <div className="p-1.5 bg-brand-500/20 rounded-lg text-brand-400">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <strong className="block text-white mb-0.5">Abertura e Regularização Empresarial</strong>
                                            <span className="text-slate-400 text-xs">Da escolha do regime tributário ideal à conformidade completa.</span>
                                        </div>
                                    </li>
                                    <li className="flex gap-3 items-start">
                                        <div className="p-1.5 bg-brand-500/20 rounded-lg text-brand-400">
                                            <Scale className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <strong className="block text-white mb-0.5">Planejamento Tributário</strong>
                                            <span className="text-slate-400 text-xs">Desenvolvimento e implementação de estratégias legais para a máxima redução fiscal e proteção patrimonial.</span>
                                        </div>
                                    </li>
                                    <li className="flex gap-3 items-start">
                                        <div className="p-1.5 bg-brand-500/20 rounded-lg text-brand-400">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <strong className="block text-white mb-0.5">Registro de Marcas</strong>
                                            <span className="text-slate-400 text-xs">Proteção integral do seu patrimônio intelectual e do seu naming profissional.</span>
                                        </div>
                                    </li>
                                    <li className="flex gap-3 items-start">
                                        <div className="p-1.5 bg-brand-500/20 rounded-lg text-brand-400">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <strong className="block text-white mb-0.5">Declarações PF (IRPF/ITR)</strong>
                                            <span className="text-slate-400 text-xs">Conformidade, otimização e maximização da restituição.</span>
                                        </div>
                                    </li>
                                    <li className="flex gap-3 items-start">
                                        <div className="p-1.5 bg-brand-500/20 rounded-lg text-brand-400">
                                            <Banknote className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <strong className="block text-white mb-0.5">Consultoria Financeira e BPO</strong>
                                            <span className="text-slate-400 text-xs">Gestão de fluxo de caixa e suporte na tomada de decisão.</span>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="bg-brand-50 border border-brand-100 rounded-2xl p-8 text-center">
                        <div className="mb-4 inline-flex p-3 bg-white rounded-full shadow-sm">
                            <Lightbulb className="w-6 h-6 text-brand-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Próxima Etapa</h3>
                        <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
                            Utilize o ERCMed para gerenciar sua clínica de forma profissional e eficiente. Entre em contato para conhecer todos os recursos disponíveis.
                        </p>
                        <button
                            onClick={handleWhatsApp}
                            className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2 transform hover:-translate-y-1"
                        >
                            Falar com Contador (WhatsApp)
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AboutAppView;
