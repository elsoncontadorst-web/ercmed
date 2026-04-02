import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, Lock, AlertCircle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { canSyncClinics, UPGRADE_MESSAGES } from '../types/accountTiers';
import { getClinics } from '../services/clinicService';
import { Clinic } from '../types/clinic';

interface ClinicSyncStatusProps {
    onSyncClick?: () => void;
}

export const ClinicSyncStatus: React.FC<ClinicSyncStatusProps> = ({ onSyncClick }) => {
    const { userTier } = useUser();
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const hasSyncAccess = canSyncClinics(userTier);

    useEffect(() => {
        if (hasSyncAccess) {
            loadClinics();
        }
    }, [hasSyncAccess]);

    const loadClinics = async () => {
        try {
            const data = await getClinics();
            setClinics(data);
        } catch (error) {
            console.error('Error loading clinics:', error);
        }
    };

    const handleSync = async () => {
        if (!hasSyncAccess) {
            alert(UPGRADE_MESSAGES.clinicSync);
            return;
        }

        setLoading(true);
        try {
            // Reload clinics data
            await loadClinics();
            setLastSync(new Date());

            if (onSyncClick) {
                onSyncClick();
            }
        } catch (error) {
            console.error('Error syncing:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatLastSync = () => {
        if (!lastSync) return 'Nunca';

        const now = new Date();
        const diff = now.getTime() - lastSync.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (seconds < 60) return 'Agora mesmo';
        if (minutes < 60) return `Há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        if (hours < 24) return `Há ${hours} hora${hours > 1 ? 's' : ''}`;
        return lastSync.toLocaleDateString('pt-BR');
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {hasSyncAccess ? (
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                    ) : (
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Lock className="w-5 h-5 text-amber-600" />
                        </div>
                    )}

                    <div>
                        <h3 className="font-semibold text-slate-800">
                            Sincronização de Consultórios
                        </h3>
                        <p className="text-sm text-slate-500">
                            {hasSyncAccess ? (
                                <>
                                    Status: <span className="text-green-600 font-medium">Ativa</span>
                                    {' • '}
                                    {clinics.length} consultório{clinics.length !== 1 ? 's' : ''} sincronizado{clinics.length !== 1 ? 's' : ''}
                                </>
                            ) : (
                                <span className="text-amber-600">Bloqueada - Upgrade necessário</span>
                            )}
                        </p>
                        {hasSyncAccess && (
                            <p className="text-xs text-slate-400 mt-1">
                                Última sincronização: {formatLastSync()}
                            </p>
                        )}
                    </div>
                </div>

                {hasSyncAccess ? (
                    <button
                        onClick={handleSync}
                        disabled={loading}
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Sincronizando...' : 'Sincronizar'}
                    </button>
                ) : (
                    <button
                        onClick={() => alert(UPGRADE_MESSAGES.clinicSync)}
                        className="px-4 py-2 bg-slate-300 text-slate-600 rounded-lg cursor-not-allowed flex items-center gap-2 relative"
                    >
                        <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1 rounded-full">
                            <Lock className="w-3 h-3" />
                        </div>
                        <RefreshCw className="w-4 h-4" />
                        Sincronizar
                    </button>
                )}
            </div>

            {!hasSyncAccess && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-800">
                            {UPGRADE_MESSAGES.clinicSync}
                        </p>
                    </div>
                </div>
            )}

            {hasSyncAccess && clinics.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">
                        Consultórios Sincronizados
                    </h4>
                    <div className="space-y-2">
                        {clinics.map(clinic => (
                            <div
                                key={clinic.id}
                                className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded"
                            >
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span className="font-medium">{clinic.name}</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-500">{clinic.specialty}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClinicSyncStatus;
