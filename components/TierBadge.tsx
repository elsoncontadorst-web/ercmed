import React from 'react';
import { AccountTier, TIER_NAMES, TIER_COLORS, TIER_DESCRIPTIONS } from '../types/accountTiers';
import { Crown } from 'lucide-react';

interface TierBadgeProps {
    tier?: AccountTier | string;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
}

export const TierBadge: React.FC<TierBadgeProps> = ({
    tier = AccountTier.BRONZE,
    size = 'md',
    showIcon = true
}) => {
    // Handle string tier (from database) mapping to enum
    const currentTier = (tier as AccountTier) || AccountTier.BRONZE;

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-1.5'
    };

    const colorClass = TIER_COLORS[currentTier] || TIER_COLORS[AccountTier.BRONZE];
    const name = TIER_NAMES[currentTier] || 'Plano Básico';
    const description = TIER_DESCRIPTIONS[currentTier] || '';

    return (
        <div
            className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${sizeClasses[size]} ${colorClass}`}
            title={description}
        >
            {showIcon && <Crown className="w-3.5 h-3.5" />}
            <span>{name}</span>
        </div>
    );
};
