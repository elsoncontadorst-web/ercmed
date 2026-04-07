import React, { useState } from 'react';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from '../services/firebase';
import { saveUserProfile } from '../services/userRoleService';
import { AccountTier } from '../types/accountTiers';
import { UserRole } from '../types';
import { AlertCircle, CheckCircle, LogIn, UserPlus, Loader2, TrendingUp, Lock, Mail, KeyRound, ArrowLeft, Activity, Rocket } from 'lucide-react';
import SystemLogo from './SystemLogo';

interface LoginComponentProps {
  onBack?: () => void;
  initialSignUp?: boolean;
}

const LoginComponent: React.FC<LoginComponentProps> = ({ onBack, initialSignUp = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [isTrialSignUp, setIsTrialSignUp] = useState(initialSignUp); // Initialize trial mode if initialSignUp is true
  const [isResetting, setIsResetting] = useState(false); // Estado para modo de recuperação
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isResetting) {
        // Fluxo de Recuperação de Senha
        await sendPasswordResetEmail(auth, email);
        setSuccessMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada (e spam) para redefinir a senha.');
        setLoading(false);
        return; // Para aqui, não tenta logar
      }

      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // If it's a trial sign up, save the profile with TRIAL tier
        if (isSignUp && userCredential.user) {
          await saveUserProfile(userCredential.user.uid, {
            uid: userCredential.user.uid,
            email: email,
            role: UserRole.HEALTH_PROFESSIONAL,
            accountTier: AccountTier.TRIAL,
            isClinicManager: true,
            displayName: 'Usuário Teste', // Default name
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (isResetting && err.code === 'auth/user-not-found') {
        setError('Este e-mail não está cadastrado. Verifique se digitou corretamente.');
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
        setError('Ocorreu um erro. Verifique sua conexão.');
      }
    } finally {
      // Se for reset, o loading já foi tratado no sucesso
      if (!isResetting) {
        setLoading(false);
      }
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setIsTrialSignUp(false); // Reset trial mode when toggling normally
    setIsResetting(false);
    setError(null);
    setSuccessMessage(null);
  };

  const toggleReset = () => {
    setIsResetting(!isResetting);
    setIsSignUp(false);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden px-4">

      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-0 right-0 p-64 bg-teal-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 -mr-32 -mt-32 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 p-48 bg-blue-600 rounded-full mix-blend-overlay filter blur-3xl opacity-10 -ml-20 -mb-20"></div>
      </div>

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 text-white/50 hover:text-white flex items-center gap-2 transition-colors z-20"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar ao Início
        </button>
      )}

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-fade-in">

        {/* Lado Esquerdo - Branding e Recursos */}
        <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-teal-600 to-blue-700 text-white">
          <div>
            <div className="flex flex-col items-center mb-8">
              <SystemLogo variant="white" className="h-28" />
            </div>
            <p className="text-blue-100 text-lg leading-relaxed mb-8">
              A plataforma completa para gestão de saúde e repasse clínico.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/10 rounded-full">
                  <CheckCircle className="w-4 h-4 text-teal-300" />
                </div>
                <span className="text-sm font-medium">Gestão Automatizada de Repasses</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/10 rounded-full">
                  <CheckCircle className="w-4 h-4 text-teal-300" />
                </div>
                <span className="text-sm font-medium">Faturamento e Contratos</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/10 rounded-full">
                  <CheckCircle className="w-4 h-4 text-teal-300" />
                </div>
                <span className="text-sm font-medium">Prontuário Eletrônico Integrado</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/10 rounded-full">
                  <CheckCircle className="w-4 h-4 text-teal-300" />
                </div>
                <span className="text-sm font-medium">Controle Financeiro e Tributário</span>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-xs text-blue-200">
              © 2025 ERCMed. Todos os direitos reservados.
            </p>
          </div>
        </div>

        {/* Lado Direito - Formulário */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="inline-flex md:hidden items-center justify-center w-14 h-14 bg-teal-100 text-teal-600 rounded-xl mb-4 shadow-sm">
              <Activity className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              {isResetting ? 'Recuperar Senha' : (isTrialSignUp ? 'Teste Grátis' : (isSignUp ? 'Criar Conta' : 'Acesse sua Conta'))}
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              {isResetting
                ? 'Digite seu e-mail para receber o link de redefinição'
                : (isTrialSignUp ? 'Crie sua conta e teste a plataforma agora' : (isSignUp ? 'Preencha os dados para começar' : 'Bem-vindo de volta ao ERCMed'))}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">

            {successMessage && (
              <div className="p-4 bg-green-50 text-green-700 text-sm rounded-lg flex items-start gap-2 border border-green-100 mb-4 animate-fade-in">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Campo de Senha - Oculto se estiver recuperando senha */}
            {!isResetting && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-slate-700 mb-1 ml-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!isResetting}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  />
                </div>
                {!isSignUp && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={toggleReset}
                      className="text-xs text-teal-600 hover:text-teal-800 hover:underline transition-colors"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2 border border-red-100 animate-pulse">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-70 flex items-center justify-center gap-2 transform hover:scale-[1.02]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isResetting ? (
                  <>Enviar Link de Recuperação <KeyRound className="w-4 h-4" /></>
                ) : isSignUp ? (
                  <>Cadastrar {isTrialSignUp && 'Grátis'} <UserPlus className="w-4 h-4" /></>
                ) : (
                  <>Entrar <LogIn className="w-4 h-4" /></>
                )
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            {isResetting ? (
              <button
                onClick={toggleReset}
                className="text-sm text-slate-600 hover:text-teal-700 font-medium transition-colors flex items-center justify-center gap-2 w-full"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar para o Login
              </button>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                {isSignUp && (
                  <button
                    onClick={toggleMode}
                    className="text-sm text-slate-600 hover:text-teal-700 font-medium transition-colors flex items-center justify-center gap-2 w-full"
                  >
                    Já tem cadastro? Faça Login
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
                    className="group relative w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-2xl transform hover:scale-[1.02] overflow-hidden"
                  >
                    {/* Animated background effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                    {/* Content */}
                    <div className="relative flex items-center justify-center gap-3">
                      <Rocket className="w-5 h-5 animate-bounce" />
                      <span className="text-base">Cadastre e Teste Nossa Plataforma</span>
                      <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-xs font-black px-2 py-0.5 rounded-full animate-pulse">
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

      <p className="absolute bottom-4 text-slate-500 text-xs opacity-50">
        Desenvolvido com tecnologia segura Google Firebase
      </p>
    </div >
  );
};

export default LoginComponent;