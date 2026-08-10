import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import LoginComponent from './components/LoginComponent';
import LandingPage from './components/LandingPage';
import { AppView } from './types';
import { auth, onAuthStateChanged, User } from './services/firebase';
import { Loader2, AlertCircle } from 'lucide-react';
import { SettingsProvider } from './contexts/SettingsContext';
import { SimulationProvider } from './contexts/SimulationContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { logUserActivity, incrementModuleUsage } from './services/userDataService';
import LGPDConsent from './components/LGPDConsent';
import { hasAcceptedLGPD, registerConsent } from './services/lgpdService';
import { NotificationProvider } from './contexts/NotificationContext';

const isChunkLoadingError = (message: string) =>
  message.includes('Failed to fetch dynamically imported module') ||
  message.includes('Importing a module script failed') ||
  message.includes('Failed to load module script') ||
  message.includes('Expected a JavaScript-or-Wasm module script');

const safeLazy = <T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  cacheKey: string
) =>
  React.lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (typeof window !== 'undefined' && isChunkLoadingError(message)) {
        const reloadKey = `ercmed_lazy_chunk_reload_${cacheKey}`;
        const alreadyReloaded = sessionStorage.getItem(reloadKey) === '1';
        if (!alreadyReloaded) {
          sessionStorage.setItem(reloadKey, '1');
          window.location.reload();
          return new Promise<{ default: T }>(() => undefined);
        }
      }

      throw error;
    }
  });

// Lazy load components for better performance
const AiConsultantView = safeLazy(() => import('./components/AiConsultantView'), 'ai_consultant');
const AboutAppView = safeLazy(() => import('./components/AboutAppView'), 'about_app');
const HowToUseView = safeLazy(() => import('./components/HowToUseView'), 'how_to_use');
const DashboardView = safeLazy(() => import('./components/DashboardView'), 'dashboard');
const SubscriptionView = safeLazy(() => import('./components/SubscriptionView'), 'subscription');
const UserProfileView = safeLazy(() => import('./components/UserProfileView'), 'user_profile');
const CashFlowView = safeLazy(() => import('./components/CashFlowView'), 'cash_flow');
const FinancialControlView = safeLazy(() => import('./components/FinancialControlView'), 'financial_control');
const BankAccountsView = safeLazy(() => import('./components/BankAccountsView'), 'bank_accounts');
const BankReconciliationView = safeLazy(() => import('./components/BankReconciliationView'), 'bank_reconciliation');
const SalesView = safeLazy(() => import('./components/SalesView'), 'sales');
const ManagerLoginView = safeLazy(() => import('./components/ManagerLoginView'), 'manager_login');
const ManagerDashboardView = safeLazy(() => import('./components/ManagerDashboardView'), 'manager_dashboard');
const FeedbackView = safeLazy(() => import('./components/FeedbackView'), 'feedback');

// Easymed Components
const HealthDashboard = safeLazy(() => import('./components/HealthDashboard'), 'health_dashboard');
const PersonalDashboard = safeLazy(() => import('./components/PersonalDashboard'), 'personal_dashboard');
const RepasseDashboard = safeLazy(() => import('./components/RepasseDashboard'), 'repasse_dashboard');
const ContractsView = safeLazy(() => import('./components/ContractsView').then(module => ({ default: module.default })), 'contracts');
const AppointmentsView = safeLazy(() => import('./components/AppointmentsView'), 'appointments');
const ProductionEntryView = safeLazy(() => import('./components/ProductionEntryView'), 'production_entry');
const EMRView = safeLazy(() => import('./components/EMRView'), 'emr');
const InventoryView = safeLazy(() => import('./components/InventoryView'), 'inventory');
const PatientsView = safeLazy(() => import('./components/PatientsView'), 'patients');
const ClinicsView = safeLazy(() => import('./components/ClinicsView'), 'clinics');
const BillingView = safeLazy(() => import('./components/BillingView'), 'billing');
const OnboardingView = safeLazy(() => import('./components/OnboardingView'), 'onboarding');
const ReceiptsView = safeLazy(() => import('./components/ReceiptsView'), 'receipts');
const ClinicHoursView = safeLazy(() => import('./components/ClinicHoursView'), 'clinic_hours');
const BookingSettingsView = safeLazy(() => import('./components/BookingSettingsView'), 'booking_settings');
const RepasseCalculationView = safeLazy(() => import('./components/RepasseCalculationView'), 'repasse_calculation');
const PublicBookingPage = safeLazy(() => import('./components/PublicBookingPage'), 'public_booking');
const TISSView = safeLazy(() => import('./components/TISSView'), 'tiss');
const UsersManagementView = safeLazy(() => import('./components/UsersManagementView'), 'users_management');
const PermissionsManagementView = safeLazy(() => import('./components/PermissionsManagementView'), 'permissions_management');
const FeaturesPage = safeLazy(() => import('./components/FeaturesPage'), 'features');

