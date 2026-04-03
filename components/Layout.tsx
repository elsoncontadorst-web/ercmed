import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Calculator, Users, TrendingUp, LogOut, Menu, X, ChevronDown, ChevronRight, BookOpen, Info, DollarSign, MessageSquare, Calendar, FileText, Sun, Moon, Cloud, CloudOff, ShoppingCart, Heart, Activity, Pill, Receipt, Settings, FileSignature, Home, Building2, Clock, Link as LinkIcon, Edit, User as UserIcon, Save, Lock, Shield, Check, Crown, UserPlus } from 'lucide-react';
import { AppView, UserRole } from '../types';
import { signOut, auth } from '../services/firebase';
import { useSettings } from '../contexts/SettingsContext';
import { useUser } from '../contexts/UserContext';
import { saveUserProfile } from '../services/userRoleService';
import { AccountTier, TIER_CONFIG, tierAllowsModule, TIER_NAMES } from '../types/accountTiers';
import { TierBadge } from './TierBadge';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  setView: (view: AppView) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, setView }) => {
  const { theme, toggleTheme, cloudSaveEnabled, toggleCloudSave } = useSettings();
  const { userRole, isAdmin, userProfile, refreshUserData, modulePermissions } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCalculatorsOpen, setIsCalculatorsOpen] = useState(false); // Closed by default
  const [professionalSettings, setProfessionalSettings] = useState<{ name: string, profession: string, logoUrl?: string } | null>(null);

  // Profile Edit State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    jobTitle: '',
    function: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Module expansion states - ERCMed
  const [isSaudeOpen, setIsSaudeOpen] = useState(false);
  const [isRepasseOpen, setIsRepasseOpen] = useState(false);

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState('');

  // Legacy module expansion states
  const [isTributarioOpen, setIsTributarioOpen] = useState(false);
  const [isContratosOpen, setIsContratosOpen] = useState(false);
  const [isFinanceiroOpen, setIsFinanceiroOpen] = useState(false);

  // Define allowed views based on user role
  const HEALTH_PROFESSIONAL_VIEWS = [
    AppView.HEALTH_DASHBOARD,
    AppView.PATIENTS,
    AppView.APPOINTMENTS,
    AppView.EMR,
    AppView.RECEIPTS,
    AppView.CLINIC_HOURS,
    AppView.BOOKING_SETTINGS,
    AppView.MEDICATIONS,
    AppView.USER_PROFILE,
    AppView.FEEDBACK,
    AppView.TEAM_INVITATIONS
  ];

  // Helper function to check if view is allowed for current user
  const isViewAllowed = (view: AppView): boolean => {
    // Admin (master or gestor) has access to all views
    if (isAdmin) return true;

    // Health professionals only have access to health management views
    return HEALTH_PROFESSIONAL_VIEWS.includes(view);
  };

  React.useEffect(() => {
    const loadSettings = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const { getProfessionalSettings } = await import('../services/userDataService');
          const settings = await getProfessionalSettings(user.uid);
          if (settings) {
            setProfessionalSettings({
              name: settings.professionalName,
              profession: settings.profession,
              logoUrl: settings.logoUrl
            });
          }
        } catch (error) {
          console.error("Error loading professional settings", error);
        }
      }
    };
    loadSettings();
  }, [userProfile]); // Reload when userProfile changes

  // Initialize profile form when modal opens
  useEffect(() => {
    if (isProfileModalOpen && userProfile) {
      setProfileForm({
        displayName: userProfile.displayName || auth.currentUser?.displayName || '',
        jobTitle: userProfile.jobTitle || '',
        function: userProfile.function || ''
      });
    }
  }, [isProfileModalOpen, userProfile]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511999999999', '_blank'); // Replace with actual number
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    setSavingProfile(true);
    try {
      await saveUserProfile(auth.currentUser.uid, {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email || '',
        role: userRole || UserRole.HEALTH_PROFESSIONAL,
        displayName: profileForm.displayName,
        jobTitle: profileForm.jobTitle,
        function: profileForm.function
      });
      await refreshUserData();
      setIsProfileModalOpen(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Erro ao salvar perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const NavButton = ({ view, icon: Icon, label, locked = false, moduleName }: { view: AppView; icon: any; label: string; locked?: boolean; moduleName?: string }) => {
    // Check if module is allowed for current tier
    const isModuleAllowed = moduleName ? tierAllowsModule(userProfile?.accountTier as AccountTier, moduleName) : true;
    const isLocked = locked || !isModuleAllowed;

    return (
      <button
        onClick={() => {
          if (isLocked) {
            // Redirect to Plans view instead of showing modal
            setView(AppView.PLANS);
            setMobileMenuOpen(false);
            return;
          }
          setView(view);
          setMobileMenuOpen(false);
        }}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${currentView === view
          ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          } ${isLocked ? 'opacity-60' : ''}`}
      >
        <div className="flex items-center space-x-3">
          <Icon className="w-5 h-5" />
          <span className="font-medium">{label}</span>
        </div>
        {isLocked && <Lock className="w-4 h-4 text-slate-500" />}
      </button>
    );
  };

  const ModuleGroup = ({
    title,
    icon: Icon,
    isOpen,
    setIsOpen,
    currentView: _currentView,
    views,
    children
  }: {
    title: string;
    icon: any;
    isOpen: boolean;
    setIsOpen: (val: boolean) => void;
    currentView: AppView;
    views: AppView[];
    children: React.ReactNode;
  }) => {
    const isActive = views.includes(_currentView);

    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${isActive ? 'text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            } `}
        >
          <div className="flex items-center space-x-3">
            <Icon className="w-5 h-5" />
            <span className="font-medium">{title}</span>
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {isOpen && (
          <div className="pl-4 space-y-1 animate-fade-in">
            {children}
          </div>
        )}
      </div>
    );
  };



  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-white h-screen fixed left-0 top-0 overflow-y-auto border-r border-slate-800 z-50">
        <div className="p-6 flex flex-col items-center border-b border-slate-800">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-brand-900/20 overflow-hidden">
            {professionalSettings?.logoUrl ? (
              <img src={professionalSettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Heart className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-lg font-bold text-center leading-tight">
            {userProfile?.nomeFantasia || userProfile?.razaoSocial || professionalSettings?.name || 'ERCMed'}
            <span className="block text-xs text-brand-400 font-normal mt-1">
              {userProfile?.cnpj ? 'CNPJ Cadastrado' : (professionalSettings?.profession || 'Gestão de Saúde')}
            </span>
          </h1>

          {/* User Profile Section */}
          <div className="mt-6 w-full bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 relative group">
            <button
              onClick={() => setView(AppView.USER_PROFILE)}
              className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Editar Perfil Completo"
            >
              <Settings className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-brand-400 font-bold text-lg">
                {userProfile?.displayName?.charAt(0) || auth.currentUser?.email?.charAt(0).toUpperCase() || <UserIcon className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {userProfile?.displayName || auth.currentUser?.email?.split('@')[0] || 'Usuário'}
                </p>
                <div className="mt-1">
                  <TierBadge tier={userProfile?.accountTier} size="sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {/* 1. DASHBOARD */}
          <ModuleGroup
            title="Dashboards"
            icon={LayoutDashboard}
            isOpen={true} // Keep main group open
            setIsOpen={() => {}} // Controlled or permanently open for clarity
            currentView={currentView}
            views={[AppView.DASHBOARD, AppView.HEALTH_DASHBOARD]}
          >
            {isAdmin && (
              <NavButton view={AppView.DASHBOARD} icon={LayoutDashboard} label="Dashboard Geral" />
            )}
            <NavButton view={AppView.HEALTH_DASHBOARD} icon={Activity} label="Indicadores de Saúde" moduleName="healthManagement" />
          </ModuleGroup>

          {/* 2. OPERAÇÃO CLÍNICA */}
          <ModuleGroup
            title="Operação Clínica"
            icon={Heart}
            isOpen={isSaudeOpen}
            setIsOpen={setIsSaudeOpen}
            currentView={currentView}
            views={[AppView.PATIENTS, AppView.EMR, AppView.RECEIPTS]}
          >
            <NavButton view={AppView.PATIENTS} icon={Users} label="Pacientes" moduleName="patients" />
            <NavButton view={AppView.EMR} icon={FileText} label="Prontuário (Clínica)" moduleName="emr" />
            <NavButton view={AppView.RECEIPTS} icon={Receipt} label="Recibos Médicos" moduleName="receipts" />
          </ModuleGroup>

          {/* 3. AGENDA */}
          <ModuleGroup
            title="Agenda"
            icon={Calendar}
            isOpen={true}
            setIsOpen={() => {}}
            currentView={currentView}
            views={[AppView.APPOINTMENTS, AppView.CLINIC_HOURS, AppView.BOOKING_SETTINGS]}
          >
            <NavButton view={AppView.APPOINTMENTS} icon={Calendar} label="Meus Atendimentos" moduleName="appointments" />
            <NavButton view={AppView.CLINIC_HOURS} icon={Clock} label="Horários da Clínica" moduleName="clinicHours" />
            <NavButton view={AppView.BOOKING_SETTINGS} icon={LinkIcon} label="Agendamento Online" moduleName="bookingSettings" />
          </ModuleGroup>

          {/* 4. FINANCEIRO & FATURAMENTO */}
          <ModuleGroup
            title="Financeiro & Faturamento"
            icon={DollarSign}
            isOpen={isFinanceiroOpen || isRepasseOpen}
            setIsOpen={(val) => { setIsFinanceiroOpen(val); setIsRepasseOpen(val); }}
            currentView={currentView}
            views={[
              AppView.FINANCIAL_CONTROL,
              AppView.SALES_MANAGEMENT,
              AppView.CASH_FLOW,
              AppView.REPASSE_DASHBOARD,
              AppView.BILLING_MANAGEMENT,
              AppView.REPASSE_CALCULATION,
              AppView.TISS_BILLING,
              AppView.SIMULATOR,
              AppView.IRPF_CALC
            ]}
          >
            <NavButton view={AppView.FINANCIAL_CONTROL} icon={DollarSign} label="Controle Financeiro" moduleName="financial" />
            <NavButton view={AppView.SALES_MANAGEMENT} icon={ShoppingCart} label="Gestão de Vendas" moduleName="financial" />
            <NavButton view={AppView.CASH_FLOW} icon={TrendingUp} label="Fluxo de Caixa" moduleName="financial" />
            <div className="h-px bg-slate-800 my-1"></div>
            <NavButton view={AppView.REPASSE_DASHBOARD} icon={LayoutDashboard} label="Dashboard de Repasse" moduleName="repasse" />
            <NavButton view={AppView.BILLING_MANAGEMENT} icon={Receipt} label="Faturamento" moduleName="repasse" />
            <NavButton view={AppView.REPASSE_CALCULATION} icon={Calculator} label="Cálculo de Repasse" moduleName="repasse" />
            <NavButton view={AppView.TISS_BILLING} icon={Building2} label="Faturamento TISS" moduleName="tiss" />
            <div className="h-px bg-slate-800 my-1"></div>
            <NavButton view={AppView.SIMULATOR} icon={Calculator} label="Simulador Empresa" locked={!modulePermissions.SIMULATOR} moduleName="financial" />
            <NavButton view={AppView.IRPF_CALC} icon={FileText} label="Simulador IRPF" locked={!modulePermissions.IRPF} moduleName="financial" />
          </ModuleGroup>

          {/* 5. ADMINISTRAÇÃO */}
          <ModuleGroup
            title="Administração"
            icon={Settings}
            isOpen={isContratosOpen}
            setIsOpen={setIsContratosOpen}
            currentView={currentView}
            views={[AppView.CLINICS, AppView.CLINIC_TEAMS, AppView.TEAM_INVITATIONS, AppView.CONTRACTS, AppView.USERS_MANAGEMENT, AppView.PERMISSIONS_MANAGEMENT, AppView.DEBUG, AppView.PLANS]}
          >
            <NavButton view={AppView.CLINICS} icon={Building2} label="Consultórios" moduleName="clinics" />
            {(isAdmin || userProfile?.isClinicManager) && (
              <NavButton view={AppView.CLINIC_TEAMS} icon={Shield} label="Equipes da Clínica" />
            )}
            <NavButton view={AppView.TEAM_INVITATIONS} icon={UserPlus} label="Convites de Equipe" />
            <NavButton view={AppView.CONTRACTS} icon={FileSignature} label="Contratos" moduleName="contracts" />
            {isAdmin && (
              <NavButton view={AppView.USERS_MANAGEMENT} icon={Users} label="Gerenciar Usuários" />
            )}
            {userRole === UserRole.ADMIN_MASTER && (
              <NavButton view={AppView.PERMISSIONS_MANAGEMENT} icon={Shield} label="Permissões Master" />
            )}
            {(isAdmin || userProfile?.isClinicManager) && (
              <NavButton view={AppView.DEBUG} icon={Activity} label="Diagnóstico" />
            )}
            <NavButton view={AppView.PLANS} icon={Crown} label="Planos e Preços" />
          </ModuleGroup>

          {/* 6. APOIO & SUPORTE */}
          <ModuleGroup
            title="Apoio & Suporte"
            icon={Info}
            isOpen={false}
            setIsOpen={() => {}}
            currentView={currentView}
            views={[AppView.AI_CONSULTANT, AppView.USER_PROFILE, AppView.HOW_TO_USE, AppView.ABOUT_APP, AppView.FEEDBACK]}
          >
            <NavButton view={AppView.AI_CONSULTANT} icon={MessageSquare} label="Consultor IA" />
            <NavButton view={AppView.USER_PROFILE} icon={UserIcon} label="Meu Perfil" />
            <NavButton view={AppView.HOW_TO_USE} icon={BookOpen} label="Como Usar" />
            <NavButton view={AppView.ABOUT_APP} icon={Info} label="Sobre" />
            <NavButton view={AppView.FEEDBACK} icon={MessageSquare} label="Feedback" />
          </ModuleGroup>
        </nav>

        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <p className="text-[10px] text-slate-500 text-center leading-tight mb-4 italic">
            (Este material não substitui orientação médica/profissional)
          </p>
          <div className="flex items-center justify-between px-2 mb-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-slate-800 rounded-lg transition-colors"
              title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleCloudSave}
              className={`p-2 rounded-lg transition-colors ${cloudSaveEnabled ? 'text-green-400 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              title={cloudSaveEnabled ? 'Salvamento na Nuvem Ativo' : 'Salvamento na Nuvem Pausado'}
            >
              {cloudSaveEnabled ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-4 py-2 rounded-lg text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 bg-slate-900 text-white z-50 flex justify-center items-center shadow-lg transition-all"
        style={{
          paddingTop: 'max(35px, env(safe-area-inset-top))',
          paddingBottom: '10px'
        }}
      >
        <div className="flex flex-col items-center text-center px-4 relative w-full">
          <div className="flex flex-col items-center gap-0.5 mb-1">
            <div className="flex items-center justify-center gap-2">
              <Heart className="w-5 h-5 text-brand-400 flex-shrink-0" />
              <span className="font-bold leading-tight text-xl whitespace-normal">ERCMed</span>
            </div>
            <span className="text-[10px] text-brand-400 uppercase font-bold tracking-wider leading-tight max-w-[280px]">
              Gestão de Saúde e Repasse Clínico
            </span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="absolute right-4 bottom-3 p-1"
        >
          {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {
        mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-slate-900 z-40 pt-32 px-4 flex flex-col h-full pb-6">
            <div className="space-y-4 flex-1 overflow-auto overscroll-contain">
              <button
                onClick={handleWhatsAppClick}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-slate-300 hover:bg-slate-800 hover:text-green-400"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">Falar com Contador (WhatsApp)</span>
              </button>
              <div className="h-px bg-slate-700 my-2"></div>

              {/* Dashboard Geral - Admin only */}
              {isAdmin && (
                <NavButton view={AppView.DASHBOARD} icon={LayoutDashboard} label="Dashboard Geral" />
              )}

              {/* Gestão de Saúde */}
              <ModuleGroup
                title="Gestão de Saúde"
                icon={Heart}
                isOpen={isSaudeOpen}
                setIsOpen={setIsSaudeOpen}
                currentView={currentView}
                views={[AppView.HEALTH_DASHBOARD, AppView.PATIENTS, AppView.APPOINTMENTS, AppView.EMR, AppView.RECEIPTS, AppView.CLINIC_HOURS, AppView.BOOKING_SETTINGS, AppView.TEAM_INVITATIONS]}
              >
                <NavButton view={AppView.HEALTH_DASHBOARD} icon={Activity} label="Dashboard de Saúde" />
                <NavButton view={AppView.PATIENTS} icon={Users} label="Pacientes" />
                <NavButton view={AppView.APPOINTMENTS} icon={Calendar} label="Meus Atendimentos" />
                <NavButton view={AppView.EMR} icon={FileText} label="Clínica" />
                <NavButton view={AppView.RECEIPTS} icon={Receipt} label="Recibos" />
                <NavButton view={AppView.CLINIC_HOURS} icon={Clock} label="Horários" />
                <NavButton view={AppView.BOOKING_SETTINGS} icon={LinkIcon} label="Agendamento Online" />
                <NavButton view={AppView.TEAM_INVITATIONS} icon={UserPlus} label="Convites de Equipe" />
              </ModuleGroup>

              {/* Gestão de Repasse Clínico - Admin Only */}
              {(auth.currentUser?.email === 'usuario020@ercmed.com.br' || auth.currentUser?.email === 'elsoncontador.st@gmail.com' || userRole === UserRole.BILLER || userProfile?.isClinicManager) && (
                <ModuleGroup
                  title="Gestão de Repasse"
                  icon={DollarSign}
                  isOpen={isRepasseOpen}
                  setIsOpen={setIsRepasseOpen}
                  currentView={currentView}
                  views={[AppView.REPASSE_DASHBOARD, AppView.BILLING_MANAGEMENT, AppView.REPASSE_CALCULATION]}
                >
                  <NavButton view={AppView.REPASSE_DASHBOARD} icon={LayoutDashboard} label="Dashboard Financeiro" />
                  <NavButton view={AppView.BILLING_MANAGEMENT} icon={Receipt} label="Faturamento" />
                  <NavButton view={AppView.REPASSE_CALCULATION} icon={Calculator} label="Cálculo de Repasse" />
                  {/* <NavButton view={AppView.PROFESSIONAL_CONFIG} icon={Settings} label="Profissionais" /> */}
                </ModuleGroup>
              )}

              <div className="h-px bg-slate-700 my-2"></div>

              {/* Contratos - Admin only */}
              {(isAdmin || userRole === UserRole.BILLER || userProfile?.isClinicManager) && (
                <NavButton view={AppView.CONTRACTS} icon={FileSignature} label="Contratos" />
              )}

              {/* Módulo Financeiro - Admin only */}
              {(isAdmin || userProfile?.isClinicManager) && (
                <ModuleGroup
                  title="Módulo Financeiro"
                  icon={DollarSign}
                  isOpen={isFinanceiroOpen}
                  setIsOpen={setIsFinanceiroOpen}
                  currentView={currentView}
                  views={[
                    AppView.FINANCIAL_CONTROL,
                    AppView.SALES_MANAGEMENT,
                    AppView.CASH_FLOW,
                    AppView.SIMULATOR,
                    AppView.IRPF_CALC
                  ]}
                >
                  <NavButton view={AppView.FINANCIAL_CONTROL} icon={DollarSign} label="Controle Financeiro" />
                  <NavButton view={AppView.SALES_MANAGEMENT} icon={ShoppingCart} label="Gestão de Vendas" />
                  <NavButton view={AppView.CASH_FLOW} icon={TrendingUp} label="Fluxo de Caixa" />
                  <div className="h-px bg-slate-800 my-1"></div>
                  <NavButton
                    view={AppView.SIMULATOR}
                    icon={Calculator}
                    label="Simulador Empresa"
                    locked={!modulePermissions.SIMULATOR}
                  />
                  <NavButton
                    view={AppView.IRPF_CALC}
                    icon={FileText}
                    label="Simulador IRPF"
                    locked={!modulePermissions.IRPF}
                  />
                  <NavButton
                    view={AppView.DOMESTIC_CALC}
                    icon={UserIcon}
                    label="Simulador Doméstico"
                    locked={!modulePermissions.SIMULATOR}
                  />
                  <div className="h-px bg-slate-800 my-1"></div>
                  <NavButton view={AppView.LOAN_REVISION} icon={TrendingUp} label="Revisão de Empréstimo" />
                </ModuleGroup>
              )}

              <div className="h-px bg-slate-700 my-2"></div>

              <NavButton view={AppView.AI_CONSULTANT} icon={MessageSquare} label="Consultor IA" />
              <NavButton view={AppView.USER_PROFILE} icon={UserIcon} label="Meu Perfil" />
              <NavButton view={AppView.HOW_TO_USE} icon={BookOpen} label="Como Usar" />
              <NavButton view={AppView.ABOUT_APP} icon={Info} label="Sobre" />
              <NavButton view={AppView.FEEDBACK} icon={MessageSquare} label="Feedback" />
            </div>

            <div className="mt-auto border-t border-slate-700 pt-4 pb-4 space-y-4">
              <p className="text-[10px] text-slate-500 text-center italic px-4">
                (Este material não substitui orientação médica/profissional)
              </p>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-red-400 bg-red-900/20 hover:bg-red-900/30 transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair do Sistema</span>
              </button>
              <p className="text-xs text-center text-slate-500">Versão 2.3 - Autenticado</p>
            </div>
          </div>
        )
      }

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:relative pt-32 md:pt-0 overflow-y-auto md:overflow-hidden ml-0 md:ml-72">
        {children}
      </main>

      {/* Edit Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Edit className="w-5 h-5 text-brand-400" />
                Editar Perfil
              </h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome de Exibição</label>
                <input
                  type="text"
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                <input
                  type="text"
                  value={profileForm.jobTitle}
                  onChange={(e) => setProfileForm({ ...profileForm, jobTitle: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Ex: Médico, Enfermeiro, Recepcionista"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Função / Especialidade</label>
                <input
                  type="text"
                  value={profileForm.function}
                  onChange={(e) => setProfileForm({ ...profileForm, function: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Ex: Cardiologista, Gerente"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {savingProfile ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in relative">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-brand-600" />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                Recurso Bloqueado
              </h3>

              <p className="text-slate-600 mb-6">
                O módulo <span className="font-semibold text-brand-700">{blockedFeature}</span> não está disponível no seu plano atual ({TIER_NAMES[userProfile?.accountTier || AccountTier.BRONZE]}).
              </p>

              <div className="bg-slate-50 rounded-xl p-4 mb-8 border border-slate-100">
                <p className="text-sm text-slate-600 mb-3">Faça upgrade para desbloquear:</p>
                <ul className="text-left space-y-2 text-sm text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Acesso a todos os módulos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Sem limite de pacientes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Suporte prioritário</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  // Redirect to upgrade page or open contact
                  window.open('https://wa.me/5511999999999', '_blank');
                }}
                className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-900/20"
              >
                Fazer Upgrade Agora
              </button>

              <button
                onClick={() => setShowUpgradeModal(false)}
                className="mt-4 text-slate-500 hover:text-slate-700 text-sm font-medium"
              >
                Continuar com plano atual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
