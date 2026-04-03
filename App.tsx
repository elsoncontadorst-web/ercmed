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
import { UserProvider } from './contexts/UserContext';
import { logUserActivity, incrementModuleUsage } from './services/userDataService';
import LGPDConsent from './components/LGPDConsent';
import { hasAcceptedLGPD, registerConsent } from './services/lgpdService';
import { NotificationProvider } from './contexts/NotificationContext';

// Lazy load components for better performance
const ComparisonView = React.lazy(() => import('./components/ComparisonView'));
const AiConsultantView = React.lazy(() => import('./components/AiConsultantView'));
const AboutAppView = React.lazy(() => import('./components/AboutAppView'));
const HowToUseView = React.lazy(() => import('./components/HowToUseView'));
const DashboardView = React.lazy(() => import('./components/DashboardView'));
const SubscriptionView = React.lazy(() => import('./components/SubscriptionView'));
const UserProfileView = React.lazy(() => import('./components/UserProfileView'));
const CashFlowView = React.lazy(() => import('./components/CashFlowView'));
const FinancialControlView = React.lazy(() => import('./components/FinancialControlView'));
const SalesView = React.lazy(() => import('./components/SalesView'));
const ManagerLoginView = React.lazy(() => import('./components/ManagerLoginView'));
const ManagerDashboardView = React.lazy(() => import('./components/ManagerDashboardView'));
const FeedbackView = React.lazy(() => import('./components/FeedbackView'));

// Easymed Components
const HealthDashboard = React.lazy(() => import('./components/HealthDashboard'));
const RepasseDashboard = React.lazy(() => import('./components/RepasseDashboard'));
const ContractsView = React.lazy(() => import('./components/ContractsView').then(module => ({ default: module.default })));
const AppointmentsView = React.lazy(() => import('./components/AppointmentsView'));
const EMRView = React.lazy(() => import('./components/EMRView'));
const InventoryView = React.lazy(() => import('./components/InventoryView'));
const PatientsView = React.lazy(() => import('./components/PatientsView'));
const ClinicsView = React.lazy(() => import('./components/ClinicsView'));
const BillingView = React.lazy(() => import('./components/BillingView'));
const RepasseCalculationView = React.lazy(() => import('./components/RepasseCalculationView'));
const ReceiptsView = React.lazy(() => import('./components/ReceiptsView'));
const ClinicHoursView = React.lazy(() => import('./components/ClinicHoursView'));
const BookingSettingsView = React.lazy(() => import('./components/BookingSettingsView'));
const PublicBookingPage = React.lazy(() => import('./components/PublicBookingPage'));
const TISSView = React.lazy(() => import('./components/TISSView'));
const UsersManagementView = React.lazy(() => import('./components/UsersManagementView'));
const PermissionsManagementView = React.lazy(() => import('./components/PermissionsManagementView'));
const FeaturesPage = React.lazy(() => import('./components/FeaturesPage'));
const IrpfSimulator = React.lazy(() => import('./components/IrpfSimulator'));
const DebugView = React.lazy(() => import('./components/DebugView'));
const PlansView = React.lazy(() => import('./components/PlansView'));
const AccountantModule = React.lazy(() => import('./components/AccountantModule'));
const TeamInvitationsView = React.lazy(() => import('./components/TeamInvitationsView'));
const ClinicTeamsView = React.lazy(() => import('./components/ClinicTeamsView'));


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
  const [currentView, setView] = useState<AppView>(AppView.DASHBOARD);
  const [showLogin, setShowLogin] = useState(false);
  const [showLGPDConsent, setShowLGPDConsent] = useState(false);
  const [initialSignUpMode, setInitialSignUpMode] = useState(false);

  // Estados para controle do Trial
  const [isTrial, setIsTrial] = useState(false);
  const [trialHoursLeft, setTrialHoursLeft] = useState(0);

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
              return <DashboardView setView={setView} />;

            // Health Management Views
            case AppView.HEALTH_DASHBOARD:
              return <HealthDashboard />;
            case AppView.PATIENTS:
              return <PatientsView />;
            case AppView.APPOINTMENTS:
              return <AppointmentsView />;
            case AppView.EMR:
              return <EMRView />;
            case AppView.INVENTORY:
              return <InventoryView />;
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
              return <BillingView />;
            case AppView.REPASSE_CALCULATION:
              return <RepasseCalculationView />;


            // Contracts Management
            case AppView.CONTRACTS:
              return <ContractsView />;

            // TISS Billing
            case AppView.TISS_BILLING:
              return <TISSView />;

            // User Management
            case AppView.USERS_MANAGEMENT:
              return <UsersManagementView />;
            case AppView.PERMISSIONS_MANAGEMENT:
              return <PermissionsManagementView />;

            // Legacy views
            case AppView.SIMULATOR:
              return <ComparisonView />;

            case AppView.AI_CONSULTANT:
              return <AiConsultantView />;
            case AppView.FINANCIAL_CONTROL:
              return <FinancialControlView />;
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

            // IRPF Calculator
            case AppView.IRPF_CALC:
              return <IrpfSimulator />;

            case AppView.IRPF_CALC:
              return <IrpfSimulator />;

            case AppView.DEBUG:
              return <DebugView />;

            case AppView.PLANS:
              return <PlansView />;

            case AppView.ACCOUNTANT_MODULE:
              return <AccountantModule />;

            case AppView.CLINIC_TEAMS:
              return <ClinicTeamsView />;

            default:
              return <DashboardView setView={setView} />;
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
