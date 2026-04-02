import React from 'react';
import { Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';

interface CloudSyncIndicatorProps {
    isSyncing: boolean;
    lastSync: Date | null;
    className?: string;
}

export const CloudSyncIndicator: React.FC<CloudSyncIndicatorProps> = ({
    isSyncing,
    lastSync,
    className = ""
}) => {
    return (
        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm ${className}`}>
            {isSyncing ? (
                <>
                    <RefreshCw className="w-3 h-3 text-brand-600 animate-spin" />
                    <span className="text-brand-600">Salvando...</span>
                </>
            ) : (
                <>
                    <Cloud className={`w-3 h-3 ${lastSync ? 'text-green-500' : 'text-slate-400'}`} />
                    <span className="text-slate-500">
                        {lastSync ? `Salvo às ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Pronto'}
                    </span>
                </>
            )}
        </div>
    );
};
