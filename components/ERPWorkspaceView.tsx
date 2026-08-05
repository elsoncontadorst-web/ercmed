import React from 'react';
import { AppView } from '../types';
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  ClipboardList,
  FileText,
  Landmark,
  Layers3,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Tags,
  Users,
  Wallet
} from 'lucide-react';

interface ERPWorkspaceViewProps {
  currentView: AppView;
  setView?: (view: AppView) => void;
}

type Shortcut = { label: string; view: AppView };

type WorkspaceConfig = {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  bullets: string[];
  shortcuts: Shortcut[];
  note: string;
};

const CONFIG: Partial<Record<AppView, WorkspaceConfig>> = {
  [AppView.ACCOUNTS_RECEIVABLE]: {
    title: 'Contas a Receber',
    subtitle: 'Acompanhe títulos, recebimentos, inadimplência e vínculo com faturamento.',
    icon: Wallet,
    bullets: ['Baixa manual ou automática', 'Vínculo com faturamento e atendimento', 'Status recebido ou pendente'],
    shortcuts: [
      { label: 'Financeiro', view: AppView.FINANCIAL_CONTROL },
      { label: 'Cobranças e inadimplência', view: AppView.COLLECTIONS },
      { label: 'Faturamento', view: AppView.BILLING_MANAGEMENT }
    ],
    note: 'Este módulo usa os lançamentos financeiros e os títulos originados da produção/faturamento.'
  },
  [AppView.ACCOUNTS_PAYABLE]: {
    title: 'Contas a Pagar',
    subtitle: 'Centralize despesas recorrentes, fornecedores, XML e compromissos financeiros.',
    icon: Wallet,
    bullets: ['Despesas recorrentes e manuais', 'Reflexo de XML e compras', 'Centros de custo e resultado'],
    shortcuts: [
      { label: 'Financeiro', view: AppView.FINANCIAL_CONTROL },
      { label: 'Compras', view: AppView.PURCHASES },
      { label: 'Documentos Fiscais', view: AppView.FISCAL_IMPORT }
    ],
    note: 'O fluxo de pagamento é consolidado no financeiro e na controladoria.'
  },
  [AppView.CASH_ACCOUNTS]: {
    title: 'Caixa',
    subtitle: 'Controle entradas, saídas e posição de caixa operacional.',
    icon: Wallet,
    bullets: ['Movimentação diária', 'Fechamento operacional', 'Impacto imediato no fluxo de caixa'],
    shortcuts: [
      { label: 'Fluxo de Caixa', view: AppView.CASH_FLOW },
      { label: 'Financeiro', view: AppView.FINANCIAL_CONTROL }
    ],
    note: 'Os saldos de caixa alimentam o dashboard executivo e a visão gerencial.'
  },
  [AppView.BANKS]: {
    title: 'Bancos',
    subtitle: 'Gestão de contas bancárias, saldos e movimentações financeiras.',
    icon: Landmark,
    bullets: ['Contas e saldos', 'PIX, transferências e cartões', 'Base para conciliação bancária'],
    shortcuts: [
      { label: 'Financeiro', view: AppView.FINANCIAL_CONTROL },
      { label: 'Conciliação', view: AppView.BANK_RECONCILIATION }
    ],
    note: 'As contas bancárias fazem parte da governança financeira e dos parâmetros administrativos.'
  },
  [AppView.BANK_RECONCILIATION]: {
    title: 'Conciliação Bancária',
    subtitle: 'Compare movimentações do ERP com o extrato e identifique divergências.',
    icon: Calculator,
    bullets: ['Conciliação por conta', 'Diferenças entre recebido e baixado', 'Suporte à auditoria financeira'],
    shortcuts: [
      { label: 'Financeiro', view: AppView.FINANCIAL_CONTROL },
      { label: 'Bancos', view: AppView.BANKS }
    ],
    note: 'A conciliação fecha o ciclo entre faturamento, recebimento e posição bancária.'
  },
  [AppView.COLLECTIONS]: {
    title: 'Cobranças e Inadimplência',
    subtitle: 'Acompanhe títulos pendentes e ações para recuperação de receita.',
    icon: Receipt,
    bullets: ['Títulos em atraso', 'Baixas pendentes', 'Reflexo em inadimplência no dashboard'],
    shortcuts: [
      { label: 'Contas a Receber', view: AppView.ACCOUNTS_RECEIVABLE },
      { label: 'Financeiro', view: AppView.FINANCIAL_CONTROL }
    ],
    note: 'Este módulo usa os títulos pendentes para compor inadimplência e alertas executivos.'
  },
  [AppView.BILLING_PRODUCTION]: {
    title: 'Produção',
    subtitle: 'Transforme atendimentos e lançamentos em base faturável.',
    icon: ClipboardList,
    bullets: ['Produção por profissional', 'Reflexo no faturamento e repasse', 'Validação operacional'],
    shortcuts: [
      { label: 'Portal de Produção Profissional', view: AppView.PRODUCTION_ENTRY },
      { label: 'Controle de Atendimentos', view: AppView.ATTENDANCES },
      { label: 'Faturamento', view: AppView.BILLING_MANAGEMENT }
    ],
    note: 'Produção registrada corretamente é o gatilho do motor financeiro do ERP.'
  },
  [AppView.BILLING_PRIVATE]: {
    title: 'Faturamento Particular',
    subtitle: 'Controle cobranças e recebimentos de atendimentos particulares.',
    icon: Receipt,
    bullets: ['Particular e recebimento direto', 'Baixa financeira', 'Indicadores de ticket e margem'],
    shortcuts: [
      { label: 'Faturamento', view: AppView.BILLING_MANAGEMENT },
      { label: 'Contas a Receber', view: AppView.ACCOUNTS_RECEIVABLE }
    ],
    note: 'Os lançamentos particulares alimentam receita, caixa e dashboard executivo.'
  },
  [AppView.BILLING_INSURANCE]: {
    title: 'Convênios',
    subtitle: 'Gerencie produção, contratos e faturamento por convênio.',
    icon: Building2,
    bullets: ['Planos e convênios', 'Regras comerciais', 'Produção vinculada ao pagador correto'],
    shortcuts: [
      { label: 'TISS', view: AppView.TISS_BILLING },
      { label: 'Serviços e Preços', view: AppView.SERVICE_CATALOG },
      { label: 'Faturamento', view: AppView.BILLING_MANAGEMENT }
    ],
    note: 'Convênios dependem da tabela, do serviço e da produção corretamente classificada.'
  },
  [AppView.BILLING_GUIDES]: {
    title: 'Guias e Lotes',
    subtitle: 'Organize envio, protocolos e agrupamentos de faturamento.',
    icon: FileText,
    bullets: ['Guias assistenciais', 'Lotes de faturamento', 'Rastreabilidade por competência'],
    shortcuts: [
      { label: 'TISS', view: AppView.TISS_BILLING },
      { label: 'Convênios', view: AppView.BILLING_INSURANCE }
    ],
    note: 'Guias e lotes estruturam o faturamento por convênio e apoiam auditoria.'
  },
  [AppView.BILLING_GLOSAS]: {
    title: 'Glosas e Recursos',
    subtitle: 'Acompanhe divergências, perdas e regularizações no faturamento.',
    icon: BarChart3,
    bullets: ['Glosas identificadas', 'Pendências por convênio', 'Impacto em receita e repasse'],
    shortcuts: [
      { label: 'TISS', view: AppView.TISS_BILLING },
      { label: 'Repasses', view: AppView.REPASSE_DASHBOARD }
    ],
    note: 'Glosas afetam rentabilidade, previsão de recebimento e repasse profissional.'
  },
  [AppView.PROFESSIONALS]: {
    title: 'Profissionais e Equipes',
    subtitle: 'Cadastro operacional, vínculo de equipe e estrutura assistencial.',
    icon: Users,
    bullets: ['Equipe multidisciplinar', 'Vínculo usuário-profissional', 'Base para produção e repasse'],
    shortcuts: [
      { label: 'Gestão de equipes', view: AppView.CLINIC_TEAMS },
      { label: 'Usuários', view: AppView.USERS_MANAGEMENT },
      { label: 'Contratos', view: AppView.CONTRACTS }
    ],
    note: 'Para operar corretamente, o usuário de acesso deve estar vinculado ao profissional.'
  },
  [AppView.PROFESSIONAL_PRODUCTION]: {
    title: 'Produção por Profissional',
    subtitle: 'Visualize volume, faturamento e performance individual.',
    icon: Briefcase,
    bullets: ['Quantidade produzida', 'Reflexo em faturamento', 'Base para repasses e margem'],
    shortcuts: [
      { label: 'Portal de Produção Profissional', view: AppView.PRODUCTION_ENTRY },
      { label: 'Repasses', view: AppView.REPASSE_CALCULATION },
      { label: 'Dashboard Executivo', view: AppView.HEALTH_DASHBOARD }
    ],
    note: 'Este módulo consolida a produção individual com o financeiro e a controladoria.'
  },
  [AppView.PROFESSIONAL_SCALES]: {
    title: 'Escalas',
    subtitle: 'Gerencie disponibilidade, horários e cobertura operacional.',
    icon: CalendarDaysIcon,
    bullets: ['Horários da clínica', 'Escala por profissional', 'Base para agenda operacional'],
    shortcuts: [
      { label: 'Agenda', view: AppView.APPOINTMENTS },
      { label: 'Horários da clínica', view: AppView.CLINIC_HOURS }
    ],
    note: 'A escala é a camada de disponibilidade que organiza agenda e operação.'
  },
  [AppView.SERVICES_PROCEDURES]: {
    title: 'Serviços e Procedimentos',
    subtitle: 'Catálogo assistencial e regras de classificação operacional.',
    icon: Tags,
    bullets: ['Serviços e procedimentos', 'Especialidade e duração', 'Base para preço e produção'],
    shortcuts: [
      { label: 'Serviços e Preços', view: AppView.SERVICE_CATALOG },
      { label: 'Portal de Produção Profissional', view: AppView.PRODUCTION_ENTRY }
    ],
    note: 'Serviço bem cadastrado é o elo entre operação, faturamento e controladoria.'
  },
  [AppView.PRICE_TABLES]: {
    title: 'Tabelas de Preços',
    subtitle: 'Defina valores por serviço, profissional, especialidade, contrato e unidade.',
    icon: Tags,
    bullets: ['Particular e convênio', 'Regra por profissional ou especialidade', 'Vigência comercial'],
    shortcuts: [
      { label: 'Serviços e Preços', view: AppView.SERVICE_CATALOG },
      { label: 'Convênios e Planos', view: AppView.INSURANCE_PLANS }
    ],
    note: 'As tabelas são consultadas automaticamente pelo portal do profissional e pelo faturamento.'
  },
  [AppView.INSURANCE_PLANS]: {
    title: 'Convênios e Planos',
    subtitle: 'Gestão de pagadores, contratos e planos de atendimento.',
    icon: Building2,
    bullets: ['Pagador e contrato', 'Relação com TISS', 'Regras comerciais por plano'],
    shortcuts: [
      { label: 'TISS', view: AppView.TISS_BILLING },
      { label: 'Tabelas de Preços', view: AppView.PRICE_TABLES }
    ],
    note: 'Convênio e plano interferem na regra comercial, produção e recebimento.'
  },
  [AppView.SUPPLIERS]: {
    title: 'Fornecedores',
    subtitle: 'Base de fornecedores para compras, XML, contas a pagar e patrimônio.',
    icon: ShoppingCart,
    bullets: ['Dados cadastrais', 'Documentos', 'Relação com compras e pagamentos'],
    shortcuts: [
      { label: 'Compras', view: AppView.PURCHASES },
      { label: 'Documentos Fiscais', view: AppView.FISCAL_IMPORT },
      { label: 'Financeiro', view: AppView.FINANCIAL_CONTROL }
    ],
    note: 'Fornecedor bem cadastrado fecha o ciclo entre compra, XML, estoque e financeiro.'
  },
  [AppView.PURCHASES]: {
    title: 'Compras',
    subtitle: 'Solicitação, pedido, recebimento e impacto financeiro/estoque.',
    icon: ShoppingCart,
    bullets: ['Pedidos e recebimento', 'Vínculo com XML', 'Entrada em estoque e contas a pagar'],
    shortcuts: [
      { label: 'Documentos Fiscais', view: AppView.FISCAL_IMPORT },
      { label: 'Estoque', view: AppView.INVENTORY },
      { label: 'Fornecedores', view: AppView.SUPPLIERS }
    ],
    note: 'Compras integram suprimentos, financeiro e patrimônio.'
  },
  [AppView.DRE_MANAGERIAL]: {
    title: 'DRE Gerencial',
    subtitle: 'Resultado consolidado para gestão da empresa de saúde.',
    icon: BarChart3,
    bullets: ['Receita, custo e lucro', 'Margem e resultado', 'Base para decisão executiva'],
    shortcuts: [
      { label: 'Fluxo Gerencial', view: AppView.MANAGERIAL_FLOW },
      { label: 'Fluxo de Caixa e DRE', view: AppView.CASH_FLOW }
    ],
    note: 'A DRE usa lançamentos financeiros e produção classificada por centro.'
  },
  [AppView.MANAGERIAL_FLOW]: {
    title: 'Fluxo Gerencial',
    subtitle: 'Visão consolidada de caixa e previsão da operação.',
    icon: BarChart3,
    bullets: ['Fluxo realizado e previsto', 'Saúde financeira', 'Base para orçamento e meta'],
    shortcuts: [
      { label: 'Fluxo de Caixa', view: AppView.CASH_FLOW },
      { label: 'Dashboard Executivo', view: AppView.HEALTH_DASHBOARD }
    ],
    note: 'O fluxo gerencial é o elo entre financeiro, controladoria e projeção executiva.'
  },
  [AppView.COST_CENTERS]: {
    title: 'Centros de Custo',
    subtitle: 'Classifique despesas e acompanhe custo por área/unidade.',
    icon: Calculator,
    bullets: ['Administrativo, assistencial e unidades', 'Rateio de despesas', 'Base para DRE gerencial'],
    shortcuts: [
      { label: 'Financeiro', view: AppView.FINANCIAL_CONTROL },
      { label: 'Controladoria', view: AppView.CASH_FLOW }
    ],
    note: 'Centros de custo alimentam margem, DRE e rentabilidade.'
  },
  [AppView.RESULT_CENTERS]: {
    title: 'Centros de Resultado',
    subtitle: 'Analise receita e resultado por linha de negócio.',
    icon: Calculator,
    bullets: ['Receita assistencial', 'Convênios, particular e exames', 'Base para margem e rentabilidade'],
    shortcuts: [
      { label: 'Dashboard Executivo', view: AppView.HEALTH_DASHBOARD },
      { label: 'Controladoria', view: AppView.CASH_FLOW }
    ],
    note: 'Centros de resultado mostram onde a empresa realmente gera valor.'
  },
  [AppView.BUDGET]: {
    title: 'Orçamento',
    subtitle: 'Planeje metas financeiras e compare realizado versus orçado.',
    icon: Calculator,
    bullets: ['Metas mensais', 'Comparativo orçado vs realizado', 'Base para previsibilidade gerencial'],
    shortcuts: [
      { label: 'Fluxo Gerencial', view: AppView.MANAGERIAL_FLOW },
      { label: 'Dashboard Executivo', view: AppView.HEALTH_DASHBOARD }
    ],
    note: 'Orçamento funciona melhor quando custos e resultados estão classificados corretamente.'
  },
  [AppView.PROFITABILITY_INDICATORS]: {
    title: 'Indicadores de Rentabilidade',
    subtitle: 'Margem por serviço, unidade, convênio e profissional.',
    icon: BarChart3,
    bullets: ['Margem operacional', 'Resultado por profissional', 'Lucratividade por serviço'],
    shortcuts: [
      { label: 'Dashboard Executivo', view: AppView.HEALTH_DASHBOARD },
      { label: 'DRE Gerencial', view: AppView.DRE_MANAGERIAL }
    ],
    note: 'Os indicadores dependem da produção, preço e custo financeiro bem sincronizados.'
  },
  [AppView.CHART_OF_ACCOUNTS]: {
    title: 'Plano de Contas',
    subtitle: 'Estruture as categorias financeiras para integração contábil.',
    icon: FileText,
    bullets: ['Classificação contábil', 'Vínculo com categorias do ERP', 'Base de exportação contábil'],
    shortcuts: [
      { label: 'Módulo contábil', view: AppView.ACCOUNTANT_MODULE },
      { label: 'Financeiro', view: AppView.FINANCIAL_CONTROL }
    ],
    note: 'O plano de contas é essencial para um ERP de gestão e para exportação ao contador.'
  },
  [AppView.ACCOUNTING_INTEGRATION]: {
    title: 'Integração Contábil',
    subtitle: 'Conecte o ERP à rotina contábil e fiscal.',
    icon: Landmark,
    bullets: ['Exportações', 'Histórico de integração', 'Base documental e financeira'],
    shortcuts: [
      { label: 'Módulo contábil', view: AppView.ACCOUNTANT_MODULE },
      { label: 'Documentos fiscais', view: AppView.FISCAL_DOCUMENTS }
    ],
    note: 'A integração contábil depende de categorias, plano de contas e documentos organizados.'
  },
  [AppView.FISCAL_DOCUMENTS]: {
    title: 'Documentos Fiscais',
    subtitle: 'Central de notas, XML, documentos recebidos e emitidos.',
    icon: FileText,
    bullets: ['NF-e, NFS-e e CT-e', 'Classificação fiscal', 'Origem para estoque e contas a pagar'],
    shortcuts: [
      { label: 'Documentos Fiscais', view: AppView.FISCAL_IMPORT },
      { label: 'Módulo contábil', view: AppView.ACCOUNTANT_MODULE }
    ],
    note: 'Documentos fiscais organizam compras, estoque, patrimônio e tributos.'
  },
  [AppView.TAX_RETENTIONS]: {
    title: 'Tributos e Retenções',
    subtitle: 'Controle impostos, retenções e impactos no resultado.',
    icon: Shield,
    bullets: ['ISS, IRRF, INSS e retenções', 'Reflexo em margem', 'Base para controladoria e fiscal'],
    shortcuts: [
      { label: 'Módulo contábil', view: AppView.ACCOUNTANT_MODULE },
      { label: 'Dashboard Executivo', view: AppView.HEALTH_DASHBOARD }
    ],
    note: 'Tributos e retenções afetam provisão, resultado e projeção de caixa.'
  },
  [AppView.ADMIN_GENERAL_REGISTRATIONS]: {
    title: 'Cadastros Gerais',
    subtitle: 'Base administrativa para empresas, unidades, centros e formas de pagamento.',
    icon: Settings,
    bullets: ['Formas de pagamento', 'Centros de custo', 'Centros de resultado e parâmetros'],
    shortcuts: [
      { label: 'Empresas e Unidades', view: AppView.CLINICS },
      { label: 'Usuários', view: AppView.USERS_MANAGEMENT },
      { label: 'Parâmetros', view: AppView.ADMIN_PARAMETERS }
    ],
    note: 'Cadastros gerais dão consistência para o ERP operar com padrão e escala.'
  },
  [AppView.ADMIN_PARAMETERS]: {
    title: 'Parâmetros',
    subtitle: 'Configurações estruturais do sistema e do ambiente operacional.',
    icon: Settings,
    bullets: ['Perfil da empresa', 'Configurações operacionais', 'Preferências e controle do ambiente'],
    shortcuts: [
      { label: 'Perfil do usuário/empresa', view: AppView.USER_PROFILE },
      { label: 'Empresas e Unidades', view: AppView.CLINICS }
    ],
    note: 'Parâmetros sustentam regras do ERP e governança do ambiente.'
  },
  [AppView.ADMIN_AUDIT]: {
    title: 'Auditoria',
    subtitle: 'Monitore alterações críticas, acessos e rastreabilidade operacional.',
    icon: Shield,
    bullets: ['Logs de alteração', 'Rastreamento de produção e preço', 'Base para governança'],
    shortcuts: [
      { label: 'Usuários', view: AppView.USERS_MANAGEMENT },
      { label: 'Perfis e Permissões', view: AppView.PERMISSIONS_MANAGEMENT }
    ],
    note: 'Auditoria é indispensável para um ERP robusto e confiável.'
  },
  [AppView.ADMIN_INTEGRATIONS]: {
    title: 'Integrações',
    subtitle: 'Organize conexões externas, importações e interoperabilidade do sistema.',
    icon: Settings,
    bullets: ['Importações', 'Integrações contábeis e fiscais', 'Fluxos externos'],
    shortcuts: [
      { label: 'Documentos Fiscais', view: AppView.FISCAL_IMPORT },
      { label: 'Integração Contábil', view: AppView.ACCOUNTING_INTEGRATION }
    ],
    note: 'Integrações devem respeitar a base de dados do ERP e sua governança.'
  },
  [AppView.SUPPORT_DOCUMENTATION]: {
    title: 'Documentação',
    subtitle: 'Guia de uso do ERP e estrutura dos fluxos principais.',
    icon: FileText,
    bullets: ['Rotinas principais', 'Fluxos do ERP', 'Apoio ao onboarding do cliente'],
    shortcuts: [
      { label: 'Central de Ajuda', view: AppView.HOW_TO_USE },
      { label: 'Feedback', view: AppView.FEEDBACK }
    ],
    note: 'Documentação reduz erro operacional e acelera adoção do produto.'
  },
  [AppView.SUPPORT_CHANGELOG]: {
    title: 'Histórico de Atualizações',
    subtitle: 'Acompanhe a evolução funcional do sistema.',
    icon: FileText,
    bullets: ['Novos módulos', 'Melhorias operacionais', 'Rastreio de evolução do ERP'],
    shortcuts: [
      { label: 'Documentação', view: AppView.SUPPORT_DOCUMENTATION },
      { label: 'Central de Ajuda', view: AppView.HOW_TO_USE }
    ],
    note: 'O histórico ajuda a equipe a entender o que mudou e o que foi entregue.'
  },
};

