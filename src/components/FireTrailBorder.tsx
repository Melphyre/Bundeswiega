import React from 'react';

export interface FireTrailBorderProps {
  selectedColor?: string;
  children: React.ReactNode;
  borderStyle?: string;
  className?: string;
  vertical?: boolean;
}

export default function FireTrailBorder({
  selectedColor,
  children,
  borderStyle,
  className = '',
  vertical = false
}: FireTrailBorderProps) {
  const color = selectedColor || '#ef4444'; // Standard Rot oder gewählte Farbe
  const isActive =
    (borderStyle === undefined ||
      borderStyle === 'fire' ||
      borderStyle === 'flame' ||
      borderStyle === 'flamme') &&
    color !== 'none';

  if (!isActive) {
    return (
      <div className={`relative bg-slate-950 rounded-xl ${vertical ? 'px-2 py-1.5' : 'px-6 py-3.5'} border border-slate-800 text-white font-bold ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${vertical ? 'my-3 mx-2' : 'my-4 mx-4'} overflow-visible ${className}`}>
      
      {/* CSS-Animationen für den wandernden Punkt und den Feuerschweif */}
      <style>{`
        @keyframes orbitFire {
          0% { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }

        .fire-traveler {
          /* Lässt den Punkt präzise um den abgerundeten Kasten wandern */
          offset-path: rect(0% 100% 100% 0% round 12px);
          animation: orbitFire 3s linear infinite;
        }

        @supports not (offset-path: rect(0% 100% 100% 0% round 12px)) {
          .fire-traveler {
            animation: traceBorder 3s linear infinite !important;
          }
        }

        @keyframes sparkFade {
          0% { transform: scale(1) translate(0, 0); opacity: 1; }
          100% { transform: scale(0.3) translate(-8px, -8px); opacity: 0; }
        }

        .spark-particle {
          animation: sparkFade 0.8s ease-out infinite;
        }
      `}</style>

      {/* Basis-Namensschild */}
      <div className={`relative bg-slate-950 rounded-xl ${vertical ? 'px-2 py-1.5' : 'px-6 py-3.5'} border border-slate-800 z-10 shadow-2xl overflow-visible text-white font-bold`}>
        
        {/* Nur der reine farbige Glow (ohne weißen Punkt) wandert als Flamme */}
        <div 
          className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-transparent z-30 pointer-events-none fire-traveler"
          style={{
            boxShadow: `0 0 14px 4px ${color}, -6px -3px 18px 6px ${color}bb, -12px -6px 22px 4px ${color}66`,
          }}
        >
          {/* Kleine abfliegende Funken */}
          <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-200 spark-particle" />
          <div className="absolute -bottom-3 -left-2 w-1 h-1 rounded-full bg-orange-400 spark-particle" style={{ animationDelay: '0.25s' }} />
        </div>

        {/* Inhalt / Name */}
        <div className="relative z-20">
          {children}
        </div>
      </div>
    </div>
  );
}
