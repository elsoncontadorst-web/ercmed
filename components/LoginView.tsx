import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, auth } from '../services/firebase';
import { TrendingUp, Lock, Mail, Loader2, ArrowRight, UserPlus, LogIn, Database, Download } from 'lucide-react';
import InstallModal from './InstallModal';

const LoginView: React.FC = () => {
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validação básica para cadastro
        if (isSignUp && password !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }

        if (isSignUp && password.length < 6) {
            setError("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            if (isSignUp) {
                // Criar conta (Local)
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                // Login (Local)
                await signInWithEmailAndPassword(auth, email, password);
            }
            // O App.tsx irá detectar a mudança de estado
        } catch (err: any) {
            // Não logar erro no console se for erro esperado de negócio
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('E-mail ou senha incorretos.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Este e-mail já está cadastrado.');
            } else if (err.code === 'auth/weak-password') {
                setError('A senha é muito fraca.');
            } else {
                console.error("Erro inesperado no login:", err);
                setError('Erro na autenticação local.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setError('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">

            {/* Background Decorativo */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-0 right-0 p-64 bg-brand-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 -mr-32 -mt-32 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 p-48 bg-blue-600 rounded-full mix-blend-overlay filter blur-3xl opacity-10 -ml-20 -mb-20"></div>
            </div>

            <div className="w-full max-w-md p-8 relative z-10 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">

                    {/* Header do Card */}
                    <div className="bg-gray-50 p-8 text-center border-b border-gray-100">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 text-brand-600 rounded-2xl mb-4 shadow-sm">
                            <TrendingUp className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            {isSignUp ? 'Criar Conta' : 'Bem-vindo'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-2">
                            Elson Ribeiro - Contador<br />
                            <span className="text-brand-600 font-medium">Planejamento Tributário Inteligente</span>
                        </p>
                        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-400 bg-slate-100 py-1 px-2 rounded-full mx-auto w-fit">
                            <Database className="w-3 h-3" />
                            <span>Servidor Local (Offline)</span>
                        </div>
                    </div>

                    {/* Formulário */}
                    <div className="p-8">
                        <form onSubmit={handleAuthAction} className="space-y-5">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg text-center font-medium animate-pulse">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-slate-700 ml-1">E-mail</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 text-slate-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition duration-150 ease-in-out sm:text-sm"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-slate-700 ml-1">Senha</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 text-slate-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition duration-150 ease-in-out sm:text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {isSignUp && (
                                <div className="space-y-1 animate-fade-in">
                                    <label className="block text-sm font-medium text-slate-700 ml-1">Confirmar Senha</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 text-slate-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition duration-150 ease-in-out sm:text-sm"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        {isSignUp ? 'Cadastrar Conta' : 'Entrar no Sistema'}
                                        {isSignUp ? <UserPlus className="ml-2 w-4 h-4" /> : <ArrowRight className="ml-2 w-4 h-4" />}
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                            <button
                                onClick={toggleMode}
                                className="text-sm text-slate-600 hover:text-brand-700 font-medium transition-colors flex items-center justify-center gap-2 w-full"
                            >
                                {isSignUp ? (
                                    <>Já tem uma conta? <span className="underline">Faça Login</span></>
                                ) : (
                                    <>Não tem acesso? <span className="underline">Criar Nova Conta</span></>
                                )}
                            </button>
                        </div>

                        {!isSignUp && (
                            <div className="mt-4 flex flex-col gap-3 text-center">
                                <a href="https://api.whatsapp.com/send?phone=5579988078887" target="_blank" className="text-xs text-slate-400 hover:text-brand-600 transition-colors">
                                    Precisa de ajuda? Falar com suporte.
                                </a>
                                <button
                                    onClick={() => setShowInstallModal(true)}
                                    className="flex items-center justify-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Como Instalar o App
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-center text-slate-600 text-xs mt-8 opacity-60">
                    © {new Date().getFullYear()} Elson Ribeiro. Todos os direitos reservados.
                </p>

                <InstallModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
            </div>
        </div>
    );
};

export default LoginView;