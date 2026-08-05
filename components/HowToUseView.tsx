import React from 'react';
import { Activity, BookOpen, Boxes, Building2, Calculator, ClipboardPlus, DollarSign, FileText } from 'lucide-react';

const HowToUseView: React.FC = () => {
    const sections = [
        {
            title: 'Atendimento e Saúde', icon: Activity, color: 'text-teal-600', bg: 'bg-teal-100',
            steps: [
                'Pacientes e prontuários: cadastre pacientes, documentos, histórico clínico e evoluções.',
                'Agenda e escalas: organize horários, profissionais, unidades e atendimentos.',
                'Equipes por paciente: defina os profissionais responsáveis por cada paciente.',
                'Prescrições e documentos: registre e acompanhe os documentos assistenciais.',
                'Selecione a empresa ou unidade no topo antes de registrar qualquer operação.'
            ]
        },
        {
            title: 'Financeiro e Importações', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100',
            steps: [
                'Contas a receber e a pagar: registre, edite, filtre, marque como pago e exclua em lote.',
                'Importação Excel: revise as abas e classifique receitas como Clínico ou Laboratório.',
                'Importação XML/PDF: importe notas, vincule responsáveis, ajuste a competência e baixe os XMLs.',
                'Caixa, bancos e conciliação: acompanhe movimentações, saldos e contas bancárias.',
                'Relatórios: gere extratos e o relatório executivo financeiro em PDF.'
            ]
        },
        {
            title: 'Profissionais, Sócios e Repasses', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100',
            steps: [
                'Contratos e Sócios: cadastre prestadores, sócios, regras de pagamento e vigências.',
                'Vinculação de notas: associe notas fiscais ao profissional ou sócio responsável.',
                'Cálculo de repasse: as notas vinculadas compõem automaticamente a receita do período.',
                'Rateio de impostos: distribua o imposto conforme a participação no faturamento.',
                'Produção: consulte atendimentos, valores produzidos e demonstrativos em PDF.'
            ]
        },
        {
            title: 'Produção e Regras Comerciais', icon: ClipboardPlus, color: 'text-purple-600', bg: 'bg-purple-100',
            steps: [
                'Serviços e procedimentos: mantenha o catálogo usado nos atendimentos.',
                'Tabela de preços: defina preço, especialidade, profissional, unidade, vigência e pagadores.',
                'Convênios e planos: cadastre convênios para selecioná-los automaticamente na produção.',
                'Portal de Produção: selecione paciente, profissional, pagador, serviço e situação financeira.',
                'Ao finalizar, o sistema integra produção, faturamento, financeiro, estoque e repasse.'
            ]
        },
        {
            title: 'Dashboard e Gestão Fiscal', icon: Calculator, color: 'text-indigo-600', bg: 'bg-indigo-100',
            steps: [
                'Dashboard Executivo: alterne entre visão mensal e anual, por empresa ou grupo.',
                'Acompanhe receita, despesas, lucro, margem, EBITDA, caixa e inadimplência.',
                'Veja separadamente o faturamento clínico e laboratorial.',
                'Painel Fiscal: acompanhe RBT12, folha, Fator R, anexo, faixa e alíquota.',
                'O imposto lançado vem de Contas a Pagar; sem lançamento, o sistema apresenta uma estimativa.'
            ]
        },
        {
            title: 'Recursos e Controladoria', icon: Boxes, color: 'text-orange-600', bg: 'bg-orange-100',
            steps: [
                'Estoque e materiais: cadastre itens e registre o consumo durante a produção.',
                'Pacotes e recorrência: organize sessões contratadas e atendimentos recorrentes.',
                'Fornecedores e centros: estruture custos e resultados para análises gerenciais.',
                'Plano de contas e integração contábil: classifique e prepare dados para a contabilidade.',
                'Documentos fiscais, tributos e retenções: centralize as informações fiscais.'
            ]
        },
        {
            title: 'Empresas, Acessos e Configuração', icon: Building2, color: 'text-cyan-600', bg: 'bg-cyan-100',
            steps: [
                'Empresas e unidades: cadastre filiais e analise todas pelo Grupo consolidado.',
                'Usuários e permissões: convide usuários e defina o nível de acesso.',
                'Cadastros gerais: mantenha categorias, centros de custo e de resultado.',
                'Parâmetros: configure os dados que orientam cálculos e rotinas.',
                'Auditoria: consulte o histórico das operações relevantes do sistema.'
            ]
        }
    ];

    return (
        <div className="h-full overflow-y-auto p-6 animate-fade-in">
            <div className="max-w-6xl mx-auto space-y-8 pb-24 md:pb-6">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm"><BookOpen className="w-8 h-8 text-brand-400" /></div>
                        <div><h1 className="text-3xl font-bold">Como Usar</h1><p className="text-slate-300 mt-1">Guia atualizado dos principais fluxos e recursos do ERCMed</p></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sections.map((section) => (
                        <div key={section.title} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4"><div className={`p-2.5 rounded-lg ${section.bg}`}><section.icon className={`w-6 h-6 ${section.color}`} /></div><h3 className="text-lg font-bold text-slate-800">{section.title}</h3></div>
                                <ul className="space-y-3">{section.steps.map((step, index) => <li key={step} className="flex items-start gap-3 text-sm text-slate-600"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold mt-0.5">{index + 1}</span><span className="leading-relaxed">{step}</span></li>)}</ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HowToUseView;
