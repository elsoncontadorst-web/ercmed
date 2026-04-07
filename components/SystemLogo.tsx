import React from 'react';

interface SystemLogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'light' | 'dark' | 'white';
}

const SystemLogo: React.FC<SystemLogoProps> = ({ 
  className = "h-12", 
  showText = true, 
  variant = 'dark' 
}) => {
  const isWhite = variant === 'white';
  const primaryColor = isWhite ? '#FFFFFF' : '#14b8a6'; // teal-500
  const secondaryColor = isWhite ? '#FFFFFF' : '#0f172a'; // slate-900
  const textColor = isWhite ? '#FFFFFF' : secondaryColor;
  const subtextColor = isWhite ? 'rgba(255,255,255,0.8)' : '#0d9488'; // teal-600

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Dynamic SVG Icon */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto drop-shadow-sm"
      >
        {/* Rounded Medical Cross Background Shield (Subtle) */}
        <rect x="25" y="10" width="50" height="80" rx="12" fill={secondaryColor} opacity="0.05" />
        <rect x="10" y="25" width="80" height="50" rx="12" fill={secondaryColor} opacity="0.05" />

        {/* Main Cross Shape */}
        <path
          d="M40 20C40 17.7909 41.7909 16 44 16H56C58.2091 16 60 17.7909 60 20V40H80C82.2091 40 84 41.7909 84 44V56C84 58.2091 82.2091 60 80 60H60V80C60 82.2091 58.2091 84 56 84H44C41.7909 84 40 82.2091 40 80V60H20C17.7909 60 16 58.2091 16 56V44C16 41.7909 17.7909 40 20 40H40V20Z"
          fill={secondaryColor}
        />
        
        {/* Accent Bar (Inner Cross) */}
        <path
          d="M45 42H55C56.1046 42 57 42.8954 57 44V56C57 57.1046 56.1046 58 55 58H45C43.8954 58 43 57.1046 43 56V44C43 42.8954 43.8954 42 45 42Z"
          fill={primaryColor}
          opacity="0.3"
        />

        {/* Heartbeat / Vital Line */}
        <path
          d="M10 50H30L38 30L46 70L54 45L58 55L65 50H90"
          stroke={primaryColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-pulse"
        />
      </svg>

      {showText && (
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline">
            <span 
              className="text-2xl font-black tracking-tighter" 
              style={{ color: textColor, fontFamily: 'Outfit, Inter, sans-serif' }}
            >
              ERC
            </span>
            <span 
              className="text-2xl font-black tracking-tighter" 
              style={{ color: primaryColor, fontFamily: 'Outfit, Inter, sans-serif' }}
            >
              MED
            </span>
          </div>
          <span 
            className="text-[8px] font-bold uppercase tracking-[0.25em] whitespace-nowrap leading-none opacity-90"
            style={{ color: subtextColor }}
          >
            Gestão Inteligente em Saúde
          </span>
        </div>
      )}
    </div>
  );
};

export default SystemLogo;
