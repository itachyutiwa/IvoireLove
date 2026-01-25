import React from 'react';
import { SubscriptionType } from '@/types';

interface SubscriptionBadgeProps {
  type: SubscriptionType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Configuration des badges selon le type de pass
const BADGE_CONFIG: Record<SubscriptionType, {
  text: string;
  outerColor: string;
  innerColor: string;
  textColor: string;
  ribbonColor: string;
  stars: number;
  symbol?: string;
}> = {
  trial: {
    text: 'ESSAI',
    outerColor: '#9CA3AF', // gris
    innerColor: '#D1D5DB',
    textColor: '#374151',
    ribbonColor: '#6B7280',
    stars: 1,
  },
  day: {
    text: 'JOUR',
    outerColor: '#3B82F6', // bleu
    innerColor: '#60A5FA',
    textColor: '#1E40AF',
    ribbonColor: '#2563EB',
    stars: 1,
  },
  week: {
    text: 'SEMAINE',
    outerColor: '#10B981', // vert
    innerColor: '#34D399',
    textColor: '#065F46',
    ribbonColor: '#059669',
    stars: 2,
  },
  month: {
    text: 'MOIS',
    outerColor: '#8B5CF6', // violet
    innerColor: '#A78BFA',
    textColor: '#5B21B6',
    ribbonColor: '#7C3AED',
    stars: 2,
  },
  '3months': {
    text: 'PREMIUM',
    outerColor: '#F26E27', // orange
    innerColor: '#FF8C42',
    textColor: '#C2410C',
    ribbonColor: '#EA580C',
    stars: 3,
    symbol: '★',
  },
  '6months': {
    text: 'PREMIUM+',
    outerColor: '#F26E27', // orange
    innerColor: '#FFA500',
    textColor: '#C2410C',
    ribbonColor: '#EA580C',
    stars: 4,
    symbol: '★★',
  },
  year: {
    text: 'VIP',
    outerColor: '#F26E27', // orange
    innerColor: '#FFD700',
    textColor: '#C2410C',
    ribbonColor: '#DC2626',
    stars: 5,
    symbol: '★★★',
  },
};

export const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({ 
  type, 
  size = 'md',
  className = '' 
}) => {
  const config = BADGE_CONFIG[type];
  const sizeClasses = {
    sm: 'w-16 h-16 text-[8px]',
    md: 'w-24 h-24 text-xs',
    lg: 'w-32 h-32 text-sm',
  };

  const starSize = size === 'sm' ? 4 : size === 'md' ? 6 : 8;
  const checkmarkSize = size === 'sm' ? 8 : size === 'md' ? 12 : 16;

  // Générer les points pour la bordure dentelée (cogwheel effect)
  const generateSerratedEdge = (cx: number, cy: number, outerRadius: number, innerRadius: number, teeth: number) => {
    const points: string[] = [];
    for (let i = 0; i < teeth * 2; i++) {
      const angle = (i * Math.PI) / teeth;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  };

  const serratedPoints = generateSerratedEdge(50, 50, 40, 36, 16);

  return (
    <div className={`relative inline-block ${className}`}>
      <svg
        width={size === 'sm' ? 64 : size === 'md' ? 96 : 128}
        height={size === 'sm' ? 80 : size === 'md' ? 120 : 160}
        viewBox="0 0 100 120"
        className="drop-shadow-xl"
      >
        {/* Définition des gradients pour les effets 3D */}
        <defs>
          <linearGradient id={`gradient-outer-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={config.outerColor} stopOpacity="1" />
            <stop offset="100%" stopColor={config.outerColor} stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id={`gradient-inner-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={config.innerColor} stopOpacity="1" />
            <stop offset="100%" stopColor={config.innerColor} stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id={`gradient-ribbon-${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={config.ribbonColor} stopOpacity="1" />
            <stop offset="100%" stopColor={config.ribbonColor} stopOpacity="0.7" />
          </linearGradient>
          <filter id={`shadow-${type}`}>
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Ruban gauche */}
        <path
          d="M 42 100 L 42 108 L 46 112 L 50 108 L 50 100 Z"
          fill={`url(#gradient-ribbon-${type})`}
          filter={`url(#shadow-${type})`}
        />
        <path
          d="M 42 100 L 42 108 L 46 112 L 50 108 L 50 100"
          fill="none"
          stroke="#000000"
          strokeWidth="0.3"
          opacity="0.2"
        />

        {/* Ruban droit */}
        <path
          d="M 50 100 L 50 108 L 54 112 L 58 108 L 58 100 Z"
          fill={`url(#gradient-ribbon-${type})`}
          filter={`url(#shadow-${type})`}
        />
        <path
          d="M 50 100 L 50 108 L 54 112 L 58 108 L 58 100"
          fill="none"
          stroke="#000000"
          strokeWidth="0.3"
          opacity="0.2"
        />

        {/* Bordure dentelée extérieure (polygone avec dents) */}
        <polygon
          points={serratedPoints}
          fill={`url(#gradient-outer-${type})`}
          filter={`url(#shadow-${type})`}
        />
        
        {/* Ombre interne sur la bordure */}
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="#000000"
          strokeWidth="0.5"
          opacity="0.1"
        />

        {/* Cercle intérieur */}
        <circle
          cx="50"
          cy="50"
          r="28"
          fill={`url(#gradient-inner-${type})`}
        />

        {/* Effet de brillance/highlight sur le cercle intérieur */}
        <ellipse
          cx="50"
          cy="42"
          rx="18"
          ry="10"
          fill="#FFFFFF"
          opacity="0.4"
        />

        {/* Étoiles au-dessus du texte */}
        {Array.from({ length: config.stars }).map((_, i) => {
          const spacing = config.stars > 1 ? 8 : 0;
          const startX = 50 - ((config.stars - 1) * spacing) / 2;
          const x = startX + i * spacing;
          const y = 38;
          return (
            <g key={i}>
              <path
                d={`M ${x} ${y} L ${x + 1.2} ${y + 1.8} L ${x + 2.5} ${y} L ${x + 2} ${y + 1.2} L ${x + 2.5} ${y + 2.5} L ${x} ${y + 2} L ${x - 1.2} ${y + 2.5} L ${x - 0.8} ${y + 1.2} Z`}
                fill={config.textColor}
                opacity="0.95"
              />
            </g>
          );
        })}

        {/* Texte principal */}
        <text
          x="50"
          y="52"
          textAnchor="middle"
          fill={config.textColor}
          fontSize="6.5"
          fontWeight="bold"
          fontFamily="Arial, sans-serif"
          letterSpacing="0.5"
          opacity="0.98"
        >
          {config.text}
        </text>

        {/* Checkmark ou symbole en dessous */}
        {config.symbol ? (
          <text
            x="50"
            y="62"
            textAnchor="middle"
            fill={config.textColor}
            fontSize="5.5"
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
            opacity="0.95"
          >
            {config.symbol}
          </text>
        ) : (
          <path
            d="M 44 58 L 47.5 61.5 L 56 53"
            stroke={config.textColor}
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
        )}
      </svg>
    </div>
  );
};