function CalendarDaysIcon(props: React.ComponentProps<'svg'>) {
  return <ClipboardList {...props} />;
}

const ERPWorkspaceView: React.FC<ERPWorkspaceViewProps> = ({ currentView, setView }) => {
  const config = CONFIG[currentView];

  if (!config) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Área em preparação</h1>
          <p className="mt-2 text-slate-500">Esta área será exibida aqui conforme a estrutura final do ERP.</p>
        </div>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-brand-50 p-3 text-brand-700">
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{config.title}</h1>
            <p className="mt-1 text-slate-500">{config.subtitle}</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <strong>Central integrada.</strong>{' '}
          Os dados deste recurso são consolidados pelos módulos indicados abaixo, preservando uma única origem para cada informação.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Integrações deste módulo</h2>
          <ul className="mt-4 space-y-3">
            {config.bullets.map(item => (
              <li key={item} className="flex items-start gap-3 text-slate-700">
                <ArrowRight className="mt-0.5 h-4 w-4 text-brand-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <strong className="block text-slate-800">Integração com o ERP</strong>
            <span className="mt-1 block">{config.note}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Ações rápidas</h2>
          <div className="mt-4 space-y-3">
            {config.shortcuts.map(shortcut => (
              <button
                key={shortcut.label}
                onClick={() => setView?.(shortcut.view)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left hover:border-brand-200 hover:bg-brand-50/40"
              >
                <span className="font-medium text-slate-800">{shortcut.label}</span>
                <ArrowRight className="h-4 w-4 text-brand-600" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ERPWorkspaceView;