const RoleAwareDashboard: React.FC<{ setView: (view: AppView) => void }> = ({ setView }) => {
  const { isAdmin } = useUser();
  return isAdmin ? <HealthDashboard setView={setView} /> : <PersonalDashboard setView={setView} />;
};
const DebugView = safeLazy(() => import('./components/DebugView'), 'debug');
const PlansView = safeLazy(() => import('./components/PlansView'), 'plans');
const AccountantModule = safeLazy(() => import('./components/AccountantModule'), 'accountant_module');
const TeamInvitationsView = safeLazy(() => import('./components/TeamInvitationsView'), 'team_invitations');
const ClinicTeamsView = safeLazy(() => import('./components/ClinicTeamsView'), 'clinic_teams');
const TherapeuticIntelligenceView = safeLazy(() => import('./components/TherapeuticIntelligenceView'), 'therapeutic_intelligence');
const ServiceCatalogView = safeLazy(() => import('./components/ServiceCatalogView'), 'service_catalog');
const FiscalImportView = safeLazy(() => import('./components/FiscalImportView'), 'fiscal_import');
const NfseView = safeLazy(() => import('./features/nfse/NfseView'), 'nfse');
const CarePackagesView = safeLazy(() => import('./components/CarePackagesView'), 'care_packages');
const AssetsView = safeLazy(() => import('./components/AssetsView'), 'assets');
const AttendancesView = safeLazy(() => import('./components/AttendancesView'), 'attendances');
const ERPWorkspaceView = safeLazy(() => import('./components/ERPWorkspaceView'), 'erp_workspace');


// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    const message = error?.message || error?.toString() || '';
    const isDynamicImportError =
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('Importing a module script failed') ||
      message.includes('Failed to load module script');

    if (isDynamicImportError) {
      const reloadKey = 'ercmed_dynamic_import_recovery_once';
      const alreadyReloaded = sessionStorage.getItem(reloadKey) === '1';
      if (!alreadyReloaded) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Algo deu errado</h2>
            <p className="text-slate-500 mb-6 text-center">
              Ocorreu um erro inesperado na aplicação. Por favor, recarregue a página.
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-6 overflow-auto max-h-40 text-xs font-mono text-red-800">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
            >
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  // ... (existing state)
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setView] = useState<AppView>(AppView.HEALTH_DASHBOARD);
  const [showLogin, setShowLogin] = useState(false);
  const [showLGPDConsent, setShowLGPDConsent] = useState(false);
  const [initialSignUpMode, setInitialSignUpMode] = useState(false);

  // Estados para controle do Trial
  const [isTrial, setIsTrial] = useState(false);
  const [trialHoursLeft, setTrialHoursLeft] = useState(0);

  useEffect(() => {
    const cleanupReloadFlags = () => {
      if (typeof window === 'undefined') return;

      sessionStorage.removeItem('ercmed_dynamic_import_recovery_once');
      sessionStorage.removeItem('ercmed_preload_error_reload_once');

      Object.keys(sessionStorage)
        .filter((key) => key.startsWith('ercmed_lazy_chunk_reload_'))
        .forEach((key) => sessionStorage.removeItem(key));
    };

    const timer = window.setTimeout(cleanupReloadFlags, 1500);
    return () => window.clearTimeout(timer);
  }, [currentView, user?.uid]);

  useEffect(() => {
    // Escuta mudanças na autenticação (Login/Logout) em tempo real
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Log user login
        await logUserActivity(currentUser.uid, currentUser.email || '', {
          deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
          platform: navigator.platform
        });

        // Auto-redirect admin to Manager Dashboard
        if (currentUser.email === 'elsoncontador.st@gmail.com') {
          setView(AppView.MANAGER_DASHBOARD);
        }
        console.log('[DEBUG_UID]', currentUser.uid, currentUser.email);
      }
    });

    // Limpa o ouvinte quando o componente desmonta
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkLGPD = async () => {
      if (user && !loading) {
        const accepted = await hasAcceptedLGPD(user.uid);
        if (!accepted) {
          setShowLGPDConsent(true);
        }
      }
    };
    checkLGPD();
  }, [user, loading]);

  const handleAcceptLGPD = async () => {
    if (user) {
      console.log('[LGPD] User accepted, saving consent...');
      const success = await registerConsent(user.uid, user.email || '', true);
      if (success) {
        console.log('[LGPD] Consent saved, hiding modal');
        setShowLGPDConsent(false);
      } else {
        console.error('[LGPD] Failed to save consent!');
        alert('Erro ao salvar consentimento. Por favor, tente novamente.');
      }
    }
  };

  const handleDeclineLGPD = () => {
    auth.signOut();
    setShowLGPDConsent(false);
    alert('É necessário aceitar os termos para utilizar o sistema.');
  };

  const handleSubscriptionActive = async () => {
    // Placeholder para compatibilidade futura
    console.log("Subscription flow disabled");
  };

  const renderContent = () => {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      }>
        {(() => {
          switch (currentView) {
            case AppView.DASHBOARD:
              return <RoleAwareDashboard setView={setView} />;

            // Health Management Views
            case AppView.HEALTH_DASHBOARD:
              return <RoleAwareDashboard setView={setView} />;
            case AppView.PATIENTS:
              return <PatientsView setView={setView} />;
            case AppView.APPOINTMENTS:
              return <AppointmentsView />;
            case AppView.ATTENDANCES:
              return <AttendancesView setView={setView} />;
            case AppView.PRODUCTION_ENTRY:
              return <ProductionEntryView />;
            case AppView.EMR:
              return <EMRView />;
            case AppView.INVENTORY:
              return <InventoryView />;
            case AppView.CARE_PACKAGES:
              return <CarePackagesView />;
            case AppView.ASSETS:
              return <AssetsView />;
            case AppView.RECEIPTS:
              return <ReceiptsView />;
            case AppView.CLINIC_HOURS:
              return <ClinicHoursView />;
            case AppView.BOOKING_SETTINGS:
              return <BookingSettingsView />;
            case AppView.CLINICS:
              return <ClinicsView />;
            case AppView.TEAM_INVITATIONS:
              return <TeamInvitationsView />;

            // Clinical Repasse Management Views
            case AppView.REPASSE_DASHBOARD:
              return <RepasseDashboard />;
            case AppView.BILLING_MANAGEMENT:
            case AppView.BILLING_PRODUCTION:
            case AppView.BILLING_PRIVATE:
              return <BillingView />;
            case AppView.REPASSE_CALCULATION:
              return <RepasseCalculationView />;


            // Contracts Management
            case AppView.CONTRACTS:
              return <ContractsView />;

            // TISS Billing
            case AppView.TISS_BILLING:
              return <TISSView />;
            case AppView.BILLING_INSURANCE:
            case AppView.INSURANCE_PLANS:
              return <TISSView initialTab="CONVENIOS" />;
            case AppView.BILLING_GUIDES:
              return <TISSView initialTab="GUIAS" />;
            case AppView.BILLING_GLOSAS:
            case AppView.BILLING_AUDIT:
              return <TISSView initialTab="GLOSAS" />;
            case AppView.SERVICE_CATALOG:
            case AppView.SERVICES_PROCEDURES:
            case AppView.PRICE_TABLES:
              return <ServiceCatalogView />;
            case AppView.FISCAL_IMPORT:
              return <FiscalImportView />;
            case AppView.NFSE:
              return <NfseView />;

            // User Management
            case AppView.USERS_MANAGEMENT:
              return <UsersManagementView setView={setView} />;
            case AppView.PERMISSIONS_MANAGEMENT:
              return <PermissionsManagementView />;

            // Legacy views
            case AppView.AI_CONSULTANT:
              return <AiConsultantView />;
            case AppView.FINANCIAL_CONTROL:
              return <FinancialControlView />;
            case AppView.ACCOUNTS_RECEIVABLE:
              return <FinancialControlView initialTab="receivable" />;
            case AppView.ACCOUNTS_PAYABLE:
              return <FinancialControlView initialTab="payable" />;
            case AppView.CASH_ACCOUNTS:
              return <FinancialControlView initialTab="transactions" />;
            case AppView.BANKS:
              return <BankAccountsView />;
            case AppView.BANK_RECONCILIATION:
              return <BankReconciliationView />;
            case AppView.COLLECTIONS:
              return <FinancialControlView initialTab="transactions" />;
            case AppView.PROFESSIONALS:
            case AppView.PROFESSIONAL_PRODUCTION:
            case AppView.PROFESSIONAL_SCALES:
            case AppView.SUPPLIERS:
            case AppView.PURCHASES:
            case AppView.COST_CENTERS:
            case AppView.RESULT_CENTERS:
            case AppView.BUDGET:
            case AppView.CHART_OF_ACCOUNTS:
            case AppView.ACCOUNTING_INTEGRATION:
            case AppView.FISCAL_DOCUMENTS:
            case AppView.TAX_RETENTIONS:
            case AppView.ADMIN_GENERAL_REGISTRATIONS:
            case AppView.ADMIN_PARAMETERS:
            case AppView.ADMIN_AUDIT:
            case AppView.ADMIN_INTEGRATIONS:
            case AppView.ADMIN_LOGS:
            case AppView.SUPPORT_DOCUMENTATION:
            case AppView.SUPPORT_CHANGELOG:
              return <ERPWorkspaceView currentView={currentView} setView={setView} />;
            case AppView.DRE_MANAGERIAL:
            case AppView.MANAGERIAL_FLOW:
            case AppView.PROFITABILITY_INDICATORS:
              return <CashFlowView />;
            case AppView.SALES_MANAGEMENT:
              return <SalesView />;
            case AppView.SALES_MANAGEMENT:
              return <SalesView />;
            case AppView.CASH_FLOW:
              return <CashFlowView />;
            case AppView.HOW_TO_USE:
              return <HowToUseView />;
            case AppView.ABOUT_APP:
              return <AboutAppView />;
            case AppView.USER_PROFILE:
              return <UserProfileView user={user} subscription={null} onSubscriptionActive={handleSubscriptionActive} isTrial={isTrial} trialHoursLeft={trialHoursLeft} />;
            case AppView.MANAGER_LOGIN:
              return <ManagerLoginView onLoginSuccess={() => setView(AppView.MANAGER_DASHBOARD)} onBack={() => setView(AppView.DASHBOARD)} />;
            case AppView.MANAGER_DASHBOARD:
              return <ManagerDashboardView />;
            case AppView.FEEDBACK:
              return <FeedbackView />;

            case AppView.DEBUG:
              return <DebugView />;

            case AppView.PLANS:
              return <PlansView setView={setView} />;

            case AppView.ACCOUNTANT_MODULE:
              return <AccountantModule />;

            case AppView.CLINIC_TEAMS:
              return <ClinicTeamsView />;

            case AppView.ONBOARDING:
              return <OnboardingView 
                setView={setView} 
                onComplete={async () => {
                  setView(AppView.HEALTH_DASHBOARD);
                }}
              />;

            case AppView.THERAPEUTIC_INTELLIGENCE:
              return <TherapeuticIntelligenceView />;

            default:
              return <HealthDashboard setView={setView} />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <ErrorBoundary>
      <Routes>
        {/* Features page - public route */}
        <Route
          path="/recursos"
          element={
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            }>
              <FeaturesPage />
            </Suspense>
          }
        />

        {/* Public Booking Page - no auth required */}
        <Route
          path="/book/:bookingUrl"
          element={
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            }>
              <PublicBookingPage />
            </Suspense>
          }
        />

        {/* Main app route - requires authentication */}
        <Route
          path="/*"
          element={
            loading ? (
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              </div>
            ) : !user ? (
              showLogin ? (
                <LoginComponent
                  onBack={() => {
                    setShowLogin(false);
                    setInitialSignUpMode(false);
                  }}
                  initialSignUp={initialSignUpMode}
                />
              ) : (
                <LandingPage
                  onLoginClick={() => {
                    setInitialSignUpMode(false);
                    setShowLogin(true);
                  }}
                  onTrialClick={() => {
                    setInitialSignUpMode(true);
                    setShowLogin(true);
                  }}
                />
              )
            ) : (
              <UserProvider>
                <SettingsProvider>
                  <NotificationProvider>
                    <SimulationProvider>
                      <Layout currentView={currentView} setView={setView}>
                        {renderContent()}
                      </Layout>
                    </SimulationProvider>
                  </NotificationProvider>
                </SettingsProvider>
              </UserProvider>
            )
          }
        />
      </Routes>
      {showLGPDConsent && (
        <LGPDConsent
          onAccept={handleAcceptLGPD}
          onDecline={handleDeclineLGPD}
        />
      )}
    </ErrorBoundary>
  );
}

export default App;
