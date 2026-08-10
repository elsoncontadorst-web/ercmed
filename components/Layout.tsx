import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  ChevronDown,
  ClipboardList,
  Cloud,
  CloudOff,
  Crown,
  DollarSign,
  FileBox,
  FileSearch,
  FileSignature,
  FileSpreadsheet,
  FileUp,
  HandCoins,
  Heart,
  HelpCircle,
  Landmark,
  Layers3,
  LayoutDashboard,
  Library,
  Link as LinkIcon,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Package,
  Pill,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Sun,
  Tags,
  User as UserIcon,
  UserRound,
  Users,
  Wallet,
  Waypoints,
  X,
} from 'lucide-react';
import SystemLogo from './SystemLogo';
import { AppView, UserRole } from '../types';
import { auth, signOut } from '../services/firebase';
import { useSettings } from '../contexts/SettingsContext';
import { useUser } from '../contexts/UserContext';
import { TierBadge } from './TierBadge';
import { getClinics } from '../services/clinicService';
import { Clinic } from '../types/clinic';
import { ACTIVE_CLINIC_CHANGED_EVENT, GROUP_CLINIC_ID, getStoredActiveClinicId, setStoredActiveClinicId } from '../services/activeClinicStorage';
import { canAccessView, getDefaultViewForRole } from '../services/viewAccessPolicy';
import { getAllowedClinicsForUser } from '../services/accessControlService';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  setView: (view: AppView) => void;
}

type NavItem = {
  view: AppView;
  label: string;
  icon: React.ElementType;
  activeViews?: AppView[];
  adminOnly?: boolean;
  masterOnly?: boolean;
};

const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M3 17l6-6 4 4 7-7" />
    <path d="M14 8h6v6" />
  </svg>
);

const isItemActive = (currentView: AppView, item: NavItem) =>
  currentView === item.view || item.activeViews?.includes(currentView) === true;

const SIDEBAR_SCROLL_KEY = 'ercmed_sidebar_scroll_top';

