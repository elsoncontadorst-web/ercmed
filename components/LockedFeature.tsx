import React, { ReactNode } from 'react';
import { Lock } from 'lucide-react';

interface LockedFeatureProps {
    isLocked: boolean;
    message: string;
    children: ReactNode;
    onClick?: () => void;
}

export const LockedFeature: React.FC<LockedFeatureProps> = ({
    isLocked,
    message,
    children,
    onClick
}) => {
    if (!isLocked) {
        return <>{children}</>;
    }

    return (
        <div
            className="relative cursor-not-allowed"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onClick) {
                    onClick();
                } else {
                    alert(message);
                }
            }}
            title={message}
        >
            <div className="pointer-events-none opacity-60">
                {children}
            </div>
            <div className="absolute top-2 right-2">
                <div className="bg-amber-500 text-white p-1.5 rounded-full shadow-lg">
                    <Lock className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
};

export default LockedFeature;
