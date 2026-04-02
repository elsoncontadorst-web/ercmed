import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';
import { auth } from '../services/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

const PasswordManagementView: React.FC = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Password strength validation
    const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z\d]/.test(password)) score++;

        if (score <= 2) return { score, label: 'Fraca', color: 'red' };
        if (score <= 3) return { score, label: 'Média', color: 'yellow' };
        if (score <= 4) return { score, label: 'Boa', color: 'blue' };
        return { score, label: 'Forte', color: 'green' };
    };

    const passwordStrength = getPasswordStrength(newPassword);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            setMessage({ type: 'error', text: 'Todos os campos são obrigatórios' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem' });
            return;
        }

        if (newPassword.length < 8) {
            setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 8 caracteres' });
            return;
        }

        if (newPassword === currentPassword) {
            setMessage({ type: 'error', text: 'A nova senha deve ser diferente da senha atual' });
            return;
        }

        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user || !user.email) {
                throw new Error('Usuário não autenticado');
            }

            // Re-authenticate user
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, newPassword);

            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });

            // Clear form
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Error changing password:', error);

            if (error.code === 'auth/wrong-password') {
                setMessage({ type: 'error', text: 'Senha atual incorreta' });
            } else if (error.code === 'auth/weak-password') {
                setMessage({ type: 'error', text: 'A senha é muito fraca' });
            } else {
                setMessage({ type: 'error', text: 'Erro ao alterar senha. Tente novamente.' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Lock className="w-8 h-8 text-blue-600" />
                        Gerenciamento de Senha
                    </h1>
                    <p className="text-slate-600 mt-1">Altere sua senha de acesso ao sistema</p>
                </div>

                {/* Message Alert */}
                {message && (
                    <div className={`p-4 rounded-lg border ${message.type === 'success'
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-red-50 border-red-200 text-red-800'
                        } flex items-center gap-3`}>
                        {message.type === 'success' ? (
                            <Check className="w-5 h-5 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        )}
                        <span>{message.text}</span>
                    </div>
                )}

                {/* Password Change Form */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <form onSubmit={handleChangePassword} className="space-y-6">
                        {/* Current Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Senha Atual *
                            </label>
                            <div className="relative">
                                <input
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                                    placeholder="Digite sua senha atual"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Nova Senha *
                            </label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                                    placeholder="Digite sua nova senha"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Password Strength Indicator */}
                            {newPassword && (
                                <div className="mt-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full bg-${passwordStrength.color}-500 transition-all duration-300`}
                                                style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                            />
                                        </div>
                                        <span className={`text-sm font-medium text-${passwordStrength.color}-600`}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Mínimo 8 caracteres. Use letras maiúsculas, minúsculas, números e símbolos.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Confirmar Nova Senha *
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                                    placeholder="Confirme sua nova senha"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                    <X className="w-4 h-4" />
                                    As senhas não coincidem
                                </p>
                            )}
                            {confirmPassword && newPassword === confirmPassword && (
                                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                                    <Check className="w-4 h-4" />
                                    As senhas coincidem
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Alterando...
                                </>
                            ) : (
                                <>
                                    <Lock className="w-5 h-5" />
                                    Alterar Senha
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Security Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Dicas de Segurança
                    </h3>
                    <ul className="text-sm text-blue-800 space-y-1 ml-7">
                        <li>• Use uma senha única que você não usa em outros sites</li>
                        <li>• Combine letras maiúsculas e minúsculas, números e símbolos</li>
                        <li>• Evite informações pessoais óbvias (nome, data de nascimento, etc.)</li>
                        <li>• Altere sua senha regularmente</li>
                        <li>• Nunca compartilhe sua senha com outras pessoas</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default PasswordManagementView;
