import React, { ReactNode } from 'react';
import { Lock, ArrowUpCircle } from 'lucide-react';
import { AccountTier, TIER_NAMES, isPremiumOrEnterprise } from '../types/accountTiers';

interface UpgradePromptProps {
    featureName: string;
    message?: string;
    currentTier?: AccountTier;
    requiredTiers?: AccountTier[];
    children?: ReactNode;
    showUpgradeButton?: boolean;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
    featureName,
    message,
    currentTier,
    requiredTiers = [],
    children,
    showUpgradeButton = true
}) => {
    const hasAccess = currentTier ? isPremiumOrEnterprise(currentTier) : false;

    if (hasAccess) {
        return <>{children}</>;
    }

    const defaultMessage = message || `Faça upgrade para Premium ou Enterprise para acessar ${featureName}.`;
    const requiredTierNames = requiredTiers.length > 0
        ? requiredTiers.map(t => TIER_NAMES[t]).join(' ou ')
        : 'Premium ou Enterprise';

    return (
        <div className="relative">
            {/* Overlay with blur effect */}
            <div className="relative">
                {children && (
                    <div className="pointer-events-none opacity-50 blur-sm">
                        {children}
                    </div>
                )}

                {/* Lock overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
                    <div className="text-center p-6 max-w-md">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-4 shadow-lg">
                            <Lock className="w-8 h-8 text-white" />
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                            Recurso Bloqueado
                        </h3>

                        <p className="text-sm text-slate-600 mb-4">
                            {defaultMessage}
                        </p>

                        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-4">
                            <span>Planos necessários:</span>
                            <span className="font-semibold text-amber-600">{requiredTierNames}</span>
                        </div>

                        {showUpgradeButton && (
                            <button
                                onClick={() => {
                                    // Navigate to plans page
                                    window.location.hash = '#/plans';
                                }}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg font-medium"
                            >
                                <ArrowUpCircle className="w-5 h-5" />
                                Fazer Upgrade
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradePrompt;