const NavButton = ({
  item,
  currentView,
  setView,
  setMobileMenuOpen,
  registerItemRef,
  navScrollRef,
}: {
  item: NavItem;
  currentView: AppView;
  setView: (view: AppView) => void;
  setMobileMenuOpen: (open: boolean) => void;
  registerItemRef: (view: AppView) => (element: HTMLButtonElement | null) => void;
  navScrollRef: React.RefObject<HTMLElement | null>;
}) => {
  const Icon = item.icon;
  const active = isItemActive(currentView, item);

  return (
    <button
      ref={registerItemRef(item.view)}
      onClick={() => {
        const scrollTop = navScrollRef.current?.scrollTop;
        if (typeof scrollTop === 'number') {
          sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(scrollTop));
        }
        setView(item.view);
        setMobileMenuOpen(false);
      }}
      className={`group relative w-full flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm transition-all ${
        active
          ? 'bg-gradient-to-r from-teal-700 to-teal-600 text-white shadow-md shadow-teal-950/20'
          : 'text-slate-300 hover:bg-slate-800/90 hover:text-white'
      }`}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? 'bg-white/15 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-teal-300'}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="truncate font-medium">{item.label}</span>
    </button>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, currentView, setView }) => {
  const { theme, toggleTheme, cloudSaveEnabled, toggleCloudSave } = useSettings();
  const { userRole, isAdmin, userProfile, permissions, loading: userLoading, isTrialExpired, trialDaysRemaining } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeClinic, setActiveClinic] = useState<Clinic | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [availableClinics, setAvailableClinics] = useState<Clinic[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const desktopNavRef = useRef<HTMLElement | null>(null);
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Partial<Record<AppView, HTMLButtonElement | null>>>({});

  const registerItemRef = (view: AppView) => (element: HTMLButtonElement | null) => {
    itemRefs.current[view] = element;
  };

  const restoreSidebarScroll = (navElement: HTMLElement | null) => {
    if (!navElement) return;

    const storedScroll = Number(sessionStorage.getItem(SIDEBAR_SCROLL_KEY) || '0');
    navElement.scrollTop = Number.isFinite(storedScroll) ? storedScroll : 0;

    const activeElement = itemRefs.current[currentView];
    if (!activeElement) return;

    const navRect = navElement.getBoundingClientRect();
    const itemRect = activeElement.getBoundingClientRect();
    const isAbove = itemRect.top < navRect.top + 12;
    const isBelow = itemRect.bottom > navRect.bottom - 12;

    if (isAbove || isBelow) {
      activeElement.scrollIntoView({ block: 'nearest' });
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(navElement.scrollTop));
    }
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentView]);

  useEffect(() => {
    const syncStoredScroll = (element: HTMLElement | null) => {
      if (!element) return () => undefined;

      const handleScroll = () => {
        sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(element.scrollTop));
      };

      element.addEventListener('scroll', handleScroll, { passive: true });
      return () => element.removeEventListener('scroll', handleScroll);
    };

    const cleanupDesktop = syncStoredScroll(desktopNavRef.current);
    const cleanupMobile = syncStoredScroll(mobileNavRef.current);

    return () => {
      cleanupDesktop();
      cleanupMobile();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      restoreSidebarScroll(desktopNavRef.current);
      restoreSidebarScroll(mobileNavRef.current);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentView, mobileMenuOpen]);

  useEffect(() => {
    const loadClinicsHeader = async () => {
      try {
        const clinics = await getClinics();
        const currentUserId = auth.currentUser?.uid;
        const managerCanConsolidate = isAdmin || userProfile?.isClinicManager === true || ['admin', 'manager', 'admin_gestor', 'admin_master'].includes(userRole as string);
        const allowedIds = currentUserId ? await getAllowedClinicsForUser(currentUserId) : [];
        const visibleClinics = managerCanConsolidate ? clinics : clinics.filter(clinic => allowedIds.includes(clinic.id));
        setAvailableClinics(visibleClinics);
        const storedClinicId = getStoredActiveClinicId();
        const nextClinicId = managerCanConsolidate
          ? (storedClinicId === GROUP_CLINIC_ID || visibleClinics.some(clinic => clinic.id === storedClinicId) ? storedClinicId : GROUP_CLINIC_ID)
          : (visibleClinics.some(clinic => clinic.id === storedClinicId) ? storedClinicId : visibleClinics[0]?.id || '');
        setSelectedClinicId(nextClinicId || '');
        setActiveClinic(visibleClinics.find(clinic => clinic.id === nextClinicId) || null);
        if (nextClinicId && nextClinicId !== storedClinicId) setStoredActiveClinicId(nextClinicId);
      } catch (error) {
        console.error('Erro ao carregar clínica ativa:', error);
      }
    };

    loadClinicsHeader();

    const refreshActiveClinic = () => {
      loadClinicsHeader();
    };

    window.addEventListener(ACTIVE_CLINIC_CHANGED_EVENT, refreshActiveClinic);
    return () => window.removeEventListener(ACTIVE_CLINIC_CHANGED_EVENT, refreshActiveClinic);
  }, [isAdmin, userRole, userProfile?.displayName, userProfile?.nomeFantasia, userProfile?.razaoSocial]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const isMaster = userRole === UserRole.ADMIN_MASTER;
  const canAccessCurrentView = canAccessView(currentView, userRole, permissions, isAdmin);

  useEffect(() => {
    if (!userLoading && !canAccessCurrentView) {
      setView(getDefaultViewForRole(userRole, isAdmin));
    }
  }, [canAccessCurrentView, isAdmin, setView, userLoading, userRole]);

  const mainSections: Array<{ title: string; icon: React.ComponentType<{ className?: string }>; items: NavItem[] }> = useMemo(
    () => [
      {
        title: 'Operação',
        icon: ClipboardList,
        items: [
          { view: AppView.APPOINTMENTS, label: 'Agenda', icon: Calendar },
          { view: AppView.PATIENTS, label: 'Cadastro de Pacientes', icon: Users },
          { view: AppView.CLIENTS, label: 'Clientes', icon: UserRound },
          { view: AppView.ATTENDANCES, label: 'Controle de Atendimentos', icon: ClipboardList },
          { view: AppView.PRODUCTION_ENTRY, label: 'Portal de Produção Profissional', icon: Briefcase },
        ],
      },
      {
        title: 'Financeiro',
        icon: Wallet,
        items: [
          { view: AppView.ACCOUNTS_RECEIVABLE, label: 'Contas a Receber', icon: DollarSign },
          { view: AppView.ACCOUNTS_PAYABLE, label: 'Contas a Pagar', icon: Receipt },
          { view: AppView.CASH_ACCOUNTS, label: 'Caixa', icon: Wallet },
          { view: AppView.BANKS, label: 'Bancos', icon: Landmark },
          { view: AppView.CASH_FLOW, label: 'Fluxo de Caixa', icon: BarChart3 },
          { view: AppView.BANK_RECONCILIATION, label: 'Conciliação', icon: RefreshCw },
          { view: AppView.COLLECTIONS, label: 'Cobranças e Inadimplência', icon: HandCoins },
        ],
      },
      {
        title: 'Faturamento',
        icon: Receipt,
        items: [
          { view: AppView.BILLING_PRODUCTION, label: 'Produção', icon: ClipboardList },
          { view: AppView.BILLING_PRIVATE, label: 'Particular', icon: Receipt },
          { view: AppView.BILLING_INSURANCE, label: 'Convênios', icon: Building2 },
          { view: AppView.BILLING_GUIDES, label: 'Guias e Lotes', icon: FileSpreadsheet },
          { view: AppView.TISS_BILLING, label: 'TISS', icon: FileBox },
          { view: AppView.BILLING_GLOSAS, label: 'Glosas e Recursos', icon: FileSearch, activeViews: [AppView.BILLING_AUDIT] },
        ],
      },
      {
        title: 'Profissionais',
        icon: Users,
        items: [
          { view: AppView.CLINIC_TEAMS, label: 'Equipes por Paciente', icon: Users, activeViews: [AppView.PROFESSIONALS] },
          { view: AppView.PRODUCTION_ENTRY, label: 'Produção', icon: BarChart3, activeViews: [AppView.PROFESSIONAL_PRODUCTION] },
          { view: AppView.REPASSE_CALCULATION, label: 'Repasses', icon: Calculator },
          { view: AppView.CONTRACTS, label: 'Contratos', icon: FileSignature },
          { view: AppView.CLINIC_HOURS, label: 'Escalas', icon: Calendar, activeViews: [AppView.PROFESSIONAL_SCALES] },
        ],
      },
      {
        title: 'Recursos',
        icon: Layers3,
        items: [
          { view: AppView.SERVICES_PROCEDURES, label: 'Serviços e Procedimentos', icon: Tags },
          { view: AppView.PRICE_TABLES, label: 'Tabelas de Preços', icon: DollarSign },
          { view: AppView.INSURANCE_PLANS, label: 'Convênios e Planos', icon: LinkIcon },
          { view: AppView.CARE_PACKAGES, label: 'Pacotes e Recorrência', icon: Layers3 },
          { view: AppView.SUPPLIERS, label: 'Fornecedores', icon: Building2 },
          { view: AppView.PURCHASES, label: 'Compras', icon: ShoppingCart },
          { view: AppView.FISCAL_IMPORT, label: 'Documentos Fiscais', icon: FileUp },
          { view: AppView.INVENTORY, label: 'Estoque', icon: Pill },
          { view: AppView.ASSETS, label: 'Patrimônio', icon: Package },
        ],
      },
      {
        title: 'Controladoria',
        icon: BarChart3,
        items: [
          { view: AppView.DRE_MANAGERIAL, label: 'DRE Gerencial', icon: BarChart3 },
          { view: AppView.MANAGERIAL_FLOW, label: 'Fluxo Gerencial', icon: Waypoints },
          { view: AppView.COST_CENTERS, label: 'Centros de Custo', icon: Building2 },
          { view: AppView.RESULT_CENTERS, label: 'Centros de Resultado', icon: LayoutDashboard },
          { view: AppView.BUDGET, label: 'Orçamento', icon: Calculator },
          { view: AppView.PROFITABILITY_INDICATORS, label: 'Indicadores de Rentabilidade', icon: TrendingUpIcon },
        ],
      },
      {
        title: 'Contábil e Fiscal',
        icon: Calculator,
        items: [
          { view: AppView.ACCOUNTANT_MODULE, label: 'Fator R e Painel Fiscal', icon: Calculator },
          { view: AppView.CHART_OF_ACCOUNTS, label: 'Plano de Contas', icon: BookOpen },
          { view: AppView.ACCOUNTING_INTEGRATION, label: 'Integração Contábil', icon: Landmark },
          { view: AppView.NFSE, label: 'Emissor NFS-e', icon: Receipt, adminOnly: true },
          { view: AppView.FISCAL_DOCUMENTS, label: 'Documentos Fiscais', icon: FileBox },
          { view: AppView.TAX_RETENTIONS, label: 'Tributos e Retenções', icon: Calculator },
        ],
      },
      {
        title: 'Administração',
        icon: Shield,
        items: [
          { view: AppView.CLINICS, label: 'Empresas e Unidades', icon: Building2, adminOnly: true },
          { view: AppView.USERS_MANAGEMENT, label: 'Usuários', icon: Users, adminOnly: true },
          { view: AppView.PERMISSIONS_MANAGEMENT, label: 'Perfis e Permissões', icon: Shield, masterOnly: true },
          { view: AppView.ADMIN_GENERAL_REGISTRATIONS, label: 'Cadastros Gerais', icon: Library, adminOnly: true },
          { view: AppView.ADMIN_PARAMETERS, label: 'Parâmetros', icon: Settings, adminOnly: true },
          { view: AppView.PLANS, label: 'Planos e Assinatura', icon: Crown, adminOnly: true },
          { view: AppView.ADMIN_AUDIT, label: 'Auditoria', icon: Search, adminOnly: true },
          { view: AppView.ADMIN_INTEGRATIONS, label: 'Integrações', icon: Bot, adminOnly: true },
        ],
      },
      {
        title: 'Suporte',
        icon: HelpCircle,
        items: [
          { view: AppView.HOW_TO_USE, label: 'Central de Ajuda', icon: HelpCircle },
          { view: AppView.SUPPORT_DOCUMENTATION, label: 'Documentação', icon: BookOpen },
          { view: AppView.FEEDBACK, label: 'Feedback', icon: MessageSquare },
        ],
      },
    ],
    []
  );

  const visibleSections = mainSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (item.masterOnly) return isMaster;
        if (item.adminOnly) return isAdmin;
        return canAccessView(item.view, userRole, permissions, isAdmin);
      }),
    }))
    .filter(section => section.items.length > 0);

  useEffect(() => {
    const activeSection = visibleSections.find(section => section.items.some(item => isItemActive(currentView, item)));
    if (activeSection) {
      setOpenSections(current => current.has(activeSection.title) ? current : new Set([...current, activeSection.title]));
    }
  }, [currentView, visibleSections]);

  const toggleSection = (title: string) => {
    setOpenSections(current => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const searchableItems = useMemo(() => {
    const dashboard = canAccessView(AppView.HEALTH_DASHBOARD, userRole, permissions, isAdmin)
      ? [{ view: AppView.HEALTH_DASHBOARD, label: isAdmin ? 'Dashboard Executivo' : 'Dashboard Pessoal', section: 'Início' }]
      : [];

    return dashboard.concat(
      visibleSections.flatMap(section =>
        section.items.map(item => ({ view: item.view, label: item.label, section: section.title }))
      )
    );
  }, [visibleSections, userRole, permissions, isAdmin]);

  const searchResults = useMemo(() => {
    const term = globalSearch.trim().toLocaleLowerCase('pt-BR');
    if (!term) return [];
    return searchableItems
      .filter(item => `${item.label} ${item.section}`.toLocaleLowerCase('pt-BR').includes(term))
      .slice(0, 8);
  }, [globalSearch, searchableItems]);

  const openSearchResult = (view: AppView) => {
    setView(view);
    setGlobalSearch('');
    setSearchOpen(false);
  };

  const greetingCompanyName =
    userProfile?.nomeFantasia ||
    userProfile?.razaoSocial ||
    activeClinic?.name ||
    availableClinics[0]?.name ||
    userProfile?.displayName ||
    'sua empresa';

  const SidebarContent = () => (
    <>
      <div className="flex flex-col items-center border-b border-slate-800 bg-slate-900/50 p-4 backdrop-blur-sm">
        <SystemLogo variant="white" className="h-10" />
      </div>

      <div className="mt-1 text-center">
        <span className="block text-[10px] font-medium uppercase tracking-wider text-brand-400">
          {userProfile?.nomeFantasia || userProfile?.razaoSocial || 'Sistema de Gestão'}
        </span>
      </div>

      <div className="mx-3 mt-3 rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-800 to-slate-900 p-2.5 shadow-lg shadow-slate-950/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/25 to-blue-500/20 text-sm font-bold text-brand-300 ring-1 ring-white/10">
            {userProfile?.displayName?.charAt(0) || auth.currentUser?.email?.charAt(0).toUpperCase() || <UserIcon className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">
              Olá, {greetingCompanyName}
            </p>
            <div className="mt-1">
              <TierBadge tier={userProfile?.accountTier} size="sm" />
            </div>
          </div>
        </div>
      </div>

      <nav ref={registerNavRef => {
        desktopNavRef.current = registerNavRef;
      }} className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {canAccessView(AppView.HEALTH_DASHBOARD, userRole, permissions, isAdmin) && (
          <NavButton
            item={{ view: AppView.HEALTH_DASHBOARD, label: isAdmin ? 'Dashboard Executivo' : 'Dashboard Pessoal', icon: LayoutDashboard }}
            currentView={currentView}
            setView={setView}
            setMobileMenuOpen={setMobileMenuOpen}
            registerItemRef={registerItemRef}
            navScrollRef={desktopNavRef}
          />
        )}

        {visibleSections.map(section => (
          <div key={section.title}>
            <button
              type="button"
              onClick={() => toggleSection(section.title)}
              className="group mt-1 flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-teal-400 transition-colors hover:bg-slate-800/70 hover:text-teal-300"
              aria-expanded={openSections.has(section.title)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-teal-400 ring-1 ring-slate-700/70 transition-colors group-hover:bg-teal-500/10 group-hover:text-teal-300">
                  {React.createElement(section.icon, { className: 'h-4 w-4' })}
                </span>
                <span className="truncate">{section.title}</span>
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openSections.has(section.title) ? 'rotate-180' : ''}`} />
            </button>
            {openSections.has(section.title) && (
              <div className="ml-3 space-y-0.5 border-l border-slate-700/70 pl-2">
                {section.items.map((item, index) => (
                  <NavButton
                    key={`${section.title}-${item.label}-${index}`}
                    item={item}
                    currentView={currentView}
                    setView={setView}
                    setMobileMenuOpen={setMobileMenuOpen}
                    registerItemRef={registerItemRef}
                    navScrollRef={desktopNavRef}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-700 bg-slate-900/50 p-2">
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-yellow-400"
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={toggleCloudSave}
            className={`rounded-lg p-2 transition-colors ${cloudSaveEnabled ? 'text-green-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
            title={cloudSaveEnabled ? 'Salvamento na nuvem ativo' : 'Salvamento na nuvem pausado'}
            aria-label={cloudSaveEnabled ? 'Salvamento na nuvem ativo' : 'Salvamento na nuvem pausado'}
          >
            {cloudSaveEnabled ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
          </button>
          <div className="mx-1 h-5 w-px bg-slate-700" aria-hidden="true" />
          <button
            onClick={handleLogout}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-400 transition-colors hover:bg-red-900/30 hover:text-red-400"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Sair do Sistema</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-72 flex-col border-r border-slate-800 bg-[#031b31] text-white md:flex">
        <SidebarContent />
      </aside>

      <div
        className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center bg-slate-900 text-white shadow-lg md:hidden"
        style={{ paddingTop: 'max(35px, env(safe-area-inset-top))', paddingBottom: '10px' }}
      >
        <div className="relative w-full px-4 text-center">
          <div className="mb-1 flex flex-col items-center gap-0.5">
            <div className="flex items-center justify-center gap-2">
              <Heart className="h-5 w-5 flex-shrink-0 text-brand-400" />
              <span className="whitespace-normal text-xl font-bold leading-tight">ERCMed</span>
            </div>
            <span className="max-w-[280px] text-[10px] font-bold uppercase leading-tight tracking-wider text-brand-400">
              ERP inteligente para empresas de saúde
            </span>
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="absolute bottom-3 right-4 p-1">
          {mobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-900 px-4 pb-6 pt-32 md:hidden">
          <div className="flex-1 overflow-auto space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
              <label htmlFor="mobile-active-clinic-selector" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-teal-300">Empresa ou unidade ativa</label>
              <select
                id="mobile-active-clinic-selector"
                value={selectedClinicId}
                disabled={!availableClinics.length && !isAdmin}
                onChange={event => {
                  if (event.target.value === GROUP_CLINIC_ID) {
                    setSelectedClinicId(GROUP_CLINIC_ID);
                    setActiveClinic(null);
                    setStoredActiveClinicId(GROUP_CLINIC_ID);
                    return;
                  }
                  const clinic = availableClinics.find(item => item.id === event.target.value);
                  if (!clinic) return;
                  setSelectedClinicId(clinic.id);
                  setActiveClinic(clinic);
                  setStoredActiveClinicId(clinic.id);
                }}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-sm font-semibold text-white outline-none focus:border-teal-400"
              >
                {(isAdmin || userProfile?.isClinicManager === true || ['admin', 'manager', 'admin_gestor', 'admin_master'].includes(userRole as string)) && (
                  <option value={GROUP_CLINIC_ID}>Grupo consolidado — todas as unidades</option>
                )}
                {availableClinics.map(clinic => <option key={clinic.id} value={clinic.id}>{clinic.name}{clinic.specialty ? ` — ${clinic.specialty}` : ''}</option>)}
              </select>
            </div>
            <button
              onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
              className="flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-slate-300 transition-all hover:bg-slate-800 hover:text-green-400"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium">Falar com suporte</span>
            </button>
          </div>
          <div ref={registerNavRef => {
            mobileNavRef.current = registerNavRef;
          }} className="max-h-[70vh] overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-900/50">
            <SidebarContent />
          </div>
        </div>
      )}

      <main className="ml-0 flex flex-1 flex-col overflow-y-auto pt-32 md:relative md:ml-72 md:overflow-hidden md:pt-0">
        <header className="hidden h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 md:flex">
          <div className="flex items-center gap-4">
            <Menu className="h-5 w-5 text-slate-600" />
            <div className="relative w-[28rem]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={globalSearch}
                onChange={event => {
                  setGlobalSearch(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && searchResults[0]) openSearchResult(searchResults[0].view);
                  if (event.key === 'Escape') setSearchOpen(false);
                }}
                placeholder="Buscar e abrir módulo ou recurso..."
                className="w-full rounded-lg border border-transparent bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-100"
                aria-label="Buscar e abrir módulo ou recurso"
              />
              {searchOpen && globalSearch.trim() && (
                <div className="absolute left-0 right-0 top-11 z-[70] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  {searchResults.length ? searchResults.map((result, index) => (
                    <button
                      key={`${result.section}-${result.label}-${index}`}
                      type="button"
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => openSearchResult(result.view)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-brand-50"
                    >
                      <span className="text-sm font-medium text-slate-800">{result.label}</span>
                      <span className="text-xs text-slate-400">{result.section}</span>
                    </button>
                  )) : (
                    <p className="px-4 py-3 text-sm text-slate-500">Nenhum módulo ou recurso encontrado.</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative min-w-[13rem] rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50">
              <label htmlFor="active-clinic-selector" className="sr-only">Trocar empresa ou unidade</label>
              <select
                id="active-clinic-selector"
                aria-label="Trocar empresa ou unidade"
                value={selectedClinicId}
                disabled={!availableClinics.length && !isAdmin}
                onChange={event => {
                  if (event.target.value === GROUP_CLINIC_ID) {
                    setSelectedClinicId(GROUP_CLINIC_ID);
                    setActiveClinic(null);
                    setStoredActiveClinicId(GROUP_CLINIC_ID);
                    return;
                  }
                  const clinic = availableClinics.find(item => item.id === event.target.value);
                  if (!clinic) return;
                  setSelectedClinicId(clinic.id);
                  setActiveClinic(clinic);
                  setStoredActiveClinicId(clinic.id);
                }}
                className="w-full appearance-none bg-transparent py-2 pl-4 pr-10 text-xs font-semibold text-slate-800 outline-none disabled:cursor-default"
              >
                {!availableClinics.length && <option value="">Minha Empresa de Saúde</option>}
                {isAdmin && <option value={GROUP_CLINIC_ID}>Grupo consolidado — todas as unidades</option>}
                {availableClinics.map(clinic => (
                  <option key={clinic.id} value={clinic.id}>{clinic.name} — {clinic.specialty || 'Unidade'}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setView(AppView.PLANS)}
                className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-teal-700"
                title="Ver planos e assinatura"
                aria-label="Ver planos e assinatura"
              >
                <Crown className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setView(AppView.HOW_TO_USE)}
              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-teal-700"
              title="Central de ajuda"
              aria-label="Abrir central de ajuda"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setView(AppView.ADMIN_PARAMETERS)}
                className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-teal-700"
                title="Configurações"
                aria-label="Abrir configurações"
              >
                <Settings className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        {!isTrialExpired && trialDaysRemaining !== undefined && trialDaysRemaining <= 3 && trialDaysRemaining > 0 && (
          <div className="z-40 flex items-center justify-between border-b border-amber-200 bg-amber-100 px-6 py-2 animate-fade-in">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <RefreshCw className="h-4 w-4" />
              Seu período de teste termina em {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia' : 'dias'}.
            </div>
            <button
              onClick={() => setView(AppView.PLANS)}
              className="rounded-full bg-amber-600 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-amber-700"
            >
              Fazer Upgrade
            </button>
          </div>
        )}

        {isTrialExpired ? (
          <div className="flex flex-1 items-center justify-center bg-slate-50 p-6">
            <div className="max-w-md w-full rounded-2xl border-t-8 border-brand-600 bg-white p-8 text-center shadow-2xl animate-fade-in">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100">
                <Lock className="h-10 w-10 text-brand-600" />
              </div>
              <h2 className="mb-4 text-3xl font-bold text-slate-900">Teste Expirado</h2>
              <p className="mb-8 leading-relaxed text-slate-600">
                Seu período de teste chegou ao fim. Para continuar usando o ERCMed, escolha um dos nossos planos.
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => setView(AppView.PLANS)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-4 text-lg font-bold text-white transition-all hover:bg-brand-700"
                >
                  <Crown className="h-5 w-5" />
                  Ver Planos de Assinatura
                </button>
                <button
                  onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 font-medium text-slate-700 transition-all hover:bg-slate-200"
                >
                  <MessageSquare className="h-5 w-5 text-brand-600" />
                  Falar com Consultor
                </button>
              </div>
            </div>
          </div>
        ) : userLoading || !canAccessCurrentView ? (
          <div className="flex flex-1 items-center justify-center bg-slate-50 text-sm text-slate-500">
            Verificando permissões...
          </div>
        ) : (
          <React.Fragment key={selectedClinicId || 'no-clinic'}>{children}</React.Fragment>
        )}
      </main>
    </div>
  );
};

export default Layout;
