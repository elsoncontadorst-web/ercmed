import React, { useState } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  googleProvider,
  signInWithPopup,
  linkWithCredential,
  GoogleAuthProvider,
} from '../services/firebase';
import { saveUserProfile } from '../services/userRoleService';
import { AccountTier } from '../types/accountTiers';
import { UserRole } from '../types';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Activity,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Rocket,
  UserPlus,
} from 'lucide-react';
import SystemLogo from './SystemLogo';

const USER_PROFILE_UPDATED_EVENT = 'ercmed:user-profile-updated';

interface LoginComponentProps {
  onBack?: () => void;
  initialSignUp?: boolean;
}

const LoginComponent: React.FC<LoginComponentProps> = ({ onBack, initialSignUp = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [isTrialSignUp, setIsTrialSignUp] = useState(initialSignUp);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [syncEmail, setSyncEmail] = useState<string | null>(null);
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<any>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isResetting) {
        await sendPasswordResetEmail(auth, email.trim().toLowerCase());
        setSuccessMessage('Enviamos o link de recuperação. Verifique sua caixa de entrada e também o spam.');
        setLoading(false);
        return;
      }

      if (isSignUp && !syncEmail) {
        const normalizedEmail = email.trim().toLowerCase();
        const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

        if (userCredential.user) {
          await saveUserProfile(userCredential.user.uid, {
            uid: userCredential.user.uid,
            email: normalizedEmail,
            role: UserRole.HEALTH_PROFESSIONAL,
            accountTier: AccountTier.TRIAL,
            isClinicManager: true,
            displayName: 'Gestor ERCMed',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          window.dispatchEvent(new CustomEvent(USER_PROFILE_UPDATED_EVENT));
        }
      } else {
        const loginEmail = (syncEmail || email).trim().toLowerCase();
        const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);

        if (pendingGoogleCredential) {
          try {
            await linkWithCredential(userCredential.user, pendingGoogleCredential);
            setSuccessMessage('Conta sincronizada com o Google com sucesso.');
            setPendingGoogleCredential(null);
            setSyncEmail(null);
          } catch (linkErr) {
            console.error('Erro ao sincronizar contas:', linkErr);
            setError('Não foi possível sincronizar a conta com o Google.');
          }
        }
      }
    } catch (err: any) {
      console.error(err);

      if (isResetting && err.code === 'auth/user-not-found') {
        setError('Este e-mail não está cadastrado.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Digite um e-mail válido.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setError('Ocorreu um erro. Verifique sua conexão e tente novamente.');
      }
    } finally {
      if (!isResetting) {
        setLoading(false);
      }
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setSuccessMessage(null);
    setGoogleLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userId = result.user.uid;
      const userEmail = result.user.email || '';
      const creationTime = result.user.metadata.creationTime;
      const lastSignInTime = result.user.metadata.lastSignInTime;

      if (creationTime === lastSignInTime) {
        await saveUserProfile(userId, {
          uid: userId,
          email: userEmail,
          role: UserRole.HEALTH_PROFESSIONAL,
          accountTier: AccountTier.TRIAL,
          isClinicManager: true,
          displayName: result.user.displayName || 'Gestor ERCMed',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        window.dispatchEvent(new CustomEvent(USER_PROFILE_UPDATED_EVENT));
      }
    } catch (err: any) {
      console.error('Erro completo Google Auth:', err);
      const errorCode = err.code;

      if (errorCode === 'auth/account-exists-with-different-credential') {
        const pendingCred = GoogleAuthProvider.credentialFromError(err);
        const existingEmail = err.customData?.email || '';
        setSyncEmail(existingEmail);
        setPendingGoogleCredential(pendingCred);
        setEmail(existingEmail);
        setIsSignUp(false);
        setIsResetting(false);
        setError(`Encontramos uma conta para ${existingEmail}. Informe sua senha para sincronizar com o Google.`);
      } else if (errorCode === 'auth/unauthorized-domain') {
        setError(`Domínio não autorizado: ${window.location.hostname}.`);
      } else if (errorCode === 'auth/popup-blocked') {
        setError('O navegador bloqueou a janela de login do Google.');
      } else if (errorCode !== 'auth/popup-closed-by-user') {
        setError(`Erro ao entrar com Google: ${errorCode || 'desconhecido'}.`);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setIsTrialSignUp(false);
    setIsResetting(false);
    setError(null);
    setSuccessMessage(null);
    setPendingGoogleCredential(null);
    setSyncEmail(null);
  };

  const toggleReset = () => {
    setIsResetting(!isResetting);
    setIsSignUp(false);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 p-64 rounded-full bg-teal-500 opacity-10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 p-48 rounded-full bg-blue-600 opacity-10 blur-3xl" />
      </div>

      {onBack && (
        <button
          onClick={onBack}
          className="absolute left-4 top-4 z-20 flex items-center gap-2 text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar ao início
        </button>
      )}

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-teal-600 to-blue-700 p-10 text-white md:flex">
          <div>
            <div className="mb-8 flex flex-col items-center">
              <SystemLogo variant="white" className="h-28" />
            </div>

            <p className="mb-8 text-lg leading-relaxed text-blue-100">
              Gestão executiva, financeira, faturamento e controladoria para empresas de saúde.
            </p>

            <div className="space-y-4">
              {[
                'Gestão de unidades, profissionais e permissões',
                'Faturamento particular, convênios, TISS e glosas',
                'Serviços, preços, produção e repasses integrados',
                'Financeiro, controladoria, tributos e DRE gerencial',
              ].map(item => (
                <div key={item} className="flex items-center gap-3">
                  <div className="rounded-full bg-white/10 p-1.5">
                    <CheckCircle className="h-4 w-4 text-teal-300" />
                  </div>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-8">
            <p className="text-xs text-blue-200">© 2026 ERCMed. Todos os direitos reservados.</p>
          </div>
        </div>

        <div className="flex flex-col justify-center p-8 md:p-12">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-teal-100 text-teal-600 shadow-sm md:hidden">
              <Activity className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              {isResetting ? 'Recuperar senha' : isTrialSignUp ? 'Teste grátis' : isSignUp ? 'Criar conta' : 'Acesse sua conta'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {isResetting
                ? 'Digite seu e-mail para receber o link de redefinição.'
                : isTrialSignUp
                  ? 'Crie sua conta e conheça o novo ERP de gestão para empresas de saúde.'
                  : isSignUp
                    ? 'Preencha os dados para começar.'
                    : 'Bem-vindo de volta ao ERCMed.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {successMessage && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-green-100 bg-green-50 p-4 text-sm text-green-700">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div>
              <label className="ml-1 mb-1 block text-sm font-medium text-slate-700">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 outline-none transition-all focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {!isResetting && (
              <div>
                <label className="ml-1 mb-1 block text-sm font-medium text-slate-700">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 outline-none transition-all focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {!isSignUp && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={toggleReset}
                      className="text-xs text-teal-600 transition-colors hover:text-teal-800 hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full transform items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-teal-700 hover:shadow-xl disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isResetting ? (
                <>
                  Enviar link de recuperação
                  <KeyRound className="h-4 w-4" />
                </>
              ) : isSignUp ? (
                <>
                  Cadastrar {isTrialSignUp ? 'grátis' : ''}
                  <UserPlus className="h-4 w-4" />
                </>
              ) : (
                <>
                  Entrar
                  <LogIn className="h-4 w-4" />
                </>
              )}
            </button>

            {!isResetting && !syncEmail && (
              <>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-200" />
                  <span className="mx-4 flex-shrink-0 text-sm text-gray-400">ou</span>
                  <div className="flex-grow border-t border-gray-200" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={googleLoading || loading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white py-3 font-semibold text-slate-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-70"
                >
                  {googleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      {isSignUp ? 'Cadastrar com Google' : 'Entrar com Google'}
                    </>
                  )}
                </button>
              </>
            )}

            {syncEmail && (
              <button
                type="button"
                onClick={() => {
                  setSyncEmail(null);
                  setPendingGoogleCredential(null);
                  setError(null);
                }}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                Cancelar sincronização
              </button>
            )}
          </form>

          <div className="mt-6 border-t border-gray-100 pt-4 text-center">
            {isResetting ? (
              <button
                onClick={toggleReset}
                className="flex w-full items-center justify-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-teal-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </button>
            ) : (
              <div className="flex w-full flex-col gap-2">
                {isSignUp && (
                  <button
                    onClick={toggleMode}
                    className="flex w-full items-center justify-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-teal-700"
                  >
                    Já tem cadastro? Faça login
                  </button>
                )}

                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setIsTrialSignUp(true);
                      setError(null);
                    }}
                    className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-teal-600 to-blue-600 px-6 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:from-teal-700 hover:to-blue-700 hover:shadow-2xl"
                  >
                    <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-1000 group-hover:translate-x-[100%]" />
                    <div className="relative flex items-center justify-center gap-3">
                      <Rocket className="h-5 w-5 animate-bounce" />
                      <span className="text-base">Cadastre e teste nossa plataforma</span>
                      <span className="absolute -right-1 -top-1 rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-black text-yellow-900">
                        GRÁTIS
                      </span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="absolute bottom-4 text-xs text-slate-500 opacity-60">
        Desenvolvido com tecnologia segura Google Firebase
      </p>
    </div>
  );
};

export default LoginComponent;
