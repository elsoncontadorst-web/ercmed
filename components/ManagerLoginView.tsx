import React, { useEffect } from 'react';
import { auth } from '../services/firebase';
import { Lock, AlertTriangle } from 'lucide-react';

interface ManagerLoginViewProps {
    onLoginSuccess: () => void;
    onBack: () => void;
}

const ManagerLoginView: React.FC<ManagerLoginViewProps> = ({ onLoginSuccess, onBack }) => {
    useEffect(() => {
        const checkUser = () => {
            const user = auth.currentUser;
            if (user && user.email === 'elsoncontador.st@gmail.com') {
                onLoginSuccess();
            }
        };
        checkUser();
    }, [onLoginSuccess]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8 text-red-600" />
                </div>

                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Acesso Restrito</h2>
                    <p className="text-slate-600 mt-2">
                        Esta área é exclusiva para administradores do sistema.
                    </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-left">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                        Se você é o gestor, certifique-se de estar logado com a conta correta.
                    </p>
                </div>

                <button
                    onClick={onBack}
                    className="w-full py-3 px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium"
                >
                    Voltar ao Início
                </button>
            </div>
        </div>
    );
};

export default ManagerLoginView;
